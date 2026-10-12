"""
Culinary Ingredient Normalization, Unit Validation, and Freshness Semantics.

- Normalized ingredient naming and alias resolution.
- Collision guards preventing false merges (e.g. black pepper vs bell pepper,
  peanut butter vs butter, sweet potato vs potato, coconut milk vs dairy milk).
- Supported culinary units validation and canonicalization.
- Consistent date-only semantics and freshness state categorization.
- Dates are organizational reminders, not certified food-safety guarantees.
"""

import re
from datetime import date, timedelta
from typing import Optional, Tuple, Dict, Set, List

# --- Supported Units ---
SUPPORTED_UNITS: Set[str] = {
    # Count & packaging
    "pcs", "piece", "pieces", "count", "item", "items", "unit", "units",
    "head", "heads", "clove", "cloves", "can", "cans", "bottle", "bottles",
    "pack", "packs", "package", "packages", "bag", "bags", "box", "boxes",
    "slice", "slices", "bunch", "bunches", "stalk", "stalks", "pinch", "pinches",
    # Weight
    "g", "gram", "grams", "kg", "kilogram", "kilograms", "oz", "ounce", "ounces",
    "lb", "lbs", "pound", "pounds",
    # Volume
    "ml", "milliliter", "milliliters", "l", "liter", "liters",
    "cup", "cups", "tbsp", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons", "pt", "pint", "pints",
    "qt", "quart", "quarts", "gal", "gallon", "gallons",
    "fl oz", "fluid ounce", "fluid ounces"
}

UNIT_CANONICAL_MAP: Dict[str, str] = {
    "piece": "pcs",
    "pieces": "pcs",
    "count": "pcs",
    "item": "pcs",
    "items": "pcs",
    "unit": "pcs",
    "units": "pcs",
    "gram": "g",
    "grams": "g",
    "kilogram": "kg",
    "kilograms": "kg",
    "ounce": "oz",
    "ounces": "oz",
    "pound": "lbs",
    "pounds": "lbs",
    "lb": "lbs",
    "milliliter": "ml",
    "milliliters": "ml",
    "liter": "l",
    "liters": "l",
    "cup": "cups",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "pint": "pt",
    "pints": "pt",
    "quart": "qt",
    "quarts": "qt",
    "gallon": "gal",
    "gallons": "gal",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    "package": "pack",
    "packages": "pack",
    "packs": "pack",
    "heads": "head",
    "bunches": "bunch",
    "stalks": "stalk",
    "slices": "slices",
    "pinches": "pinch",
    "cans": "cans",
    "bottles": "bottle",
    "bags": "bag",
    "boxes": "box",
}

def validate_and_normalize_unit(unit_raw: str) -> str:
    """
    Validates that a unit string is supported and returns its canonical representation.
    Raises ValueError if unsupported.
    """
    cleaned = unit_raw.strip().lower()
    if cleaned not in SUPPORTED_UNITS:
        supported_display = ", ".join(sorted(["pcs", "g", "kg", "ml", "l", "cups", "tbsp", "tsp", "cloves", "cans", "oz", "lbs", "pack", "slices", "bunch", "pinch"]))
        raise ValueError(f"Unsupported unit '{unit_raw}'. Supported units include: {supported_display}")
    return UNIT_CANONICAL_MAP.get(cleaned, cleaned)


# --- Unit Dimensions & Conversion Engine ---
# Physical unit dimensions for safe culinary conversion.
# Units within the same dimension (weight-to-weight, volume-to-volume) can be converted reliably.
# Volume-to-weight or count-to-weight conversions CANNOT be assumed without density!
UNIT_DIMENSIONS: Dict[str, Dict[str, float]] = {
    # Weight dimension with ratios relative to 1 gram (g)
    "WEIGHT": {
        "g": 1.0,
        "gram": 1.0,
        "grams": 1.0,
        "kg": 1000.0,
        "kilogram": 1000.0,
        "kilograms": 1000.0,
        "oz": 28.349523,
        "ounce": 28.349523,
        "ounces": 28.349523,
        "lbs": 453.59237,
        "lb": 453.59237,
        "pound": 453.59237,
        "pounds": 453.59237,
    },
    # Volume dimension with ratios relative to 1 milliliter (ml)
    "VOLUME": {
        "ml": 1.0,
        "milliliter": 1.0,
        "milliliters": 1.0,
        "l": 1000.0,
        "liter": 1000.0,
        "liters": 1000.0,
        "tsp": 5.0,
        "teaspoon": 5.0,
        "teaspoons": 5.0,
        "tbsp": 15.0,
        "tablespoon": 15.0,
        "tablespoons": 15.0,
        "cup": 240.0,
        "cups": 240.0,
        "pt": 473.176,
        "pint": 473.176,
        "pints": 473.176,
        "qt": 946.353,
        "quart": 946.353,
        "quarts": 946.353,
        "gal": 3785.41,
        "gallon": 3785.41,
        "gallons": 3785.41,
        "fl oz": 29.5735,
        "fluid ounce": 29.5735,
        "fluid ounces": 29.5735,
    }
}

COUNT_SYNONYM_SETS: List[Set[str]] = [
    {"pcs", "piece", "pieces", "count", "item", "items", "unit", "units"},
    {"clove", "cloves"},
    {"can", "cans"},
    {"slice", "slices"},
    {"bunch", "bunches"},
    {"head", "heads"},
    {"stalk", "stalks"},
    {"pinch", "pinches"},
    {"pack", "packs", "package", "packages"},
    {"bottle", "bottles"},
    {"bag", "bags"},
    {"box", "boxes"}
]

def get_unit_dimension(unit_str: str) -> Optional[str]:
    """Returns 'WEIGHT', 'VOLUME', 'COUNT', or None."""
    cleaned = unit_str.strip().lower()
    canonical = UNIT_CANONICAL_MAP.get(cleaned, cleaned)
    if canonical in UNIT_DIMENSIONS["WEIGHT"] or cleaned in UNIT_DIMENSIONS["WEIGHT"]:
        return "WEIGHT"
    if canonical in UNIT_DIMENSIONS["VOLUME"] or cleaned in UNIT_DIMENSIONS["VOLUME"]:
        return "VOLUME"
    for cset in COUNT_SYNONYM_SETS:
        if cleaned in cset or canonical in cset:
            return "COUNT"
    return None

def can_convert_units(from_unit: str, to_unit: str) -> bool:
    """
    Returns True if and only if from_unit and to_unit belong to the same convertible dimension.
    Volume-to-weight or count-to-weight conversions return False because density is variable.
    """
    if not from_unit or not to_unit:
        return False
    u1 = from_unit.strip().lower()
    u2 = to_unit.strip().lower()
    c1 = UNIT_CANONICAL_MAP.get(u1, u1)
    c2 = UNIT_CANONICAL_MAP.get(u2, u2)

    if u1 == u2 or c1 == c2:
        return True

    dim1 = get_unit_dimension(u1)
    dim2 = get_unit_dimension(u2)

    if dim1 is None or dim2 is None or dim1 != dim2:
        return False

    if dim1 == "WEIGHT" and dim2 == "WEIGHT":
        return True

    if dim1 == "VOLUME" and dim2 == "VOLUME":
        return True

    if dim1 == "COUNT" and dim2 == "COUNT":
        for cset in COUNT_SYNONYM_SETS:
            if (u1 in cset or c1 in cset) and (u2 in cset or c2 in cset):
                return True
        return False

    return False

def convert_unit_quantity(quantity: float, from_unit: str, to_unit: str) -> Optional[float]:
    """
    Converts a numerical quantity from from_unit to to_unit.
    Returns None if units cannot be reliably converted (e.g. volume to weight).
    """
    if quantity is None:
        return None
    if not can_convert_units(from_unit, to_unit):
        return None

    u1 = from_unit.strip().lower()
    u2 = to_unit.strip().lower()
    c1 = UNIT_CANONICAL_MAP.get(u1, u1)
    c2 = UNIT_CANONICAL_MAP.get(u2, u2)

    if u1 == u2 or c1 == c2:
        return float(quantity)

    dim1 = get_unit_dimension(u1)
    if dim1 == "WEIGHT":
        r1 = UNIT_DIMENSIONS["WEIGHT"].get(c1) or UNIT_DIMENSIONS["WEIGHT"].get(u1)
        r2 = UNIT_DIMENSIONS["WEIGHT"].get(c2) or UNIT_DIMENSIONS["WEIGHT"].get(u2)
        if r1 and r2:
            return round((float(quantity) * r1) / r2, 4)

    if dim1 == "VOLUME":
        r1 = UNIT_DIMENSIONS["VOLUME"].get(c1) or UNIT_DIMENSIONS["VOLUME"].get(u1)
        r2 = UNIT_DIMENSIONS["VOLUME"].get(c2) or UNIT_DIMENSIONS["VOLUME"].get(u2)
        if r1 and r2:
            return round((float(quantity) * r1) / r2, 4)

    if dim1 == "COUNT":
        return float(quantity)

    return None



# --- Aliases & Normalized Taxonomy ---
ALIAS_MAP: Dict[str, str] = {
    # Alliums
    "scallion": "scallion",
    "scallions": "scallion",
    "green onion": "scallion",
    "green onions": "scallion",
    "spring onion": "scallion",
    "spring onions": "scallion",
    "shallot": "shallot",
    "shallots": "shallot",
    "yellow onion": "onion",
    "yellow onions": "onion",
    "white onion": "onion",
    "white onions": "onion",
    "brown onion": "onion",
    "brown onions": "onion",
    "red onion": "red onion",
    "red onions": "red onion",
    "sweet onion": "onion",
    "sweet onions": "onion",
    "onion": "onion",
    "onions": "onion",
    "garlic": "garlic",
    "garlic clove": "garlic",
    "garlic cloves": "garlic",
    "minced garlic": "garlic",
    "fresh garlic": "garlic",
    "crushed garlic": "garlic",
    "garlic bulb": "garlic",
    "leek": "leek",
    "leeks": "leek",

    # Herbs
    "cilantro": "cilantro",
    "fresh cilantro": "cilantro",
    "coriander": "cilantro",
    "coriander leaves": "cilantro",
    "fresh coriander": "cilantro",
    "chinese parsley": "cilantro",
    "coriander seed": "coriander seed",
    "coriander seeds": "coriander seed",
    "ground coriander": "coriander seed",
    "basil": "basil",
    "fresh basil": "basil",
    "sweet basil": "basil",
    "basil leaves": "basil",
    "fresh basil leaves": "basil",
    "thai basil": "thai basil",
    "parsley": "parsley",
    "fresh parsley": "parsley",
    "flat leaf parsley": "parsley",
    "italian parsley": "parsley",
    "curly parsley": "parsley",
    "oregano": "oregano",
    "fresh oregano": "oregano",
    "dried oregano": "oregano",
    "rosemary": "rosemary",
    "fresh rosemary": "rosemary",
    "thyme": "thyme",
    "fresh thyme": "thyme",
    "ginger": "ginger",
    "fresh ginger": "ginger",
    "ginger root": "ginger",
    "minced ginger": "ginger",
    "ground ginger": "ground ginger",
    "ginger powder": "ground ginger",

    # Tomatoes & Nightshades
    "tomato": "tomato",
    "tomatoes": "tomato",
    "roma tomato": "tomato",
    "roma tomatoes": "tomato",
    "cherry tomato": "cherry tomato",
    "cherry tomatoes": "cherry tomato",
    "plum tomato": "tomato",
    "plum tomatoes": "tomato",
    "grape tomato": "cherry tomato",
    "grape tomatoes": "cherry tomato",
    "beefsteak tomato": "tomato",
    "beefsteak tomatoes": "tomato",
    "canned tomato": "canned tomato",
    "canned tomatoes": "canned tomato",
    "crushed tomato": "canned tomato",
    "crushed tomatoes": "canned tomato",
    "diced tomato": "canned tomato",
    "diced tomatoes": "canned tomato",
    "tomato paste": "tomato paste",
    "tomato sauce": "tomato sauce",
    "tomato puree": "tomato sauce",
    "passata": "tomato sauce",

    # Peppers (Distinct species protected against incorrect merging)
    "bell pepper": "bell pepper",
    "bell peppers": "bell pepper",
    "capsicum": "bell pepper",
    "capsicums": "bell pepper",
    "sweet pepper": "bell pepper",
    "sweet peppers": "bell pepper",
    "red bell pepper": "bell pepper",
    "green bell pepper": "bell pepper",
    "yellow bell pepper": "bell pepper",
    "orange bell pepper": "bell pepper",

    "black pepper": "black pepper",
    "ground black pepper": "black pepper",
    "black peppercorns": "black pepper",
    "white pepper": "white pepper",
    "cayenne": "cayenne pepper",
    "cayenne pepper": "cayenne pepper",
    "chili pepper": "chili pepper",
    "chilli pepper": "chili pepper",
    "red chili": "chili pepper",
    "red chilli": "chili pepper",
    "green chili": "chili pepper",
    "jalapeno": "jalapeno",
    "jalapenos": "jalapeno",
    "serrano": "serrano pepper",
    "habanero": "habanero pepper",
    "chili flakes": "red pepper flakes",
    "red pepper flakes": "red pepper flakes",
    "crushed red pepper": "red pepper flakes",
    "paprika": "paprika",
    "smoked paprika": "smoked paprika",

    # Vegetables
    "eggplant": "eggplant",
    "eggplants": "eggplant",
    "aubergine": "eggplant",
    "aubergines": "eggplant",
    "zucchini": "zucchini",
    "zucchinis": "zucchini",
    "courgette": "zucchini",
    "courgettes": "zucchini",
    "cucumber": "cucumber",
    "cucumbers": "cucumber",
    "carrot": "carrot",
    "carrots": "carrot",
    "baby carrot": "carrot",
    "baby carrots": "carrot",
    "celery": "celery",
    "celery stalk": "celery",
    "celery stalks": "celery",
    "spinach": "spinach",
    "baby spinach": "spinach",
    "fresh spinach": "spinach",
    "kale": "kale",
    "curly kale": "kale",
    "broccoli": "broccoli",
    "broccoli florets": "broccoli",
    "cauliflower": "cauliflower",
    "cauliflower florets": "cauliflower",
    "cabbage": "cabbage",
    "green cabbage": "cabbage",
    "red cabbage": "red cabbage",
    "mushroom": "mushroom",
    "mushrooms": "mushroom",
    "button mushroom": "mushroom",
    "button mushrooms": "mushroom",
    "cremini mushroom": "mushroom",
    "cremini mushrooms": "mushroom",
    "portobello": "portobello mushroom",
    "shiitake": "shiitake mushroom",
    "avocado": "avocado",
    "avocados": "avocado",
    "haas avocado": "avocado",
    "hass avocado": "avocado",

    # Tubers
    "potato": "potato",
    "potatoes": "potato",
    "russet potato": "potato",
    "russet potatoes": "potato",
    "yukon gold potato": "potato",
    "yukon gold potatoes": "potato",
    "red potato": "potato",
    "red potatoes": "potato",
    "sweet potato": "sweet potato",
    "sweet potatoes": "sweet potato",
    "yam": "sweet potato",
    "yams": "sweet potato",

    # Legumes
    "chickpea": "chickpea",
    "chickpeas": "chickpea",
    "garbanzo": "chickpea",
    "garbanzo bean": "chickpea",
    "garbanzo beans": "chickpea",
    "canned chickpeas": "chickpea",
    "green pea": "green pea",
    "green peas": "green pea",
    "pea": "green pea",
    "peas": "green pea",
    "frozen peas": "green pea",
    "sweet peas": "green pea",
    "black bean": "black bean",
    "black beans": "black bean",
    "canned black beans": "black bean",
    "kidney bean": "kidney bean",
    "kidney beans": "kidney bean",
    "red kidney beans": "kidney bean",
    "cannellini bean": "cannellini bean",
    "cannellini beans": "cannellini bean",
    "white bean": "cannellini bean",
    "white beans": "cannellini bean",
    "lentil": "lentil",
    "lentils": "lentil",
    "red lentils": "red lentil",
    "brown lentils": "brown lentil",

    # Dairy, Fats & Alternatives
    "egg": "egg",
    "eggs": "egg",
    "large egg": "egg",
    "large eggs": "egg",
    "egg white": "egg white",
    "egg whites": "egg white",
    "egg yolk": "egg yolk",
    "egg yolks": "egg yolk",

    "milk": "milk",
    "whole milk": "milk",
    "cow milk": "milk",
    "skim milk": "milk",
    "2% milk": "milk",
    "low fat milk": "milk",
    "buttermilk": "buttermilk",
    "heavy cream": "heavy cream",
    "heavy whipping cream": "heavy cream",
    "double cream": "heavy cream",
    "whipping cream": "heavy cream",
    "sour cream": "sour cream",
    "greek yogurt": "greek yogurt",
    "plain greek yogurt": "greek yogurt",
    "yogurt": "yogurt",
    "yoghurt": "yogurt",

    "coconut milk": "coconut milk",
    "canned coconut milk": "coconut milk",
    "coconut cream": "coconut cream",
    "almond milk": "almond milk",
    "oat milk": "oat milk",
    "soy milk": "soy milk",

    "butter": "butter",
    "unsalted butter": "butter",
    "salted butter": "butter",
    "peanut butter": "peanut butter",
    "creamy peanut butter": "peanut butter",
    "almond butter": "almond butter",

    # Cheeses
    "parmesan": "parmesan",
    "parmesan cheese": "parmesan",
    "parmigiano": "parmesan",
    "parmigiano reggiano": "parmesan",
    "pecorino": "pecorino",
    "pecorino romano": "pecorino",
    "cheddar": "cheddar",
    "cheddar cheese": "cheddar",
    "sharp cheddar": "cheddar",
    "mozzarella": "mozzarella",
    "mozzarella cheese": "mozzarella",
    "fresh mozzarella": "mozzarella",
    "shredded mozzarella": "mozzarella",
    "feta": "feta",
    "feta cheese": "feta",
    "ricotta": "ricotta",
    "ricotta cheese": "ricotta",
    "cream cheese": "cream cheese",

    # Oils & Vinegars
    "olive oil": "olive oil",
    "extra virgin olive oil": "olive oil",
    "evoo": "olive oil",
    "vegetable oil": "vegetable oil",
    "canola oil": "canola oil",
    "sunflower oil": "sunflower oil",
    "sesame oil": "sesame oil",
    "toasted sesame oil": "sesame oil",
    "coconut oil": "coconut oil",
    "balsamic vinegar": "balsamic vinegar",
    "red wine vinegar": "red wine vinegar",
    "white wine vinegar": "white wine vinegar",
    "apple cider vinegar": "apple cider vinegar",
    "rice vinegar": "rice vinegar",
    "white vinegar": "white vinegar",

    # Grains, Pasta & Starches
    "flour": "flour",
    "all purpose flour": "flour",
    "all-purpose flour": "flour",
    "plain flour": "flour",
    "white flour": "flour",
    "wheat flour": "wheat flour",
    "bread flour": "bread flour",
    "cornstarch": "cornstarch",
    "corn starch": "cornstarch",
    "corn flour": "cornstarch",
    "sweet corn": "corn",
    "corn": "corn",
    "corn kernels": "corn",
    "canned corn": "corn",
    "rice": "rice",
    "white rice": "white rice",
    "jasmine rice": "jasmine rice",
    "basmati rice": "basmati rice",
    "brown rice": "brown rice",
    "spaghetti": "spaghetti",
    "pasta": "pasta",
    "penne": "penne",
    "rigatoni": "rigatoni",
    "linguine": "linguine",
    "fettuccine": "fettuccine",
    "bread": "bread",
    "white bread": "bread",
    "sliced bread": "bread",
    "sourdough bread": "sourdough bread",
    "tortilla": "tortilla",
    "tortillas": "tortilla",
    "flour tortilla": "tortilla",
    "flour tortillas": "tortilla",
    "corn tortilla": "corn tortilla",
    "corn tortillas": "corn tortilla",
    "oats": "oats",
    "rolled oats": "oats",
    "quick oats": "oats",
    "bread crumbs": "bread crumbs",
    "breadcrumbs": "bread crumbs",
    "panko": "panko",
    "panko breadcrumbs": "panko",

    # Leaveners & Condiments
    "baking powder": "baking powder",
    "baking soda": "baking soda",
    "sodium bicarbonate": "baking soda",
    "active dry yeast": "yeast",
    "instant yeast": "yeast",
    "yeast": "yeast",
    "salt": "salt",
    "sea salt": "salt",
    "kosher salt": "salt",
    "table salt": "salt",
    "sugar": "sugar",
    "granulated sugar": "sugar",
    "white sugar": "sugar",
    "brown sugar": "brown sugar",
    "light brown sugar": "brown sugar",
    "powdered sugar": "powdered sugar",
    "icing sugar": "powdered sugar",
    "honey": "honey",
    "maple syrup": "maple syrup",
    "soy sauce": "soy sauce",
    "soya sauce": "soy sauce",
    "shoyu": "soy sauce",
    "tamari": "tamari",
    "worcestershire sauce": "worcestershire sauce",
    "dijon mustard": "dijon mustard",
    "yellow mustard": "mustard",
    "mustard": "mustard",
    "mayonnaise": "mayonnaise",
    "mayo": "mayonnaise",
    "ketchup": "ketchup",
    "sriracha": "sriracha",
    "hot sauce": "hot sauce",

    # Meats & Seafood
    "chicken breast": "chicken breast",
    "chicken breasts": "chicken breast",
    "boneless skinless chicken breast": "chicken breast",
    "boneless chicken breast": "chicken breast",
    "fresh chicken breast": "chicken breast",
    "chicken thigh": "chicken thigh",
    "chicken thighs": "chicken thigh",
    "boneless chicken thigh": "chicken thigh",
    "ground chicken": "ground chicken",
    "ground turkey": "ground turkey",
    "ground beef": "ground beef",
    "minced beef": "ground beef",
    "beef mince": "ground beef",
    "beef steak": "beef steak",
    "steak": "beef steak",
    "pork chop": "pork chop",
    "pork chops": "pork chop",
    "bacon": "bacon",
    "pancetta": "pancetta",
    "guanciale": "guanciale",
    "shrimp": "shrimp",
    "prawns": "shrimp",
    "salmon": "salmon",
    "salmon fillet": "salmon",
    "salmon fillets": "salmon",
    "tuna": "tuna",
    "canned tuna": "canned tuna",
    "tofu": "tofu",
    "firm tofu": "tofu",
    "extra firm tofu": "tofu",

    # Fruits & Citrus
    "lemon": "lemon",
    "lemons": "lemon",
    "lemon juice": "lemon juice",
    "fresh lemon juice": "lemon juice",
    "lime": "lime",
    "limes": "lime",
    "lime juice": "lime juice",
    "apple": "apple",
    "apples": "apple",
    "banana": "banana",
    "bananas": "banana",
}

# Collision Guards: Substrings that must NEVER match generic parent terms
COLLISION_GUARDS = [
    # (Distinct item, Prohibited generic/different match)
    ("black pepper", "bell pepper"),
    ("bell pepper", "black pepper"),
    ("black pepper", "chili pepper"),
    ("peanut butter", "butter"),
    ("almond butter", "butter"),
    ("apple butter", "butter"),
    ("coconut milk", "milk"),
    ("almond milk", "milk"),
    ("soy milk", "milk"),
    ("oat milk", "milk"),
    ("eggplant", "egg"),
    ("sweet potato", "potato"),
    ("cornstarch", "corn"),
    ("baking powder", "baking soda"),
    ("baking soda", "baking powder"),
    ("chickpea", "green pea"),
    ("green pea", "chickpea"),
]

def normalize_ingredient_name(name: str) -> str:
    """
    Normalizes an ingredient name into a canonical lowercase culinary token.
    Strips noise words (diced, organic, fresh) unless they form a guarded compound.
    """
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower().strip())
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    # Direct match in alias map
    if cleaned in ALIAS_MAP:
        return ALIAS_MAP[cleaned]

    # Strip superficial noise words if not part of a guarded phrase
    noise_prefixes = [
        "organic ", "fresh ", "raw ", "diced ", "chopped ", "minced ",
        "sliced ", "grated ", "shredded ", "crushed ", "whole ", "pure ",
        "dry ", "dried ", "frozen ", "canned ", "boneless ", "skinless "
    ]
    candidate = cleaned
    for prefix in noise_prefixes:
        if candidate.startswith(prefix):
            stripped = candidate[len(prefix):].strip()
            # Do not strip if it would break a guarded compound
            if stripped and stripped in ALIAS_MAP:
                return ALIAS_MAP[stripped]
            candidate = stripped

    if candidate in ALIAS_MAP:
        return ALIAS_MAP[candidate]

    # Plural stemming fallback
    tokens = candidate.split()
    stemmed_tokens = []
    for t in tokens:
        if t.endswith('ies') and len(t) > 4:
            stemmed_tokens.append(t[:-3] + 'y')
        elif t.endswith('es') and len(t) > 3 and not t.endswith(('ches', 'shes')):
            stemmed_tokens.append(t[:-2])
        elif t.endswith('s') and len(t) > 3 and not t.endswith(('ss', 'us', 'is')):
            stemmed_tokens.append(t[:-1])
        else:
            stemmed_tokens.append(t)
    
    stemmed = " ".join(stemmed_tokens)
    if stemmed in ALIAS_MAP:
        return ALIAS_MAP[stemmed]

    return candidate or cleaned

def ingredients_match(req_name: str, pantry_name: str) -> bool:
    """
    Checks if a recipe required ingredient matches a pantry ingredient name.
    Strictly adheres to collision guards to prevent incorrect food mergers.
    """
    norm_req = normalize_ingredient_name(req_name)
    norm_pan = normalize_ingredient_name(pantry_name)

    # 1. Exact canonical equality
    if norm_req == norm_pan:
        return True

    # 2. Collision guards: ensure distinct foods never merge
    for guard_a, guard_b in COLLISION_GUARDS:
        if (norm_req == guard_a and norm_pan == guard_b) or (norm_req == guard_b and norm_pan == guard_a):
            return False
        if guard_a in norm_req and norm_pan == guard_b:
            return False
        if guard_a in norm_pan and norm_req == guard_b:
            return False

    # 3. Guard against single-word generic subset matching guarded compound
    # e.g., req="butter" vs pantry="peanut butter" -> FALSE
    if norm_req == "butter" and "peanut butter" in norm_pan:
        return False
    if norm_req == "milk" and any(alt in norm_pan for alt in ["coconut milk", "almond milk", "soy milk", "oat milk"]):
        return False
    if norm_req == "egg" and "eggplant" in norm_pan:
        return False
    if norm_req == "potato" and "sweet potato" in norm_pan:
        return False
    if norm_req == "corn" and "cornstarch" in norm_pan:
        return False

    # 4. Token subset / inclusion match
    if norm_req in norm_pan or norm_pan in norm_req:
        return True

    req_tokens = set(norm_req.split())
    pan_tokens = set(norm_pan.split())
    common = req_tokens.intersection(pan_tokens)
    ignore_words = {"fresh", "ground", "chopped", "diced", "organic", "dried", "powder", "whole", "sliced"}
    significant_common = common - ignore_words
    return len(significant_common) > 0


# --- Freshness States & Date Semantics ---
def calculate_freshness_state(
    expiry: Optional[date],
    reference_date: Optional[date] = None
) -> Tuple[Optional[int], str, str]:
    """
    Calculates freshness status and human-readable label with consistent date-only semantics.
    Calendar dates are organizational reminders, not certified food-safety guarantees.

    States:
    - 'no_date' ("No date")
    - 'date_passed' ("Date passed")
    - 'due_today' ("Due today")
    - 'due_within_three_days' ("Due within 3 days")
    - 'later' ("Later")
    """
    if expiry is None:
        return None, "no_date", "No date"

    today = reference_date or date.today()
    days = (expiry - today).days

    if days < 0:
        return days, "date_passed", "Date passed"
    elif days == 0:
        return 0, "due_today", "Due today"
    elif days <= 3:
        return days, "due_within_three_days", "Due within 3 days"
    else:
        return days, "later", "Later"


# --- Sample Pantry Starter Kit ---
def get_sample_pantry_items(ref_date: Optional[date] = None) -> List[dict]:
    """
    Returns a rich, balanced starter kit of pantry essentials across multiple categories.
    Dates are computed relative to reference date.
    """
    today = ref_date or date.today()
    return [
        {
            "name": "Eggs",
            "category": "Dairy & Eggs",
            "quantity": 12.0,
            "unit": "pcs",
            "location": "Fridge",
            "expiry_date": today + timedelta(days=7),
        },
        {
            "name": "Garlic",
            "category": "Produce",
            "quantity": 8.0,
            "unit": "cloves",
            "location": "Pantry",
            "expiry_date": None,
        },
        {
            "name": "Roma Tomatoes",
            "category": "Produce",
            "quantity": 4.0,
            "unit": "pcs",
            "location": "Counter",
            "expiry_date": today + timedelta(days=2),  # due within 3 days
        },
        {
            "name": "Baby Spinach",
            "category": "Produce",
            "quantity": 200.0,
            "unit": "g",
            "location": "Fridge",
            "expiry_date": today,  # due today!
        },
        {
            "name": "Extra Virgin Olive Oil",
            "category": "Pantry & Grains",
            "quantity": 500.0,
            "unit": "ml",
            "location": "Pantry",
            "expiry_date": None,
        },
        {
            "name": "Boneless Chicken Breast",
            "category": "Meat & Seafood",
            "quantity": 500.0,
            "unit": "g",
            "location": "Fridge",
            "expiry_date": today + timedelta(days=3),  # due within 3 days
        },
        {
            "name": "Spaghetti",
            "category": "Pantry & Grains",
            "quantity": 500.0,
            "unit": "g",
            "location": "Pantry",
            "expiry_date": today + timedelta(days=180),  # later
        },
        {
            "name": "Whole Milk",
            "category": "Dairy & Eggs",
            "quantity": 1000.0,
            "unit": "ml",
            "location": "Fridge",
            "expiry_date": today + timedelta(days=6),  # later
        },
        {
            "name": "Yellow Onions",
            "category": "Produce",
            "quantity": 3.0,
            "unit": "pcs",
            "location": "Pantry",
            "expiry_date": today + timedelta(days=14),  # later
        },
        {
            "name": "Canned Chickpeas",
            "category": "Canned Goods",
            "quantity": 2.0,
            "unit": "cans",
            "location": "Pantry",
            "expiry_date": today + timedelta(days=365),  # later
        },
        {
            "name": "Parmesan Cheese",
            "category": "Dairy & Eggs",
            "quantity": 150.0,
            "unit": "g",
            "location": "Fridge",
            "expiry_date": today + timedelta(days=21),  # later
        },
        {
            "name": "Fine Sea Salt",
            "category": "Spices & Seasonings",
            "quantity": 500.0,
            "unit": "g",
            "location": "Pantry",
            "expiry_date": None,
        },
        {
            "name": "Black Peppercorns",
            "category": "Spices & Seasonings",
            "quantity": 60.0,
            "unit": "g",
            "location": "Pantry",
            "expiry_date": None,
        },
        {
            "name": "Soy Sauce",
            "category": "Condiments",
            "quantity": 250.0,
            "unit": "ml",
            "location": "Pantry",
            "expiry_date": None,
        },
    ]
