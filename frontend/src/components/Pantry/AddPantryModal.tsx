import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { PantryItem } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface AddPantryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Partial<PantryItem>) => Promise<void>;
  editItem?: PantryItem | null;
}

const COMMON_PRESETS = [
  { name: 'Garlic', category: 'Produce', unit: 'cloves', location: 'Pantry' },
  { name: 'Eggs', category: 'Dairy & Eggs', unit: 'pcs', location: 'Fridge' },
  { name: 'Chicken Breast', category: 'Meat & Seafood', unit: 'g', location: 'Fridge' },
  { name: 'Baby Spinach', category: 'Produce', unit: 'g', location: 'Fridge' },
  { name: 'Olive Oil', category: 'Pantry & Grains', unit: 'ml', location: 'Pantry' },
  { name: 'Whole Milk', category: 'Dairy & Eggs', unit: 'ml', location: 'Fridge' },
  { name: 'Yellow Onion', category: 'Produce', unit: 'pcs', location: 'Pantry' },
  { name: 'Parmesan', category: 'Dairy & Eggs', unit: 'g', location: 'Fridge' },
  { name: 'Spaghetti', category: 'Pantry & Grains', unit: 'g', location: 'Pantry' },
  { name: 'Canned Tomatoes', category: 'Canned Goods', unit: 'cans', location: 'Pantry' },
];

const CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Pantry & Grains',
  'Canned Goods',
  'Condiments',
  'Spices & Seasonings',
  'Bakery',
  'Beverages',
  'Other',
];

const UNITS = [
  'pcs', 'g', 'kg', 'ml', 'l', 'cups', 'tbsp', 'tsp', 'cloves', 'cans',
  'slices', 'pack', 'bottle', 'bag', 'box', 'head', 'bunch', 'pinch', 'stalk', 'oz', 'lbs'
];
const LOCATIONS = ['Fridge', 'Pantry', 'Freezer', 'Counter'];

export const AddPantryModal: React.FC<AddPantryModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  editItem,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Produce');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [location, setLocation] = useState('Fridge');
  const [expiryDate, setExpiryDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setCategory(editItem.category);
      setQuantity(editItem.quantity.toString());
      setUnit(editItem.unit);
      setLocation(editItem.location || editItem.storage_location || 'Fridge');
      setExpiryDate(editItem.expiry_date || '');
    } else {
      setName('');
      setCategory('Produce');
      setQuantity('1');
      setUnit('pcs');
      setLocation('Fridge');
      setExpiryDate('');
    }
    setError(null);
  }, [editItem, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please provide an ingredient name.');
      return;
    }
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Quantity must be a positive number greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        name: cleanName,
        category,
        quantity: parsedQty,
        unit,
        location,
        storage_location: location,
        expiry_date: expiryDate ? expiryDate : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save pantry item.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setName(preset.name);
    setCategory(preset.category);
    setUnit(preset.unit);
    setLocation(preset.location);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Pantry Item' : 'Add Ingredient to Pantry'}
      description="Keep your kitchen stock accurate for instant recipe matching and waste rescue."
      maxWidth="md"
    >
      {/* Quick Presets */}
      {!editItem && (
        <div className="space-y-2 pb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#56735D] dark:text-[#8DB896] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Common Pantry Staples</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-[#152019] text-[#56645A] dark:text-[#A3B5AA] border border-[#E8E1D3] dark:border-[#25362C] hover:border-[#1C3B2B] hover:text-[#1C3B2B] transition-colors"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Ingredient Name *"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Boneless Chicken Breast"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <Select
            label="Storage Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={LOCATIONS.map((l) => ({ value: l, label: l }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity *"
            type="number"
            step="any"
            min="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Select
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
        </div>

        <div>
          <Input
            label="Expiry / Best-Before Date (Optional)"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            helperText="Calendar date (YYYY-MM-DD). Dates are reminders to reduce waste, not certified food-safety guarantees."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE3D6] dark:border-[#223026]">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={loading}>
            {editItem ? 'Update Item' : 'Add to Pantry'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
