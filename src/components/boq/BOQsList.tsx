import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Download, 
  Copy, 
  Trash2, 
  FileText,
  Plus,
  RefreshCw
} from 'lucide-react';
import type { BOQ, BOQStatus, SystemSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { exportBOQToExcel, triggerExcelDownload } from '../../services/excelService';
import { exportBOQToPDF } from '../../services/pdfService';
import { duplicateBOQ, updateBOQStatus, deleteBOQ } from '../../services/boqService';

interface BOQsListProps {
  boqs: BOQ[];
  settings: SystemSettings;
  isLoading?: boolean;
  onEditBOQ: (boq: BOQ) => void;
  onViewBOQ: (boq: BOQ) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
}

export const BOQsList: React.FC<BOQsListProps> = ({
  boqs,
  settings,
  isLoading = false,
  onEditBOQ,
  onViewBOQ,
  onCreateNew,
  onRefresh
}) => {
  const { userProfile, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [systemFilter, setSystemFilter] = useState<string>('ALL');

  // Filtered BOQs
  const filteredBOQs = boqs.filter(b => {
    const matchesSearch = 
      (b.boqNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.system || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.preparedBy && b.preparedBy.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSystem = systemFilter === 'ALL' || b.system === systemFilter;

    return matchesSearch && matchesStatus && matchesSystem;
  });

  // Handle Approve / Reject
  const handleStatusChange = async (boq: BOQ, newStatus: BOQStatus) => {
    try {
      await updateBOQStatus(boq.id, newStatus, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async (boq: BOQ) => {
    try {
      await duplicateBOQ(boq, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Excel Download
  const handleDownloadExcel = async (boq: BOQ) => {
    try {
      const { blob, filename } = await exportBOQToExcel(boq, settings);
      triggerExcelDownload(blob, filename);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle PDF Download
  const handleDownloadPDF = (boq: BOQ) => {
    exportBOQToPDF(boq, settings);
  };

  // Handle Delete
  const handleDelete = async (boq: BOQ) => {
    if (!window.confirm(`Are you sure you want to delete BOQ ${boq.boqNumber}?`)) return;
    try {
      await deleteBOQ(boq.id, userProfile?.uid || '', userProfile?.name || '', userProfile?.email || '');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            <span>BOQ Management & Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, edit, approve, and export all project Bill of Quantities
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            title="Refresh BOQs List"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New BOQ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by BOQ #, System, Brand, Prepared by..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Status</option>
              <option value="DRAFT" className="bg-slate-900">Draft</option>
              <option value="SUBMITTED" className="bg-slate-900">Submitted</option>
              <option value="APPROVED" className="bg-slate-900">Approved</option>
              <option value="REJECTED" className="bg-slate-900">Rejected</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">System:</span>
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Systems</option>
              {settings.systemsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">BOQ No</th>
                <th className="p-3.5">System</th>
                <th className="p-3.5">Brand</th>
                <th className="p-3.5">Prepared By</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Value (SAR)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredBOQs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No BOQs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBOQs.map((boq) => {
                  const canEdit = isAdmin || boq.status === 'DRAFT' || boq.status === 'REJECTED';

                  return (
                    <tr key={boq.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-400">
                        <div>{boq.boqNumber}</div>
                        {boq.projectName && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{boq.projectName}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {boq.system || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300">{boq.brand || '-'}</td>
                      <td className="p-3.5 text-slate-400">{boq.preparedBy || '-'}</td>
                      <td className="p-3.5 text-slate-400 font-mono">{boq.date}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                        SAR {(boq.totalFinalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                          boq.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          boq.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          boq.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          {boq.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onViewBOQ(boq)}
                            title="View Details"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => onEditBOQ(boq)}
                              title="Edit BOQ"
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && boq.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(boq, 'APPROVED')}
                                title="Approve BOQ"
                                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(boq, 'REJECTED')}
                                title="Reject BOQ"
                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDownloadExcel(boq)}
                            title="Download Excel Spreadsheet"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadPDF(boq)}
                            title="Download PDF Document"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(boq)}
                            title="Duplicate BOQ"
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(boq)}
                              title="Delete BOQ"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
