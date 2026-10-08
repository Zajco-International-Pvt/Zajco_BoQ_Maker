import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  Edit3,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Search,
  Calendar,
  User,
  Building,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Tag,
  Wrench,
  Bookmark
} from 'lucide-react';
import type { BOQ, SystemSettings } from '../../types';
import { getCurrencySymbol } from '../../types';
import { exportBOQToExcel, triggerExcelDownload } from '../../services/excelService';
import { exportBOQToPDF } from '../../services/pdfService';
import { isInstallationItem } from '../../services/boqService';

interface BOQViewModalProps {
  boq: BOQ | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (boq: BOQ) => void;
  settings: SystemSettings;
  canEdit?: boolean;
}

export const BOQViewModal: React.FC<BOQViewModalProps> = ({
  boq,
  isOpen,
  onClose,
  onEdit,
  settings,
  canEdit = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'summary' | 'notes'>('items');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !boq) return null;

  const currencySymbol = getCurrencySymbol(boq.currency || 'EUR');
  const currencyCode = boq.currency || 'EUR';
  const conversionRate = boq.conversionRate || 5.0;

  // Copy BOQ number to clipboard
  const handleCopyNumber = () => {
    if (boq.boqNumber) {
      navigator.clipboard.writeText(boq.boqNumber);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  // Export to Excel
  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const { blob, filename } = await exportBOQToExcel(boq, settings);
      triggerExcelDownload(blob, filename);
    } catch (err) {
      console.error('Failed to export BOQ to Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to PDF
  const handleDownloadPDF = () => {
    try {
      exportBOQToPDF(boq, settings);
    } catch (err) {
      console.error('Failed to export BOQ to PDF:', err);
    }
  };

  // Format numbers
  const fmt = (val?: number, decimals: number = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Status Styling
  const getStatusBadge = () => {
    switch (boq.status) {
      case 'APPROVED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'SUBMITTED':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-blue-400" />,
          classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        };
      case 'ARCHIVED':
        return {
          icon: <Bookmark className="w-3.5 h-3.5 text-slate-400" />,
          classes: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
        };
      case 'DRAFT':
      default:
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />,
          classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        };
    }
  };

  const statusBadge = getStatusBadge();

  // Filter items
  const items = boq.items || [];
  const filteredItems = items.filter(it => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (it.description || '').toLowerCase().includes(term) ||
      (it.brand || '').toLowerCase().includes(term) ||
      (it.model || '').toLowerCase().includes(term) ||
      (it.pricingSource || '').toLowerCase().includes(term) ||
      (it.notes || '').toLowerCase().includes(term)
    );
  });

  // Calculate quick metrics if not present
  const totalItemsCount = items.filter(i => !i.isHeader).length;
  const installationItemsCount = items.filter(i => !i.isHeader && (i.isInstallation || isInstallationItem(i))).length;
  const supplyItemsCount = totalItemsCount - installationItemsCount;

  const totalEUR = boq.totalEUR || 0;
  const totalSAR = boq.totalSAR || 0;
  const totalFinalValue = boq.totalFinalValue || 0;
  const totalProfit = boq.totalProfit || (totalFinalValue - totalSAR);
  const profitMarginPercent = totalFinalValue > 0 ? ((totalProfit / totalFinalValue) * 100) : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm sm:text-base font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20 flex items-center gap-1.5">
                <span>{boq.boqNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  title="Copy BOQ Number"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>

              <span className={`inline-flex items-center space-x-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${statusBadge.classes}`}>
                {statusBadge.icon}
                <span>{boq.status}</span>
              </span>

              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Eye className="w-3 h-3 text-blue-400" />
                <span>Read-Only Preview</span>
              </span>

              {boq.revision !== undefined && boq.revision > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                  Rev {boq.revision}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{boq.projectName || 'Untitled BOQ Project'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {boq.client && <span>Client: <strong className="text-slate-200">{boq.client}</strong> • </span>}
              System: <strong className="text-slate-200">{boq.system || 'General'}</strong>
              {boq.brand && <span> • Brand: <strong className="text-slate-200">{boq.brand}</strong></span>}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all disabled:opacity-50"
              title="Download as Excel Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExportingExcel ? 'Exporting...' : 'Excel'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all"
              title="Download as PDF Document"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>

            {canEdit && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(boq);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                title="Open in BOQ Editor to make changes"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit BOQ</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Sub-Bar: Project Details */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-4 sm:px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs flex-shrink-0">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Date</span>
            <span className="text-slate-200 font-medium font-mono flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              {boq.date || '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Prepared By</span>
            <span className="text-slate-200 font-medium truncate flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-slate-400" />
              {boq.preparedBy || '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Checked By</span>
            <span className="text-slate-200 font-medium truncate flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              {boq.checkedBy || '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Contractor</span>
            <span className="text-slate-200 font-medium truncate flex items-center gap-1 mt-0.5">
              <Building className="w-3 h-3 text-slate-400" />
              {boq.contractor || '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Consultant / Location</span>
            <span className="text-slate-200 font-medium truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              {boq.location || boq.consultant || '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Currency & Rate</span>
            <span className="text-slate-200 font-medium font-mono flex items-center gap-1 mt-0.5">
              <DollarSign className="w-3 h-3 text-blue-400" />
              {currencyCode} ({currencySymbol}) • {conversionRate} SAR
            </span>
          </div>
        </div>

        {/* Financial Highlights KPI Cards */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 flex-shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Base Currency Cost */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Purchase Cost ({currencyCode})</span>
                <span className="text-slate-500 font-mono">{currencySymbol}</span>
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-100 mt-1">
                {currencySymbol} {fmt(totalEUR)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Foreign purchase bill
              </div>
            </div>

            {/* Total Cost in SAR */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Cost (SAR)</span>
                <span className="text-slate-500 font-mono">SAR</span>
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-slate-100 mt-1">
                SAR {fmt(totalSAR)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Converted base landing cost
              </div>
            </div>

            {/* Total Profit Margin */}
            <div className="bg-slate-950/70 border border-blue-900/30 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center justify-between">
                <span>Gross Profit Margin</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-blue-400 mt-1">
                SAR {fmt(totalProfit)}
              </div>
              <div className="text-[10px] text-blue-400/80 mt-0.5 font-semibold">
                {fmt(profitMarginPercent, 1)}% Margin on sales
              </div>
            </div>

            {/* Final Quoted Selling Price */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950/80 to-slate-950 border border-emerald-500/30 rounded-xl p-3 shadow-lg shadow-emerald-950/20">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>Total Final Value (SAR)</span>
                <span className="text-xs font-mono font-bold text-emerald-400">GRAND TOTAL</span>
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-300 mt-1">
                SAR {fmt(totalFinalValue)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5 font-medium">
                Quotation selling value
              </div>
            </div>

          </div>

          {/* Breakdown Pills: Supply vs Installation & Item Count */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Total Items: <strong className="text-slate-200">{totalItemsCount}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Supply Items: <strong className="text-slate-200">{supplyItemsCount}</strong></span>
              </span>
              {installationItemsCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Installation / Services: <strong className="text-amber-300 font-semibold">{installationItemsCount}</strong></span>
                </span>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activeTab === 'items'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Line Items ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Financial Summary
              </button>
              {(boq.notes || boq.approvalNotes) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    activeTab === 'notes'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Notes & Details
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* TAB 1: LINE ITEMS TABLE */}
          {activeTab === 'items' && (
            <div className="space-y-3">
              
              {/* Search & Counter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter preview items by description, model, brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-medium">
                    Showing <span className="text-white font-bold">{filteredItems.length}</span> of {items.length} items
                  </span>
                </div>
              </div>

              {/* Read-Only Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800 select-none">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3 min-w-[240px]">Description & Specifications</th>
                        <th className="p-3 w-28">Source</th>
                        <th className="p-3 w-16 text-right">Qty</th>
                        <th className="p-3 w-24 text-right">Unit ({currencySymbol})</th>
                        <th className="p-3 w-24 text-right">Total ({currencySymbol})</th>
                        <th className="p-3 w-24 text-right">Unit (SAR)</th>
                        <th className="p-3 w-28 text-right">Total Cost (SAR)</th>
                        <th className="p-3 w-16 text-right">Margin %</th>
                        <th className="p-3 w-28 text-right">Sell Unit (SAR)</th>
                        <th className="p-3 w-32 text-right">Sell Total (SAR)</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/70 text-slate-300">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-slate-500">
                            {searchTerm 
                              ? `No items found matching "${searchTerm}".` 
                              : 'No line items recorded for this BOQ.'}
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, idx) => {
                          // Section Header Row
                          if (item.isHeader) {
                            return (
                              <tr key={item.id || idx} className="bg-slate-800/70 border-y border-slate-700/80">
                                <td colSpan={11} className="p-2.5 font-bold text-blue-300 tracking-wide text-xs">
                                  <div className="flex items-center space-x-2">
                                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{item.description || 'SECTION HEADER'}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const isInstallation = item.isInstallation || isInstallationItem(item);

                          return (
                            <tr 
                              key={item.id || idx} 
                              className={`hover:bg-slate-800/40 transition-colors ${
                                isInstallation ? 'bg-amber-950/10' : ''
                              }`}
                            >
                              {/* Serial Number */}
                              <td className="p-3 text-center font-mono text-slate-400">
                                {item.serialNumber || idx + 1}
                              </td>

                              {/* Description & Specs */}
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-200">
                                    {item.description}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    {isInstallation && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                                        <Wrench className="w-2.5 h-2.5" />
                                        <span>Installation / Service</span>
                                      </span>
                                    )}
                                    {item.brand && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                                        {item.brand}
                                      </span>
                                    )}
                                    {item.model && (
                                      <span className="font-mono text-slate-400">
                                        Mod: {item.model}
                                      </span>
                                    )}
                                    {item.notes && (
                                      <span className="text-slate-500 italic">
                                        Note: {item.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Pricing Source */}
                              <td className="p-3 text-[11px] text-slate-400">
                                <span className="truncate block max-w-[110px]" title={item.pricingSource}>
                                  {item.pricingSource || '-'}
                                </span>
                              </td>

                              {/* Quantity */}
                              <td className="p-3 text-right font-mono font-bold text-white">
                                {item.quantity}
                              </td>

                              {/* Unit Price (EUR/Foreign) */}
                              <td className="p-3 text-right font-mono text-slate-300">
                                {item.unitPriceEUR ? fmt(item.unitPriceEUR) : '-'}
                              </td>

                              {/* Total Price (EUR/Foreign) */}
                              <td className="p-3 text-right font-mono text-slate-300">
                                {item.totalEUR ? fmt(item.totalEUR) : '-'}
                              </td>

                              {/* Unit Price (SAR) */}
                              <td className="p-3 text-right font-mono text-slate-300">
                                {fmt(item.unitPriceSAR)}
                              </td>

                              {/* Total Cost (SAR) */}
                              <td className="p-3 text-right font-mono font-semibold text-slate-200">
                                {fmt(item.totalSAR)}
                              </td>

                              {/* Profit Percentage */}
                              <td className="p-3 text-right font-mono">
                                {item.profitPercentage !== null && item.profitPercentage !== undefined ? (
                                  <span className="text-blue-400 font-semibold">
                                    {item.profitPercentage}%
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              {/* Sell Unit Price (SAR) */}
                              <td className="p-3 text-right font-mono text-emerald-400 font-medium">
                                {fmt(item.unitPriceProfitIncl)}
                              </td>

                              {/* Sell Total Price (SAR) */}
                              <td className="p-3 text-right font-mono font-bold text-emerald-300">
                                {fmt(item.totalProfitIncl)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Table Summary Footer */}
                    {items.length > 0 && (
                      <tfoot className="bg-slate-900/90 font-bold text-slate-200 border-t-2 border-slate-700">
                        <tr>
                          <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-[11px] text-slate-400">
                            Totals Summary:
                          </td>
                          <td className="p-3 text-right font-mono text-white font-black">
                            {items.reduce((acc, i) => acc + (i.isHeader ? 0 : (Number(i.quantity) || 0)), 0)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">-</td>
                          <td className="p-3 text-right font-mono text-slate-200">
                            {currencySymbol} {fmt(totalEUR)}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">-</td>
                          <td className="p-3 text-right font-mono text-slate-200">
                            SAR {fmt(totalSAR)}
                          </td>
                          <td className="p-3 text-right font-mono text-blue-400">
                            {fmt(profitMarginPercent, 1)}%
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">-</td>
                          <td className="p-3 text-right font-mono text-emerald-300 text-sm font-black">
                            SAR {fmt(totalFinalValue)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL SUMMARY BREAKDOWN */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Cost & Procurement Summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                    <span>Cost & Procurement Analysis</span>
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Foreign Currency Purchase Total:</span>
                      <span className="font-mono font-bold text-white">{currencySymbol} {fmt(totalEUR)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Applied Exchange Rate:</span>
                      <span className="font-mono text-slate-200">1 {currencyCode} = {conversionRate} SAR</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Base Landed Cost in SAR:</span>
                      <span className="font-mono font-bold text-white">SAR {fmt(totalSAR)}</span>
                    </div>
                    {boq.calculationSummary?.purchaseBillAmountSAR !== undefined && (
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Purchase Bill (Supply Only SAR):</span>
                        <span className="font-mono text-slate-300">SAR {fmt(boq.calculationSummary.purchaseBillAmountSAR)}</span>
                      </div>
                    )}
                    {boq.calculationSummary?.installationAmount !== undefined && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Installation & Services Quoted:</span>
                        <span className="font-mono text-amber-300 font-semibold">SAR {fmt(boq.calculationSummary.installationAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit & Commercial Summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Commercial & Profit Margins</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Gross Margin SAR:</span>
                      <span className="font-mono font-bold text-blue-400">SAR {fmt(totalProfit)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Margin Percentage on Total:</span>
                      <span className="font-mono font-bold text-blue-400">{fmt(profitMarginPercent, 2)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Line Items Count:</span>
                      <span className="font-mono text-slate-200">{totalItemsCount}</span>
                    </div>
                    <div className="flex justify-between py-1.5 bg-emerald-950/30 px-2 rounded-lg border border-emerald-500/20 mt-2">
                      <span className="text-emerald-400 font-bold uppercase text-[11px]">Final Client Price (SAR):</span>
                      <span className="font-mono font-black text-emerald-300 text-sm">SAR {fmt(totalFinalValue)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: NOTES & METADATA */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {boq.notes && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Project & Commercial Notes
                  </h4>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {boq.notes}
                  </p>
                </div>
              )}

              {boq.approvalNotes && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Approval / Review Notes
                  </h4>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {boq.approvalNotes}
                  </p>
                </div>
              )}

              {boq.revisionHistory && boq.revisionHistory.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Revision History
                  </h4>
                  <div className="space-y-2">
                    {boq.revisionHistory.map((rev, i) => (
                      <div key={i} className="text-xs border-b border-slate-800/60 pb-2 last:border-b-0">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-bold text-slate-200">Revision #{rev.revisionNumber}</span>
                          <span className="font-mono">{rev.createdAt?.slice(0, 10)} by {rev.createdByName}</span>
                        </div>
                        {rev.notes && <p className="text-slate-400 mt-1 italic">{rev.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>
              Preview mode is strictly read-only. Data modifications are disabled.
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Close
            </button>

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(boq);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit This BOQ</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
