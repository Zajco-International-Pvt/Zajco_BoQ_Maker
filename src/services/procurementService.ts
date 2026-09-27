import { db } from '../config/firebase';
import {
  collection, doc, getDocs, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import type {
  ProcurementItem,
  ProcurementStatus,
  ProcurementPriority,
  VendorQuotationEntry,
  ProcurementActivityLog,
  UserProfile
} from '../types';
import { logAuditEvent } from './auditService';

export const ACTIVE_PROCUREMENT_STATUSES: ProcurementStatus[] = [
  'PURCHASES_POS_COMPLETED',
  'PENDING_POS',
  'URGENTLY_REQUIRED_MATERIALS',
  'SUPPLIER_DELAYS',
  'PRICE_SUPPLIER_ISSUES',
  'EXPECTED_DELIVERIES',
  'MATERIAL_SHORTAGES',
  'SUPPLIER_PAYMENT_ISSUES',
  'CRITICAL_STOCK_REQUIREMENTS',
  'CHAIRMAN_APPROVAL_REQUIRED'
];

export const PROCUREMENT_STATUS_CONFIG: Record<
  ProcurementStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; description: string; step: number }
> = {
  PURCHASES_POS_COMPLETED: {
    label: 'Purchases/POs completed',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    description: 'Purchases and Purchase Orders completed and fulfilled',
    step: 1
  },
  PENDING_POS: {
    label: 'Pending purchase orders',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    description: 'Purchase orders drafted or awaiting supplier issuance',
    step: 2
  },
  URGENTLY_REQUIRED_MATERIALS: {
    label: 'Urgently required materials',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
    description: 'Critical materials needed urgently for project execution',
    step: 3
  },
  SUPPLIER_DELAYS: {
    label: 'Supplier delays',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    description: 'Manufacturing or dispatch delays communicated by supplier',
    step: 4
  },
  PRICE_SUPPLIER_ISSUES: {
    label: 'Price/supplier issues',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    description: 'Price disputes, quote discrepancies, or vendor issues',
    step: 5
  },
  EXPECTED_DELIVERIES: {
    label: 'Expected deliveries',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
    description: 'Orders dispatched and expected for site delivery',
    step: 6
  },
  MATERIAL_SHORTAGES: {
    label: 'Material shortages affecting projects',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    description: 'Shortages currently impacting active project timelines',
    step: 7
  },
  SUPPLIER_PAYMENT_ISSUES: {
    label: 'Supplier payment issues',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    description: 'Payment terms, invoice approvals, or accounts clearance pending',
    step: 8
  },
  CRITICAL_STOCK_REQUIREMENTS: {
    label: 'Critical stock requirements',
    bgClass: 'bg-fuchsia-500/10',
    textClass: 'text-fuchsia-400',
    borderClass: 'border-fuchsia-500/30',
    description: 'Stock level below safety threshold requiring replenishment',
    step: 9
  },
  CHAIRMAN_APPROVAL_REQUIRED: {
    label: 'Chairman approval required',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    description: 'High value or strategic order requiring Chairman sanction',
    step: 10
  },
  // Legacy / fallback mappings for backward compatibility
  NEW_ENQUIRY: {
    label: 'Pending purchase orders',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    description: 'Pending purchase orders',
    step: 2
  },
  RFQ_SENT: {
    label: 'Pending purchase orders',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    description: 'Pending purchase orders',
    step: 2
  },
  QUOTATION_IN_PROGRESS: {
    label: 'Pending purchase orders',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    description: 'Pending purchase orders',
    step: 2
  },
  QUOTATION_RECEIVED: {
    label: 'Price/supplier issues',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    description: 'Price/supplier issues',
    step: 5
  },
  UNDER_EVALUATION: {
    label: 'Price/supplier issues',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    description: 'Price/supplier issues',
    step: 5
  },
  PO_ISSUED: {
    label: 'Pending purchase orders',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    description: 'Pending purchase orders',
    step: 2
  },
  DELIVERED: {
    label: 'Purchases/POs completed',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    description: 'Purchases/POs completed',
    step: 1
  },
  CLOSED: {
    label: 'Purchases/POs completed',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    description: 'Purchases/POs completed',
    step: 1
  },
  CANCELLED: {
    label: 'Purchases/POs completed',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30',
    description: 'Cancelled / completed',
    step: 0
  }
};

/**
 * Normalizes any status string (including legacy ones) to the active 10 statuses
 */
export const normalizeProcurementStatus = (rawStatus: any): ProcurementStatus => {
  if (!rawStatus) return 'PENDING_POS';
  const str = String(rawStatus).trim();

  if (ACTIVE_PROCUREMENT_STATUSES.includes(str as ProcurementStatus)) {
    return str as ProcurementStatus;
  }

  // Exact or label match
  const match = ACTIVE_PROCUREMENT_STATUSES.find(
    s => s.toLowerCase() === str.toLowerCase() ||
         PROCUREMENT_STATUS_CONFIG[s].label.toLowerCase() === str.toLowerCase()
  );
  if (match) return match;

  // Legacy status conversion
  const upper = str.toUpperCase();
  if (upper === 'DELIVERED' || upper === 'CLOSED' || upper === 'CANCELLED' || upper === 'PURCHASES_POS_COMPLETED') {
    return 'PURCHASES_POS_COMPLETED';
  }
  if (upper === 'NEW_ENQUIRY' || upper === 'RFQ_SENT' || upper === 'QUOTATION_IN_PROGRESS' || upper === 'PO_ISSUED') {
    return 'PENDING_POS';
  }
  if (upper === 'QUOTATION_RECEIVED' || upper === 'UNDER_EVALUATION') {
    return 'PRICE_SUPPLIER_ISSUES';
  }

  return 'PENDING_POS';
};

/**
 * Safely fetches the status configuration for any status value
 */
export const getProcurementStatusConfig = (status: any) => {
  const norm = normalizeProcurementStatus(status);
  return PROCUREMENT_STATUS_CONFIG[norm] || PROCUREMENT_STATUS_CONFIG.PENDING_POS;
};

/**
 * Fuzzy matches text from Excel columns or user input to one of the 10 statuses
 */
export const matchProcurementStatus = (rawText: string): ProcurementStatus | null => {
  if (!rawText) return null;
  const t = rawText.toLowerCase().trim();

  // Check specific issue/action keywords first
  if (t.includes('chairman') || t.includes('approval required') || t.includes('board approval')) {
    return 'CHAIRMAN_APPROVAL_REQUIRED';
  }
  if (t.includes('payment') || t.includes('supplier payment') || t.includes('invoice issue')) {
    return 'SUPPLIER_PAYMENT_ISSUES';
  }
  if (t.includes('shortage') || t.includes('affecting project') || t.includes('material shortage')) {
    return 'MATERIAL_SHORTAGES';
  }
  if (t.includes('critical stock') || t.includes('stock requirement') || t.includes('low stock')) {
    return 'CRITICAL_STOCK_REQUIREMENTS';
  }
  if (t.includes('urgently') || t.includes('urgent material') || t.includes('urgent required')) {
    return 'URGENTLY_REQUIRED_MATERIALS';
  }
  if (t.includes('supplier delay') || t.includes('delay') || t.includes('delayed')) {
    return 'SUPPLIER_DELAYS';
  }
  if (t.includes('price') || t.includes('rate issue') || t.includes('price issue') || t.includes('supplier issue')) {
    return 'PRICE_SUPPLIER_ISSUES';
  }
  if (t.includes('expected') || t.includes('transit') || t.includes('delivery expected') || t.includes('expected delivery') || t.includes('deliveries')) {
    return 'EXPECTED_DELIVERIES';
  }
  if (t.includes('completed') || t.includes('purchase order completed') || t.includes('po completed') || t.includes('pos completed')) {
    return 'PURCHASES_POS_COMPLETED';
  }
  if (t.includes('pending') || t.includes('draft') || t.includes('po pending') || t.includes('pending po')) {
    return 'PENDING_POS';
  }
  return null;
};

export const PROCUREMENT_PRIORITY_CONFIG: Record<
  ProcurementPriority,
  { label: string; bgClass: string; textClass: string; badge: string }
> = {
  LOW: {
    label: 'Low',
    bgClass: 'bg-slate-800 text-slate-400',
    textClass: 'text-slate-400',
    badge: 'border-slate-700 text-slate-400'
  },
  MEDIUM: {
    label: 'Medium',
    bgClass: 'bg-blue-900/40 text-blue-300',
    textClass: 'text-blue-400',
    badge: 'border-blue-700/50 text-blue-300'
  },
  HIGH: {
    label: 'High',
    bgClass: 'bg-amber-900/40 text-amber-300',
    textClass: 'text-amber-400',
    badge: 'border-amber-700/50 text-amber-300'
  },
  URGENT: {
    label: 'Urgent',
    bgClass: 'bg-rose-900/50 text-rose-300 font-bold animate-pulse',
    textClass: 'text-rose-400',
    badge: 'border-rose-600/60 text-rose-300'
  }
};

/**
 * Generate a unique enquiry reference formatted as: ENQ-YYMM-RAND
 */
export const generateEnquiryReference = (): string => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `ENQ-${yy}${mm}-${seq}`;
};

/**
 * Converts an image file to a Base64 data URL string (e.g. data:image/png;base64,...).
 * Optimizes dimensions if larger than maxDimension to keep Firestore document size lean.
 */
export const convertFileToBase64 = (file: File, maxDimension = 1200): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File must be an image format (PNG, JPG, WebP, etc.).'));
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) return reject(new Error('Failed to read image file data.'));

      // If in non-browser/test environment without Image or Canvas, return raw DataURL
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // If image is already smaller than maxDimension, preserve original data URL
        if (width <= maxDimension && height <= maxDimension) {
          return resolve(dataUrl);
        }

        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(dataUrl);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const resizedDataUrl = canvas.toDataURL(mimeType, 0.88);
        resolve(resizedDataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

let lastProcurementError: string | null = null;
const CACHE_KEY = 'zajco_procurement_items_cache';

export const getLastProcurementError = (): string | null => lastProcurementError;
export const clearLastProcurementError = (): void => { lastProcurementError = null; };

const getCachedProcurementItems = (): ProcurementItem[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setCachedProcurementItems = (items: ProcurementItem[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch { }
};

const saveItemToLocalCache = (item: ProcurementItem): void => {
  try {
    const current = getCachedProcurementItems();
    const idx = current.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      current[idx] = item;
    } else {
      current.unshift(item);
    }
    setCachedProcurementItems(current);
  } catch { }
};

const removeItemFromLocalCache = (id: string): void => {
  try {
    const current = getCachedProcurementItems().filter(i => i.id !== id);
    setCachedProcurementItems(current);
  } catch { }
};

/**
 * Fetch all procurement enquiries from Firestore with local cache resilience
 */
export const getProcurementItems = async (): Promise<ProcurementItem[]> => {
  try {
    const colRef = collection(db, 'procurementItems');
    const snap = await getDocs(colRef);
    const items: ProcurementItem[] = [];
    snap.forEach(d => {
      const data = d.data();
      items.push({
        id: d.id,
        referenceNumber: data.referenceNumber || `ENQ-${d.id.slice(0, 6)}`,
        itemName: data.itemName || 'Untitled Item',
        description: data.description || '',
        category: data.category || 'General',
        brand: data.brand || '',
        model: data.model || '',
        images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
        quantity: Number(data.quantity) || 1,
        unit: data.unit || 'pcs',
        targetUnitPrice: data.targetUnitPrice ? Number(data.targetUnitPrice) : undefined,
        currency: data.currency || 'SAR',
        priority: (data.priority as ProcurementPriority) || 'MEDIUM',
        status: normalizeProcurementStatus(data.status),
        requestedBy: data.requestedBy || '',
        assignedTo: data.assignedTo || '',
        projectReference: data.projectReference || '',
        expectedDate: data.expectedDate || '',
        vendorQuotes: Array.isArray(data.vendorQuotes) ? data.vendorQuotes : [],
        activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
        notes: data.notes || '',
        createdBy: data.createdBy || '',
        createdByName: data.createdByName || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      });
    });

    const sorted = items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setCachedProcurementItems(sorted);
    lastProcurementError = null;
    return sorted;
  } catch (err: any) {
    console.warn('getProcurementItems Firestore notice:', err?.message || err);
    lastProcurementError = err?.message || 'Missing or insufficient permissions.';
    // Graceful fallback to local cache
    return getCachedProcurementItems();
  }
};


/**
 * Create or update a procurement item
 */
export const saveProcurementItem = async (
  itemData: Partial<ProcurementItem>,
  user: UserProfile
): Promise<string> => {
  const now = new Date().toISOString();

  if (itemData.id) {
    // Updating existing item
    const docRef = doc(db, 'procurementItems', itemData.id);
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : {};

    const activityEntry: ProcurementActivityLog = {
      id: `act_${Date.now()}`,
      timestamp: now,
      authorName: user.name || user.email,
      authorEmail: user.email,
      action: 'ITEM_UPDATED',
      note: 'Item specifications or procurement details updated'
    };

    const updatedPayload: ProcurementItem = {
      ...existingData,
      ...itemData,
      updatedAt: now,
      activityLog: [...(existingData.activityLog || []), activityEntry]
    } as ProcurementItem;

    try {
      await setDoc(docRef, updatedPayload, { merge: true });
      await logAuditEvent(
        user.uid,
        user.name,
        user.email,
        'UPDATE_PROCUREMENT_ITEM',
        `Updated procurement item ${itemData.referenceNumber || itemData.id} (${itemData.itemName})`
      ).catch(() => { });
      lastProcurementError = null;
    } catch (err: any) {
      console.warn('saveProcurementItem Firestore notice (caching locally):', err?.message || err);
      lastProcurementError = err?.message || 'Missing or insufficient permissions.';
    }

    saveItemToLocalCache(updatedPayload);
    return itemData.id;
  } else {
    // Creating brand new item
    const newRef = doc(collection(db, 'procurementItems'));
    const refNumber = itemData.referenceNumber || generateEnquiryReference();

    const initialStatus = normalizeProcurementStatus(itemData.status);
    const activityEntry: ProcurementActivityLog = {
      id: `act_${Date.now()}`,
      timestamp: now,
      authorName: user.name || user.email,
      authorEmail: user.email,
      action: 'ENQUIRY_CREATED',
      note: `Enquiry logged with status: ${getProcurementStatusConfig(initialStatus).label}`
    };

    const newPayload: ProcurementItem = {
      id: newRef.id,
      referenceNumber: refNumber,
      itemName: itemData.itemName || 'New Item Enquiry',
      description: itemData.description || '',
      category: itemData.category || 'General',
      brand: itemData.brand || '',
      model: itemData.model || '',
      images: itemData.images || [],
      quantity: Number(itemData.quantity) || 1,
      unit: itemData.unit || 'pcs',
      targetUnitPrice: itemData.targetUnitPrice ? Number(itemData.targetUnitPrice) : undefined,
      currency: itemData.currency || 'SAR',
      priority: itemData.priority || 'MEDIUM',
      status: initialStatus,
      requestedBy: itemData.requestedBy || user.name || '',
      assignedTo: itemData.assignedTo || '',
      projectReference: itemData.projectReference || '',
      expectedDate: itemData.expectedDate || '',
      vendorQuotes: itemData.vendorQuotes || [],
      activityLog: [activityEntry],
      notes: itemData.notes || '',
      createdBy: user.uid,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(newRef, newPayload);
      await logAuditEvent(
        user.uid,
        user.name,
        user.email,
        'CREATE_PROCUREMENT_ITEM',
        `Created new procurement item enquiry ${refNumber} (${newPayload.itemName})`
      ).catch(() => { });
      lastProcurementError = null;
    } catch (err: any) {
      console.warn('saveProcurementItem Firestore notice (caching locally):', err?.message || err);
      lastProcurementError = err?.message || 'Missing or insufficient permissions.';
    }

    saveItemToLocalCache(newPayload);
    return newRef.id;
  }
};

/**
 * Fast status transition with timeline activity logging
 */
export const updateProcurementStatus = async (
  itemId: string,
  newStatus: ProcurementStatus,
  note: string,
  user: UserProfile
): Promise<void> => {
  const now = new Date().toISOString();
  const docRef = doc(db, 'procurementItems', itemId);
  const normStatus = normalizeProcurementStatus(newStatus);

  const activityEntry: ProcurementActivityLog = {
    id: `act_${Date.now()}`,
    timestamp: now,
    authorName: user.name || user.email,
    authorEmail: user.email,
    action: `STATUS_CHANGED_${normStatus}`,
    note: note || `Status changed to ${getProcurementStatusConfig(normStatus).label}`
  };

  await updateDoc(docRef, {
    status: normStatus,
    updatedAt: now,
    activityLog: arrayUnion(activityEntry)
  });

  await logAuditEvent(
    user.uid,
    user.name,
    user.email,
    'UPDATE_PROCUREMENT_STATUS',
    `Updated status of item ${itemId} to ${normStatus}. Note: ${note || 'None'}`
  );
};

/**
 * Add or update a vendor quotation for an enquiry
 */
export const saveVendorQuotation = async (
  itemId: string,
  quote: Omit<VendorQuotationEntry, 'id' | 'createdAt'> & { id?: string },
  user: UserProfile
): Promise<void> => {
  const now = new Date().toISOString();
  const docRef = doc(db, 'procurementItems', itemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Procurement item not found');

  const data = snap.data() as ProcurementItem;
  const quotes = [...(data.vendorQuotes || [])];

  const quotationId = quote.id || `quote_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const quoteEntry: VendorQuotationEntry = {
    ...quote,
    id: quotationId,
    createdAt: now
  };

  const existingIndex = quotes.findIndex(q => q.id === quotationId);
  if (existingIndex >= 0) {
    quotes[existingIndex] = quoteEntry;
  } else {
    quotes.push(quoteEntry);
  }

  // Preserve normalized status
  const newStatus = normalizeProcurementStatus(data.status);

  const activityEntry: ProcurementActivityLog = {
    id: `act_${Date.now()}`,
    timestamp: now,
    authorName: user.name || user.email,
    authorEmail: user.email,
    action: 'VENDOR_QUOTE_LOGGED',
    note: `Added quote from ${quote.vendorName} (${quote.netPrice} ${quote.currency})`
  };

  await updateDoc(docRef, {
    vendorQuotes: quotes,
    status: newStatus,
    updatedAt: now,
    activityLog: arrayUnion(activityEntry)
  });

  await logAuditEvent(
    user.uid,
    user.name,
    user.email,
    'LOG_VENDOR_QUOTE',
    `Added vendor quote for ${data.referenceNumber} from ${quote.vendorName}`
  );
};

/**
 * Delete a vendor quotation from an item
 */
export const deleteVendorQuotation = async (
  itemId: string,
  quoteId: string,
  user: UserProfile
): Promise<void> => {
  const now = new Date().toISOString();
  const docRef = doc(db, 'procurementItems', itemId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const data = snap.data() as ProcurementItem;
  const quotes = (data.vendorQuotes || []).filter(q => q.id !== quoteId);

  await updateDoc(docRef, {
    vendorQuotes: quotes,
    updatedAt: now
  });

  await logAuditEvent(
    user.uid,
    user.name,
    user.email,
    'DELETE_VENDOR_QUOTE',
    `Removed vendor quotation ${quoteId} from procurement item ${data.referenceNumber}`
  );
};

/**
 * Delete a procurement item
 */
export const deleteProcurementItem = async (
  itemId: string,
  user: UserProfile
): Promise<void> => {
  removeItemFromLocalCache(itemId);
  try {
    const docRef = doc(db, 'procurementItems', itemId);
    await deleteDoc(docRef);

    await logAuditEvent(
      user.uid,
      user.name,
      user.email,
      'DELETE_PROCUREMENT_ITEM',
      `Deleted procurement item ${itemId}`
    ).catch(() => { });
  } catch (err: any) {
    console.warn('deleteProcurementItem Firestore notice:', err?.message || err);
  }
};

/**
 * Export procurement items to CSV
 */
export const exportProcurementItemsToCSV = (items: ProcurementItem[]): void => {
  const headers = [
    'Reference No',
    'Item Name',
    'Category',
    'Brand',
    'Model',
    'Quantity',
    'Unit',
    'Target Unit Price',
    'Currency',
    'Status',
    'Priority',
    'Project Reference',
    'Requested By',
    'Quotes Count',
    'Best Vendor Quote',
    'Expected Date',
    'Created At',
    'Last Updated'
  ];

  const rows = items.map(item => {
    // Find best/cheapest quote if any
    const quotes = item.vendorQuotes || [];
    let bestQuoteStr = 'None';
    if (quotes.length > 0) {
      const cheapest = [...quotes].sort((a, b) => a.netPrice - b.netPrice)[0];
      bestQuoteStr = `${cheapest.vendorName}: ${cheapest.netPrice} ${cheapest.currency}`;
    }

    return [
      `"${item.referenceNumber}"`,
      `"${item.itemName.replace(/"/g, '""')}"`,
      `"${item.category || ''}"`,
      `"${item.brand || ''}"`,
      `"${item.model || ''}"`,
      item.quantity,
      `"${item.unit}"`,
      item.targetUnitPrice || '',
      `"${item.currency}"`,
      `"${PROCUREMENT_STATUS_CONFIG[item.status]?.label || item.status}"`,
      `"${item.priority}"`,
      `"${(item.projectReference || '').replace(/"/g, '""')}"`,
      `"${(item.requestedBy || '').replace(/"/g, '""')}"`,
      quotes.length,
      `"${bestQuoteStr.replace(/"/g, '""')}"`,
      `"${item.expectedDate || ''}"`,
      `"${new Date(item.createdAt).toLocaleDateString()}"`,
      `"${new Date(item.updatedAt).toLocaleDateString()}"`
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ZAJCO_Procurement_Tracker_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =========================================================
// EXCEL IMPORT ENGINE FOR PROCUREMENT ENQUIRIES
// =========================================================

export interface ProcurementExcelColumnMapping {
  itemName: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  quantity: string;
  unit: string;
  targetUnitPrice: string;
  currency: string;
  priority: string;
  status?: string;
  projectReference: string;
  requestedBy: string;
  expectedDate: string;
  notes: string;
}

export interface ProcurementExcelParseResult {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
}

export interface ProcurementSheetDataResult {
  headers: string[];
  rows: Record<string, any>[];
  suggestedMapping: ProcurementExcelColumnMapping;
}

const findBestColumn = (headers: string[], keywords: string[]): string => {
  for (const kw of keywords) {
    const found = headers.find(h => h.toLowerCase().includes(kw.toLowerCase()));
    if (found) return found;
  }
  return '';
};

/**
 * Read uploaded Excel file and retrieve all worksheet names
 */
export const parseProcurementExcelWorkbook = async (file: File): Promise<ProcurementExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('No worksheets found in this Excel file.');
        }
        resolve({
          workbook,
          sheetNames: workbook.SheetNames
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extract rows, headers, and suggested column mapping from a specific worksheet
 */
export const extractProcurementSheetRows = (
  workbook: XLSX.WorkBook,
  sheetName: string
): ProcurementSheetDataResult => {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" could not be found.`);
  }

  // Convert to 2D array
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawData || rawData.length === 0) {
    throw new Error(`Worksheet "${sheetName}" is empty.`);
  }

  // Find header row (row containing item, desc, qty, name, brand, etc.)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(25, rawData.length); i++) {
    const rowStr = JSON.stringify(rawData[i]).toLowerCase();
    if (
      rowStr.includes('item') ||
      rowStr.includes('description') ||
      rowStr.includes('qty') ||
      rowStr.includes('quantity') ||
      rowStr.includes('brand') ||
      rowStr.includes('model') ||
      rowStr.includes('product')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (rawData[headerRowIndex] || [])
    .map((h: any) => String(h || '').trim())
    .filter(Boolean);

  if (headers.length === 0) {
    throw new Error(`Could not find valid column headers in sheet "${sheetName}".`);
  }

  // Parse rows below header row
  const rows: Record<string, any>[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const rowObj: Record<string, any> = {};
    let hasContent = false;

    headers.forEach((h) => {
      const colIdx = (rawData[headerRowIndex] || []).indexOf(h);
      if (colIdx >= 0) {
        const val = row[colIdx];
        rowObj[h] = val !== undefined ? val : '';
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          hasContent = true;
        }
      }
    });

    if (hasContent) {
      rows.push(rowObj);
    }
  }

  // Auto-detect and suggest column mapping
  const suggestedMapping: ProcurementExcelColumnMapping = {
    itemName: findBestColumn(headers, [
      'item name', 'item description', 'equipment', 'product name', 'material', 'item', 'description', 'title'
    ]),
    category: findBestColumn(headers, [
      'category', 'system', 'discipline', 'section', 'trade'
    ]),
    brand: findBestColumn(headers, [
      'brand', 'make', 'manufacturer', 'vendor'
    ]),
    model: findBestColumn(headers, [
      'model', 'part no', 'part number', 'p/n', 'model code', 'code'
    ]),
    description: findBestColumn(headers, [
      'specifications', 'specification', 'technical spec', 'detail', 'remarks', 'desc'
    ]),
    quantity: findBestColumn(headers, [
      'qty', 'quantity', 'count', 'amount', 'no.'
    ]),
    unit: findBestColumn(headers, [
      'unit', 'uom', 'measure'
    ]),
    targetUnitPrice: findBestColumn(headers, [
      'target price', 'target unit price', 'unit price', 'budget rate', 'rate', 'price', 'cost', 'est rate'
    ]),
    currency: findBestColumn(headers, [
      'currency', 'curr'
    ]),
    priority: findBestColumn(headers, [
      'priority', 'urgency'
    ]),
    status: findBestColumn(headers, [
      'status', 'stage', 'procurement stage', 'procurement status', 'state', 'current status'
    ]),
    projectReference: findBestColumn(headers, [
      'project', 'project name', 'project ref', 'site', 'client'
    ]),
    requestedBy: findBestColumn(headers, [
      'requested by', 'engineer', 'requester', 'originator'
    ]),
    expectedDate: findBestColumn(headers, [
      'expected date', 'due date', 'delivery date', 'required date', 'date'
    ]),
    notes: findBestColumn(headers, [
      'notes', 'comment', 'internal notes', 'note'
    ])
  };

  return {
    headers,
    rows,
    suggestedMapping
  };
};

/**
 * Batch insert multiple procurement items into Firestore
 */
export const batchImportProcurementItems = async (
  items: Partial<ProcurementItem>[],
  user: UserProfile
): Promise<{ count: number; referenceNumbers: string[] }> => {
  const now = new Date().toISOString();
  const colRef = collection(db, 'procurementItems');
  const generatedRefs: string[] = [];

  for (const item of items) {
    const newDoc = doc(colRef);
    const refNumber = item.referenceNumber || generateEnquiryReference();
    generatedRefs.push(refNumber);

    const itemStatus = normalizeProcurementStatus(item.status);
    const activityEntry: ProcurementActivityLog = {
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: now,
      authorName: user.name || user.email,
      authorEmail: user.email,
      action: 'BATCH_IMPORTED_FROM_EXCEL',
      note: `Imported via Excel sheet with status: ${getProcurementStatusConfig(itemStatus).label}`
    };

    const payload: ProcurementItem = {
      id: newDoc.id,
      referenceNumber: refNumber,
      itemName: item.itemName || 'Imported Enquiry',
      description: item.description || '',
      category: item.category || 'General',
      brand: item.brand || '',
      model: item.model || '',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'pcs',
      targetUnitPrice: item.targetUnitPrice ? Number(item.targetUnitPrice) : undefined,
      currency: item.currency || 'SAR',
      priority: item.priority || 'MEDIUM',
      status: itemStatus,
      requestedBy: item.requestedBy || user.name || '',
      assignedTo: item.assignedTo || '',
      projectReference: item.projectReference || '',
      expectedDate: item.expectedDate || '',
      vendorQuotes: [],
      activityLog: [activityEntry],
      notes: item.notes || '',
      createdBy: user.uid,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(newDoc, payload);
    } catch (err: any) {
      console.warn('batchImport item Firestore notice (caching locally):', err?.message || err);
      lastProcurementError = err?.message || 'Missing or insufficient permissions.';
    }

    saveItemToLocalCache(payload);
  }

  await logAuditEvent(
    user.uid,
    user.name,
    user.email,
    'IMPORT_PROCUREMENT_EXCEL',
    `Batch imported ${items.length} procurement enquiries from Excel file`
  ).catch(() => { });

  return { count: items.length, referenceNumbers: generatedRefs };
};

/**
 * Generate and download a sample Excel (.xlsx) template for procurement enquiries
 */
export const downloadProcurementExcelTemplate = (): void => {
  const sampleHeaders = [
    'Item Name',
    'Category / System',
    'Brand',
    'Model',
    'Technical Specifications',
    'Quantity',
    'Unit',
    'Target Unit Price',
    'Currency',
    'Priority',
    'Project Reference',
    'Requested By',
    'Expected Date',
    'Internal Notes'
  ];

  const sampleRows = [
    [
      'IP Nurse Call Master Console',
      'Nurse Call System',
      'Tunstall',
      'NC-MST-400',
      'Wall/desk mounted IP touchscreen master station with duplex audio',
      2,
      'pcs',
      4200,
      'SAR',
      'HIGH',
      'King Fahd Hospital Extension',
      'Eng. Ahmed',
      '2026-10-15',
      'Need supplier quotation with CE certification'
    ],
    [
      '4MP WDR IR Network Dome Camera',
      'CCTV & Surveillance',
      'Hikvision',
      'DS-2CD2143G2-I',
      '4 MP AcuSense Fixed Dome Network Camera, 2.8mm lens, IP67, IK10',
      32,
      'pcs',
      285,
      'SAR',
      'MEDIUM',
      'Riyadh Commercial Tower',
      'Procurement Dept',
      '2026-10-30',
      'Compare prices from at least 2 local distributors'
    ],
    [
      'Addressable Optical Smoke Detector',
      'Fire Alarm & Life Safety',
      'Honeywell Morley',
      'MI-PSE-S2I',
      'Intelligent optical smoke sensor with built-in isolator',
      150,
      'pcs',
      95,
      'SAR',
      'URGENT',
      'Al Nakheel Mall Project',
      'Safety Engineer',
      '2026-09-25',
      'Urgent enquiry required for site inspection'
    ],
    [
      'Cat6A U/UTP LSZH Cable 305m Box',
      'Structured Cabling & Fiber',
      'Schneider Electric',
      'ACT4P6AUCM3RBBU',
      'Actassi Cat6A U/UTP 4-pair cable 23 AWG LSZH blue box',
      15,
      'roll',
      620,
      'SAR',
      'LOW',
      'IT Headquarters Phase 2',
      'Network Team',
      '2026-11-01',
      'Inquire stock availability with local Schneider agent'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 32 }, // Item Name
    { wch: 24 }, // Category
    { wch: 18 }, // Brand
    { wch: 18 }, // Model
    { wch: 45 }, // Tech Specs
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 18 }, // Target Price
    { wch: 10 }, // Currency
    { wch: 12 }, // Priority
    { wch: 26 }, // Project Reference
    { wch: 18 }, // Requested By
    { wch: 14 }, // Expected Date
    { wch: 35 }  // Internal Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Procurement_Enquiries');

  XLSX.writeFile(wb, `ZAJCO_Procurement_Import_Template.xlsx`);
};

