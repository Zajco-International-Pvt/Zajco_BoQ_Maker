import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Layers, 
  DollarSign, 
  Calendar, 
  User, 
  AlertCircle,
  Save,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Eye,
  Loader2
} from 'lucide-react';
import type { ProcurementItem, ProcurementStatus, ProcurementPriority } from '../../types';
import { 
  PROCUREMENT_STATUS_CONFIG, 
  PROCUREMENT_PRIORITY_CONFIG,
  ACTIVE_PROCUREMENT_STATUSES,
  normalizeProcurementStatus,
  convertFileToBase64 
} from '../../services/procurementService';

interface ProcurementItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ProcurementItem>) => Promise<void>;
  initialItem?: ProcurementItem | null;
  systemsList?: string[];
}

const DEFAULT_CATEGORIES = [
  'CCTV & Surveillance',
  'Access Control & Attendance',
  'Nurse Call System',
  'Fire Alarm & Life Safety',
  'Public Address & Audio Visual',
  'Structured Cabling & Fiber',
  'Active Networking & Switches',
  'IP Telephony & Intercom',
  'Building Management (BMS)',
  'UPS & Power Systems',
  'ELV / MEP General',
  'Other Materials'
];

export const ProcurementItemModal: React.FC<ProcurementItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  systemsList = []
}) => {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('CCTV & Surveillance');
  const [customCategory, setCustomCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('pcs');
  const [targetUnitPrice, setTargetUnitPrice] = useState<string>('');
  const [currency, setCurrency] = useState('SAR');
  const [priority, setPriority] = useState<ProcurementPriority>('MEDIUM');
  const [status, setStatus] = useState<ProcurementStatus>('PENDING_POS');
  const [requestedBy, setRequestedBy] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [projectReference, setProjectReference] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...systemsList]));

  useEffect(() => {
    if (initialItem) {
      setItemName(initialItem.itemName || '');
      if (categories.includes(initialItem.category)) {
        setCategory(initialItem.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(initialItem.category || '');
      }
      setBrand(initialItem.brand || '');
      setModel(initialItem.model || '');
      setDescription(initialItem.description || '');
      setQuantity(initialItem.quantity || 1);
      setUnit(initialItem.unit || 'pcs');
      setTargetUnitPrice(initialItem.targetUnitPrice !== undefined ? String(initialItem.targetUnitPrice) : '');
      setCurrency(initialItem.currency || 'SAR');
      setPriority(initialItem.priority || 'MEDIUM');
      setStatus(initialItem.status ? normalizeProcurementStatus(initialItem.status) : 'PENDING_POS');
      setRequestedBy(initialItem.requestedBy || '');
      setAssignedTo(initialItem.assignedTo || '');
      setProjectReference(initialItem.projectReference || '');
      setExpectedDate(initialItem.expectedDate || '');
      setNotes(initialItem.notes || '');
      setImages(initialItem.images || []);
    } else {
      resetForm();
    }
  }, [initialItem, isOpen]);

  const resetForm = () => {
    setItemName('');
    setCategory(categories[0] || 'CCTV & Surveillance');
    setCustomCategory('');
    setBrand('');
    setModel('');
    setDescription('');
    setQuantity(1);
    setUnit('pcs');
    setTargetUnitPrice('');
    setCurrency('SAR');
    setPriority('MEDIUM');
    setStatus('PENDING_POS');
    setRequestedBy('');
    setAssignedTo('');
    setProjectReference('');
    setExpectedDate('');
    setNotes('');
    setImages([]);
    setErrorMsg(null);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    setErrorMsg(null);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const base64 = await convertFileToBase64(file);
          newImages.push(base64);
        }
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process image upload.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrorMsg('Item name is required.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    const finalCategory = category === 'Other' && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSave({
        ...(initialItem?.id ? { id: initialItem.id } : {}),
        itemName: itemName.trim(),
        category: finalCategory,
        brand: brand.trim(),
        model: model.trim(),
        description: description.trim(),
        images: images,
        quantity: Number(quantity) || 1,
        unit: unit.trim() || 'pcs',
        targetUnitPrice: targetUnitPrice ? parseFloat(targetUnitPrice) : undefined,
        currency,
        priority,
        status,
        requestedBy: requestedBy.trim(),
        assignedTo: assignedTo.trim(),
        projectReference: projectReference.trim(),
        expectedDate,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save procurement enquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {initialItem ? 'Edit Procurement Enquiry' : 'Log New Item Enquiry'}
              </h2>
              <p className="text-xs text-slate-400">
                {initialItem 
                  ? `Updating Reference ${initialItem.referenceNumber}` 
                  : 'Track a new enquired item through supplier quotation stages'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Item Identification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Item & Specification Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Item Name / Equipment Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IP Nurse Call Patient Station with Audio"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">System / Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other (Custom Category)</option>
                </select>
              </div>

              {category === 'Other' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Custom Category Name</label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Brand / Preferred Make</label>
                <input
                  type="text"
                  placeholder="e.g. Tunstall, Honeywell, Hikvision"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Model / Part Number</label>
                <input
                  type="text"
                  placeholder="e.g. NC-PST-402-A"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Detailed Technical Specifications & Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed specs, datasheet requirements, mounting type, accessories required..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Item Images & Reference Photos (Base64) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Item Images &amp; Photos ({images.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Base64 Format (data:image/...;base64)
              </span>
            </div>

            {/* Upload Drag & Drop Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files) handleImageUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDraggingOver 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />

              {isUploadingImage ? (
                <div className="flex items-center justify-center space-x-2 text-cyan-400 py-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-semibold">Processing &amp; Encoding Image to Base64...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    Click to upload or drag &amp; drop item images
                  </div>
                  <p className="text-[10px] text-slate-500">
                    PNG, JPG, WebP (Automatically encoded into base64 Data URL)
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
                {images.map((imgBase64, idx) => (
                  <div 
                    key={idx} 
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-cyan-500/60 shadow-md transition-all"
                  >
                    <img 
                      src={imgBase64} 
                      alt={`Item image ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-1.5 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewImageModal(imgBase64); }}
                        className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-cyan-600 transition-colors"
                        title="View Full Size"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                        className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.5 rounded bg-slate-950/80 text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Quantity & Budget Target */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Quantity & Commercial Estimate</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Quantity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="set">Set</option>
                  <option value="meters">Meters (m)</option>
                  <option value="lot">Lot</option>
                  <option value="roll">Roll</option>
                  <option value="box">Box</option>
                  <option value="pair">Pair</option>
                  <option value="kg">Kilograms (kg)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 250.00"
                  value={targetUnitPrice}
                  onChange={(e) => setTargetUnitPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="SAR">SAR</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Status & Priority */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Procurement Stage & Priority</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Stage / Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProcurementStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {ACTIVE_PROCUREMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PROCUREMENT_STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProcurementPriority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {(Object.keys(PROCUREMENT_PRIORITY_CONFIG) as ProcurementPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {PROCUREMENT_PRIORITY_CONFIG[p].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expected / Required Date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Assignments & Notes */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Project & Responsibilities</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project / Client Tag</label>
                <input
                  type="text"
                  placeholder="e.g. King Fahd Hospital"
                  value={projectReference}
                  onChange={(e) => setProjectReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Requested By</label>
                <input
                  type="text"
                  placeholder="Engineer / Department"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Buyer</label>
                <input
                  type="text"
                  placeholder="Procurement Officer"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Additional notes for purchasing team..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : initialItem ? 'Update Enquiry' : 'Log Enquiry'}</span>
            </button>
          </div>
        </form>

      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Base64 Item Image Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center max-h-[80vh]">
              <img 
                src={previewImageModal} 
                alt="Enlarged item preview" 
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
