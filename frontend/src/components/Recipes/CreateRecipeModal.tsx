import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (recipe: any) => Promise<void>;
}

export const CreateRecipeModal: React.FC<CreateRecipeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState('American');
  const [mealType, setMealType] = useState('Dinner');
  const [prepTime, setPrepTime] = useState(15);
  const [cookTime, setCookTime] = useState(20);
  const [servings, setServings] = useState(2);
  const [dietaryTags, setDietaryTags] = useState('');

  const [ingredients, setIngredients] = useState<
    { ingredient_name: string; quantity: number; unit: string }[]
  >([{ ingredient_name: '', quantity: 1, unit: 'pcs' }]);

  const [instructionsText, setInstructionsText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { ingredient_name: '', quantity: 1, unit: 'pcs' }]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx: number, field: string, value: any) => {
    const updated = [...ingredients];
    (updated[idx] as any)[field] = value;
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validIngredients = ingredients.filter((i) => i.ingredient_name.trim().length > 0);
    if (validIngredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    const steps = instructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      cuisine,
      meal_type: mealType,
      prep_time_minutes: Number(prepTime),
      cook_time_minutes: Number(cookTime),
      servings: Number(servings),
      instructions: JSON.stringify(steps.length > 0 ? steps : ['Cook and enjoy!']),
      dietary_tags: dietaryTags,
      ingredients: validIngredients,
    };

    setLoading(true);
    try {
      await onCreate(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Recipe"
      description="Add a recipe to your kitchen collection and match it with your pantry stock."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Recipe Title *"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Garden Vegetable Risotto"
        />

        <Textarea
          label="Description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief culinary description of this dish..."
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select
            label="Cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            options={[
              { value: 'Italian', label: 'Italian' },
              { value: 'Mexican', label: 'Mexican' },
              { value: 'Asian', label: 'Asian' },
              { value: 'Mediterranean', label: 'Mediterranean' },
              { value: 'American', label: 'American' },
              { value: 'Indian', label: 'Indian' },
              { value: 'French', label: 'French' },
            ]}
          />

          <Select
            label="Meal Type"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            options={[
              { value: 'Breakfast', label: 'Breakfast' },
              { value: 'Lunch', label: 'Lunch' },
              { value: 'Dinner', label: 'Dinner' },
              { value: 'Snack', label: 'Snack' },
              { value: 'Dessert', label: 'Dessert' },
            ]}
          />

          <Input
            label="Prep (min)"
            type="number"
            min="1"
            value={prepTime}
            onChange={(e) => setPrepTime(Number(e.target.value))}
          />

          <Input
            label="Cook (min)"
            type="number"
            min="1"
            value={cookTime}
            onChange={(e) => setCookTime(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(Number(e.target.value))}
          />

          <Input
            label="Dietary Tags"
            value={dietaryTags}
            onChange={(e) => setDietaryTags(e.target.value)}
            placeholder="Vegetarian, Gluten-Free, High-Protein"
          />
        </div>

        {/* Dynamic Ingredients List */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1D2420] dark:text-[#E2EBE5]">
              Ingredients *
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5 text-[#56735D]" />}
              onClick={handleAddIngredientRow}
            >
              Add Row
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={ing.ingredient_name}
                  onChange={(e) => handleIngredientChange(idx, 'ingredient_name', e.target.value)}
                  placeholder="e.g. Pasta, Garlic, Olive Oil"
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#152019] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-[#1D2420] dark:text-[#F2F5F3]"
                />
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={ing.quantity}
                  onChange={(e) => handleIngredientChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-18 px-3 py-2 rounded-xl bg-white dark:bg-[#152019] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-center text-[#1D2420] dark:text-[#F2F5F3]"
                />
                <input
                  type="text"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                  placeholder="unit"
                  className="w-18 px-3 py-2 rounded-xl bg-white dark:bg-[#152019] border border-[#E2DBD0] dark:border-[#25362C] text-xs text-center text-[#1D2420] dark:text-[#F2F5F3]"
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredientRow(idx)}
                    className="p-1.5 text-[#87968B] hover:text-[#A33A38] rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <Textarea
          label="Preparation Steps (One per line) *"
          rows={4}
          required
          value={instructionsText}
          onChange={(e) => setInstructionsText(e.target.value)}
          placeholder="Step 1: Chop vegetables...&#10;Step 2: Simmer in olive oil for 10 minutes."
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE3D6] dark:border-[#223026]">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={loading}>
            Save Recipe
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
