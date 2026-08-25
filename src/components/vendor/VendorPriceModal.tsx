import React, { useState } from 'react';
import { Tag, Plus } from 'lucide-react';
import type { VendorPrice } from '../../types';
import { saveVendorPrice } from '../../services/adminService';

interface VendorPriceModalProps {
  vendorPrices: VendorPrice[];
  onRefresh: () => void;
  onClose?: () => void;
}

export const VendorPriceModal: React.FC<VendorPriceModalProps> = ({
  vendorPrices,
  onRefresh,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [vendor, setVendor] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const currency = 'EUR';
  const [unitPrice, setUnitPrice] = useState(100);
  const [discount, setDiscount] = useState(10);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !description) return;

    const finalPrice = unitPrice * (1 - discount / 100);

    try {
      await saveVendorPrice({
        vendor,
        brand,
        model,
        description,
        currency,
        unitPrice,
        discount,
        finalPrice,
        source: 'Vendor Quotation',
        notes: '',
        updatedAt: new Date().toISOString()
      });

      setVendor('');
      setDescription('');
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = vendorPrices.filter(v =>
    v.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            <span>Vendor Quotation & Pricing Master Database</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Store supplier quotations, discounts, and verified unit pricing history
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor Price</span>
          </button>

          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSave} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Vendor Price Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Vendor Name (e.g. Tunstall KSA)"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Model Code"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Product Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">List Price ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Discount %</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Net Discounted Price</label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold">
                {(unitPrice * (1 - discount / 100)).toFixed(2)} {currency}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg"
            >
              Save Vendor Price
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search vendor prices..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
      />

      {/* Table */}
      <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 text-slate-300 font-bold sticky top-0">
            <tr>
              <th className="p-2.5">Vendor</th>
              <th className="p-2.5">Brand / Model</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5 text-right">List Price</th>
              <th className="p-2.5 text-right">Discount</th>
              <th className="p-2.5 text-right">Final Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No vendor pricing records found. Click "Add Vendor Price" above!
                </td>
              </tr>
            ) : (
              filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-800/40">
                  <td className="p-2.5 font-bold text-indigo-300">{v.vendor}</td>
                  <td className="p-2.5 font-mono text-slate-300">{v.brand} {v.model}</td>
                  <td className="p-2.5 max-w-xs truncate">{v.description}</td>
                  <td className="p-2.5 text-right font-mono text-slate-400">{v.currency} {v.unitPrice.toFixed(2)}</td>
                  <td className="p-2.5 text-right font-mono text-amber-400">{v.discount}%</td>
                  <td className="p-2.5 text-right font-mono font-bold text-emerald-400">{v.currency} {v.finalPrice.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
