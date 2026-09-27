import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  Building2, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Trash2, 
  Lock, 
  ChevronDown, 
  ShieldCheck, 
  Tag,
  FileUp,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Package,
  X
} from 'lucide-react';
import type { ProcurementItem, ProcurementStatus, SystemSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  getProcurementItems, 
  saveProcurementItem, 
  deleteProcurementItem, 
  updateProcurementStatus,
  exportProcurementItemsToCSV,
  downloadProcurementExcel,
  getLastProcurementError,
  PROCUREMENT_STATUS_CONFIG, 
  PROCUREMENT_PRIORITY_CONFIG,
  ACTIVE_PROCUREMENT_STATUSES,
  getProcurementStatusConfig
} from '../../services/procurementService';
import { ProcurementItemModal } from './ProcurementItemModal';
import { ProcurementDetailsModal } from './ProcurementDetailsModal';
import { ProcurementExcelImportModal } from './ProcurementExcelImportModal';

interface ProcurementDashboardProps {
  settings?: SystemSettings;
}

export const ProcurementDashboard: React.FC<ProcurementDashboardProps> = ({ settings }) => {
  const { userProfile, isAdmin } = useAuth();

  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [copiedRule, setCopiedRule] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ProcurementItem | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ProcurementItem | null>(null);
  const [previewLightboxImage, setPreviewLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProcurementItems();
      setItems(data);

      const err = getLastProcurementError();
      if (err && (err.toLowerCase().includes('permission') || err.toLowerCase().includes('denied'))) {
        setPermissionError(err);
      } else {
        setPermissionError(null);
      }

      // If an item was open in details modal, update its reference in memory
      if (selectedItemForDetails) {
        const updated = data.find(i => i.id === selectedItemForDetails.id);
        if (updated) setSelectedItemForDetails(updated);
      }
    } catch (err: any) {
      console.warn('Failed to load procurement items from Firestore:', err);
      setPermissionError(err?.message || 'Missing or insufficient permissions');
    } finally {
      setLoading(false);
    }
  };

  // Guard for non-admin
  if (!isAdmin || !userProfile) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto mt-10">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Admin Access Only</h2>
        <p className="text-xs text-slate-400">
          The Procurement module is restricted to system administrators. Please contact your administrator if you require access.
        </p>
      </div>
    );
  }

  // Save new / edited enquiry
  const handleSaveItem = async (itemData: Partial<ProcurementItem>) => {
    await saveProcurementItem(itemData, userProfile);
    await loadData();
  };

  // Delete enquiry
  const handleDeleteItem = async (item: ProcurementItem) => {
    if (!confirm(`Are you sure you want to delete enquiry ${item.referenceNumber} (${item.itemName})?`)) return;
    try {
      await deleteProcurementItem(item.id, userProfile);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  // Quick inline status change
  const handleQuickStatusChange = async (itemId: string, newStatus: ProcurementStatus) => {
    try {
      await updateProcurementStatus(itemId, newStatus, `Quick status change via table dropdown`, userProfile);
      await loadData();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Export to Excel handler
  const handleExportExcel = async () => {
    if (filteredItems.length === 0) return;
    try {
      setIsExportingExcel(true);
      await downloadProcurementExcel(filteredItems, settings);
    } catch (err: any) {
      console.error('Failed to export procurement items to Excel:', err);
      alert('Failed to export to Excel: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Summary Metrics
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter(i => i.status === 'PURCHASES_POS_COMPLETED').length;
    const pendingPOs = items.filter(i => i.status === 'PENDING_POS').length;
    const urgentMaterials = items.filter(i => i.status === 'URGENTLY_REQUIRED_MATERIALS' || i.priority === 'URGENT').length;
    const expectedDeliveries = items.filter(i => i.status === 'EXPECTED_DELIVERIES').length;
    const approvalRequired = items.filter(i => i.status === 'CHAIRMAN_APPROVAL_REQUIRED').length;
    const issuesAndDelays = items.filter(i => 
      i.status === 'SUPPLIER_DELAYS' || 
      i.status === 'PRICE_SUPPLIER_ISSUES' || 
      i.status === 'MATERIAL_SHORTAGES' || 
      i.status === 'SUPPLIER_PAYMENT_ISSUES'
    ).length;
    return { total, completed, pendingPOs, urgentMaterials, expectedDeliveries, approvalRequired, issuesAndDelays };
  }, [items]);

  // Unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return Array.from(set);
  }, [items]);

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.itemName.toLowerCase().includes(query);
        const matchesRef = item.referenceNumber.toLowerCase().includes(query);
        const matchesBrand = (item.brand || '').toLowerCase().includes(query);
        const matchesModel = (item.model || '').toLowerCase().includes(query);
        const matchesCategory = (item.category || '').toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesVendor = (item.vendorQuotes || []).some(q => q.vendorName.toLowerCase().includes(query));
        const matchesProject = (item.projectReference || '').toLowerCase().includes(query);

        if (!matchesName && !matchesRef && !matchesBrand && !matchesModel && !matchesCategory && !matchesDesc && !matchesVendor && !matchesProject) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ISSUES_GROUP') {
          if (
            item.status !== 'SUPPLIER_DELAYS' &&
            item.status !== 'PRICE_SUPPLIER_ISSUES' &&
            item.status !== 'MATERIAL_SHORTAGES' &&
            item.status !== 'SUPPLIER_PAYMENT_ISSUES'
          ) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  return (
    <div className="space-y-6">

      {/* Main Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3 sm:space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Procurement & Enquiries Tracker
              </h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Admin Only</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Add and track enquired items, supplier quotations, lead times, and closing status
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-300 hover:text-white text-xs font-semibold rounded-xl border border-emerald-500/40 transition-all shadow"
            title="Import procurement items from Excel (.xlsx, .xls)"
          >
            <FileUp className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0 || isExportingExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download full Procurement Tracker spreadsheet with item calculations and vendor quotations (.xlsx)"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isExportingExcel ? 'animate-bounce' : ''}`} />
            <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={() => exportProcurementItemsToCSV(filteredItems)}
            disabled={filteredItems.length === 0}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all disabled:opacity-40"
            title="Download CSV report"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Enquiry</span>
          </button>
        </div>
      </div>

      {/* Firebase Cloud Rules Notice Banner */}
      {permissionError && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Firebase Cloud Rules Notice: Rule Needed in Firebase Console
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Cloud Firestore returned <span className="font-mono text-rose-300">"Missing or insufficient permissions"</span>. 
                  Because Firestore rules run in Google Cloud, your Firebase project <strong className="text-white">boq-maker</strong> needs the rule for the new <code className="text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded font-mono">procurementItems</code> collection.
                </p>
                <div className="text-[11px] text-emerald-400 mt-1.5 font-semibold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Local offline caching is active: you can still add, edit, and import items without losing your work!</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setPermissionError(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Copy this rule snippet to Firebase Console:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`    match /procurementItems/{itemId} {\n      allow read, write: if request.auth != null;\n    }`);
                  setCopiedRule(true);
                  setTimeout(() => setCopiedRule(false), 2500);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold underline flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedRule ? '✓ Copied to Clipboard!' : 'Copy Rule'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs text-amber-300 bg-slate-900 p-2.5 rounded-lg overflow-x-auto border border-slate-800">
{`match /procurementItems/{itemId} {
  allow read, write: if request.auth != null;
}`}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <a
              href="https://console.firebase.google.com/project/boq-maker/firestore/rules"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold underline flex items-center space-x-1"
            >
              <span>Open Firebase Console (Firestore Rules)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => loadData()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Cloud Sync</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Items</span>
            <Tag className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-1">All registered items</div>
        </div>

        <div 
          onClick={() => setStatusFilter('PENDING_POS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING_POS'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Pending POs</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">{stats.pendingPOs}</div>
          <div className="text-[10px] text-slate-500 mt-1">Pending purchase orders</div>
        </div>

        <div 
          onClick={() => setStatusFilter('EXPECTED_DELIVERIES')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'EXPECTED_DELIVERIES'
              ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-400">Expected Deliveries</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-cyan-300">{stats.expectedDeliveries}</div>
          <div className="text-[10px] text-slate-500 mt-1">In transit / scheduled</div>
        </div>

        <div 
          onClick={() => setStatusFilter('URGENTLY_REQUIRED_MATERIALS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'URGENTLY_REQUIRED_MATERIALS'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400">Urgent Materials</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-300">{stats.urgentMaterials}</div>
          <div className="text-[10px] text-slate-500 mt-1">Urgent / priority site needs</div>
        </div>

        <div 
          onClick={() => setStatusFilter('ISSUES_GROUP')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ISSUES_GROUP'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-400">Delays & Issues</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300">{stats.issuesAndDelays}</div>
          <div className="text-[10px] text-slate-500 mt-1">Supplier, price, payment</div>
        </div>

        <div 
          onClick={() => setStatusFilter('PURCHASES_POS_COMPLETED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'PURCHASES_POS_COMPLETED'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-600/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">POs Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300">{stats.completed}</div>
          <div className="text-[10px] text-slate-500 mt-1">Fulfilled and delivered</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search enquired items by name, model, vendor, ref no, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Systems / Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Horizontal Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({items.length})
          </button>

          {ACTIVE_PROCUREMENT_STATUSES.map((statusKey) => {
            const conf = PROCUREMENT_STATUS_CONFIG[statusKey];
            const count = items.filter(i => i.status === statusKey).length;
            const isActive = statusFilter === statusKey;

            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  isActive
                    ? `${conf.bgClass} ${conf.textClass} ${conf.borderClass} ring-1 ring-white/20 shadow`
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {conf.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Items Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Ref # / Date</th>
                <th className="p-3.5">Item Name & Specifications</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-center">Qty / Unit</th>
                <th className="p-3.5">Target Budget</th>
                <th className="p-3.5">Stage / Status</th>
                <th className="p-3.5">Vendor Quotes</th>
                <th className="p-3.5 text-center">Priority</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading procurement enquiries...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-400 text-sm">No procurement items found.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                        ? 'Try clearing filters or search terms.'
                        : 'Click "New Enquiry" above to log your first enquired item.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const statusConf = getProcurementStatusConfig(item.status);
                  const priorityConf = PROCUREMENT_PRIORITY_CONFIG[item.priority] || PROCUREMENT_PRIORITY_CONFIG.MEDIUM;
                  const quotesCount = item.vendorQuotes?.length || 0;

                  // Find best awarded or cheapest quote
                  const quotes = item.vendorQuotes || [];
                  const awardedQuote = quotes.find(q => q.isAwarded);
                  const lowestQuote = quotes.length > 0 ? [...quotes].sort((a, b) => a.netPrice - b.netPrice)[0] : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Ref & Date */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-400 text-xs">
                          {item.referenceNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Item Name & Specs */}
                      <td className="p-3.5 max-w-sm">
                        <div className="flex items-start space-x-2.5">
                          {item.images && item.images.length > 0 ? (
                            <div 
                              className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700 cursor-pointer group hover:border-cyan-400 shadow transition-all"
                              onClick={() => setPreviewLightboxImage(item.images![0])}
                              title="Click to view image"
                            >
                              <img 
                                src={item.images[0]} 
                                alt={item.itemName} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                              />
                              {item.images.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[8px] font-mono font-bold text-cyan-300 px-1 rounded-tl">
                                  +{item.images.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 flex-shrink-0">
                              <Package className="w-5 h-5 opacity-40" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => setSelectedItemForDetails(item)}
                              className="font-bold text-white hover:text-blue-400 transition-colors text-left line-clamp-1 block"
                            >
                              {item.itemName}
                            </button>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate">
                              {item.brand && <span className="text-slate-300 font-semibold">{item.brand}</span>}
                              {item.model && <span className="font-mono text-slate-400">({item.model})</span>}
                              {item.projectReference && (
                                <span className="text-slate-500 truncate max-w-[120px]">
                                  • {item.projectReference}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="text-slate-300 text-xs">{item.category}</span>
                      </td>

                      {/* Qty */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono font-bold text-white">
                        {item.quantity} <span className="text-slate-400 font-normal text-[11px]">{item.unit}</span>
                      </td>

                      {/* Budget */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-xs">
                        {item.targetUnitPrice ? (
                          <div>
                            <span className="text-emerald-400 font-bold">{item.targetUnitPrice.toFixed(2)}</span>{' '}
                            <span className="text-slate-400 text-[10px]">{item.currency}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status / Quick Dropdown */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="relative inline-block text-left group">
                          <select
                            value={item.status}
                            onChange={(e) => handleQuickStatusChange(item.id, e.target.value as ProcurementStatus)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border appearance-none pr-6 cursor-pointer focus:outline-none transition-colors ${statusConf.bgClass} ${statusConf.textClass} ${statusConf.borderClass}`}
                          >
                            {ACTIVE_PROCUREMENT_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-slate-900 text-white">
                                {PROCUREMENT_STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* Vendor Quotes Tracker */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedItemForDetails(item)}
                          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                            quotesCount > 0
                              ? 'bg-slate-950 border-slate-700 text-slate-200 hover:border-blue-500'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Building2 className={`w-3 h-3 ${quotesCount > 0 ? 'text-blue-400' : 'text-slate-600'}`} />
                          <span className="font-semibold">{quotesCount} quote{quotesCount !== 1 ? 's' : ''}</span>
                          {awardedQuote ? (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">
                              • {awardedQuote.netPrice.toFixed(0)} {awardedQuote.currency} (Awarded)
                            </span>
                          ) : lowestQuote ? (
                            <span className="text-[10px] text-slate-400 font-mono">
                              • min {lowestQuote.netPrice.toFixed(0)} {lowestQuote.currency}
                            </span>
                          ) : null}
                        </button>
                      </td>

                      {/* Priority */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityConf.badge} ${priorityConf.bgClass}`}>
                          {priorityConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setSelectedItemForDetails(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Enquiry & Quotes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsItemModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Edit Enquiry Specs"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Delete Enquiry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="text-white font-bold">{filteredItems.length}</span> of{' '}
              <span className="text-white font-bold">{items.length}</span> procurement enquiries
            </div>
            {filteredItems.length > 0 && (
              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 transition-colors hover:underline disabled:opacity-40"
                title="Download currently shown items as Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export ({filteredItems.length}) to Excel</span>
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-600">
            Standalone module • All records synced with Firestore procurementItems
          </div>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isItemModalOpen && (
        <ProcurementItemModal
          isOpen={isItemModalOpen}
          initialItem={editingItem}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          systemsList={settings?.systemsList}
        />
      )}

      {/* Details & Quotations Modal */}
      {selectedItemForDetails && (
        <ProcurementDetailsModal
          item={selectedItemForDetails}
          isOpen={Boolean(selectedItemForDetails)}
          onClose={() => setSelectedItemForDetails(null)}
          onRefresh={loadData}
          onEdit={(it) => {
            setSelectedItemForDetails(null);
            setEditingItem(it);
            setIsItemModalOpen(true);
          }}
          currentUser={userProfile}
        />
      )}

      {/* Excel Import Modal */}
      {isExcelModalOpen && (
        <ProcurementExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImportSuccess={() => loadData()}
          currentUser={userProfile}
        />
      )}

      {/* Lightbox Image Preview Modal */}
      {previewLightboxImage && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Base64 Item Image Preview</span>
              <button
                type="button"
                onClick={() => setPreviewLightboxImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center max-h-[80vh]">
              <img 
                src={previewLightboxImage} 
                alt="Enlarged item preview" 
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
