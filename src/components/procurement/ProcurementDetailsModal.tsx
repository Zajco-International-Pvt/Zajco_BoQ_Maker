import React, { useState } from 'react';
import { 
  X, 
  Package, 
  CheckCircle2, 
  Clock, 
  Send, 
  Plus, 
  Trash2, 
  Check, 
  Building2, 
  MessageSquare, 
  Edit3, 
  Award,
  FileText
} from 'lucide-react';
import type { 
  ProcurementItem, 
  ProcurementStatus, 
  VendorQuotationEntry, 
  UserProfile 
} from '../../types';
import { 
  PROCUREMENT_STATUS_CONFIG, 
  PROCUREMENT_PRIORITY_CONFIG,
  updateProcurementStatus,
  saveVendorQuotation,
  deleteVendorQuotation
} from '../../services/procurementService';

interface ProcurementDetailsModalProps {
  item: ProcurementItem;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: (item: ProcurementItem) => void;
  currentUser: UserProfile;
}

const LIFECYCLE_STEPS: ProcurementStatus[] = [
  'NEW_ENQUIRY',
  'RFQ_SENT',
  'QUOTATION_IN_PROGRESS',
  'QUOTATION_RECEIVED',
  'UNDER_EVALUATION',
  'PO_ISSUED',
  'DELIVERED',
  'CLOSED'
];

export const ProcurementDetailsModal: React.FC<ProcurementDetailsModalProps> = ({
  item,
  isOpen,
  onClose,
  onRefresh,
  onEdit,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'specs' | 'history'>('quotes');
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Vendor Quote Form
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [leadTime, setLeadTime] = useState('');
  const [quoteReference, setQuoteReference] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isAwarded, setIsAwarded] = useState(false);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStatusConfig = PROCUREMENT_STATUS_CONFIG[item.status] || PROCUREMENT_STATUS_CONFIG.NEW_ENQUIRY;
  const currentPriorityConfig = PROCUREMENT_PRIORITY_CONFIG[item.priority] || PROCUREMENT_PRIORITY_CONFIG.MEDIUM;
  const currentStepIndex = LIFECYCLE_STEPS.indexOf(item.status);

  // Handle Quick Status Advance / Change
  const handleStatusChange = async (newStatus: ProcurementStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateProcurementStatus(
        item.id,
        newStatus,
        statusNote || `Transitioned to ${PROCUREMENT_STATUS_CONFIG[newStatus].label}`,
        currentUser
      );
      setStatusNote('');
      onRefresh();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Save Vendor Quote
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setQuoteError('Vendor name is required.');
      return;
    }
    if (unitPrice <= 0) {
      setQuoteError('List unit price must be greater than 0.');
      return;
    }

    const netPrice = unitPrice * (1 - (discountPercentage || 0) / 100);

    setIsSubmittingQuote(true);
    setQuoteError(null);

    try {
      await saveVendorQuotation(
        item.id,
        {
          vendorName: vendorName.trim(),
          contactPerson: contactPerson.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          unitPrice,
          currency: item.currency,
          discountPercentage,
          netPrice,
          leadTime: leadTime.trim(),
          quoteReference: quoteReference.trim(),
          validUntil,
          isAwarded,
          notes: quoteNotes.trim()
        },
        currentUser
      );

      // Reset form
      setVendorName('');
      setContactPerson('');
      setContactPhone('');
      setContactEmail('');
      setUnitPrice(0);
      setDiscountPercentage(0);
      setLeadTime('');
      setQuoteReference('');
      setValidUntil('');
      setIsAwarded(false);
      setQuoteNotes('');
      setShowAddQuote(false);
      onRefresh();
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to record vendor quotation.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to remove this vendor quotation?')) return;
    try {
      await deleteVendorQuotation(item.id, quoteId, currentUser);
      onRefresh();
    } catch (err: any) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  // Toggle award state
  const handleToggleAward = async (quote: VendorQuotationEntry) => {
    try {
      await saveVendorQuotation(
        item.id,
        {
          ...quote,
          isAwarded: !quote.isAwarded
        },
        currentUser
      );
      onRefresh();
    } catch (err: any) {
      alert('Failed to update award status: ' + err.message);
    }
  };

  const calculatedNet = unitPrice * (1 - (discountPercentage || 0) / 100);
  const totalItemNet = calculatedNet * item.quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {item.referenceNumber}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentPriorityConfig.badge} ${currentPriorityConfig.bgClass}`}>
                {currentPriorityConfig.label} Priority
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentStatusConfig.bgClass} ${currentStatusConfig.textClass} ${currentStatusConfig.borderClass}`}>
                {currentStatusConfig.label}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <span>{item.itemName}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {item.brand && <span className="text-slate-300 font-semibold">{item.brand} </span>}
              {item.model && <span className="font-mono text-slate-400">({item.model}) </span>}
              • {item.category} • Qty: <span className="text-white font-bold">{item.quantity} {item.unit}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => { onClose(); onEdit(item); }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Specs</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lifecycle Visual Stepper */}
        <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 overflow-x-auto flex-shrink-0">
          <div className="min-w-[650px]">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
              <span className="text-xs font-bold text-slate-300">Procurement Progress Pipeline</span>
              <span>{currentStatusConfig.description}</span>
            </div>

            <div className="grid grid-cols-8 gap-1 relative">
              {LIFECYCLE_STEPS.map((stepKey, idx) => {
                const conf = PROCUREMENT_STATUS_CONFIG[stepKey];
                const isPassed = currentStepIndex >= 0 && idx <= currentStepIndex;
                const isCurrent = item.status === stepKey;

                return (
                  <button
                    key={stepKey}
                    onClick={() => handleStatusChange(stepKey)}
                    title={`Click to set stage to ${conf.label}`}
                    disabled={isUpdatingStatus}
                    className={`group text-left p-1.5 sm:p-2 rounded-xl border transition-all text-[10px] leading-tight flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                        : isPassed
                        ? 'bg-slate-900 border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[9px] opacity-70">0{idx + 1}</span>
                      {isPassed && !isCurrent ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      ) : null}
                    </div>
                    <span className="font-semibold truncate">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-slate-900 flex-shrink-0">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'quotes'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendor Quotations ({item.vendorQuotes?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'specs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Specs & Commercials</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Activity Log & Notes ({item.activityLog?.length || 0})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: Vendor Quotations Tracker */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Vendor Quotations & Pricing Comparison</h3>
                  <p className="text-xs text-slate-400">
                    Log and compare competitive pricing received from multiple vendors
                  </p>
                </div>
                <button
                  onClick={() => setShowAddQuote(!showAddQuote)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showAddQuote ? 'Close Form' : 'Log Vendor Quote'}</span>
                </button>
              </div>

              {/* Add Vendor Quote Form Drawer */}
              {showAddQuote && (
                <form onSubmit={handleSaveQuote} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      New Supplier Quotation Entry
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">Currency: {item.currency}</span>
                  </div>

                  {quoteError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                      {quoteError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        Vendor / Supplier Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tunstall Middle East / ZAJCO Direct"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Contact Person</label>
                      <input
                        type="text"
                        placeholder="Sales Engineer Name"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Phone / Mobile</label>
                      <input
                        type="text"
                        placeholder="+966 50 000 0000"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Contact Email</label>
                      <input
                        type="email"
                        placeholder="sales@vendor.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Quote Reference #</label>
                      <input
                        type="text"
                        placeholder="QT-2026-891"
                        value={quoteReference}
                        onChange={(e) => setQuoteReference(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Lead Time / Delivery</label>
                      <input
                        type="text"
                        placeholder="e.g. 3-4 weeks ex-works / In Stock"
                        value={leadTime}
                        onChange={(e) => setLeadTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Pricing row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-900">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">
                        List Price ({item.currency}) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={unitPrice || ''}
                        onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Discount %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={discountPercentage || ''}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Net Unit Price</label>
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold">
                        {calculatedNet.toFixed(2)} {item.currency}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Total ({item.quantity} {item.unit})</label>
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold">
                        {totalItemNet.toFixed(2)} {item.currency}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Quote Validity Date</label>
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Terms / Payment Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. 50% advance, 50% upon delivery"
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAwarded}
                        onChange={(e) => setIsAwarded(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Mark as Preferred / Awarded Quote</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowAddQuote(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingQuote}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow"
                      >
                        {isSubmittingQuote ? 'Saving...' : 'Save Quotation'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Vendor Quotes List Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Vendor / Supplier</th>
                      <th className="p-3">Quote Ref & Lead Time</th>
                      <th className="p-3 text-right">List Price</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Net Unit Price</th>
                      <th className="p-3 text-right">Total ({item.quantity} {item.unit})</th>
                      <th className="p-3 text-center">Awarded</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {(!item.vendorQuotes || item.vendorQuotes.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
                          <p className="font-semibold text-slate-400">No vendor quotations logged yet.</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Click <span className="text-blue-400 font-semibold">"Log Vendor Quote"</span> above to compare supplier prices.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      item.vendorQuotes.map((q) => {
                        const total = q.netPrice * item.quantity;
                        return (
                          <tr key={q.id} className={`hover:bg-slate-900/40 transition-colors ${q.isAwarded ? 'bg-emerald-950/20' : ''}`}>
                            <td className="p-3">
                              <div className="font-bold text-white flex items-center space-x-1.5">
                                <span>{q.vendorName}</span>
                                {q.isAwarded && (
                                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                    Awarded
                                  </span>
                                )}
                              </div>
                              {(q.contactPerson || q.contactPhone) && (
                                <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                  {q.contactPerson && <span>{q.contactPerson}</span>}
                                  {q.contactPhone && <span>• {q.contactPhone}</span>}
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="font-mono text-slate-300">{q.quoteReference || '—'}</div>
                              <div className="text-[10px] text-slate-400">{q.leadTime || 'Lead time unstated'}</div>
                            </td>

                            <td className="p-3 text-right font-mono text-slate-400">
                              {q.unitPrice.toFixed(2)} {q.currency}
                            </td>

                            <td className="p-3 text-right font-mono text-amber-400">
                              {q.discountPercentage ? `${q.discountPercentage}%` : '0%'}
                            </td>

                            <td className="p-3 text-right font-mono font-bold text-white">
                              {q.netPrice.toFixed(2)} {q.currency}
                            </td>

                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {total.toFixed(2)} {q.currency}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleToggleAward(q)}
                                title={q.isAwarded ? 'Unmark Awarded' : 'Mark as Awarded Quote'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  q.isAwarded 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                              >
                                <Award className="w-4 h-4" />
                              </button>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteQuote(q.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                                title="Remove quote"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Specifications & Commercials */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">System / Category</span>
                  <span className="text-sm font-semibold text-white">{item.category}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Brand & Model</span>
                  <span className="text-sm font-semibold text-white">
                    {item.brand || 'Any Approved'} {item.model ? `(${item.model})` : ''}
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Required Quantity</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {item.quantity} {item.unit}
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Target Unit Price</span>
                  <span className="text-sm font-mono font-bold text-white">
                    {item.targetUnitPrice ? `${item.targetUnitPrice.toFixed(2)} ${item.currency}` : 'Not Specified'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Estimated Total Budget</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {item.targetUnitPrice ? `${(item.targetUnitPrice * item.quantity).toFixed(2)} ${item.currency}` : '—'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Expected Delivery Date</span>
                  <span className="text-sm font-semibold text-white">
                    {item.expectedDate ? new Date(item.expectedDate).toLocaleDateString() : 'Immediate / Open'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Project / Client Reference</span>
                  <span className="text-sm font-semibold text-white">{item.projectReference || 'None'}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Requested By</span>
                  <span className="text-sm font-semibold text-white">{item.requestedBy || 'Unspecified'}</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Assigned Buyer</span>
                  <span className="text-sm font-semibold text-white">{item.assignedTo || 'Unassigned'}</span>
                </div>
              </div>

              {/* Technical Specifications Text */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Technical Description & Specifications</span>
                </span>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {item.description || 'No technical specification provided.'}
                </p>
              </div>

              {item.notes && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-400 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                    <span>Internal Procurement Remarks</span>
                  </span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Activity Log & Notes */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Quick Status Note Sender */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a log update or status note..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  disabled={!statusNote.trim() || isUpdatingStatus}
                  onClick={() => handleStatusChange(item.status)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>

              {/* Timeline list */}
              <div className="space-y-2">
                {(!item.activityLog || item.activityLog.length === 0) ? (
                  <div className="text-center py-6 text-slate-500 text-xs">No activity logged yet.</div>
                ) : (
                  [...item.activityLog].reverse().map((act) => (
                    <div key={act.id} className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{act.authorName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{act.note || act.action}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="text-[11px] text-slate-400">
            Created: <span className="text-slate-300">{new Date(item.createdAt).toLocaleDateString()}</span> by{' '}
            <span className="text-white font-medium">{item.createdByName || 'Admin'}</span>
          </div>

          <div className="flex items-center space-x-2">
            {item.status !== 'CLOSED' && (
              <button
                onClick={() => handleStatusChange('CLOSED')}
                disabled={isUpdatingStatus}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Closed</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
