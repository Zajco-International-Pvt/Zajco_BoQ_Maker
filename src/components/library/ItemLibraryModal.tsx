import React, { useState } from 'react';
import { PackageSearch, Search, Plus } from 'lucide-react';
import type { ItemLibraryProduct } from '../../types';
import { saveItemLibraryProduct } from '../../services/adminService';

interface ItemLibraryModalProps {
  products: ItemLibraryProduct[];
  onRefresh: () => void;
  onClose?: () => void;
}

export const ItemLibraryModal: React.FC<ItemLibraryModalProps> = ({
  products,
  onRefresh,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [brand, setBrand] = useState('Tunstall');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState('Nurse Call');
  const [defaultPriceEUR, setDefaultPriceEUR] = useState(100);
  const [defaultPriceSAR, setDefaultPriceSAR] = useState(500);
  const [defaultProfitPercentage, setDefaultProfitPercentage] = useState(15);

  const filteredProducts = products.filter(p =>
    p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      await saveItemLibraryProduct({
        brand,
        model,
        description,
        system,
        defaultPriceEUR,
        defaultPriceSAR,
        defaultProfitPercentage,
        pricingSource: 'Discounted Listed Price',
        active: true
      });

      setDescription('');
      setModel('');
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
            <PackageSearch className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <span>Searchable Item Library & Product Master</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized product master database for instant BOQ line item autocomplete
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Hide Form' : 'Add Product'}</span>
          </button>

          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white font-bold" aria-label="Close modal">
              ✕
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSaveProduct} className="bg-slate-950 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3 sm:space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Product Master Record</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Brand (e.g. Tunstall)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Model Code (e.g. 76060550)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="System (e.g. Nurse Call)"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Full Technical Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Price (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={defaultPriceEUR}
                onChange={(e) => setDefaultPriceEUR(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Price (SAR)</label>
              <input
                type="number"
                step="0.01"
                value={defaultPriceSAR}
                onChange={(e) => setDefaultPriceSAR(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Default Profit %</label>
              <input
                type="number"
                value={defaultProfitPercentage}
                onChange={(e) => setDefaultProfitPercentage(parseFloat(e.target.value) || 15)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-blue-400 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg"
            >
              Save to Catalog
            </button>
          </div>
        </form>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input
          type="text"
          placeholder="Search products by brand, model, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-300 font-bold sticky top-0">
            <tr>
              <th className="p-2.5">Brand</th>
              <th className="p-2.5">Model</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5 text-right">Default EUR</th>
              <th className="p-2.5 text-right">Default SAR</th>
              <th className="p-2.5 text-right">Profit %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No products found in catalog. Add new products above!
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-blue-300">{p.brand}</td>
                  <td className="p-2.5 font-mono text-slate-300">{p.model}</td>
                  <td className="p-2.5 font-medium max-w-xs">{p.description}</td>
                  <td className="p-2.5 text-right font-mono text-emerald-400">€{p.defaultPriceEUR.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono">SAR {p.defaultPriceSAR.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono text-blue-300">{p.defaultProfitPercentage}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
