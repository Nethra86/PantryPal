import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Copy,
  Edit2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { GroceryItem, MovePurchasedItemIn } from '../../types';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { EmptyGroceryIllustration } from '../illustrations/EmptyIllustrations';

interface GroceryViewProps {
  items: GroceryItem[];
  onToggleItem: (id: number) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onAddItem: (item: Partial<GroceryItem>) => Promise<void>;
  onEditItem?: (id: number, item: Partial<GroceryItem>) => Promise<void>;
  onMoveToPantry: () => Promise<void>;
  onMoveToPantryExplicit?: (items: MovePurchasedItemIn[]) => Promise<void>;
  onClearPurchased: () => Promise<void>;
  onShowToast?: (type: 'success' | 'info' | 'error' | 'warning', message: string) => void;
}

export const GroceryView: React.FC<GroceryViewProps> = ({
  items,
  onToggleItem,
  onDeleteItem,
  onAddItem,
  onEditItem,
  onMoveToPantry,
  onMoveToPantryExplicit,
  onClearPurchased,
  onShowToast,
}) => {
  // Quick Add State
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('Produce');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newNotes, setNewNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editQty, setEditQty] = useState('1');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Explicit Move to Pantry Modal State
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveItemsState, setMoveItemsState] = useState<
    Array<{
      shopping_item_id: number;
      name: string;
      quantity: number;
      unit: string;
      location: string;
      expiry_date: string;
      selected: boolean;
    }>
  >([]);
  const [movingLoading, setMovingLoading] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);

  const pendingItems = items.filter((i) => !i.is_purchased);
  const purchasedItems = items.filter((i) => i.is_purchased);

  // Quick Add Handler
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddItem({
        name: newItemName.trim(),
        category: newCategory,
        quantity: parseFloat(newQty) || 1,
        unit: newUnit.trim().toLowerCase() || 'pcs',
        notes: newNotes.trim() || undefined,
      });
      setNewItemName('');
      setNewNotes('');
      setShowNotesField(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: GroceryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category || 'General');
    setEditQty(item.quantity.toString());
    setEditUnit(item.unit || 'pcs');
    setEditNotes(item.notes || '');
  };

  // Save Edit Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      if (onEditItem) {
        await onEditItem(editingItem.id, {
          name: editName.trim(),
          category: editCategory,
          quantity: parseFloat(editQty) || 1,
          unit: editUnit.trim().toLowerCase() || 'pcs',
          notes: editNotes.trim() || undefined,
        });
      }
      setEditingItem(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Copy List to Clipboard
  const handleCopyList = async () => {
    if (items.length === 0) {
      onShowToast?.('info', 'Shopping list is currently empty.');
      return;
    }

    let text = `🛒 PantryPal Shopping List (${items.length} items)\n\n`;

    if (pendingItems.length > 0) {
      text += `--- NEED TO BUY (${pendingItems.length}) ---\n`;
      pendingItems.forEach((i) => {
        text += `[ ] ${i.quantity} ${i.unit} ${i.name} (${i.category})`;
        if (i.notes) text += ` - Note: ${i.notes}`;
        if (i.review_warning) text += ` [⚠️ ${i.review_warning}]`;
        text += '\n';
      });
      text += '\n';
    }

    if (purchasedItems.length > 0) {
      text += `--- PURCHASED (${purchasedItems.length}) ---\n`;
      purchasedItems.forEach((i) => {
        text += `[x] ${i.quantity} ${i.unit} ${i.name} (${i.category})\n`;
      });
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2500);
      onShowToast?.('success', 'Shopping list copied to clipboard!');
    } catch {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedRecently(true);
        setTimeout(() => setCopiedRecently(false), 2500);
        onShowToast?.('success', 'Shopping list copied to clipboard!');
      } catch {
        onShowToast?.('info', 'Shopping list formatted for copy.');
      }
    }
  };

  // Open Explicit Move to Pantry Modal
  const handleOpenMoveModal = () => {
    if (purchasedItems.length === 0) return;

    const initial = purchasedItems.map((p) => {
      // Intelligently infer storage location based on category
      let defaultLoc = 'Pantry';
      const cat = (p.category || '').toLowerCase();
      if (
        cat.includes('produce') ||
        cat.includes('dairy') ||
        cat.includes('meat') ||
        cat.includes('seafood')
      ) {
        defaultLoc = 'Fridge';
      } else if (cat.includes('frozen')) {
        defaultLoc = 'Freezer';
      }

      return {
        shopping_item_id: p.id,
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        location: defaultLoc,
        expiry_date: '',
        selected: true,
      };
    });

    setMoveItemsState(initial);
    setMoveModalOpen(true);
  };

  // Submit Explicit Move to Pantry
  const handleConfirmMoveToPantry = async () => {
    const selected = moveItemsState.filter((i) => i.selected && i.quantity > 0);
    if (selected.length === 0) {
      onShowToast?.('warning', 'Please select at least one item to move.');
      return;
    }

    setMovingLoading(true);
    try {
      if (onMoveToPantryExplicit) {
        await onMoveToPantryExplicit(
          selected.map((item) => ({
            shopping_item_id: item.shopping_item_id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            location: item.location,
            expiry_date: item.expiry_date.trim() ? item.expiry_date : null,
          }))
        );
      } else {
        await onMoveToPantry();
      }
      setMoveModalOpen(false);
    } finally {
      setMovingLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3] flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#56735D] dark:text-emerald-400" />
            <span>Shopping List</span>
          </h2>
          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1">
            {pendingItems.length} item{pendingItems.length === 1 ? '' : 's'} needed for upcoming dishes.
            {items.some((i) => i.needs_review) && (
              <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                • Unit mismatches flagged for your review
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy List Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyList}
            disabled={items.length === 0}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            title="Copy formatted list to clipboard"
          >
            {copiedRecently ? 'Copied!' : 'Copy List'}
          </Button>

          {purchasedItems.length > 0 && (
            <>
              {/* Explicit Move to Pantry Button */}
              <Button
                variant="primary"
                size="sm"
                isLoading={movingLoading}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={handleOpenMoveModal}
              >
                Move {purchasedItems.length} Bought to Pantry
              </Button>

              {/* Clear Purchased Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onClearPurchased}
                title="Clear all purchased items"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#A33A38] dark:text-[#F87171]" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Form */}
      <form
        onSubmit={handleAdd}
        className="p-3.5 rounded-2xl border border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] shadow-sm flex flex-col gap-2.5"
      >
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add grocery item (e.g. Greek Yogurt, Garlic, Coconut Milk)..."
              className="w-full px-3.5 py-2 rounded-xl bg-transparent text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#56645A] dark:text-[#A3B5AA] focus:outline-none"
            >
              <option>Produce</option>
              <option>Dairy & Eggs</option>
              <option>Meat & Seafood</option>
              <option>Pantry & Grains</option>
              <option>Bakery</option>
              <option>General</option>
            </select>

            <input
              type="number"
              step="any"
              min="0.1"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-14 px-2 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-center text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
            />

            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="px-2 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
            >
              <option value="pcs">pcs</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="cups">cups</option>
              <option value="tbsp">tbsp</option>
              <option value="tsp">tsp</option>
              <option value="cans">can</option>
              <option value="cloves">cloves</option>
              <option value="slices">slices</option>
              <option value="pack">pack</option>
              <option value="oz">oz</option>
              <option value="lbs">lbs</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotesField(!showNotesField)}
              title="Add a note or recipe reference"
              className={showNotesField ? 'bg-[#EBF2EC] dark:bg-[#1D2E22]' : ''}
            >
              Note
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              title="Add to grocery list"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </Button>
          </div>
        </div>

        {showNotesField && (
          <div className="pt-2 border-t border-[#E8E1D3]/60 dark:border-[#23332A]/60 flex items-center gap-2">
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional notes (e.g. Organic, for Sunday Dinner, preferred brand)..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none"
            />
          </div>
        )}
      </form>

      {/* Items Section */}
      <div className="space-y-6">
        {/* Pending Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#56645A] dark:text-[#A3B5AA] uppercase tracking-wider">
              Need to Buy ({pendingItems.length})
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <EmptyState
              title="Your shopping list is clear"
              description="No ingredients currently needed. As you plan recipes or weekly meals with missing items, they will gather here automatically."
              illustration={<EmptyGroceryIllustration />}
            />
          ) : (
            <div className="space-y-2.5">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggleItem(item.id)}
                  className={`rounded-2xl border p-3.5 shadow-sm transition-all cursor-pointer group flex flex-col gap-2 ${
                    item.needs_review
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-[#20180B]/40 hover:border-amber-400'
                      : 'border-[#E8E1D3] dark:border-[#23332A] bg-white dark:bg-[#18221C] hover:border-[#1C3B2B]/40 dark:hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 rounded-lg border border-[#C9C0B3] dark:border-[#384F41] group-hover:border-[#1C3B2B] dark:group-hover:border-emerald-400 flex items-center justify-center shrink-0 transition-colors">
                        {/* Unchecked */}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-[#1D2420] dark:text-[#F2F5F3] group-hover:text-[#1C3B2B] dark:group-hover:text-emerald-400 transition-colors truncate">
                            {item.name}
                          </p>
                          {item.needs_review && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              Review Needed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-semibold text-[#1C3B2B] dark:text-emerald-400">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#FAF7F2] dark:bg-[#141C16] text-[#87968B] border border-[#E8E1D3] dark:border-[#25362C]">
                            {item.category}
                          </span>
                          {item.recipe_source_id && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#FDF6EC] text-[#B46A1B] dark:bg-[#342410] dark:text-[#F59E0B]">
                              From Recipe
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-xs text-[#56645A] dark:text-[#A3B5AA] italic truncate max-w-xs">
                              “{item.notes}”
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit Button */}
                      <button
                        onClick={(e) => handleOpenEdit(item, e)}
                        className="p-1.5 text-[#87968B] hover:text-[#1C3B2B] dark:hover:text-emerald-400 hover:bg-[#EBF2EC] dark:hover:bg-[#1D2E22] rounded-lg transition-colors"
                        title="Edit grocery item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        className="p-1.5 text-[#87968B] hover:text-[#A33A38] dark:hover:text-[#F87171] hover:bg-[#FBF0EF] dark:hover:bg-[#2A1717] rounded-lg transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Review Warning Banner if Incompatible Units */}
                  {item.needs_review && item.review_warning && (
                    <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>{item.review_warning}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchased Items */}
        {purchasedItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#87968B] uppercase tracking-wider">
                Marked as Purchased ({purchasedItems.length})
              </span>
              <span className="text-[11px] text-[#87968B]">
                Ready to transfer into kitchen stock
              </span>
            </div>

            <div className="space-y-2">
              {purchasedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onToggleItem(item.id)}
                  className="rounded-2xl border border-[#EAE3D6] dark:border-[#223026] bg-[#FAF7F2]/60 dark:bg-[#151F19]/60 p-3.5 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-[#1C3B2B] text-white dark:bg-emerald-500 dark:text-[#062415] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#87968B] line-through truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#87968B]">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="text-[10px] text-[#87968B]">
                          • {item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleOpenEdit(item, e)}
                      className="p-1.5 text-[#87968B] hover:text-[#1C3B2B] dark:hover:text-emerald-400 rounded-lg transition-colors"
                      title="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="p-1.5 text-[#87968B] hover:text-[#A33A38] dark:hover:text-[#F87171] rounded-lg transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Grocery Item Modal */}
      {editingItem && (
        <Dialog
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Edit Shopping Item: ${editingItem.name}`}
          description="Update quantity, unit, department, or shopping notes."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                Item Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                >
                  <option>Produce</option>
                  <option>Dairy & Eggs</option>
                  <option>Meat & Seafood</option>
                  <option>Pantry & Grains</option>
                  <option>Bakery</option>
                  <option>General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                  Unit
                </label>
                <select
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                >
                  <option value="pcs">pcs</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="cups">cups</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                  <option value="cans">can</option>
                  <option value="cloves">cloves</option>
                  <option value="slices">slices</option>
                  <option value="pack">pack</option>
                  <option value="oz">oz</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#56645A] dark:text-[#A3B5AA] mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes or recipe references..."
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-[#141C16] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Explicit Move Purchased Items to Pantry Modal */}
      {moveModalOpen && (
        <Dialog
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          title="Move Purchased Items to Pantry"
          description="Specify quantity, unit, storage location, and optional expiration date before updating your inventory."
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
              All items are saved atomically in a database transaction to prevent partial updates.
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {moveItemsState.map((itm, idx) => (
                <div
                  key={itm.shopping_item_id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    itm.selected
                      ? 'border-[#E8E1D3] dark:border-[#23332A] bg-[#FAF7F2]/60 dark:bg-[#152019]'
                      : 'border-transparent bg-gray-50/50 dark:bg-gray-900/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itm.selected}
                        onChange={(e) => {
                          const updated = [...moveItemsState];
                          updated[idx].selected = e.target.checked;
                          setMoveItemsState(updated);
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-bold text-[#1D2420] dark:text-[#F2F5F3]">
                        {itm.name}
                      </span>
                    </label>

                    <span className="text-[11px] font-medium text-[#87968B]">
                      Item #{idx + 1}
                    </span>
                  </div>

                  {itm.selected && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                      {/* Quantity */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#87968B] mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          required
                          value={itm.quantity}
                          onChange={(e) => {
                            const updated = [...moveItemsState];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setMoveItemsState(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#87968B] mb-1">
                          Unit
                        </label>
                        <select
                          value={itm.unit}
                          onChange={(e) => {
                            const updated = [...moveItemsState];
                            updated[idx].unit = e.target.value;
                            setMoveItemsState(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                        >
                          <option value="pcs">pcs</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="cups">cups</option>
                          <option value="tbsp">tbsp</option>
                          <option value="tsp">tsp</option>
                          <option value="cans">can</option>
                          <option value="cloves">cloves</option>
                          <option value="slices">slices</option>
                          <option value="pack">pack</option>
                          <option value="oz">oz</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>

                      {/* Storage Location */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#87968B] mb-1">
                          Location
                        </label>
                        <select
                          value={itm.location}
                          onChange={(e) => {
                            const updated = [...moveItemsState];
                            updated[idx].location = e.target.value;
                            setMoveItemsState(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none font-medium"
                        >
                          <option value="Fridge">Fridge 🧊</option>
                          <option value="Pantry">Pantry 🥫</option>
                          <option value="Freezer">Freezer ❄️</option>
                          <option value="Counter">Counter 🍎</option>
                        </select>
                      </div>

                      {/* Optional Expiry Date */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#87968B] mb-1">
                          Expiry (Opt.)
                        </label>
                        <input
                          type="date"
                          value={itm.expiry_date}
                          onChange={(e) => {
                            const updated = [...moveItemsState];
                            updated[idx].expiry_date = e.target.value;
                            setMoveItemsState(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E1410] border border-[#E8E1D3] dark:border-[#23332A] text-xs text-[#1D2420] dark:text-[#F2F5F3] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E8E1D3] dark:border-[#23332A]">
              <span className="text-xs text-[#87968B]">
                {moveItemsState.filter((i) => i.selected).length} of {moveItemsState.length} item(s) selected
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMoveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={movingLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleConfirmMoveToPantry}
                >
                  Confirm & Stock Pantry
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
