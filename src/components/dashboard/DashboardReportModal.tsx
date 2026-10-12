import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Filter,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  RotateCcw
} from 'lucide-react';
import type { BOQ, SystemSettings } from '../../types';
import { exportDashboardBOQReportToExcel, triggerExcelDownload } from '../../services/excelService';
import { exportDashboardBOQReportToPDF } from '../../services/pdfService';

interface DashboardReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boqs: BOQ[];
  settings: SystemSettings;
}

type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'CUSTOM';

export const DashboardReportModal: React.FC<DashboardReportModalProps> = ({
  isOpen,
  onClose,
  boqs,
  settings
}) => {
  const [systemFilter, setSystemFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [preparedByFilter, setPreparedByFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Extract unique preparedBy list
  const uniquePreparedByList = useMemo(() => {
    const set = new Set<string>();
    boqs.forEach(b => {
      if (b.preparedBy && b.preparedBy.trim()) {
        set.add(b.preparedBy.trim());
      }
    });
    return Array.from(set).sort();
  }, [boqs]);

  // Filtered BOQs based on criteria
  const filteredBOQs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return boqs.filter(b => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          (b.boqNumber || '').toLowerCase().includes(query) ||
          (b.projectName || '').toLowerCase().includes(query) ||
          (b.brand || '').toLowerCase().includes(query) ||
          (b.system || '').toLowerCase().includes(query) ||
          (b.preparedBy || '').toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // 2. System Filter
      if (systemFilter !== 'ALL' && b.system !== systemFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }

      // 4. Prepared By Filter
      if (preparedByFilter !== 'ALL' && b.preparedBy !== preparedByFilter) {
        return false;
      }

      // 5. Date Filter
      const boqDate = b.date || (b.createdAt ? b.createdAt.slice(0, 10) : '');

      if (datePreset === 'THIS_MONTH') {
        if (!boqDate || !boqDate.startsWith(thisMonthStr)) return false;
      } else if (datePreset === 'LAST_30_DAYS') {
        if (!boqDate || boqDate < thirtyDaysAgo || boqDate > todayStr) return false;
      } else if (datePreset === 'THIS_YEAR') {
        if (!boqDate || !boqDate.startsWith(thisYearStr)) return false;
      } else if (datePreset === 'CUSTOM') {
        if (customStartDate && boqDate < customStartDate) return false;
        if (customEndDate && boqDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    boqs,
    searchQuery,
    systemFilter,
    statusFilter,
    preparedByFilter,
    datePreset,
    customStartDate,
    customEndDate
  ]);

  // Computed summary metrics
  const totalCount = filteredBOQs.length;
  const totalValueSAR = useMemo(
    () => filteredBOQs.reduce((acc, b) => acc + (b.totalFinalValue || 0), 0),
    [filteredBOQs]
  );
  const avgValueSAR = totalCount > 0 ? totalValueSAR / totalCount : 0;

  const approvedCount = useMemo(() => filteredBOQs.filter(b => b.status === 'APPROVED').length, [filteredBOQs]);
  const submittedCount = useMemo(() => filteredBOQs.filter(b => b.status === 'SUBMITTED').length, [filteredBOQs]);
  const draftCount = useMemo(() => filteredBOQs.filter(b => b.status === 'DRAFT').length, [filteredBOQs]);
  const rejectedCount = useMemo(() => filteredBOQs.filter(b => b.status === 'REJECTED').length, [filteredBOQs]);

  // Reset Filters
  const handleResetFilters = () => {
    setSystemFilter('ALL');
    setStatusFilter('ALL');
    setPreparedByFilter('ALL');
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
  };

  const getFiltersDescription = () => {
    const parts: string[] = [];
    if (systemFilter !== 'ALL') parts.push(`System: ${systemFilter}`);
    if (statusFilter !== 'ALL') parts.push(`Status: ${statusFilter}`);
    if (preparedByFilter !== 'ALL') parts.push(`By: ${preparedByFilter}`);
    if (datePreset !== 'ALL') {
      if (datePreset === 'THIS_MONTH') parts.push('This Month');
      else if (datePreset === 'LAST_30_DAYS') parts.push('Last 30 Days');
      else if (datePreset === 'THIS_YEAR') parts.push('This Year');
      else if (datePreset === 'CUSTOM') parts.push(`${customStartDate || 'Start'} to ${customEndDate || 'End'}`);
    } else {
      parts.push('All Time');
    }
    return parts.join(' | ') || 'All Records';
  };

  // Export Excel
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setStatusMessage(null);
    try {
      const { blob, filename } = await exportDashboardBOQReportToExcel(filteredBOQs, settings, {
        system: systemFilter,
        status: statusFilter,
        dateRange: getFiltersDescription(),
        preparedBy: preparedByFilter
      });
      triggerExcelDownload(blob, filename);
      setStatusMessage('Excel report downloaded successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Excel report export error:', err);
      setStatusMessage('Failed to generate Excel report. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setStatusMessage(null);
    try {
      exportDashboardBOQReportToPDF(filteredBOQs, settings, {
        system: systemFilter,
        status: statusFilter,
        dateRange: getFiltersDescription(),
        preparedBy: preparedByFilter
      });
      setStatusMessage('PDF report generated and downloaded successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('PDF report export error:', err);
      setStatusMessage('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Quick Print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/70 border-b border-slate-800 p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                <span>BOQ Portfolio Report Generator</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                  Executive Suite
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate and download comprehensive portfolio analytics and BOQ register schedules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 flex items-center justify-between text-xs font-medium text-emerald-300">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">

          {/* Filters Bar */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" />
                <span>Filter Criteria</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-blue-400 flex items-center space-x-1 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Date Preset */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Date Period</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Time</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                  <option value="CUSTOM">Custom Date Range</option>
                </select>
              </div>

              {/* System Filter */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">System</label>
                <select
                  value={systemFilter}
                  onChange={(e) => setSystemFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Systems</option>
                  {settings.systemsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Prepared By Filter */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Prepared By</label>
                <select
                  value={preparedByFilter}
                  onChange={(e) => setPreparedByFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Engineers</option>
                  {uniquePreparedByList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Custom Date Range Row (Conditional) */}
            {datePreset === 'CUSTOM' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Matching BOQs</div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">{totalCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">out of {boqs.length} total</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>Total Value</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-1 truncate">
                SAR {totalValueSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Avg: SAR {avgValueSAR.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Approved</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">{approvedCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{submittedCount} submitted</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Draft & Rejected</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-1">{draftCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{rejectedCount} rejected</div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <span>Report Register Preview ({totalCount} records)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Scope: {getFiltersDescription()}
                </span>
              </div>

              {/* Table search filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="max-h-64 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase sticky top-0 border-b border-slate-800 z-10">
                    <tr>
                      <th className="p-2.5 text-center">#</th>
                      <th className="p-2.5">BOQ No</th>
                      <th className="p-2.5">Project Name</th>
                      <th className="p-2.5">System</th>
                      <th className="p-2.5">Brand</th>
                      <th className="p-2.5">Prepared By</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right font-mono">Value (SAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredBOQs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          No BOQs match the selected criteria. Try adjusting the filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBOQs.map((b, idx) => (
                        <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">{b.boqNumber}</td>
                          <td className="p-2.5 text-slate-300 max-w-xs truncate">{b.projectName || '-'}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                              {b.system || 'General'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400 whitespace-nowrap">{b.brand || '-'}</td>
                          <td className="p-2.5 text-slate-300 whitespace-nowrap">{b.preparedBy || '-'}</td>
                          <td className="p-2.5 font-mono text-slate-400 whitespace-nowrap">{b.date || '-'}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              b.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              b.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                              b.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                              'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            SAR {(b.totalFinalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            <span>Includes </span>
            <span className="font-bold text-white">{totalCount}</span>
            <span> records totaling </span>
            <span className="font-mono font-bold text-emerald-400">SAR {totalValueSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Excel Download */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || totalCount === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Download full multi-sheet Excel report (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExportingExcel ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
            </button>

            {/* PDF Download */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || totalCount === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Download executive landscape PDF report (.pdf)"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingPDF ? 'Generating PDF...' : 'Export PDF (.pdf)'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={totalCount === 0}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Print current report view"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
