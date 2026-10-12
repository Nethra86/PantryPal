import React, { useState } from 'react';
import { PantryItem } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchAdd: (items: Partial<PantryItem>[]) => Promise<void>;
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  onBatchAdd,
}) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleParseAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    const lines = rawText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const items: Partial<PantryItem>[] = [];

    for (const line of lines) {
      const match = line.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
      if (match) {
        const qty = parseFloat(match[1]);
        const unit = match[2] || 'pcs';
        const name = match[3];
        items.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: qty,
          unit: unit.toLowerCase(),
          category: 'Pantry & Grains',
          location: 'Pantry',
        });
      } else {
        items.push({
          name: line.charAt(0).toUpperCase() + line.slice(1),
          quantity: 1,
          unit: 'pcs',
          category: 'Other',
          location: 'Pantry',
        });
      }
    }

    if (items.length === 0) return;

    setLoading(true);
    try {
      await onBatchAdd(items);
      onClose();
      setRawText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Import Ingredients"
      description="Quickly paste or type items separated by commas or line breaks."
      maxWidth="md"
    >
      <form onSubmit={handleParseAndSubmit} className="space-y-4">
        <Textarea
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Garlic&#10;12 eggs&#10;500g spaghetti&#10;Olive oil&#10;2 chicken breasts&#10;Baby spinach"
          helperText="Units and quantities (e.g. '500g pasta' or '3 eggs') are automatically extracted."
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE3D6] dark:border-[#223026]">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            disabled={!rawText.trim()}
          >
            Import to Pantry
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
