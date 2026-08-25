import React from 'react';
import { 
  FileSpreadsheet, 
  PlusCircle, 
  FileUp, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Bookmark, 
  Eye, 
  Edit3, 
  Layers
} from 'lucide-react';
import type { BOQ, SystemSettings } from '../../types';

interface DashboardOverviewProps {
  boqs: BOQ[];
  settings: SystemSettings;
  onCreateBOQ: () => void;
  onImportExcel: () => void;
  onViewBOQ: (boq: BOQ) => void;
  onEditBOQ: (boq: BOQ) => void;
  onOpenTemplates: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  boqs,
  settings,
  onCreateBOQ,
  onImportExcel,
  onViewBOQ,
  onEditBOQ,
  onOpenTemplates
}) => {
  const totalBOQs = boqs.length;
  const draftBOQs = boqs.filter(b => b.status === 'DRAFT').length;
  const submittedBOQs = boqs.filter(b => b.status === 'SUBMITTED').length;
  const approvedBOQs = boqs.filter(b => b.status === 'APPROVED').length;
  const rejectedBOQs = boqs.filter(b => b.status === 'REJECTED').length;

  const totalValueSAR = boqs.reduce((acc, b) => acc + (b.totalFinalValue || 0), 0);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const createdThisMonth = boqs.filter(b => (b.createdAt || '').slice(0, 7) === currentMonthStr).length;

  const recentBOQs = boqs.slice(0, 6);

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            ZAJCO ERP Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Bill of Quantities management platform for ELV, ICT, and MEP contracting engineering estimates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onCreateBOQ}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New BOQ</span>
          </button>

          <button
            onClick={onImportExcel}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <FileUp className="w-4 h-4 text-indigo-400" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={onOpenTemplates}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span>Templates</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total BOQs</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white mt-2 font-mono">{totalBOQs}</div>
          <div className="text-[11px] text-slate-500 mt-1">{createdThisMonth} created this month</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <span>Draft BOQs</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300 mt-2 font-mono">{draftBOQs}</div>
          <div className="text-[11px] text-slate-500 mt-1">Work in progress</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <span>Submitted BOQs</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-300 mt-2 font-mono">{submittedBOQs}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending review</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Approved BOQs</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">{approvedBOQs}</div>
          <div className="text-[11px] text-slate-500 mt-1">{rejectedBOQs} rejected</div>
        </div>

      </div>

      {/* Total BOQ Portfolio Value Highlight Card */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Total BOQ Portfolio Value (SAR)</span>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-1">
            SAR {totalValueSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="text-right text-xs text-slate-400">
          <div>Global Conversion Rate: <span className="text-amber-400 font-bold">1 EUR = {settings.eurToSarRate} SAR</span></div>
          <div>Company: <span className="text-slate-200 font-semibold">{settings.companyName}</span></div>
        </div>
      </div>

      {/* Recent BOQs Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <span>Recent Project BOQs</span>
          </h2>
          <span className="text-xs text-slate-500">Showing latest records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">BOQ No</th>
                <th className="p-3">Project Name</th>
                <th className="p-3">Client</th>
                <th className="p-3">System</th>
                <th className="p-3 font-mono text-right">Value (SAR)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {recentBOQs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No BOQs created yet. Click "+ Create New BOQ" to get started!
                  </td>
                </tr>
              ) : (
                recentBOQs.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-400">{b.boqNumber}</td>
                    <td className="p-3 font-semibold text-white max-w-xs truncate">{b.projectName}</td>
                    <td className="p-3 text-slate-400">{b.client || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {b.system || 'General'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      SAR {(b.totalFinalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        b.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        b.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        b.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onViewBOQ(b)}
                          className="p-1 text-slate-400 hover:text-blue-400"
                          title="View BOQ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditBOQ(b)}
                          className="p-1 text-slate-400 hover:text-amber-400"
                          title="Edit BOQ"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
