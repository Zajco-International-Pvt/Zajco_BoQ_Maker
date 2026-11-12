import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import {
  PackageSearch,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  Calendar,
  X,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import type { ItemLibraryProduct } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  saveItemLibraryProduct,
  deleteItemLibraryProduct
} from '../../services/adminService';

interface ItemLibraryModalProps {
  products: ItemLibraryProduct[];
  onRefresh: () => void;
  onClose?: () => void;
}

interface ProductRowProps {
  product: ItemLibraryProduct;
  isCopied: boolean;
  onCopy: (p: ItemLibraryProduct) => void;
  onDelete: (id: string, name: string) => void;
}

// Memoized table row component to prevent unnecessary re-rendering of all rows
const ProductRow = React.memo<ProductRowProps>(({ product: p, isCopied, onCopy, onDelete }) => {
  const eurPrice = Number(p.defaultPriceEUR || 0);
  const sarPrice = Number(p.defaultPriceSAR || 0);
  const profitPct = p.defaultProfitPercentage ?? 15;
  const sellingPrice = p.unitPriceProfitIncl || Number((sarPrice + sarPrice * (profitPct / 100)).toFixed(2));

  return (
    <tr className="hover:bg-slate-800/40 transition-colors group">
      {/* Description & Model */}
      <td className="p-3 max-w-sm">
        <div className="font-semibold text-white leading-relaxed">
          {p.description}
        </div>
        {p.model && (
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Model / Code: <span className="text-blue-300 font-semibold">{p.model}</span>
          </div>
        )}
      </td>

      {/* Brand & System */}
      <td className="p-3 whitespace-nowrap">
        <div className="font-bold text-blue-300">{p.brand || '—'}</div>
        {p.system && (
          <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">
            {p.system}
          </span>
        )}
      </td>

      {/* EUR Price */}
      <td className="p-3 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
        €{eurPrice.toFixed(2)}
      </td>

      {/* SAR Price */}
      <td className="p-3 text-right font-mono text-white font-bold whitespace-nowrap">
        SAR {sarPrice.toFixed(2)}
      </td>

      {/* Profit % & Selling Price */}
      <td className="p-3 text-right font-mono whitespace-nowrap">
        <div className="text-blue-300 font-bold">{profitPct}%</div>
        <div className="text-[10px] text-slate-400">
          Sell: SAR {sellingPrice.toFixed(2)}
        </div>
      </td>

      {/* Source BOQ / Project */}
      <td className="p-3 max-w-xs">
        {p.sourceBoqNumber ? (
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1">
              <FileSpreadsheet className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="font-mono text-blue-300 font-semibold text-[11px]">
                {p.sourceBoqNumber}
              </span>
            </div>
            {p.sourceProjectName && (
              <div className="text-[11px] text-slate-300 font-medium truncate">
                {p.sourceProjectName}
              </div>
            )}
            {p.createdByName && (
              <div className="text-[10px] text-blue-400/90 font-medium flex items-center space-x-1 truncate">
                <User className="w-2.5 h-2.5 flex-shrink-0" />
                <span>By: {p.createdByName}</span>
              </div>
            )}
            {p.sourceDate && (
              <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>{p.sourceDate}</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <span className="inline-block px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 text-[10px] font-semibold">
              Manual Master
            </span>
            {p.createdByName && (
              <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 truncate mt-0.5">
                <User className="w-2.5 h-2.5 flex-shrink-0" />
                <span>By: {p.createdByName}</span>
              </div>
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="p-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center space-x-1.5">
          <button
            type="button"
            onClick={() => onCopy(p)}
            title="Copy specs and prices"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(p.id, p.description)}
            title="Remove from Catalog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export const ItemLibraryModal: React.FC<ItemLibraryModalProps> = ({
  products,
  onRefresh,
  onClose
}) => {
  const { currentUser, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'boq' | 'manual'>('all');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'priceAsc' | 'priceDesc' | 'desc'>('updated');
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination states for lightning-fast rendering
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states for manual product addition
  const [brand, setBrand] = useState('Tunstall');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('Nurse Call');
  const [defaultPriceEUR, setDefaultPriceEUR] = useState(100);
  const [defaultPriceSAR, setDefaultPriceSAR] = useState(500);
  const [defaultProfitPercentage, setDefaultProfitPercentage] = useState(15);

  // Single-pass computation for unique systems and summary statistics
  const { uniqueSystems, boqItemCount, manualItemCount } = useMemo(() => {
    const systems = new Set<string>();
    let boqCount = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.system && p.system.trim()) systems.add(p.system.trim());
      if (p.sourceBoqId) boqCount++;
    }
    return {
      uniqueSystems: Array.from(systems).sort(),
      boqItemCount: boqCount,
      manualItemCount: products.length - boqCount
    };
  }, [products]);

  // Non-blocking deferred search input for ultra-smooth typing
  const deferredSearch = useDeferredValue(searchTerm);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();

    let list = products;
    if (selectedFilter !== 'all' || selectedSystem !== 'all' || q) {
      list = products.filter(p => {
        if (selectedFilter === 'boq' && !p.sourceBoqId) return false;
        if (selectedFilter === 'manual' && p.sourceBoqId) return false;
        if (selectedSystem !== 'all' && (p.system || '').trim() !== selectedSystem) return false;

        if (!q) return true;
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const modelMatch = (p.model || '').toLowerCase().includes(q);
        const brandMatch = (p.brand || '').toLowerCase().includes(q);
        const sysMatch = (p.system || '').toLowerCase().includes(q);
        const boqNumMatch = (p.sourceBoqNumber || '').toLowerCase().includes(q);
        const projMatch = (p.sourceProjectName || '').toLowerCase().includes(q);
        const userMatch = (p.createdByName || '').toLowerCase().includes(q);

        return descMatch || modelMatch || brandMatch || sysMatch || boqNumMatch || projMatch || userMatch;
      });
    }

    if (sortBy === 'priceAsc') {
      return [...list].sort((a, b) => (a.defaultPriceSAR || 0) - (b.defaultPriceSAR || 0));
    }
    if (sortBy === 'priceDesc') {
      return [...list].sort((a, b) => (b.defaultPriceSAR || 0) - (a.defaultPriceSAR || 0));
    }
    if (sortBy === 'desc') {
      return [...list].sort((a, b) => (a.description || '').localeCompare(b.description || ''));
    }
    // Default: newest / recently updated first
    return [...list].sort((a, b) => {
      const dateA = a.updatedAt || a.sourceDate || '';
      const dateB = b.updatedAt || b.sourceDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [products, deferredSearch, selectedFilter, selectedSystem, sortBy]);

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, selectedFilter, selectedSystem, sortBy]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      await saveItemLibraryProduct({
        brand,
        model,
        description: description.trim(),
        system,
        defaultPriceEUR,
        defaultPriceSAR,
        defaultProfitPercentage,
        pricingSource: 'Discounted Listed Price',
        active: true,
        createdBy: userProfile?.uid || currentUser?.uid || '',
        createdByName: userProfile?.name || currentUser?.displayName || 'User'
      });

      setDescription('');
      setModel('');
      setShowAddForm(false);
      setStatusNotice({ type: 'success', message: 'Product added successfully to catalog!' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setStatusNotice({ type: 'error', message: err.message || 'Failed to add product.' });
    }
  };

  const handleDeleteItem = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the Product Catalog?`)) {
      return;
    }

    try {
      await deleteItemLibraryProduct(id);
      setStatusNotice({ type: 'success', message: 'Item removed from catalog.' });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setStatusNotice({ type: 'error', message: 'Failed to remove item: ' + err.message });
    }
  }, [onRefresh]);

  const handleCopyDetails = useCallback((p: ItemLibraryProduct) => {
    const text = `${p.brand ? p.brand + ' ' : ''}${p.model ? p.model + ' - ' : ''}${p.description}\n` +
      `EUR: €${Number(p.defaultPriceEUR || 0).toFixed(2)} | SAR: ${Number(p.defaultPriceSAR || 0).toFixed(2)}` +
      (p.sourceProjectName ? ` | Project: ${p.sourceProjectName} (${p.sourceBoqNumber || ''})` : '') +
      (p.createdByName ? ` | Quoted By: ${p.createdByName}` : '');

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
            <PackageSearch className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <span>Product Catalog & Item Price Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centralized product database and item pricing library.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          <button
            onClick={onRefresh}
            title="Refresh Catalog Data"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Hide Form' : 'Add Product'}</span>
          </button>

          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white font-bold" aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {statusNotice && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${statusNotice.type === 'success'
          ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
          : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
          }`}>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{statusNotice.message}</span>
          </div>
          <button onClick={() => setStatusNotice(null)} className="text-slate-400 hover:text-white text-xs ml-3 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium">Total Catalog Items</div>
          <div className="text-xl font-bold text-white mt-0.5">{products.length}</div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
            <FileSpreadsheet className="w-3 h-3 text-blue-400" />
            <span>From BOQs</span>
          </div>
          <div className="text-xl font-bold text-blue-400 mt-0.5">{boqItemCount}</div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
            <PackageSearch className="w-3 h-3 text-purple-400" />
            <span>Product Master</span>
          </div>
          <div className="text-xl font-bold text-purple-400 mt-0.5">{manualItemCount}</div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-slate-400 font-medium flex items-center space-x-1">
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>Systems Covered</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">{uniqueSystems.length || 1}</div>
        </div>
      </div>

      {/* Add Product Collapsible Form */}
      {showAddForm && (
        <form onSubmit={handleSaveProduct} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Manual Product Master Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Brand (e.g. Tunstall)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Model Code (e.g. 76060550)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="System (e.g. Nurse Call)"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Full Technical Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Price (EUR €)</label>
              <input
                type="number"
                step="0.01"
                value={defaultPriceEUR}
                onChange={(e) => setDefaultPriceEUR(parseFloat(e.target.value) || 0)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Price (SAR)</label>
              <input
                type="number"
                step="0.01"
                value={defaultPriceSAR}
                onChange={(e) => setDefaultPriceSAR(parseFloat(e.target.value) || 0)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Default Profit %</label>
              <input
                type="number"
                value={defaultProfitPercentage}
                onChange={(e) => setDefaultProfitPercentage(parseFloat(e.target.value) || 15)}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-blue-400 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
            >
              Save to Catalog
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search items by name, description, brand, model, project, or BOQ number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills and Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Filter:</span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${selectedFilter === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setSelectedFilter('boq')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${selectedFilter === 'boq'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              From BOQs ({boqItemCount})
            </button>
            <button
              onClick={() => setSelectedFilter('manual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${selectedFilter === 'manual'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              Master Catalog ({manualItemCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {uniqueSystems.length > 0 && (
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Systems</option>
                {uniqueSystems.map(sys => (
                  <option key={sys} value={sys}>{sys}</option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="updated">Recently Updated First</option>
              <option value="priceAsc">Price: Low to High (SAR)</option>
              <option value="priceDesc">Price: High to Low (SAR)</option>
              <option value="desc">Description: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-inner">
        <div className="max-h-[30rem] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="p-3">Item Description & Specifications</th>
                <th className="p-3">Brand / System</th>
                <th className="p-3 text-right">Cost (EUR)</th>
                <th className="p-3 text-right">Cost (SAR)</th>
                <th className="p-3 text-right">Margin / Selling</th>
                <th className="p-3">Source BOQ / Reference</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <PackageSearch className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-400 text-sm">No items found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm
                        ? `No items match "${searchTerm}". Try a different keyword.`
                        : 'Your Product Catalog is currently empty. Use the "Add Product" button above to add items, or save a BOQ.'}
                    </p>
                    {products.length === 0 && (
                      <button
                        onClick={onRefresh}
                        className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow inline-flex items-center space-x-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Catalog</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    isCopied={copiedId === p.id}
                    onCopy={handleCopyDetails}
                    onDelete={handleDeleteItem}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info showing filtered count & pagination controls */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong className="text-white">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-white">{Math.min(currentPage * pageSize, filteredProducts.length)}</strong> of{' '}
              <strong className="text-white">{filteredProducts.length}</strong> items
              {searchTerm && <span className="text-blue-400 ml-1">(filtered)</span>}
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-slate-300 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-medium text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-slate-300 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
