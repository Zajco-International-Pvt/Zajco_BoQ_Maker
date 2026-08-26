import React, { useState } from 'react';
import {
  Save,
  Send,
  FileSpreadsheet,
  FileText,
  History,
  Bookmark,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Building
} from 'lucide-react';
import type { BOQ, BOQItem, BOQStatus, ItemLibraryProduct, SystemSettings } from '../../types';
import { BOQDataGrid } from './BOQDataGrid';
import { createBOQ, updateBOQ, generateBOQNumber, recalculateBOQTotals, createRevisionBOQ, calculateBOQItemRow } from '../../services/boqService';
import { exportBOQToExcel, triggerExcelDownload } from '../../services/excelService';
import { exportBOQToPDF } from '../../services/pdfService';
import { useAuth } from '../../context/AuthContext';
import { saveBOQTemplate } from '../../services/adminService';

interface BOQEditorProps {
  initialBOQ?: BOQ | null;
  settings: SystemSettings;
  itemLibrary?: ItemLibraryProduct[];
  onBack?: () => void;
  onSaved?: (boqId: string) => void;
}

// Default Tunstall Sample Items if creating brand new empty BOQ
// const SAMPLE_TUNSTALL_ITEMS: Partial<BOQItem>[] = [
//   { serialNumber: 1, description: 'Tunstall - 76060550 Com Station IP', quantity: 3, pricingSource: 'Discounted Listed Price', unitPriceEUR: 412.54, profitPercentage: 40 },
//   { serialNumber: 2, description: 'Tunstall - Connection Terminal IP POE with VOIP', quantity: 12, pricingSource: 'Discounted Listed Price', unitPriceEUR: 185.00, profitPercentage: 35 },
//   { serialNumber: 3, description: 'Tunstall - Com Terminal IP POE', quantity: 24, pricingSource: 'Discounted Listed Price', unitPriceEUR: 160.00, profitPercentage: 35 },
//   { serialNumber: 4, description: 'Tunstall - IP SystemManager License', quantity: 1, pricingSource: 'Discounted Listed Price', unitPriceEUR: 1200.00, profitPercentage: 20 },
//   { serialNumber: 5, description: 'Desktop PC Workstation for Nurse Call Console', quantity: 2, pricingSource: 'Manual', unitPriceSAR: 3500.00, isManualSAR: true, profitPercentage: 15 },
//   { serialNumber: 6, description: '24 PORT POE SWITCH CISCO CATALYST', quantity: 4, pricingSource: 'Vendor Quotation', unitPriceSAR: 4200.00, isManualSAR: true, profitPercentage: 12 },
//   { serialNumber: 7, description: '24U Network Cabinet with Accessories', quantity: 2, pricingSource: 'Manual', unitPriceSAR: 1800.00, isManualSAR: true, profitPercentage: 15 },
//   { serialNumber: 8, description: 'Installation, Programming, Testing & Commissioning', quantity: 1, pricingSource: 'Management', unitPriceSAR: 15000.00, isManualSAR: true, profitPercentage: 25 }
// ];

export const BOQEditor: React.FC<BOQEditorProps> = ({
  initialBOQ,
  settings,
  itemLibrary = [],
  onBack,
  onSaved
}) => {
  const { userProfile, isAdmin } = useAuth();

  const [boqId, setBoqId] = useState<string | null>(initialBOQ?.id || null);
  const [boqNumber, setBoqNumber] = useState(initialBOQ?.boqNumber || generateBOQNumber());
  const [projectName, setProjectName] = useState(initialBOQ?.projectName || '');
  const [client, setClient] = useState(initialBOQ?.client || '');
  const [contractor, setContractor] = useState(initialBOQ?.contractor || 'ZAJCO Contracting');
  const [consultant, setConsultant] = useState(initialBOQ?.consultant || '');
  const [location, setLocation] = useState(initialBOQ?.location || 'Riyadh, KSA');
  const [system, setSystem] = useState(initialBOQ?.system || 'Nurse Call');
  const [brand, setBrand] = useState(initialBOQ?.brand || 'Tunstall');
  const [preparedBy, setPreparedBy] = useState(initialBOQ?.preparedBy || userProfile?.name || 'Eng. Specialist');
  const [checkedBy, setCheckedBy] = useState(initialBOQ?.checkedBy || 'Eng. Project Director');
  const [date, setDate] = useState(initialBOQ?.date || new Date().toISOString().split('T')[0]);
  const [revision, setRevision] = useState(initialBOQ?.revision ?? 0);
  const [status, setStatus] = useState<BOQStatus>(initialBOQ?.status || 'DRAFT');
  const [conversionRate, setConversionRate] = useState<number>(initialBOQ?.conversionRate || settings.eurToSarRate || 5);
  const [notes, setNotes] = useState(initialBOQ?.notes || '');

  // Grid Items
  const [items, setItems] = useState<BOQItem[]>(() => {
    if (initialBOQ?.items && initialBOQ.items.length > 0) {
      return initialBOQ.items;
    }
    // Default sample items
    return []; //SAMPLE_TUNSTALL_ITEMS.map((item) => calculateBOQItemRow(item, settings.eurToSarRate || 5));
  });

  // Auto-Save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Template Save Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // Lock status check
  const isLocked = status === 'APPROVED' && !isAdmin;

  // Auto-recalculate items if conversion rate changes
  const handleRateChange = (newRate: number) => {
    setConversionRate(newRate);
    const updated = items.map(i => calculateBOQItemRow(i, newRate));
    setItems(updated);
    setSaveStatus('unsaved');
  };

  // Save BOQ to Firestore
  const handleSave = async (targetStatus: BOQStatus = status) => {
    if (!projectName.trim()) {
      setNotice({ type: 'error', message: 'Project Name is required before saving.' });
      return;
    }

    setSaveStatus('saving');
    setActionLoading(true);
    setNotice(null);

    try {
      const totals = recalculateBOQTotals(items);

      const boqPayload: Omit<BOQ, 'id'> = {
        boqNumber,
        projectName,
        client,
        contractor,
        consultant,
        location,
        system,
        brand,
        preparedBy,
        checkedBy,
        date,
        revision,
        status: targetStatus,
        currency: 'SAR',
        conversionRate,
        ...totals,
        items,
        createdBy: userProfile?.uid || 'anonymous',
        createdByName: userProfile?.name || 'User',
        createdByEmail: userProfile?.email || '',
        createdAt: initialBOQ?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes
      };

      let currentId = boqId;
      if (!currentId) {
        currentId = await createBOQ(boqPayload, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
        setBoqId(currentId);
      } else {
        await updateBOQ(currentId, { ...boqPayload, status: targetStatus }, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
      }

      setStatus(targetStatus);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      setNotice({ type: 'success', message: `BOQ successfully saved as ${targetStatus}!` });
      if (onSaved && currentId) onSaved(currentId);
    } catch (err: any) {
      console.error('Save failed:', err);
      const isPermissionErr = err.code === 'permission-denied' || err.message?.includes('permissions');
      setNotice({
        type: 'error',
        message: isPermissionErr
          ? 'Firestore Permission Error: Your Firebase Console rules currently block database writes. Please update Firestore Rules in Firebase Console to allow authenticated read/write.'
          : (err.message || 'Failed to save BOQ to database.')
      });
      setSaveStatus('unsaved');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit BOQ for review
  const handleSubmitBOQ = async () => {
    await handleSave('SUBMITTED');
  };

  // Excel Export
  const handleExportExcel = async () => {
    try {
      setActionLoading(true);
      const tempBOQ: BOQ = {
        id: boqId || 'temp',
        boqNumber,
        projectName,
        client,
        contractor,
        consultant,
        location,
        system,
        brand,
        preparedBy,
        checkedBy,
        date,
        revision,
        status,
        currency: 'SAR',
        conversionRate,
        ...recalculateBOQTotals(items),
        items,
        createdBy: userProfile?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { blob, filename } = await exportBOQToExcel(tempBOQ, settings);
      triggerExcelDownload(blob, filename);
      setNotice({ type: 'success', message: 'Excel spreadsheet generated & downloaded!' });
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Failed to generate Excel file: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    try {
      const tempBOQ: BOQ = {
        id: boqId || 'temp',
        boqNumber,
        projectName,
        client,
        contractor,
        consultant,
        location,
        system,
        brand,
        preparedBy,
        checkedBy,
        date,
        revision,
        status,
        currency: 'SAR',
        conversionRate,
        ...recalculateBOQTotals(items),
        items,
        createdBy: userProfile?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      exportBOQToPDF(tempBOQ, settings);
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Failed to export PDF: ' + err.message });
    }
  };

  // Create New Revision
  const handleCreateRevision = async () => {
    if (!boqId) {
      setNotice({ type: 'error', message: 'Please save the BOQ first before creating a revision.' });
      return;
    }
    try {
      setActionLoading(true);
      const currentBOQ: BOQ = {
        id: boqId,
        boqNumber,
        projectName,
        client,
        contractor,
        consultant,
        location,
        system,
        brand,
        preparedBy,
        checkedBy,
        date,
        revision,
        status,
        currency: 'SAR',
        conversionRate,
        ...recalculateBOQTotals(items),
        items,
        createdBy: userProfile?.uid || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await createRevisionBOQ(currentBOQ, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
      setRevision(prev => prev + 1);
      setStatus('DRAFT');
      setNotice({ type: 'success', message: `Created Revision ${revision + 1}!` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Save as Template
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      setActionLoading(true);
      const cleanItems = items.map(({ id, ...rest }) => rest);
      await saveBOQTemplate({
        name: templateName,
        description: templateDesc || `Template derived from ${projectName}`,
        system,
        brand,
        defaultItems: cleanItems,
        createdBy: userProfile?.name || 'User',
        createdAt: new Date().toISOString()
      });
      setTemplateModalOpen(false);
      setNotice({ type: 'success', message: `BOQ saved as Template "${templateName}"!` });
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Failed to save template: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Summary Card calculations
  const totals = recalculateBOQTotals(items);
  const totalBaseCost = totals.totalSAR;
  const totalProfitSAR = totals.totalProfit;
  const totalFinalBOQValue = totals.totalFinalValue;
  const profitMarginPercent = totalFinalBOQValue > 0 ? (totalProfitSAR / totalFinalBOQValue) * 100 : 0;

  return (
    <div className="space-y-6 pb-20">

      {/* Top Bar Navigation & Status Actions */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black text-white tracking-tight">
                {boqNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                    status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                {status}
              </span>

              <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
                Rev {revision}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              <span>{projectName || 'Untitled BOQ Project'}</span>
              <span>•</span>
              <span className="text-slate-500">
                {saveStatus === 'saving' ? 'Saving changes...' :
                  saveStatus === 'saved' ? `Saved ${lastSavedTime ? 'at ' + lastSavedTime : ''}` :
                    'Unsaved changes'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSave('DRAFT')}
            disabled={actionLoading || isLocked}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-40"
          >
            <Save className="w-4 h-4 text-blue-400" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handleSubmitBOQ}
            disabled={actionLoading || isLocked || status === 'SUBMITTED'}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>Submit BOQ</span>
          </button>

          <div className="h-6 w-px bg-slate-800 my-auto hidden sm:block" />

          <button
            onClick={handleExportExcel}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleCreateRevision}
            disabled={actionLoading || !boqId}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>New Rev</span>
          </button>

          <button
            onClick={() => { setTemplateName(projectName + ' Template'); setTemplateModalOpen(true); }}
            disabled={actionLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Save as Template"
          >
            <Bookmark className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>

      {notice && (
        <div className={`p-10 rounded-xl border flex items-center justify-between ${notice.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
          <div className="flex items-center space-x-3 text-sm">
            {notice.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline font-semibold">Dismiss</button>
        </div>
      )}

      {/* SECTION A: Project Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-400" />
            <span>SECTION A — Project Information & Settings</span>
          </h2>
          <span className="text-xs text-slate-500">Metadata & Conversion Rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">BOQ Number</label>
            <input
              type="text"
              value={boqNumber}
              onChange={(e) => { setBoqNumber(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => { setProjectName(e.target.value); setSaveStatus('unsaved'); }}
              placeholder="e.g. King Fahd Hospital Nurse Call System"
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Client</label>
            <input
              type="text"
              value={client}
              onChange={(e) => { setClient(e.target.value); setSaveStatus('unsaved'); }}
              placeholder="Ministry of Health / Client Name"
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Main Contractor</label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => { setContractor(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Consultant</label>
            <input
              type="text"
              value={consultant}
              onChange={(e) => { setConsultant(e.target.value); setSaveStatus('unsaved'); }}
              placeholder="Dar Al-Handasah / Consultant"
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">System Type</label>
            <select
              value={system}
              onChange={(e) => { setSystem(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {settings.systemsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setSaveStatus('unsaved'); }}
              placeholder="Tunstall, Honeywell, Cisco, Generic..."
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Prepared By</label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => { setPreparedBy(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Checked By</label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => { setCheckedBy(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">BOQ Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setSaveStatus('unsaved'); }}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center justify-between">
              <span>EUR → SAR Rate</span>
              <span className="text-[10px] text-slate-500">Global Default: {settings.eurToSarRate}</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={conversionRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value) || 5)}
              disabled={isLocked}
              className="w-full bg-slate-950 border border-amber-500/50 text-amber-300 font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total EUR Value</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            €{totals.totalEUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Base EUR items cost</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base SAR Cost</div>
          <div className="text-xl font-extrabold text-slate-200 font-mono mt-1">
            SAR {totalBaseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Converted Base Cost</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Total Profit Added</div>
          <div className="text-xl font-extrabold text-amber-300 font-mono mt-1">
            SAR {totalProfitSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Margin added value</div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-blue-500/30 p-4 rounded-2xl shadow-xl">
          <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">Final BOQ Total Value</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            SAR {totalFinalBOQValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-400/80 mt-1">Profit Included Final Client Price</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Margin %</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono mt-1">
            {profitMarginPercent.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Net profit ratio</div>
        </div>
      </div>

      {/* SECTION B: BOQ Data Grid */}
      <BOQDataGrid
        items={items}
        onChangeItems={(newItems) => { setItems(newItems); setSaveStatus('unsaved'); }}
        conversionRate={conversionRate}
        readOnly={isLocked}
        itemLibrary={itemLibrary}
        pricingSources={settings.pricingSourcesList}
      />

      {/* SECTION C: Notes & Terms */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white">Commercial Notes & Terms</h3>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaveStatus('unsaved'); }}
          placeholder="Enter commercial terms, warranty period, delivery timeframe..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Save Template Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Bookmark className="w-5 h-5 text-indigo-400" />
              <span>Save BOQ as Reusable Template</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={2}
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Brief description of when to use this template..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
