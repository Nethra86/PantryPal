import json
from datetime import date, timedelta
from app.database import SessionLocal, Base, engine
from app import models
from app.auth import hash_password

SAMPLE_RECIPES = [
    {
        "id": 1,
        "title": "Creamy Garlic Tuscan Chicken",
        "description": "Tender chicken breasts in a rich garlic, sun-dried tomato, and spinach cream sauce. A restaurant-worthy dinner ready in 30 minutes.",
        "cuisine": "Italian",
        "meal_type": "Dinner",
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 480,
        "dietary_tags": "Gluten-Free,High-Protein,Keto",
        "allergens": "Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Season chicken breasts generously with salt, black pepper, and Italian herbs.",
            "Heat 2 tbsp olive oil in a large skillet over medium-high heat. Sear chicken 5 minutes per side until golden brown and cooked through. Remove and set aside.",
            "In the same skillet, melt butter and sauté minced garlic for 1 minute until fragrant.",
            "Pour in heavy cream and chicken broth; bring to a gentle simmer for 3 minutes.",
            "Stir in grated parmesan, sun-dried tomatoes, and fresh baby spinach until wilted and sauce is velvety.",
            "Return chicken to the skillet, spoon sauce over the top, and serve warm with crusty bread or pasta."
        ]),
        "ingredients": [
            {"ingredient_name": "Chicken Breast", "quantity": 500, "unit": "g", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 4, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Heavy Cream", "quantity": 1, "unit": "cup", "is_optional": False},
            {"ingredient_name": "Spinach", "quantity": 100, "unit": "g", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 50, "unit": "g", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 1, "unit": "tbsp", "is_optional": True}
        ]
    },
    {
        "id": 2,
        "title": "Classic Roman Spaghetti Carbonara",
        "description": "Authentic Italian carbonara with velvety eggs, crisp pancetta or bacon, sharp pecorino, and cracked black pepper.",
        "cuisine": "Italian",
        "meal_type": "Dinner",
        "prep_time_minutes": 10,
        "cook_time_minutes": 15,
        "servings": 2,
        "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 520,
        "dietary_tags": "High-Protein",
        "allergens": "Gluten, Dairy, Eggs",
        "source": "sample",
        "instructions": json.dumps([
            "Bring a large pot of salted water to a rolling boil and cook spaghetti until al dente.",
            "In a bowl, whisk whole eggs, extra egg yolk, freshly grated parmesan cheese, and plenty of freshly cracked black pepper.",
            "In a wide skillet, cook diced bacon or pancetta over medium heat until crispy. Turn off the heat.",
            "Transfer hot drained pasta directly into the skillet, tossing to coat in the bacon fat.",
            "Allow the skillet to cool slightly for 30 seconds, then pour in egg mixture while stirring rapidly to create a glossy, creamy sauce without scrambling.",
            "Garnish with extra black pepper and parmesan. Serve immediately!"
        ]),
        "ingredients": [
            {"ingredient_name": "Spaghetti", "quantity": 250, "unit": "g", "is_optional": False},
            {"ingredient_name": "Eggs", "quantity": 3, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 60, "unit": "g", "is_optional": False},
            {"ingredient_name": "Bacon", "quantity": 100, "unit": "g", "is_optional": False},
            {"ingredient_name": "Black Pepper", "quantity": 1, "unit": "tsp", "is_optional": False}
        ]
    },
    {
        "id": 3,
        "title": "Golden Turmeric Red Lentil Dahl",
        "description": "Fragrant, comforting vegan curry infused with coconut milk, ginger, cumin, and garlic. Rich in plant protein and gut-healing spices.",
        "cuisine": "Indian",
        "meal_type": "Dinner",
        "prep_time_minutes": 10,
        "cook_time_minutes": 25,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 340,
        "dietary_tags": "Vegetarian,Vegan,Gluten-Free,High-Protein,Dairy-Free",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Rinse red lentils under cold water until water runs clear.",
            "Heat coconut oil or olive oil in a medium saucepan. Sauté diced onion, minced garlic, and grated ginger until soft and aromatic.",
            "Add ground turmeric, cumin, and garam masala; toast spices for 45 seconds.",
            "Stir in red lentils, canned diced tomatoes, coconut milk, and 2 cups of water.",
            "Bring to a boil, then reduce heat and simmer gently for 20 minutes until lentils are soft and creamy.",
            "Finish with fresh lemon juice and baby spinach. Serve with fluffy basmati rice."
        ]),
        "ingredients": [
            {"ingredient_name": "Red Lentils", "quantity": 200, "unit": "g", "is_optional": False},
            {"ingredient_name": "Coconut Milk", "quantity": 1, "unit": "cup", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Canned Tomatoes", "quantity": 1, "unit": "can", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Spinach", "quantity": 50, "unit": "g", "is_optional": True}
        ]
    },
    {
        "id": 4,
        "title": "Zesty Mediterranean Chickpea Shakshuka",
        "description": "Poached eggs gently nested in a spiced stew of crushed tomatoes, sweet bell peppers, cumin, smoked paprika, and creamy feta.",
        "cuisine": "Mediterranean",
        "meal_type": "Breakfast",
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings": 3,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 290,
        "dietary_tags": "Vegetarian,Gluten-Free,High-Protein",
        "allergens": "Eggs, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Warm olive oil in an oven-safe skillet over medium heat.",
            "Add diced bell pepper and sliced onion; cook until tender and slightly caramelized, about 6 minutes.",
            "Add minced garlic, cumin, smoked paprika, and a pinch of chili flakes; stir for 1 minute.",
            "Pour in crushed canned tomatoes and simmer for 10 minutes until sauce thickens.",
            "Make 3 to 4 small wells in the sauce using a wooden spoon. Crack an egg into each well.",
            "Cover the skillet and cook over low heat for 5 to 7 minutes until egg whites are set and yolks remain runny.",
            "Top with crumbled feta cheese and chopped fresh parsley. Serve warm."
        ]),
        "ingredients": [
            {"ingredient_name": "Eggs", "quantity": 4, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Canned Tomatoes", "quantity": 1, "unit": "can", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Feta Cheese", "quantity": 60, "unit": "g", "is_optional": True}
        ]
    },
    {
        "id": 5,
        "title": "Crispy Garlic Butter Salmon & Greens",
        "description": "Pan-seared salmon with a golden crispy crust bathed in rich garlic herb butter alongside sautéed spinach and lemon.",
        "cuisine": "American",
        "meal_type": "Dinner",
        "prep_time_minutes": 8,
        "cook_time_minutes": 12,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 460,
        "dietary_tags": "Gluten-Free,High-Protein,Keto,Pescatarian",
        "allergens": "Fish, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Pat salmon fillets completely dry with a paper towel and season with salt and pepper.",
            "Heat olive oil in a non-stick skillet over medium-high heat until shimmering.",
            "Place salmon skin-side down; press gently for 10 seconds. Sear for 5 minutes until crispy.",
            "Flip salmon, add butter, minced garlic, and lemon juice to the pan.",
            "Baste salmon with melted butter for 3-4 minutes until cooked to preferred doneness.",
            "Toss fresh spinach directly into the pan juices for 1 minute until wilted. Serve immediately."
        ]),
        "ingredients": [
            {"ingredient_name": "Salmon Fillet", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Spinach", "quantity": 150, "unit": "g", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False}
        ]
    },
    {
        "id": 6,
        "title": "Avocado & Poached Egg Sourdough Toast",
        "description": "Creamy mashed avocado with lime, chili flakes, and perfectly soft-poached eggs on toasted artisan bread.",
        "cuisine": "American",
        "meal_type": "Breakfast",
        "prep_time_minutes": 5,
        "cook_time_minutes": 5,
        "servings": 1,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 380,
        "dietary_tags": "Vegetarian,High-Protein",
        "allergens": "Gluten, Eggs",
        "source": "sample",
        "instructions": json.dumps([
            "Toast artisan bread or sourdough slices until golden and sturdy.",
            "Mash ripe avocado with a squeeze of fresh lemon, pinch of sea salt, and black pepper.",
            "Bring water with 1 tbsp vinegar to a gentle simmer in a small pot, swirl to make a whirlpool, and slide in cracked eggs to poach for 3 minutes.",
            "Spread avocado generously over the warm toast.",
            "Top with poached eggs, a sprinkle of chili flakes, and a drizzle of olive oil."
        ]),
        "ingredients": [
            {"ingredient_name": "Bread", "quantity": 2, "unit": "slices", "is_optional": False},
            {"ingredient_name": "Avocado", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Eggs", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tsp", "is_optional": True},
            {"ingredient_name": "Lemon", "quantity": 0.5, "unit": "pcs", "is_optional": True}
        ]
    },
    {
        "id": 7,
        "title": "Quick Vegetable Fried Rice",
        "description": "Savory fried rice packed with scrambled egg, colorful vegetables, garlic, and rich soy sauce. Perfect for using leftover rice!",
        "cuisine": "Asian",
        "meal_type": "Lunch",
        "prep_time_minutes": 10,
        "cook_time_minutes": 10,
        "servings": 3,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 390,
        "dietary_tags": "Vegetarian,Dairy-Free",
        "allergens": "Eggs, Soy",
        "source": "sample",
        "instructions": json.dumps([
            "Heat 1 tbsp oil in a wok or large frying pan over high heat.",
            "Whisk eggs lightly, pour into the wok, scramble quickly until soft, and remove to a plate.",
            "Add remaining oil, sauté chopped onion, garlic, and diced bell pepper for 3 minutes.",
            "Add cooked chilled rice, breaking up clumps with a spatula over high heat for 3-4 minutes.",
            "Drizzle soy sauce over the rice, tossing rapidly to coat evenly.",
            "Fold in scrambled eggs and sliced scallions. Serve piping hot!"
        ]),
        "ingredients": [
            {"ingredient_name": "Rice", "quantity": 300, "unit": "g", "is_optional": False},
            {"ingredient_name": "Eggs", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Soy Sauce", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": True},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False}
        ]
    },
    {
        "id": 8,
        "title": "Fluffy Golden Buttermilk Pancakes",
        "description": "Cloud-soft, golden brown breakfast pancakes with melted butter, maple syrup, and fresh berries.",
        "cuisine": "American",
        "meal_type": "Breakfast",
        "prep_time_minutes": 10,
        "cook_time_minutes": 10,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 310,
        "dietary_tags": "Vegetarian",
        "allergens": "Gluten, Dairy, Eggs",
        "source": "sample",
        "instructions": json.dumps([
            "Whisk flour, baking powder, a pinch of salt, and 1 tbsp sugar in a large bowl.",
            "In a separate bowl, whisk milk, egg, and melted butter.",
            "Pour wet ingredients into dry ingredients; stir gently until just combined (lumps are okay!).",
            "Heat a non-stick griddle over medium heat and lightly butter.",
            "Pour 1/4 cup batter per pancake. Cook until bubbles form on surface, then flip and cook 2 minutes more until golden.",
            "Stack high and top with butter and maple syrup."
        ]),
        "ingredients": [
            {"ingredient_name": "Flour", "quantity": 200, "unit": "g", "is_optional": False},
            {"ingredient_name": "Milk", "quantity": 250, "unit": "ml", "is_optional": False},
            {"ingredient_name": "Eggs", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 30, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 9,
        "title": "Thai Basil Stir-Fried Tofu & Peppers",
        "description": "Crispy golden tofu cubes tossed with crisp bell peppers, sweet onion, garlic, and savory soy sauce over steamed jasmine rice.",
        "cuisine": "Asian",
        "meal_type": "Dinner",
        "prep_time_minutes": 10,
        "cook_time_minutes": 12,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 360,
        "dietary_tags": "Vegetarian,Vegan,Dairy-Free,High-Protein",
        "allergens": "Soy",
        "source": "sample",
        "instructions": json.dumps([
            "Press tofu with paper towels and cube into 1-inch pieces.",
            "Heat 1 tbsp oil in a skillet over high heat. Fry tofu cubes until crisp and golden on all sides, about 6 minutes. Remove to a plate.",
            "In the same pan, heat remaining oil and sauté minced garlic, sliced onions, and bell peppers for 3 minutes until tender-crisp.",
            "Return tofu to the pan and pour in soy sauce. Toss vigorously over high heat to coat.",
            "Serve immediately over warm rice."
        ]),
        "ingredients": [
            {"ingredient_name": "Tofu", "quantity": 300, "unit": "g", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Soy Sauce", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Rice", "quantity": 200, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 10,
        "title": "Spanish Chilled Tomato Gazpacho",
        "description": "Refreshing Andalusian summer soup made with ripe tomatoes, bell pepper, cucumber, garlic, extra virgin olive oil, and fresh lemon.",
        "cuisine": "Mediterranean",
        "meal_type": "Lunch",
        "prep_time_minutes": 12,
        "cook_time_minutes": 0,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 180,
        "dietary_tags": "Vegetarian,Vegan,Gluten-Free,Dairy-Free",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Roughly chop bell peppers, onion, and garlic.",
            "Place canned tomatoes, chopped vegetables, olive oil, and fresh lemon juice into a blender.",
            "Blend on high speed until completely smooth and emulsified into a velvety coral soup.",
            "Season with sea salt and freshly ground black pepper.",
            "Chill in the refrigerator for at least 30 minutes before serving. Drizzle with extra olive oil."
        ]),
        "ingredients": [
            {"ingredient_name": "Canned Tomatoes", "quantity": 2, "unit": "cans", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 1, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 3, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 1, "unit": "pcs", "is_optional": False}
        ]
    },
    {
        "id": 11,
        "title": "Crispy Cheesy Pepper & Onion Quesadilla",
        "description": "Toasted golden crust filled with gooey melted cheese, sautéed sweet peppers, and caramelized onions.",
        "cuisine": "Mexican",
        "meal_type": "Lunch",
        "prep_time_minutes": 8,
        "cook_time_minutes": 10,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 380,
        "dietary_tags": "Vegetarian",
        "allergens": "Gluten, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Heat 1 tsp olive oil in a skillet over medium heat and sauté sliced bell pepper and onion for 5 minutes until soft and caramelized.",
            "Butter one side of bread slices.",
            "Layer parmesan cheese and the sautéed pepper mix between slices.",
            "Cook in a hot non-stick skillet for 3-4 minutes per side until the exterior is crunchy golden and cheese is molten.",
            "Slice diagonally and serve immediately."
        ]),
        "ingredients": [
            {"ingredient_name": "Bread", "quantity": 4, "unit": "slices", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 80, "unit": "g", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 15, "unit": "g", "is_optional": True}
        ]
    },
    {
        "id": 12,
        "title": "Lemon Garlic Herb Chicken & Rice Bowl",
        "description": "Wholesome Mediterranean meal prep bowl featuring juicy grilled chicken breast, fluffy seasoned rice, tender spinach, and lemon zest.",
        "cuisine": "Mediterranean",
        "meal_type": "Lunch",
        "prep_time_minutes": 10,
        "cook_time_minutes": 18,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 420,
        "dietary_tags": "Gluten-Free,High-Protein,Dairy-Free",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Cook rice in a small pot with water and a pinch of salt until tender and fluffy.",
            "Season diced chicken breast with black pepper, minced garlic, and olive oil.",
            "Sear chicken in a hot skillet for 6-8 minutes until golden and thoroughly cooked.",
            "Squeeze fresh lemon juice over the chicken and toss in fresh baby spinach for 1 minute until tender.",
            "Assemble bowls with warm rice base topped with lemon chicken and wilted spinach."
        ]),
        "ingredients": [
            {"ingredient_name": "Chicken Breast", "quantity": 400, "unit": "g", "is_optional": False},
            {"ingredient_name": "Rice", "quantity": 200, "unit": "g", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Spinach", "quantity": 80, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 13,
        "title": "Creamy Parmesan Garlic Risotto",
        "description": "Velvety Italian short-grain rice simmered with aromatics, finished with sweet butter and aged parmesan cheese.",
        "cuisine": "Italian",
        "meal_type": "Dinner",
        "prep_time_minutes": 5,
        "cook_time_minutes": 25,
        "servings": 3,
        "difficulty": "Medium",
        "image_url": "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 390,
        "dietary_tags": "Vegetarian,Gluten-Free",
        "allergens": "Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Melt 1 tbsp butter with olive oil in a wide heavy pot. Sauté finely minced onion and garlic until translucent.",
            "Add rice and toast grains for 2 minutes until slightly translucent around edges.",
            "Add warm water or broth one ladle at a time, stirring steadily until each addition is absorbed before adding more.",
            "Cook for 18-20 minutes until rice is creamy yet al dente.",
            "Remove from heat, vigorously beat in remaining cold butter and grated parmesan cheese. Serve immediately!"
        ]),
        "ingredients": [
            {"ingredient_name": "Rice", "quantity": 250, "unit": "g", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 30, "unit": "g", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 60, "unit": "g", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False}
        ]
    },
    {
        "id": 14,
        "title": "Sweet Savory Soy Glazed Peppers & Rice",
        "description": "Tender blistered sweet bell peppers glazed in a caramelized garlic soy reduction served over jasmine rice.",
        "cuisine": "Asian",
        "meal_type": "Dinner",
        "prep_time_minutes": 8,
        "cook_time_minutes": 15,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 330,
        "dietary_tags": "Vegetarian,Vegan,Dairy-Free,Gluten-Free",
        "allergens": "Soy",
        "source": "sample",
        "instructions": json.dumps([
            "Cook rice according to package directions.",
            "Slice bell peppers into wide strips.",
            "Heat olive oil in a skillet over high heat. Add peppers and sear for 5 minutes until edges are blistered and tender.",
            "Turn down heat, add minced garlic and soy sauce, letting the sauce bubble and glaze the peppers for 2 minutes.",
            "Spoon glazed peppers and pan juices over warm rice."
        ]),
        "ingredients": [
            {"ingredient_name": "Bell Pepper", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Soy Sauce", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Rice", "quantity": 200, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 15,
        "title": "Tuscan Tomato & Spinach Minestrone",
        "description": "Rustic Italian vegetable soup with simmered tomatoes, tender spaghetti bits, fresh garlic, spinach, and virgin olive oil.",
        "cuisine": "Italian",
        "meal_type": "Lunch",
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 260,
        "dietary_tags": "Vegetarian,Vegan,Dairy-Free",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Heat olive oil in a soup pot over medium heat. Sauté diced onion and minced garlic for 3 minutes until aromatic.",
            "Add canned tomatoes and 3 cups of water; bring to a rolling simmer.",
            "Break spaghetti into 1-inch pieces and drop directly into simmering broth.",
            "Cook for 10 minutes until pasta is tender.",
            "Stir in fresh baby spinach during the last 2 minutes until wilted. Season with salt and black pepper."
        ]),
        "ingredients": [
            {"ingredient_name": "Canned Tomatoes", "quantity": 1, "unit": "can", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Spinach", "quantity": 100, "unit": "g", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Spaghetti", "quantity": 100, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 16,
        "title": "Sizzling Pepper & Bacon Breakfast Skillet",
        "description": "Crisp smoky bacon sautéed with tender bell peppers, sweet onions, cracked pepper, and garlic butter.",
        "cuisine": "American",
        "meal_type": "Breakfast",
        "prep_time_minutes": 8,
        "cook_time_minutes": 12,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 370,
        "dietary_tags": "Gluten-Free,High-Protein,Keto",
        "allergens": "Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Dice bacon into 1/2-inch pieces and place in a cold skillet. Bring heat to medium and render until crispy, about 6 minutes.",
            "Remove bacon with a slotted spoon, leaving 1 tbsp of fat in the skillet.",
            "Add diced bell peppers and sliced onions; sauté for 4-5 minutes until tender and browned.",
            "Stir in minced garlic, butter, and black pepper for 1 minute.",
            "Toss bacon back into the skillet and serve piping hot."
        ]),
        "ingredients": [
            {"ingredient_name": "Bacon", "quantity": 150, "unit": "g", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 15, "unit": "g", "is_optional": False},
            {"ingredient_name": "Black Pepper", "quantity": 1, "unit": "tsp", "is_optional": False}
        ]
    },
    {
        "id": 17,
        "title": "Moroccan Spiced Vegetable & Tomato Tagine",
        "description": "Slow-simmered Moroccan stew with crushed tomatoes, sweet bell peppers, onions, fragrant garlic, and a hint of fresh lemon.",
        "cuisine": "Middle Eastern",
        "meal_type": "Dinner",
        "prep_time_minutes": 10,
        "cook_time_minutes": 25,
        "servings": 3,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 240,
        "dietary_tags": "Vegetarian,Vegan,Gluten-Free,Dairy-Free",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Heat olive oil in a wide pot or Dutch oven over medium heat.",
            "Add chopped onion, garlic, and bell peppers. Cook for 5 minutes until soft.",
            "Pour in canned tomatoes and 1 cup of water. Season with salt, cumin, and black pepper.",
            "Simmer gently uncovered for 15-20 minutes until stew is thick and fragrant.",
            "Finish with fresh lemon juice and serve with bread or grains."
        ]),
        "ingredients": [
            {"ingredient_name": "Canned Tomatoes", "quantity": 1, "unit": "can", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 1, "unit": "pcs", "is_optional": False}
        ]
    },
    {
        "id": 18,
        "title": "Classic French Herb & Cheese Omelette",
        "description": "Tender, silky French rolled omelette made with fresh farm eggs, rich butter, freshly cracked black pepper, and aged parmesan.",
        "cuisine": "French",
        "meal_type": "Breakfast",
        "prep_time_minutes": 5,
        "cook_time_minutes": 6,
        "servings": 1,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 320,
        "dietary_tags": "Vegetarian,Gluten-Free,High-Protein",
        "allergens": "Eggs, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Whisk eggs vigorously with black pepper and a pinch of salt until completely uniform and frothy.",
            "Melt butter in an 8-inch non-stick skillet over medium-low heat until foamy.",
            "Pour in eggs and stir rapidly in small circles with a silicone spatula while shaking the skillet.",
            "When eggs are softly set but still glossy on top, sprinkle with grated parmesan.",
            "Tilt pan and roll omelette onto a warm plate. Brush top with a touch of butter."
        ]),
        "ingredients": [
            {"ingredient_name": "Eggs", "quantity": 3, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 15, "unit": "g", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 30, "unit": "g", "is_optional": False},
            {"ingredient_name": "Black Pepper", "quantity": 0.5, "unit": "tsp", "is_optional": False}
        ]
    },
    {
        "id": 19,
        "title": "Sesame Garlic Soy Lo Mein Noodles",
        "description": "Tender pasta tossed in a savory garlic soy glaze with sweet bell peppers and tender onions. Ready in 15 minutes!",
        "cuisine": "Asian",
        "meal_type": "Lunch",
        "prep_time_minutes": 8,
        "cook_time_minutes": 10,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 360,
        "dietary_tags": "Vegetarian,Vegan,Dairy-Free",
        "allergens": "Gluten, Soy",
        "source": "sample",
        "instructions": json.dumps([
            "Cook spaghetti in salted boiling water until al dente. Drain and set aside.",
            "Heat olive oil in a wok or deep skillet over high heat.",
            "Add thinly sliced onions, bell peppers, and minced garlic; stir-fry for 3 minutes until tender-crisp.",
            "Toss in cooked pasta and pour in soy sauce.",
            "Stir-fry noodles rapidly over high heat for 2 minutes until sauce is completely absorbed and noodles are glistening."
        ]),
        "ingredients": [
            {"ingredient_name": "Spaghetti", "quantity": 200, "unit": "g", "is_optional": False},
            {"ingredient_name": "Soy Sauce", "quantity": 3, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 3, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Bell Pepper", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False}
        ]
    },
    {
        "id": 20,
        "title": "Creamy Lemon Garlic Butter Dip & Toast",
        "description": "Warm crusty artisan toast served with a zesty whipped lemon garlic butter spread and grated parmesan.",
        "cuisine": "Mediterranean",
        "meal_type": "Breakfast",
        "prep_time_minutes": 5,
        "cook_time_minutes": 5,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 280,
        "dietary_tags": "Vegetarian",
        "allergens": "Gluten, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Toast bread slices until golden brown and crunchy.",
            "In a small bowl, soften butter and stir in minced garlic, fresh lemon juice, and grated parmesan.",
            "Spread warm garlic lemon butter generously over toast slices.",
            "Cut into fingers and serve immediately."
        ]),
        "ingredients": [
            {"ingredient_name": "Bread", "quantity": 4, "unit": "slices", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 30, "unit": "g", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 2, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 20, "unit": "g", "is_optional": False}
        ]
    },
    {
        "id": 21,
        "title": "Pan-Seared Lemon Garlic Chicken Breasts",
        "description": "Succulent chicken breasts pan-seared with golden crust, braised with fresh lemon, garlic cloves, and cracked pepper.",
        "cuisine": "Mediterranean",
        "meal_type": "Dinner",
        "prep_time_minutes": 8,
        "cook_time_minutes": 14,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 390,
        "dietary_tags": "Gluten-Free,High-Protein,Dairy-Free,Keto",
        "allergens": "None reported",
        "source": "sample",
        "instructions": json.dumps([
            "Season chicken breasts with black pepper and salt.",
            "Heat olive oil in a skillet over medium-high heat. Sear chicken for 5 minutes until deeply browned.",
            "Flip chicken, add smashed garlic cloves, and squeeze juice of 2 fresh lemons directly into pan.",
            "Lower heat to medium, cover, and let chicken simmer in pan juices for 7 minutes until cooked through.",
            "Rest for 3 minutes before slicing and spooning pan juices over the meat."
        ]),
        "ingredients": [
            {"ingredient_name": "Chicken Breast", "quantity": 450, "unit": "g", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 4, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Lemon", "quantity": 2, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 2, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Black Pepper", "quantity": 1, "unit": "tsp", "is_optional": False}
        ]
    },
    {
        "id": 22,
        "title": "Rich Creamy Tomato Garlic Bisque",
        "description": "Smooth, luxurious tomato soup enriched with velvety heavy cream, sautéed onions, garlic, and butter.",
        "cuisine": "American",
        "meal_type": "Dinner",
        "prep_time_minutes": 8,
        "cook_time_minutes": 18,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 290,
        "dietary_tags": "Vegetarian,Gluten-Free",
        "allergens": "Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Melt butter and olive oil in a heavy saucepan. Sauté diced onion and minced garlic until sweet and soft, about 5 minutes.",
            "Add canned tomatoes and 1 cup of water or vegetable stock. Simmer for 10 minutes.",
            "Purée soup with an immersion blender until completely smooth.",
            "Stir in heavy cream and warm gently over low heat for 3 minutes (do not boil).",
            "Season with salt and freshly cracked black pepper. Serve warm."
        ]),
        "ingredients": [
            {"ingredient_name": "Canned Tomatoes", "quantity": 2, "unit": "cans", "is_optional": False},
            {"ingredient_name": "Heavy Cream", "quantity": 1, "unit": "cup", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 4, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Onion", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 25, "unit": "g", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 1, "unit": "tbsp", "is_optional": False}
        ]
    },
    {
        "id": 23,
        "title": "Classic Garlic Spaghetti Aglio e Olio",
        "description": "Beloved Roman classic with tender spaghetti bathed in golden garlic-infused olive oil, aged parmesan, and cracked pepper.",
        "cuisine": "Italian",
        "meal_type": "Dinner",
        "prep_time_minutes": 5,
        "cook_time_minutes": 12,
        "servings": 2,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 410,
        "dietary_tags": "Vegetarian",
        "allergens": "Gluten, Dairy",
        "source": "sample",
        "instructions": json.dumps([
            "Bring salted water to a boil and cook spaghetti until 1 minute before al dente. Reserve 1/2 cup pasta water.",
            "In a wide skillet, warm olive oil and thinly sliced garlic over medium-low heat until pale golden and fragrant (do not burn).",
            "Transfer pasta and 1/4 cup pasta water directly into the garlic oil.",
            "Toss vigorously over medium heat for 2 minutes until oil emulsifies into a glossy sauce coating each strand.",
            "Remove from heat, toss in grated parmesan and cracked black pepper. Serve immediately!"
        ]),
        "ingredients": [
            {"ingredient_name": "Spaghetti", "quantity": 250, "unit": "g", "is_optional": False},
            {"ingredient_name": "Garlic", "quantity": 5, "unit": "cloves", "is_optional": False},
            {"ingredient_name": "Olive Oil", "quantity": 3, "unit": "tbsp", "is_optional": False},
            {"ingredient_name": "Parmesan", "quantity": 40, "unit": "g", "is_optional": False},
            {"ingredient_name": "Black Pepper", "quantity": 1, "unit": "tsp", "is_optional": False}
        ]
    },
    {
        "id": 24,
        "title": "Golden Skillet Cornbread Flatbread",
        "description": "Warm, buttery rustic skillet bread with a crisp golden crust and soft crumb. Ideal companion for soups and stews.",
        "cuisine": "American",
        "meal_type": "Lunch",
        "prep_time_minutes": 8,
        "cook_time_minutes": 15,
        "servings": 4,
        "difficulty": "Easy",
        "image_url": "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=1000&q=80",
        "calories_per_serving": 290,
        "dietary_tags": "Vegetarian",
        "allergens": "Gluten, Dairy, Eggs",
        "source": "sample",
        "instructions": json.dumps([
            "Whisk flour, baking powder, a pinch of salt, and 1 tsp sugar in a bowl.",
            "In a separate bowl, whisk milk, egg, and melted butter.",
            "Combine wet and dry ingredients into a thick batter.",
            "Melt 1 tbsp butter in a cast iron or oven-safe skillet over medium heat.",
            "Pour batter into hot skillet, smooth the top, and cook on stove for 5 minutes, then bake or flip for 10 minutes until golden brown.",
            "Slice into wedges and serve warm with butter."
        ]),
        "ingredients": [
            {"ingredient_name": "Flour", "quantity": 200, "unit": "g", "is_optional": False},
            {"ingredient_name": "Milk", "quantity": 150, "unit": "ml", "is_optional": False},
            {"ingredient_name": "Eggs", "quantity": 1, "unit": "pcs", "is_optional": False},
            {"ingredient_name": "Butter", "quantity": 30, "unit": "g", "is_optional": False}
        ]
    }
]

INITIAL_PANTRY_ITEMS = [
    # Produce
    {"name": "Garlic", "category": "Produce", "quantity": 8.0, "unit": "cloves", "location": "Pantry", "days_offset": 20},
    {"name": "Onion", "category": "Produce", "quantity": 3.0, "unit": "pcs", "location": "Pantry", "days_offset": 14},
    {"name": "Spinach", "category": "Produce", "quantity": 200.0, "unit": "g", "location": "Fridge", "days_offset": 2},  # EXPIRING SOON!
    {"name": "Bell Pepper", "category": "Produce", "quantity": 2.0, "unit": "pcs", "location": "Fridge", "days_offset": 5},
    {"name": "Lemon", "category": "Produce", "quantity": 2.0, "unit": "pcs", "location": "Fridge", "days_offset": 8},
    # Dairy & Eggs
    {"name": "Eggs", "category": "Dairy & Eggs", "quantity": 12.0, "unit": "pcs", "location": "Fridge", "days_offset": 10},
    {"name": "Butter", "category": "Dairy & Eggs", "quantity": 200.0, "unit": "g", "location": "Fridge", "days_offset": 25},
    {"name": "Parmesan", "category": "Dairy & Eggs", "quantity": 120.0, "unit": "g", "location": "Fridge", "days_offset": 18},
    {"name": "Milk", "category": "Dairy & Eggs", "quantity": 500.0, "unit": "ml", "location": "Fridge", "days_offset": 4},
    {"name": "Heavy Cream", "category": "Dairy & Eggs", "quantity": 2.0, "unit": "cup", "location": "Fridge", "days_offset": 5},
    # Pantry & Grains
    {"name": "Olive Oil", "category": "Pantry & Grains", "quantity": 500.0, "unit": "ml", "location": "Pantry", "days_offset": 180},
    {"name": "Spaghetti", "category": "Pantry & Grains", "quantity": 500.0, "unit": "g", "location": "Pantry", "days_offset": 120},
    {"name": "Rice", "category": "Pantry & Grains", "quantity": 1000.0, "unit": "g", "location": "Pantry", "days_offset": 150},
    {"name": "Flour", "category": "Pantry & Grains", "quantity": 800.0, "unit": "g", "location": "Pantry", "days_offset": 90},
    {"name": "Soy Sauce", "category": "Condiments", "quantity": 250.0, "unit": "ml", "location": "Pantry", "days_offset": 200},
    {"name": "Canned Tomatoes", "category": "Canned Goods", "quantity": 3.0, "unit": "cans", "location": "Pantry", "days_offset": 120},
    {"name": "Black Pepper", "category": "Spices & Seasonings", "quantity": 50.0, "unit": "g", "location": "Pantry", "days_offset": 300},
    # Proteins
    {"name": "Bacon", "category": "Meat & Seafood", "quantity": 200.0, "unit": "g", "location": "Fridge", "days_offset": 3},  # EXPIRING SOON!
    {"name": "Chicken Breast", "category": "Meat & Seafood", "quantity": 600.0, "unit": "g", "location": "Fridge", "days_offset": 2}  # EXPIRING SOON!
]

import copy

def seed_initial_data(db_session=None):
    should_close = False
    if db_session is None:
        db = SessionLocal()
        should_close = True
    else:
        db = db_session

    try:
        # Check / create default user
        user = db.query(models.User).filter(models.User.email == "rowan@kitchen.local").first()
        if not user:
            user = models.User(
                email="rowan@kitchen.local",
                name="Chef Rowan",
                hashed_password=hash_password("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Seed or sync all 24 stable recipes
        for r_data in copy.deepcopy(SAMPLE_RECIPES):
            recipe_id = r_data["id"]
            ingredients_data = r_data.pop("ingredients")

            existing_recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
            if existing_recipe:
                # Update attributes to match canonical stable recipes
                for k, v in r_data.items():
                    setattr(existing_recipe, k, v)
                db.flush()
                # Re-sync ingredients
                db.query(models.RecipeIngredient).filter(models.RecipeIngredient.recipe_id == recipe_id).delete()
                for ing_data in ingredients_data:
                    ing = models.RecipeIngredient(recipe_id=recipe_id, **ing_data)
                    db.add(ing)
            else:
                recipe = models.Recipe(**r_data)
                db.add(recipe)
                db.flush()
                for ing_data in ingredients_data:
                    ing = models.RecipeIngredient(recipe_id=recipe.id, **ing_data)
                    db.add(ing)
        db.commit()

        # Check if pantry has items for default user
        pantry_count = db.query(models.PantryItem).filter(models.PantryItem.user_id == user.id).count()
        if pantry_count == 0:
            today = date.today()
            from app.normalization import normalize_ingredient_name
            for p_data in copy.deepcopy(INITIAL_PANTRY_ITEMS):
                days_offset = p_data.pop("days_offset")
                expiry = today + timedelta(days=days_offset)
                pantry_item = models.PantryItem(
                    user_id=user.id,
                    name=p_data["name"],
                    normalized_name=normalize_ingredient_name(p_data["name"]),
                    category=p_data["category"],
                    quantity=p_data["quantity"],
                    unit=p_data["unit"],
                    location=p_data["location"],
                    expiry_date=expiry,
                    is_low_stock=p_data["quantity"] <= 1.0
                )
                db.add(pantry_item)
            db.commit()

        # Check if meal planner has sample
        meal_count = db.query(models.MealPlan).filter(models.MealPlan.user_id == user.id).count()
        if meal_count == 0:
            first_recipe = db.query(models.Recipe).first()
            if first_recipe:
                db.add(models.MealPlan(user_id=user.id, day_of_week="Monday", meal_slot="Dinner", recipe_id=first_recipe.id))
                db.commit()

    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    print("Database seeded successfully with 24 stable recipes!")
