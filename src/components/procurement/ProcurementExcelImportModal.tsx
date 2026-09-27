import React, { useState } from 'react';
import { 
  X, 
  FileUp, 
  Download, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  FileSpreadsheet, 
  RefreshCw,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { 
  ProcurementItem, 
  ProcurementStatus, 
  ProcurementPriority, 
  UserProfile 
} from '../../types';
import { 
  parseProcurementExcelWorkbook, 
  extractProcurementSheetRows, 
  batchImportProcurementItems, 
  downloadProcurementExcelTemplate,
  PROCUREMENT_STATUS_CONFIG,
  PROCUREMENT_PRIORITY_CONFIG,
  ACTIVE_PROCUREMENT_STATUSES,
  matchProcurementStatus,
  type ProcurementExcelColumnMapping 
} from '../../services/procurementService';

interface ProcurementExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  currentUser: UserProfile;
}

export const ProcurementExcelImportModal: React.FC<ProcurementExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentUser
}) => {
  const [step, setStep] = useState<'upload' | 'sheets' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ProcurementExcelColumnMapping>({
    itemName: '',
    category: '',
    brand: '',
    model: '',
    description: '',
    quantity: '',
    unit: '',
    targetUnitPrice: '',
    currency: '',
    priority: '',
    status: '',
    projectReference: '',
    requestedBy: '',
    expectedDate: '',
    notes: ''
  });

  // Default fallbacks for unmapped or empty values
  const [defaultCategory, setDefaultCategory] = useState<string>('General Materials');
  const [defaultCurrency, setDefaultCurrency] = useState<string>('SAR');
  const [defaultPriority, setDefaultPriority] = useState<ProcurementPriority>('MEDIUM');
  const [defaultStatus, setDefaultStatus] = useState<ProcurementStatus>('PENDING_POS');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle File Selection or Drop
  const handleFile = async (file: File) => {
    if (!file) return;
    setErrorMsg(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const { workbook: parsedWb, sheetNames: sheets } = await parseProcurementExcelWorkbook(file);
      setWorkbook(parsedWb);
      setSheetNames(sheets);

      if (sheets.length === 1) {
        // Only 1 sheet, proceed directly to mapping
        loadSheetData(parsedWb, sheets[0]);
      } else {
        // Multi-sheet, ask user to select sheet
        setStep('sheets');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read Excel workbook.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    setErrorMsg(null);
    try {
      const { headers: sheetHeaders, rows, suggestedMapping } = extractProcurementSheetRows(wb, sheetName);
      if (rows.length === 0) {
        throw new Error(`Sheet "${sheetName}" contains no item records.`);
      }
      setHeaders(sheetHeaders);
      setRawRows(rows);
      setMapping(suggestedMapping);
      setStep('mapping');
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to parse sheet "${sheetName}".`);
    }
  };

  // Build items from mapped columns
  const generateMappedItems = (): Partial<ProcurementItem>[] => {
    return rawRows.map((row, idx) => {
      const rawName = mapping.itemName ? String(row[mapping.itemName] || '').trim() : '';
      const rawDesc = mapping.description ? String(row[mapping.description] || '').trim() : '';
      const itemName = rawName || (rawDesc ? rawDesc.slice(0, 80) : `Enquiry Item #${idx + 1}`);

      const category = mapping.category && row[mapping.category] 
        ? String(row[mapping.category]).trim() 
        : defaultCategory;

      const brand = mapping.brand ? String(row[mapping.brand] || '').trim() : '';
      const model = mapping.model ? String(row[mapping.model] || '').trim() : '';
      const description = rawDesc || itemName;

      let quantity = 1;
      if (mapping.quantity && row[mapping.quantity] !== undefined && row[mapping.quantity] !== '') {
        const parsedQty = parseFloat(row[mapping.quantity]);
        if (!isNaN(parsedQty) && parsedQty > 0) quantity = parsedQty;
      }

      const unit = mapping.unit && row[mapping.unit] 
        ? String(row[mapping.unit]).trim() 
        : 'pcs';

      let targetPrice: number | undefined = undefined;
      if (mapping.targetUnitPrice && row[mapping.targetUnitPrice] !== undefined && row[mapping.targetUnitPrice] !== '') {
        const parsedPrice = parseFloat(row[mapping.targetUnitPrice]);
        if (!isNaN(parsedPrice)) targetPrice = parsedPrice;
      }

      const currency = mapping.currency && row[mapping.currency] 
        ? String(row[mapping.currency]).trim().toUpperCase() 
        : defaultCurrency;

      let priority: ProcurementPriority = defaultPriority;
      if (mapping.priority && row[mapping.priority]) {
        const pStr = String(row[mapping.priority]).trim().toUpperCase();
        if (pStr.includes('URGENT')) priority = 'URGENT';
        else if (pStr.includes('HIGH')) priority = 'HIGH';
        else if (pStr.includes('LOW')) priority = 'LOW';
        else if (pStr.includes('MEDIUM')) priority = 'MEDIUM';
      }

      const projectReference = mapping.projectReference ? String(row[mapping.projectReference] || '').trim() : '';
      const requestedBy = mapping.requestedBy ? String(row[mapping.requestedBy] || '').trim() : '';
      
      let expectedDate = '';
      if (mapping.expectedDate && row[mapping.expectedDate]) {
        const dVal = row[mapping.expectedDate];
        if (dVal instanceof Date) {
          expectedDate = dVal.toISOString().slice(0, 10);
        } else if (typeof dVal === 'string' && dVal.match(/\d{4}-\d{2}-\d{2}/)) {
          expectedDate = dVal.match(/\d{4}-\d{2}-\d{2}/)![0];
        } else {
          expectedDate = String(dVal).trim();
        }
      }

      const notes = mapping.notes ? String(row[mapping.notes] || '').trim() : '';

      let itemStatus = defaultStatus;
      if (mapping.status && row[mapping.status]) {
        const matched = matchProcurementStatus(String(row[mapping.status]));
        if (matched) itemStatus = matched;
      }

      return {
        itemName,
        category,
        brand,
        model,
        description,
        quantity,
        unit,
        targetUnitPrice: targetPrice,
        currency,
        priority,
        status: itemStatus,
        projectReference,
        requestedBy,
        expectedDate,
        notes
      };
    });
  };

  // Perform Final Batch Import
  const handleExecuteImport = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const itemsToImport = generateMappedItems();
      if (itemsToImport.length === 0) {
        throw new Error('No valid items found to import.');
      }

      await batchImportProcurementItems(itemsToImport, currentUser);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete batch import.');
      setIsProcessing(false);
    }
  };

  const previewItems = generateMappedItems().slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span>Import Procurement Enquiries from Excel</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  .xlsx / .xls
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload supplier lists, BOQ material schedules, or client enquiry sheets in bulk
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center space-x-3 text-xs flex-shrink-0 overflow-x-auto">
          <div className={`flex items-center space-x-1.5 font-bold ${step === 'upload' ? 'text-blue-400' : 'text-emerald-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border flex items-center justify-center text-[10px]">1</span>
            <span>Upload File</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

          {sheetNames.length > 1 && (
            <>
              <div className={`flex items-center space-x-1.5 font-bold ${step === 'sheets' ? 'text-blue-400' : workbook ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="w-5 h-5 rounded-full bg-slate-800 border flex items-center justify-center text-[10px]">2</span>
                <span>Select Sheet</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </>
          )}

          <div className={`flex items-center space-x-1.5 font-bold ${step === 'mapping' ? 'text-blue-400' : (step === 'preview' ? 'text-emerald-400' : 'text-slate-500')}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border flex items-center justify-center text-[10px]">
              {sheetNames.length > 1 ? '3' : '2'}
            </span>
            <span>Match Columns</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

          <div className={`flex items-center space-x-1.5 font-bold ${step === 'preview' ? 'text-blue-400' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border flex items-center justify-center text-[10px]">
              {sheetNames.length > 1 ? '4' : '3'}
            </span>
            <span>Preview & Import</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 rounded-2xl p-8 text-center transition-all cursor-pointer group"
                onClick={() => document.getElementById('procurement-excel-upload-input')?.click()}
              >
                <input
                  id="procurement-excel-upload-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileUp className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-white mb-1">
                  Drag & Drop Excel Spreadsheet or Click to Browse
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Supports Microsoft Excel (.xlsx, .xls) files. Auto-detects columns and formats.
                </p>

                <div className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700">
                  <span>Browse File</span>
                </div>
              </div>

              {/* Sample Template Download Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Need a pre-formatted Excel template?</h4>
                    <p className="text-[11px] text-slate-400">
                      Download our standard Procurement template pre-populated with example enquiries and columns
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadProcurementExcelTemplate}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 (Optional): SHEET SELECTOR */}
          {step === 'sheets' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Select Worksheet to Import</h3>
                <p className="text-xs text-slate-400">
                  The file <span className="font-mono text-blue-400">{fileName}</span> contains multiple sheets. Choose which one has your enquiry items:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sheetNames.map((sheet) => (
                  <button
                    key={sheet}
                    onClick={() => workbook && loadSheetData(workbook, sheet)}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 hover:bg-slate-900 rounded-xl text-left transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="w-5 h-5 text-slate-500 group-hover:text-blue-400" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-400">{sheet}</div>
                        <div className="text-[10px] text-slate-500">Click to parse sheet</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING & DEFAULTS */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Map Columns from "{selectedSheet || fileName}"</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Found <span className="text-white font-bold">{rawRows.length}</span> rows and{' '}
                    <span className="text-white font-bold">{headers.length}</span> columns. Match them to procurement fields.
                  </p>
                </div>

                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-slate-400 hover:text-white underline self-start sm:self-auto"
                >
                  Change File
                </button>
              </div>

              {/* Column Mapping Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Item Name (Required) */}
                <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/30">
                  <label className="block text-xs font-bold text-white mb-1">
                    Item Name / Title <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={mapping.itemName}
                    onChange={(e) => setMapping({ ...mapping, itemName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- Select Excel Header --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">System / Category</label>
                  <select
                    value={mapping.category}
                    onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None (Use Fallback) --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Brand / Manufacturer</label>
                  <select
                    value={mapping.brand}
                    onChange={(e) => setMapping({ ...mapping, brand: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Model / Part Number</label>
                  <select
                    value={mapping.model}
                    onChange={(e) => setMapping({ ...mapping, model: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Quantity</label>
                  <select
                    value={mapping.quantity}
                    onChange={(e) => setMapping({ ...mapping, quantity: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- Default 1 --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Unit of Measure</label>
                  <select
                    value={mapping.unit}
                    onChange={(e) => setMapping({ ...mapping, unit: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- Default "pcs" --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Target Price */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Target / Unit Price</label>
                  <select
                    value={mapping.targetUnitPrice}
                    onChange={(e) => setMapping({ ...mapping, targetUnitPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Specifications / Description */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Technical Specifications</label>
                  <select
                    value={mapping.description}
                    onChange={(e) => setMapping({ ...mapping, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None (Use Item Name) --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Project Reference */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Project / Client Reference</label>
                  <select
                    value={mapping.projectReference}
                    onChange={(e) => setMapping({ ...mapping, projectReference: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None / Skip --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Requested By */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Requested By / Engineer</label>
                  <select
                    value={mapping.requestedBy}
                    onChange={(e) => setMapping({ ...mapping, requestedBy: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- None / Current Admin --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Status Column (Optional) */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status / Stage Column (Optional)</label>
                  <select
                    value={mapping.status || ''}
                    onChange={(e) => setMapping({ ...mapping, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-blue-500"
                  >
                    <option value="">-- Use Fallback Below --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Default Fallbacks Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Default Fallback Values (for missing or empty fields)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Default Category</label>
                    <input
                      type="text"
                      value={defaultCategory}
                      onChange={(e) => setDefaultCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Default Currency</label>
                    <select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="SAR">SAR</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Default Priority</label>
                    <select
                      value={defaultPriority}
                      onChange={(e) => setDefaultPriority(e.target.value as ProcurementPriority)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    >
                      {(Object.keys(PROCUREMENT_PRIORITY_CONFIG) as ProcurementPriority[]).map((p) => (
                        <option key={p} value={p}>{PROCUREMENT_PRIORITY_CONFIG[p].label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Initial Status</label>
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value as ProcurementStatus)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    >
                      {ACTIVE_PROCUREMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>{PROCUREMENT_STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                >
                  <span>Preview Data ({rawRows.length} Items)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & CONFIRM */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Review Sample Items Before Importing</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing first {previewItems.length} of {rawRows.length} items to be created
                  </p>
                </div>

                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  Ready to import: {rawRows.length} items
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-300 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Brand / Model</th>
                      <th className="p-2.5 text-center">Qty / Unit</th>
                      <th className="p-2.5">Target Price</th>
                      <th className="p-2.5 text-center">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-white max-w-xs truncate">{item.itemName}</td>
                        <td className="p-2.5 text-slate-400">{item.category}</td>
                        <td className="p-2.5 font-mono text-slate-400">
                          {item.brand || '—'} {item.model ? `(${item.model})` : ''}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-white">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2.5 font-mono text-emerald-400">
                          {item.targetUnitPrice ? `${item.targetUnitPrice} ${item.currency}` : '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PROCUREMENT_PRIORITY_CONFIG[item.priority || 'MEDIUM'].badge}`}>
                            {item.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Adjust Column Mapping
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteImport}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importing {rawRows.length} Items...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Import {rawRows.length} Items</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
