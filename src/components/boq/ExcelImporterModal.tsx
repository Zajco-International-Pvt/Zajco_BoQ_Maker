import React, { useState } from 'react';
import { FileUp, Check, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { ColumnMapping } from '../../services/excelService';
import { parseExcelFile } from '../../services/excelService';
import type { BOQItem, SystemSettings } from '../../types';
import { calculateBOQItemRow } from '../../services/boqService';

interface ExcelImporterModalProps {
  conversionRate: number;
  onImportComplete: (items: BOQItem[]) => void;
  onClose?: () => void;
  settings?: SystemSettings;
}

export const ExcelImporterModal: React.FC<ExcelImporterModalProps> = ({
  conversionRate,
  onImportComplete,
  onClose
}) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    serialNumber: '',
    description: '',
    quantity: '',
    pricingSource: '',
    unitPriceEUR: '',
    totalEUR: '',
    unitPriceSAR: '',
    totalSAR: '',
    profitPercentage: '',
    percentageAdded: '',
    unitPriceProfitIncl: '',
    totalProfitIncl: ''
  });

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [error, setError] = useState('');

  // Handle file drop / select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setError('');

    try {
      const res = await parseExcelFile(selectedFile);
      setHeaders(res.headers);
      setRawRows(res.rows);
      setMapping(res.suggestedMapping);
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to parse Excel file.');
    }
  };

  // Convert raw rows using mapping
  const generateMappedItems = (): BOQItem[] => {
    return rawRows.map((row, idx) => {
      const desc = mapping.description ? String(row[mapping.description] || '') : `Imported Item ${idx + 1}`;
      const qty = mapping.quantity ? parseFloat(row[mapping.quantity]) || 1 : 1;
      const source = mapping.pricingSource ? String(row[mapping.pricingSource] || 'Discounted Listed Price') : 'Discounted Listed Price';
      const unitEUR = mapping.unitPriceEUR ? parseFloat(row[mapping.unitPriceEUR]) || 0 : 0;
      const unitSAR = mapping.unitPriceSAR ? parseFloat(row[mapping.unitPriceSAR]) || 0 : 0;
      const isManual = unitSAR > 0 && unitEUR === 0;

      let profit = mapping.profitPercentage ? parseFloat(row[mapping.profitPercentage]) : 15;
      if (isNaN(profit)) profit = 15;
      if (profit > 0 && profit < 1 && String(row[mapping.profitPercentage]).includes('.')) {
        // e.g. 0.4 stored as fraction
        profit = profit * 100;
      }

      const itemRaw: Partial<BOQItem> = {
        serialNumber: idx + 1,
        description: desc,
        quantity: qty,
        pricingSource: source,
        unitPriceEUR: unitEUR,
        unitPriceSAR: unitSAR,
        isManualSAR: isManual,
        profitPercentage: profit
      };

      return calculateBOQItemRow(itemRaw, conversionRate);
    });
  };

  const handleFinishImport = () => {
    const finalItems = generateMappedItems();
    onImportComplete(finalItems);
    if (onClose) onClose();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-blue-400" />
            <span>Excel BOQ Import & Header Mapping Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload existing .xlsx, .xls, or .csv BOQ file to auto-detect and populate items
          </p>
        </div>

        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6 text-center py-8">
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-10 bg-slate-950/60 transition-all">
            <FileUp className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-bounce" />
            <h3 className="text-sm font-bold text-white">Select BOQ Excel File</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Drag and drop or browse your local file (.xlsx, .xls, .csv). Standard Tunstall and custom BOQs are supported.
            </p>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
            >
              <span>Browse Computer</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-xs text-blue-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Smart Header Mapping detected. Match your Excel column names to standard BOQ fields.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Item Description *</label>
              <select
                value={mapping.description}
                onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity (QTY) *</label>
              <select
                value={mapping.quantity}
                onChange={(e) => setMapping({ ...mapping, quantity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price (EUR)</label>
              <select
                value={mapping.unitPriceEUR}
                onChange={(e) => setMapping({ ...mapping, unitPriceEUR: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price (SAR)</label>
              <select
                value={mapping.unitPriceSAR}
                onChange={(e) => setMapping({ ...mapping, unitPriceSAR: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Profit Percentage %</label>
              <select
                value={mapping.profitPercentage}
                onChange={(e) => setMapping({ ...mapping, profitPercentage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pricing Source</label>
              <select
                value={mapping.pricingSource}
                onChange={(e) => setMapping({ ...mapping, pricingSource: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">Select column...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl"
            >
              Back
            </button>

            <button
              onClick={() => setStep('preview')}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30"
            >
              <span>Preview Mapped Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-300 flex items-center justify-between">
            <span className="font-semibold">Import Preview ({rawRows.length} items parsed)</span>
            <span className="text-emerald-400 font-mono">Conversion Rate: 1 EUR = {conversionRate} SAR</span>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-300 font-bold sticky top-0">
                <tr>
                  <th className="p-2 text-center">S.No</th>
                  <th className="p-2">Description</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Unit EUR</th>
                  <th className="p-2 text-right">Unit SAR</th>
                  <th className="p-2 text-right">Profit %</th>
                  <th className="p-2 text-right">Total Profit Incl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {generateMappedItems().slice(0, 10).map((item, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="p-2 text-center font-mono">{item.serialNumber}</td>
                    <td className="p-2 font-medium">{item.description}</td>
                    <td className="p-2 text-center font-bold">{item.quantity}</td>
                    <td className="p-2 text-right font-mono">€{item.unitPriceEUR.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">SAR {item.unitPriceSAR.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{item.profitPercentage}%</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-400">
                      SAR {item.totalProfitIncl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl"
            >
              Back to Mapping
            </button>

            <button
              onClick={handleFinishImport}
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Populate BOQ</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
