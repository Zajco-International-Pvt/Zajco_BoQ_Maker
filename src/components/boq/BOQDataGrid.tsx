import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Search,
  ClipboardPaste
} from 'lucide-react';
import type { BOQItem, ItemLibraryProduct } from '../../types';
import { calculateBOQItemRow } from '../../services/boqService';

interface BOQDataGridProps {
  items: BOQItem[];
  onChangeItems: (items: BOQItem[]) => void;
  conversionRate: number;
  readOnly?: boolean;
  itemLibrary?: ItemLibraryProduct[];
  pricingSources?: string[];
}

export const BOQDataGrid: React.FC<BOQDataGridProps> = ({
  items,
  onChangeItems,
  conversionRate,
  readOnly = false,
  itemLibrary = [],
  pricingSources = ['Discounted Listed Price', 'Vendor Quotation', 'Management', 'Previous BOQ', 'Manual', 'Other']
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [autocompleteRowIdx, setAutocompleteRowIdx] = useState<number | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<ItemLibraryProduct[]>([]);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Handle cell field change
  const handleCellChange = (index: number, field: keyof BOQItem, value: any) => {
    if (readOnly) return;
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Recalculate row
    const recalculated = calculateBOQItemRow(item, conversionRate);
    updated[index] = recalculated;

    // Ensure serial numbers stay 1...N
    const renumbered = updated.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChangeItems(renumbered);
  };

  // Add new blank row
  const handleAddRow = () => {
    if (readOnly) return;
    const newRowRaw: Partial<BOQItem> = {
      serialNumber: items.length + 1,
      description: '',
      quantity: 1,
      pricingSource: pricingSources[0] || 'Discounted Listed Price',
      unitPriceEUR: 0,
      unitPriceSAR: 0,
      profitPercentage: 15,
      isManualSAR: false
    };
    const calculated = calculateBOQItemRow(newRowRaw, conversionRate);
    const newItems = [...items, calculated].map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChangeItems(newItems);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (readOnly || items.length <= 1) return;
    const filtered = items.filter((_, idx) => idx !== index);
    const renumbered = filtered.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChangeItems(renumbered);
  };

  // Duplicate row
  const handleDuplicateRow = (index: number) => {
    if (readOnly) return;
    const target = items[index];
    const dup: BOQItem = {
      ...target,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      serialNumber: index + 2
    };
    const updated = [...items];
    updated.splice(index + 1, 0, dup);
    const renumbered = updated.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChangeItems(renumbered);
  };

  // Move row up/down
  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    const renumbered = updated.map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
    onChangeItems(renumbered);
  };

  // Bulk Excel Paste Handler
  const handleProcessBulkPaste = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.split(/\r?\n/);
    const parsedRows: BOQItem[] = [];

    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      // Split by tab (Excel clipboard default) or comma
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cols.length === 0) return;

      // Map columns heuristically or by index
      // Common order: Description, Qty, UnitPriceEUR, Profit%
      let desc = cols[0]?.trim() || '';
      let qty = parseFloat(cols[1]?.trim()) || 1;
      let eur = parseFloat(cols[2]?.trim()) || 0;
      let source = cols[3]?.trim() || pricingSources[0] || 'Discounted Listed Price';
      let profit = cols[4]?.trim() !== '' ? parseFloat(cols[4]?.trim()) : 15;

      // If user pasted full BOQ row (S.No, Desc, Qty, Source, EUR...)
      if (!isNaN(parseFloat(cols[0])) && cols.length > 2) {
        desc = cols[1]?.trim() || '';
        qty = parseFloat(cols[2]?.trim()) || 1;
        source = cols[3]?.trim() || 'Discounted Listed Price';
        eur = parseFloat(cols[4]?.trim()) || 0;
      }

      const itemRaw: Partial<BOQItem> = {
        serialNumber: items.length + parsedRows.length + 1,
        description: desc || `Imported Item ${idx + 1}`,
        quantity: isNaN(qty) ? 1 : qty,
        pricingSource: source,
        unitPriceEUR: isNaN(eur) ? 0 : eur,
        profitPercentage: isNaN(profit) ? 15 : profit
      };

      parsedRows.push(calculateBOQItemRow(itemRaw, conversionRate));
    });

    if (parsedRows.length > 0) {
      const combined = [...items, ...parsedRows].map((it, idx) => ({ ...it, serialNumber: idx + 1 }));
      onChangeItems(combined);
      setPasteRawText('');
      setPasteModalOpen(false);
    }
  };

  // Product Autocomplete suggestion filter
  const handleDescriptionChange = (index: number, val: string) => {
    handleCellChange(index, 'description', val);
    if (val.length >= 2 && itemLibrary.length > 0) {
      const matched = itemLibrary.filter(p =>
        p.description.toLowerCase().includes(val.toLowerCase()) ||
        p.model.toLowerCase().includes(val.toLowerCase()) ||
        p.brand.toLowerCase().includes(val.toLowerCase())
      );
      setAutocompleteSuggestions(matched.slice(0, 8));
      setAutocompleteRowIdx(index);
    } else {
      setAutocompleteSuggestions([]);
      setAutocompleteRowIdx(null);
    }
  };

  const handleSelectProduct = (index: number, product: ItemLibraryProduct) => {
    const updated = [...items];
    const item = {
      ...updated[index],
      description: `${product.brand ? product.brand + ' - ' : ''}${product.model ? product.model + ' ' : ''}${product.description}`,
      unitPriceEUR: product.defaultPriceEUR || 0,
      unitPriceSAR: product.defaultPriceSAR || 0,
      profitPercentage: product.defaultProfitPercentage ?? 15,
      pricingSource: product.pricingSource || pricingSources[0] || 'Discounted Listed Price',
      brand: product.brand || '',
      model: product.model || ''
    };
    updated[index] = calculateBOQItemRow(item, conversionRate);
    onChangeItems(updated);
    setAutocompleteSuggestions([]);
    setAutocompleteRowIdx(null);
  };

  // Calculating Footers
  const totals = items.reduce(
    (acc, i) => {
      acc.qty += i.quantity || 0;
      acc.eur += i.totalEUR || 0;
      acc.sar += i.totalSAR || 0;
      acc.added += i.percentageAdded * i.quantity || 0;
      acc.final += i.totalProfitIncl || 0;
      return acc;
    },
    { qty: 0, eur: 0, sar: 0, added: 0, final: 0 }
  );

  return (
    <div className="space-y-4">

      {/* Grid Controls Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 sm:p-3.5 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="font-bold text-xs sm:text-sm text-slate-200">BOQ Items Grid</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
              {items.length} Lines
            </span>
          </div>

          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search line items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPasteModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bulk Paste</span>
            </button>

            <button
              onClick={handleAddRow}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Row</span>
            </button>
          </div>
        )}
      </div>

      <div className="sm:hidden text-[11px] text-slate-400 flex items-center justify-end px-1">
        <span>↔ Scroll horizontally to view all columns</span>
      </div>

      {/* Main Data Grid Container with Horizontal Scroll */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl relative">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">

            {/* Sticky Table Header */}
            <thead className="bg-slate-950 text-slate-300 font-semibold sticky top-0 z-20 shadow-md">
              <tr className="divide-x divide-slate-800 border-b border-slate-800">
                <th className="p-2.5 text-center w-12 sticky left-0 bg-slate-950 z-30">S.No</th>
                <th className="p-2.5 min-w-[260px] sticky left-12 bg-slate-950 z-30">Item Description</th>
                <th className="p-2.5 text-center w-20">QTY</th>
                <th className="p-2.5 w-40">Pricing Source</th>
                <th className="p-2.5 text-right w-28">Unit Price (EUR)</th>
                <th className="p-2.5 text-right w-32 bg-slate-900/60">Total EUR</th>
                <th className="p-2.5 text-right w-32">
                  <div className="flex items-center justify-end space-x-1">
                    <span>Unit Price (SAR)</span>
                    <span className="text-[10px] text-blue-400 font-bold" title="Auto calculated from EUR x Conversion Rate unless Manual check is selected">
                      (x{conversionRate})
                    </span>
                  </div>
                </th>
                <th className="p-2.5 text-right w-36 bg-slate-900/60">Total SAR</th>
                <th className="p-2.5 text-right w-28">Profit %</th>
                <th className="p-2.5 text-right w-32">Percentage Added</th>
                <th className="p-2.5 text-right w-36">Unit Price (Profit Incl)</th>
                <th className="p-2.5 text-right w-40 bg-emerald-950/30 text-emerald-300">Total Profit Incl</th>
                {!readOnly && <th className="p-2.5 text-center w-24">Actions</th>}
              </tr>
            </thead>

            {/* Table Body Rows */}
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {items
                .filter(item => !searchTerm || item.description.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item, idx) => {
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`group hover:bg-slate-800/60 transition-colors divide-x divide-slate-800/60 ${isEven ? 'bg-slate-900/40' : 'bg-slate-900/90'
                        }`}
                    >
                      {/* S.No */}
                      <td className="p-2 text-center font-bold text-slate-400 sticky left-0 bg-slate-900 z-10 group-hover:bg-slate-800">
                        {item.serialNumber}
                      </td>

                      {/* Description with Autocomplete */}
                      <td className="p-1.5 relative sticky left-12 bg-slate-900 z-10 group-hover:bg-slate-800">
                        {readOnly ? (
                          <div className="px-2 py-1 text-slate-200 font-medium whitespace-pre-wrap">{item.description}</div>
                        ) : (
                          <div>
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                              placeholder="Enter item description, brand, or model..."
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 resize-y"
                            />

                            {/* Autocomplete Dropdown */}
                            {autocompleteRowIdx === idx && autocompleteSuggestions.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-900">
                                  Select from Product Library
                                </div>
                                {autocompleteSuggestions.map((prod) => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => handleSelectProduct(idx, prod)}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-600/20 text-xs transition-colors flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-semibold text-blue-300">{prod.brand} {prod.model}</div>
                                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{prod.description}</div>
                                    </div>
                                    <div className="text-right font-mono text-emerald-400 font-bold">
                                      €{prod.defaultPriceEUR}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* QTY */}
                      <td className="p-1.5">
                        {readOnly ? (
                          <div className="text-center font-bold text-white">{item.quantity}</div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleCellChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full min-w-[55px] text-center bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </td>

                      {/* Pricing Source */}
                      <td className="p-1.5">
                        {readOnly ? (
                          <div className="text-slate-400 text-center">{item.pricingSource}</div>
                        ) : (
                          <select
                            value={item.pricingSource}
                            onChange={(e) => handleCellChange(idx, 'pricingSource', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                          >
                            {pricingSources.map((src) => (
                              <option key={src} value={src}>{src}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Unit Price EUR */}
                      <td className="p-1.5 text-center">
                        {readOnly ? (
                          <div className="font-mono text-slate-200">{item.unitPriceEUR.toFixed(2)}</div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPriceEUR}
                            onChange={(e) => handleCellChange(idx, 'unitPriceEUR', parseFloat(e.target.value) || 0)}
                            className="w-full min-w-[55px] text-center bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-emerald-400 font-mono font-semibold focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </td>

                      {/* Total EUR (Auto) */}
                      <td className="p-2 text-right font-mono font-bold text-slate-300 bg-slate-950/30">
                        {item.totalEUR.toFixed(2)}
                      </td>

                      {/* Unit Price SAR (Auto / Manual Toggle) */}
                      <td className="p-1.5">
                        {readOnly ? (
                          <div className="text-center font-mono text-slate-200">
                            {item.unitPriceSAR.toFixed(2)}
                            {item.isManualSAR && <span className="ml-1 text-[10px] text-amber-400 font-bold">(M)</span>}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPriceSAR}
                              disabled={!item.isManualSAR}
                              onChange={(e) => handleCellChange(idx, 'unitPriceSAR', parseFloat(e.target.value) || 0)}
                              className={`w-full text-center bg-slate-950 border rounded px-1.5 py-1 text-xs font-mono font-semibold focus:outline-none ${item.isManualSAR
                                ? 'border-amber-500/80 text-amber-300 bg-amber-950/20'
                                : 'border-slate-800 text-slate-400'
                                }`}
                            />
                            <label className="flex items-center justify-end space-x-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!item.isManualSAR}
                                onChange={(e) => handleCellChange(idx, 'isManualSAR', e.target.checked)}
                                className="w-3 h-3 text-amber-500 rounded border-slate-700 bg-slate-950 focus:ring-0"
                              />
                              <span className="text-[10px] text-slate-500 font-medium">Manual SAR</span>
                            </label>
                          </div>
                        )}
                      </td>

                      {/* Total SAR (Auto) */}
                      <td className="p-2 text-right font-mono font-bold text-slate-200 bg-slate-950/30">
                        {item.totalSAR.toFixed(2)}
                      </td>

                      {/* Profit % */}
                      <td className="p-1.5">
                        {readOnly ? (
                          <div className="text-center font-mono text-blue-300">
                            {item.profitPercentage !== null ? `${item.profitPercentage}%` : '-'}
                          </div>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            placeholder="-"
                            value={item.profitPercentage !== null ? item.profitPercentage : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleCellChange(idx, 'profitPercentage', val === '' ? null : parseFloat(val));
                            }}
                            className="w-full text-center bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs text-blue-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </td>

                      {/* Percentage Added (Auto) */}
                      <td className="p-2 text-right font-mono text-slate-400">
                        {item.percentageAdded.toFixed(2)}
                      </td>

                      {/* Unit Price Profit Incl (Auto) */}
                      <td className="p-2 text-right font-mono font-bold text-slate-100">
                        {item.unitPriceProfitIncl.toFixed(2)}
                      </td>

                      {/* Total Profit Incl (Auto) */}
                      <td className="p-2 text-right font-mono font-extrabold text-emerald-400 bg-emerald-950/20 text-sm">
                        {item.totalProfitIncl.toFixed(2)}
                      </td>

                      {/* Actions */}
                      {!readOnly && (
                        <td className="p-1.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(idx)}
                              title="Duplicate row"
                              className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(idx, 'up')}
                              disabled={idx === 0}
                              title="Move row up"
                              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(idx, 'down')}
                              disabled={idx === items.length - 1}
                              title="Move row down"
                              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              disabled={items.length <= 1}
                              title="Delete row"
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded disabled:opacity-30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>

            {/* Table Footer Summary Totals */}
            <tfoot className="bg-slate-950 text-slate-100 font-extrabold border-t-2 border-slate-700 sticky bottom-0 z-20">
              <tr className="divide-x divide-slate-800">
                <td className="p-3 text-center sticky left-0 bg-slate-950">#</td>
                <td className="p-3 uppercase tracking-wider text-slate-400 text-right sticky left-12 bg-slate-950">
                  Total Summary
                </td>
                <td className="p-3 text-center text-blue-400 text-sm font-mono">{totals.qty}</td>
                <td className="p-3"></td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-emerald-400 font-mono text-sm">€{totals.eur.toFixed(2)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-slate-200 font-mono text-sm">SAR {totals.sar.toFixed(2)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-amber-400 font-mono text-sm">SAR {totals.added.toFixed(2)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-emerald-400 font-mono text-base bg-emerald-950/40">
                  SAR {totals.final.toFixed(2)}
                </td>
                {!readOnly && <td className="p-3"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bulk Paste Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ClipboardPaste className="w-5 h-5 text-blue-400" />
                <span>Bulk Paste from Excel</span>
              </h3>
              <button
                onClick={() => setPasteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Copy cells directly from Microsoft Excel or Google Sheets and paste them into the box below.
              <br />
              <span className="text-slate-300 font-semibold">Expected column order:</span> Description, Qty, Unit Price (EUR), Pricing Source, Profit %
            </p>

            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Paste tab-separated text here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessBulkPaste}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30"
              >
                Import Rows to Grid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
