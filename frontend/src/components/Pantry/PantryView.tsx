import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ListPlus,
  Trash2,
  Clock,
  MapPin,
  AlertTriangle,
  Minus,
  Edit2,
  Sparkles,
  Info,
  Layers,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { PantryItem } from '../../types';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { EmptyPantryIllustration } from '../illustrations/EmptyIllustrations';

interface PantryViewProps {
  items: PantryItem[];
  onAddItem: () => void;
  onBatchAdd: () => void;
  onUpdateQuantity: (id: number, delta: number) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onEditItem: (item: PantryItem) => void;
  onLoadSamplePantry?: () => Promise<void>;
}

const CATEGORIES = [
  'All',
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

const LOCATIONS = ['All', 'Fridge', 'Pantry', 'Freezer', 'Counter'];

export const PantryView: React.FC<PantryViewProps> = ({
  items,
  onAddItem,
  onBatchAdd,
  onUpdateQuantity,
  onDeleteItem,
  onEditItem,
  onLoadSamplePantry,
}) => {
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [freshnessFilter, setFreshnessFilter] = useState('All');
  const [sortBy, setSortBy] = useState('expiry_asc');
  const [search, setSearch] = useState('');

  // Delete confirmation dialog state
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sample pantry loading state
  const [loadingSample, setLoadingSample] = useState(false);

  // Grouping detection for multiple batches
  const batchCountsByName = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const key = (item.normalized_name || item.name).toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [items]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        if (selectedLocation !== 'All' && item.location !== selectedLocation) return false;
        if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

        // Freshness filter matching all 5 required states + legacy aliases
        if (freshnessFilter !== 'All') {
          const status = item.freshness_status;
          if (freshnessFilter === 'due_today' && status !== 'due_today') return false;
          if (
            freshnessFilter === 'due_within_three_days' &&
            status !== 'due_within_three_days' &&
            status !== 'expiring_soon'
          )
            return false;
          if (
            freshnessFilter === 'date_passed' &&
            status !== 'date_passed' &&
            status !== 'expired'
          )
            return false;
          if (
            freshnessFilter === 'later' &&
            status !== 'later' &&
            status !== 'fresh'
          )
            return false;
          if (freshnessFilter === 'no_date' && status !== 'no_date') return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = item.name.toLowerCase().includes(q);
          const matchNorm = item.normalized_name?.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          const matchLoc = item.location.toLowerCase().includes(q);
          if (!matchName && !matchNorm && !matchCat && !matchLoc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'quantity_desc') {
          return b.quantity - a.quantity;
        }
        if (sortBy === 'quantity_asc') {
          return a.quantity - b.quantity;
        }
        if (sortBy === 'recent') {
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        }
        if (sortBy === 'expiry_desc') {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return b.expiry_date.localeCompare(a.expiry_date);
        }
        // default: expiry_asc (soonest first, nulls last)
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return a.expiry_date.localeCompare(b.expiry_date);
      });
  }, [items, selectedLocation, selectedCategory, freshnessFilter, search, sortBy]);

  // Counts for summary banner
  const dueTodayCount = items.filter((i) => i.freshness_status === 'due_today').length;
  const dueWithin3DaysCount = items.filter(
    (i) => i.freshness_status === 'due_within_three_days' || i.freshness_status === 'expiring_soon'
  ).length;
  const datePassedCount = items.filter(
    (i) => i.freshness_status === 'date_passed' || i.freshness_status === 'expired'
  ).length;

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleSampleClick = async () => {
    if (!onLoadSamplePantry) return;
    setLoadingSample(true);
    try {
      await onLoadSamplePantry();
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-left">
      {/* Top Banner / Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-[#1D2420] dark:text-[#F2F5F3]">
              Pantry Inventory
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#EBF2EC] dark:bg-[#182B1E] text-[#1C3B2B] dark:text-emerald-400 border border-[#C8D9CB] dark:border-[#2B4734]">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <p className="text-xs text-[#56645A] dark:text-[#A3B5AA] mt-1.5 flex flex-wrap items-center gap-2">
            {dueTodayCount > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                {dueTodayCount} due today
              </span>
            )}
            {dueWithin3DaysCount > 0 && (
              <span className="font-semibold text-[#B46A1B] dark:text-[#F59E0B] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900">
                {dueWithin3DaysCount} due within 3 days
              </span>
            )}
            {datePassedCount > 0 && (
              <span className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                {datePassedCount} past date
              </span>
            )}
            {dueTodayCount === 0 && dueWithin3DaysCount === 0 && datePassedCount === 0 && (
              <span className="text-[#56735D] dark:text-[#8DB896] font-medium">
                All inventory is fresh and ready for cooking.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {onLoadSamplePantry && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-amber-500" />}
              onClick={handleSampleClick}
              isLoading={loadingSample}
              title="Add a starter kit of common essentials without overwriting your existing records"
            >
              Load Sample Pantry
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<ListPlus className="w-4 h-4 text-[#56735D] dark:text-emerald-400" />}
            onClick={onBatchAdd}
          >
            Batch Add
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            onClick={onAddItem}
          >
            Add Item
          </Button>
        </div>
      </div>

      {/* Food Safety & Date Reminder Notice Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F6F2EA] dark:bg-[#16221A] border border-[#E5DDD0] dark:border-[#24362B] text-xs text-[#56645A] dark:text-[#9FB1A5]">
        <Info className="w-4 h-4 text-[#56735D] dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#1D2420] dark:text-[#E2ECE5]">
            Date-Only Semantics & Freshness Guide:{' '}
          </span>
          Dates are calendar reminders to prioritize meal decisions and minimize food waste, not certified food-safety guarantees. Always inspect appearance, aroma, and texture before preparation. Past-date items are excluded from recipe matching by default.
        </div>
      </div>

      {/* Filter Row */}
      <div className="space-y-3">
        {/* Storage Location Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {LOCATIONS.map((loc) => {
            const count = loc === 'All' ? items.length : items.filter((i) => i.location === loc).length;
            const active = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  active
                    ? 'bg-[#1C3B2B] text-white border-[#1C3B2B] dark:bg-emerald-500 dark:text-[#062415] dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-[#16201A] text-[#56645A] dark:text-[#A3B5AA] border-[#E2DBD0] dark:border-[#25362C] hover:border-[#1C3B2B]'
                }`}
              >
                <span>{loc}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    active
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                      : 'bg-[#FAF7F2] dark:bg-[#121914] text-[#87968B]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Freshness Filter, and Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-6 w-full">
            <Search className="w-4 h-4 text-[#87968B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredient by name or alias (e.g. scallion, capsicum)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E2DBD0] dark:border-[#25362C] bg-white dark:bg-[#16201A] text-xs text-[#1D2420] dark:text-[#F2F5F3] placeholder-[#87968B] focus:outline-none focus:border-[#1C3B2B] dark:focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={freshnessFilter}
              onChange={(e) => setFreshnessFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-xs font-medium text-[#56645A] dark:text-[#A3B5AA] focus:outline-none"
            >
              <option value="All">All Freshness</option>
              <option value="due_today">Due Today</option>
              <option value="due_within_three_days">Due Within 3 Days</option>
              <option value="later">Later</option>
              <option value="no_date">No Date Set</option>
              <option value="date_passed">Date Passed</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#16201A] border border-[#E2DBD0] dark:border-[#25362C] text-xs font-medium text-[#56645A] dark:text-[#A3B5AA] focus:outline-none pr-8"
              >
                <option value="expiry_asc">Expiry: Soonest First</option>
                <option value="expiry_desc">Expiry: Latest First</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="quantity_desc">Quantity: High to Low</option>
                <option value="quantity_asc">Quantity: Low to High</option>
                <option value="recent">Recently Added / Updated</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-[#87968B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#1C3B2B] text-white dark:bg-emerald-500 dark:text-[#062415]'
                  : 'bg-[#F2ECE2] dark:bg-[#1A251E] text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Items */}
      {filteredAndSortedItems.length === 0 ? (
        <EmptyState
          title="No items found in this section"
          description="Your kitchen shelf is clear. Add items manually, import via text, or load the sample pantry starter kit."
          illustration={<EmptyPantryIllustration />}
          action={{
            label: 'Add Ingredient',
            onClick: onAddItem,
            icon: <Plus className="w-4 h-4" />,
          }}
          secondaryAction={{
            label: 'Batch Import',
            onClick: onBatchAdd,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedItems.map((item) => {
            const status = item.freshness_status;
            const isDueToday = status === 'due_today';
            const isDueWithin3 = status === 'due_within_three_days' || status === 'expiring_soon';
            const isDatePassed = status === 'date_passed' || status === 'expired';
            const isLater = status === 'later' || status === 'fresh';

            const normKey = (item.normalized_name || item.name).toLowerCase();
            const hasMultipleBatches = (batchCountsByName[normKey] || 0) > 1;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white dark:bg-[#18221C] p-4 shadow-[0_4px_16px_-4px_rgba(35,45,38,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_24px_-4px_rgba(35,45,38,0.1)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
                  isDueToday
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20'
                    : isDueWithin3
                    ? 'border-[#F3DCBD] dark:border-[#4D3315] bg-[#FDF6EC]/40 dark:bg-[#20180F]/40'
                    : isDatePassed
                    ? 'border-[#F1CECC] dark:border-[#522727] bg-[#FBF0EF]/40 dark:bg-[#2A1717]/40'
                    : 'border-[#E8E1D3] dark:border-[#23332A]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-base font-bold text-[#1D2420] dark:text-[#F2F5F3] leading-snug truncate">
                          {item.name}
                        </h4>
                        {hasMultipleBatches && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            title="Multiple batches of this ingredient exist with different expiry dates"
                          >
                            <Layers className="w-2.5 h-2.5" />
                            Batch
                          </span>
                        )}
                      </div>

                      {/* Normalized canonical name alias tag if distinct */}
                      {item.normalized_name &&
                        item.normalized_name.toLowerCase() !== item.name.toLowerCase() && (
                          <div className="text-[10px] text-[#56735D] dark:text-[#8DB896] font-medium mt-0.5">
                            matches: <span className="font-semibold">{item.normalized_name}</span>
                          </div>
                        )}

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF7F2] dark:bg-[#141C16] text-[#56645A] dark:text-[#A3B5AA] border border-[#E8E1D3] dark:border-[#25362C]">
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-[#87968B] dark:text-[#6D8074]">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1 rounded-lg text-[#87968B] hover:text-[#1D2420] dark:hover:text-white hover:bg-[#F2ECE2] dark:hover:bg-[#223026] transition-colors"
                        title="Edit item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1 rounded-lg text-[#87968B] hover:text-[#A33A38] dark:hover:text-[#F87171] hover:bg-[#FBF0EF] dark:hover:bg-[#2A1717] transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Freshness Status Badge */}
                  <div className="mt-3">
                    {item.expiry_date ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          isDueToday
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
                            : isDueWithin3
                            ? 'bg-[#FDF6EC] text-[#B46A1B] border border-[#F3DCBD] dark:bg-[#342410] dark:text-[#F59E0B] dark:border-[#4D3315]'
                            : isDatePassed
                            ? 'bg-[#FBF0EF] text-[#A33A38] border border-[#F1CECC] dark:bg-[#341616] dark:text-[#F87171] dark:border-[#522727]'
                            : isLater
                            ? 'bg-[#EBF2EC] text-[#1C3B2B] border border-[#C8D9CB] dark:bg-[#182B1E] dark:text-emerald-400 dark:border-[#2B4734]'
                            : 'bg-[#FAF7F2] text-[#56645A] border border-[#E8E1D3] dark:bg-[#17201A] dark:text-[#9FB1A5] dark:border-[#24362B]'
                        }`}
                      >
                        {isDueToday || isDueWithin3 || isDatePassed ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isDueToday
                            ? 'Due today!'
                            : isDatePassed
                            ? `Date passed (${Math.abs(item.days_until_expiry || 0)}d ago)`
                            : isDueWithin3
                            ? `Due in ${item.days_until_expiry}d (Rescue!)`
                            : item.days_until_expiry !== null && item.days_until_expiry !== undefined
                            ? `Due in ${item.days_until_expiry}d`
                            : 'Later'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#87968B] dark:text-[#6D8074]">
                        <Calendar className="w-3 h-3" />
                        No expiry set
                      </span>
                    )}

                    {item.expiry_date && (
                      <div className="text-[10px] text-[#87968B] dark:text-[#6D8074] mt-1">
                        Best-before: <span className="font-medium text-[#56645A] dark:text-[#A3B5AA]">{item.expiry_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="mt-4 pt-3 border-t border-[#F2EDE4] dark:border-[#1F2C24] flex items-center justify-between">
                  <span className="text-xs text-[#56645A] dark:text-[#A3B5AA] font-medium">Quantity</span>
                  <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#131B16] px-2 py-1 rounded-xl border border-[#E2DBD0] dark:border-[#25362C]">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) {
                          // Ask for delete confirmation if dropping to 0
                          setItemToDelete(item);
                        } else {
                          onUpdateQuantity(item.id, -1);
                        }
                      }}
                      className="p-1 rounded text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-[#1D2420] dark:text-[#F2F5F3] min-w-[3rem] text-center">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="p-1 rounded text-[#56645A] dark:text-[#A3B5AA] hover:text-[#1D2420] dark:hover:text-white transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <Dialog
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          title="Remove Ingredient from Pantry"
          description="Confirm removal of this batch from your kitchen inventory."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FBF0EF] dark:bg-[#2A1717] border border-[#F1CECC] dark:border-[#522727] text-xs text-[#A33A38] dark:text-[#F87171] leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="font-bold underline">{itemToDelete.name}</strong> ({itemToDelete.quantity}{' '}
              {itemToDelete.unit}) stored in <span className="font-semibold">{itemToDelete.location}</span>?
              {itemToDelete.expiry_date && (
                <div className="mt-1 text-[11px] opacity-90">
                  Best-before date: {itemToDelete.expiry_date}
                </div>
              )}
            </div>

            <p className="text-xs text-[#56645A] dark:text-[#A3B5AA]">
              This action will remove this batch record immediately. Recipe matching percentages and grocery lists will update automatically.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE3D6] dark:border-[#223026]">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={handleConfirmDelete}
                isLoading={deleting}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
