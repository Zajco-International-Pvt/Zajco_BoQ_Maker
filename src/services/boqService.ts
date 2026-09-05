import { db, auth } from '../config/firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where 
} from 'firebase/firestore';
import type { BOQ, BOQItem, BOQRevision, BOQStatus, BOQCalculationSummary } from '../types';
import { logAuditEvent } from './auditService';

// Helper to determine if an item is an installation/service line item
export const isInstallationItem = (item: BOQItem | Partial<BOQItem>): boolean => {
  if (item.isHeader) return false;
  if (item.isInstallation === true) return true;
  const desc = (item.description || '').toLowerCase();
  return /installation|install|testing|commissioning|programming|supervision|labor|labour|service charge|services/i.test(desc);
};

// Helper for exact calculations per row
export const calculateBOQItemRow = (item: Partial<BOQItem>, conversionRate: number = 5): BOQItem => {
  const isHeader = !!item.isHeader;

  if (isHeader) {
    return {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      serialNumber: 0,
      description: item.description || '',
      quantity: 0,
      pricingSource: '',
      unitPriceEUR: 0,
      totalEUR: 0,
      unitPriceSAR: 0,
      totalSAR: 0,
      profitPercentage: null,
      percentageAdded: 0,
      unitPriceProfitIncl: 0,
      totalProfitIncl: 0,
      isHeader: true,
      isInstallation: false,
      isManualSAR: false,
      brand: item.brand || '',
      model: item.model || '',
      system: item.system || '',
      notes: item.notes || ''
    };
  }

  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPriceEUR = Math.max(0, Number(item.unitPriceEUR) || 0);
  const isInstallation = isInstallationItem(item);
  const isManualSAR = item.isManualSAR !== undefined ? !!item.isManualSAR : (isInstallation || (Number(item.unitPriceSAR) > 0 && unitPriceEUR === 0));
  
  let unitPriceSAR = isManualSAR 
    ? Math.max(0, Number(item.unitPriceSAR) || 0)
    : Number((unitPriceEUR * conversionRate).toFixed(2));

  const totalEUR = Number((unitPriceEUR * quantity).toFixed(2));
  const totalSAR = Number((unitPriceSAR * quantity).toFixed(2));

  let profitPercentage: number | null = null;
  if (item.profitPercentage !== null && item.profitPercentage !== undefined && !isNaN(Number(item.profitPercentage))) {
    profitPercentage = Number(item.profitPercentage);
  }

  let percentageAdded = 0;
  if (profitPercentage !== null) {
    percentageAdded = Number((unitPriceSAR * (profitPercentage / 100)).toFixed(2));
  }

  const unitPriceProfitIncl = Number((unitPriceSAR + percentageAdded).toFixed(2));
  const totalProfitIncl = Number((unitPriceProfitIncl * quantity).toFixed(2));

  return {
    id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    serialNumber: item.serialNumber || 1,
    description: item.description || '',
    quantity,
    pricingSource: item.pricingSource || 'Discounted Listed Price',
    unitPriceEUR,
    totalEUR,
    unitPriceSAR,
    totalSAR,
    profitPercentage,
    percentageAdded,
    unitPriceProfitIncl,
    totalProfitIncl,
    isManualSAR,
    isHeader: false,
    isInstallation,
    brand: item.brand || '',
    model: item.model || '',
    system: item.system || '',
    notes: item.notes || ''
  };
};

export const computeBOQCalculationSummary = (items: BOQItem[]): BOQCalculationSummary => {
  let purchaseBillAmountEUR = 0;
  let purchaseBillAmountSAR = 0;
  let sellingPriceWithoutInstallation = 0;
  let installationAmount = 0;

  items.forEach(item => {
    if (item.isHeader) return;
    const isInst = isInstallationItem(item);
    if (isInst) {
      installationAmount += (item.totalProfitIncl || 0);
    } else {
      purchaseBillAmountEUR += (item.totalEUR || 0);
      purchaseBillAmountSAR += (item.totalSAR || 0);
      sellingPriceWithoutInstallation += (item.totalProfitIncl || 0);
    }
  });

  const sellingPriceWithInstallation = Number((sellingPriceWithoutInstallation + installationAmount).toFixed(2));
  const profitAmount = Number((sellingPriceWithoutInstallation - purchaseBillAmountSAR).toFixed(2));
  const profitPercentage = sellingPriceWithoutInstallation > 0
    ? Number((profitAmount / sellingPriceWithoutInstallation).toFixed(4))
    : 0;

  return {
    purchaseBillAmountEUR: Number(purchaseBillAmountEUR.toFixed(2)),
    purchaseBillAmountSAR: Number(purchaseBillAmountSAR.toFixed(2)),
    sellingPriceWithoutInstallation: Number(sellingPriceWithoutInstallation.toFixed(2)),
    installationAmount: Number(installationAmount.toFixed(2)),
    sellingPriceWithInstallation: Number(sellingPriceWithInstallation.toFixed(2)),
    profitAmount: Number(profitAmount.toFixed(2)),
    profitPercentage: Number(profitPercentage.toFixed(4))
  };
};

export const recalculateBOQTotals = (items: BOQItem[]) => {
  let totalEUR = 0;
  let totalSAR = 0;
  let totalProfit = 0;
  let totalFinalValue = 0;

  items.forEach(i => {
    if (i.isHeader) return;
    totalEUR += i.totalEUR || 0;
    totalSAR += i.totalSAR || 0;
    const itemProfitAmount = ((i.totalProfitIncl || 0) - (i.totalSAR || 0));
    totalProfit += itemProfitAmount;
    totalFinalValue += i.totalProfitIncl || 0;
  });

  const calculationSummary = computeBOQCalculationSummary(items);

  return {
    totalEUR: Number(totalEUR.toFixed(2)),
    totalSAR: Number(totalSAR.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalFinalValue: Number(totalFinalValue.toFixed(2)),
    calculationSummary
  };
};

export const generateBOQNumber = (seqIndex = 1, prefix = 'BOQ-ZJO'): string => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seq = String(seqIndex).padStart(3, '0');
  return `${prefix}-${yy}-${mm}-${dd}-${seq}`;
};

export const sanitizeForFirestore = <T>(data: T): T => {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
};

export const createBOQ = async (boqData: Omit<BOQ, 'id'>, userId: string, userName: string, userEmail: string): Promise<string> => {
  const boqsRef = collection(db, 'boqs');
  const newDocRef = doc(boqsRef);

  const totals = recalculateBOQTotals(boqData.items || []);
  const effectiveUserId = boqData.createdBy || userId || auth.currentUser?.uid || '';
  const effectiveUserName = boqData.createdByName || userName || auth.currentUser?.displayName || 'User';
  const effectiveUserEmail = boqData.createdByEmail || userEmail || auth.currentUser?.email || '';

  const newBOQ: BOQ = {
    ...boqData,
    id: newDocRef.id,
    ...totals,
    revision: boqData.revision ?? 0,
    status: boqData.status || 'DRAFT',
    createdBy: effectiveUserId,
    createdByName: effectiveUserName,
    createdByEmail: effectiveUserEmail,
    createdAt: boqData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sanitized = sanitizeForFirestore(newBOQ);
  await setDoc(newDocRef, sanitized);
  await logAuditEvent(effectiveUserId, effectiveUserName, effectiveUserEmail, 'CREATE_BOQ', `Created BOQ ${newBOQ.boqNumber}`, newBOQ.id, newBOQ.boqNumber);

  return newDocRef.id;
};

export const updateBOQ = async (boqId: string, updates: Partial<BOQ>, userId: string, userName: string, userEmail: string): Promise<void> => {
  const boqRef = doc(db, 'boqs', boqId);

  let updatedTotals = {};
  if (updates.items) {
    updatedTotals = recalculateBOQTotals(updates.items);
  }

  // Prevent accidental modification/overwriting of original creator metadata and creation date
  const { 
    createdBy: _createdBy, 
    createdByName: _createdByName, 
    createdByEmail: _createdByEmail, 
    createdAt: _createdAt, 
    ...restUpdates 
  } = updates;

  const payload = {
    ...restUpdates,
    ...updatedTotals,
    updatedAt: new Date().toISOString()
  };

  const sanitized = sanitizeForFirestore(payload);
  await updateDoc(boqRef, sanitized);
  const effectiveUserId = userId || auth.currentUser?.uid || '';
  const effectiveUserName = userName || auth.currentUser?.displayName || 'User';
  const effectiveUserEmail = userEmail || auth.currentUser?.email || '';
  await logAuditEvent(effectiveUserId, effectiveUserName, effectiveUserEmail, 'UPDATE_BOQ', `Updated BOQ details/items`, boqId, updates.boqNumber);
};

export const getBOQById = async (boqId: string): Promise<BOQ | null> => {
  const docRef = doc(db, 'boqs', boqId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as BOQ;
  }
  return null;
};

export const getBOQsList = async (userId?: string, isAdmin: boolean = false): Promise<BOQ[]> => {
  try {
    const boqsRef = collection(db, 'boqs');
    const effectiveUserId = userId || auth.currentUser?.uid;
    let q;

    if (!isAdmin && effectiveUserId) {
      q = query(boqsRef, where('createdBy', '==', effectiveUserId));
    } else if (isAdmin) {
      q = query(boqsRef);
    } else {
      // If neither admin nor authenticated user ID is available, return empty array safely
      return [];
    }

    const querySnap = await getDocs(q);
    const list: BOQ[] = [];
    querySnap.forEach(d => {
      list.push(d.data() as BOQ);
    });

    // In-memory sort by updatedAt descending (avoids requiring Firestore composite indexes)
    return list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } catch (err) {
    console.warn('getBOQsList fetch warning:', err);
    return [];
  }
};

export const updateBOQStatus = async (
  boqId: string, 
  status: BOQStatus, 
  userId: string, 
  userName: string, 
  userEmail: string,
  approvalNotes?: string
): Promise<void> => {
  const boqRef = doc(db, 'boqs', boqId);
  const payload: any = {
    status,
    updatedAt: new Date().toISOString()
  };

  if (status === 'APPROVED' || status === 'REJECTED') {
    payload.approvedBy = userName;
    payload.approvedAt = new Date().toISOString();
    if (approvalNotes) payload.approvalNotes = approvalNotes;
  }

  await updateDoc(boqRef, payload);
  await logAuditEvent(userId, userName, userEmail, `STATUS_${status}`, `Status changed to ${status}`, boqId);
};

export const duplicateBOQ = async (
  sourceBOQ: BOQ, 
  userId?: string, 
  userName?: string, 
  userEmail?: string
): Promise<string> => {
  const currentUserId = userId || auth.currentUser?.uid || '';
  const currentUserName = userName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User';
  const currentUserEmail = userEmail || auth.currentUser?.email || '';

  if (!currentUserId) {
    throw new Error('Authentication required: Cannot duplicate BOQ without active user session.');
  }

  const newNumber = generateBOQNumber(Math.floor(Math.random() * 900) + 100);
  const sourceName = (sourceBOQ.projectName || 'BOQ').trim();

  // Create deep copy of items with fresh, unique row IDs
  const duplicatedItems: BOQItem[] = (sourceBOQ.items || []).map((item, idx) => ({
    ...item,
    id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`
  }));

  // Cleanly omit previous doc ID, previous export files, and previous approval metadata
  const {
    id: _prevId,
    excelFileUrl: _prevExcel,
    pdfFileUrl: _prevPdf,
    approvedBy: _prevApprovedBy,
    approvedAt: _prevApprovedAt,
    approvalNotes: _prevApprovalNotes,
    ...restOfSource
  } = sourceBOQ;

  const newBOQData: Omit<BOQ, 'id'> = {
    ...restOfSource,
    boqNumber: newNumber,
    projectName: `${sourceName} (Copy)`,
    revision: 0,
    revisionHistory: [],
    status: 'DRAFT',
    preparedBy: currentUserName,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUserId,
    createdByName: currentUserName,
    createdByEmail: currentUserEmail,
    items: duplicatedItems,
    currency: sourceBOQ.currency || 'SAR',
    conversionRate: sourceBOQ.conversionRate || 5,
    checkedBy: sourceBOQ.checkedBy || '',
    system: sourceBOQ.system || '',
    brand: sourceBOQ.brand || '',
    client: sourceBOQ.client || '',
    contractor: sourceBOQ.contractor || '',
    consultant: sourceBOQ.consultant || '',
    location: sourceBOQ.location || '',
    notes: sourceBOQ.notes || ''
  };

  return await createBOQ(newBOQData, currentUserId, currentUserName, currentUserEmail);
};

export const createRevisionBOQ = async (boq: BOQ, userId: string, userName: string, userEmail: string, notes?: string): Promise<void> => {
  const nextRev = (boq.revision ?? 0) + 1;
  const currentSnap: BOQRevision = {
    revisionNumber: boq.revision ?? 0,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    createdByName: userName,
    notes: notes || `Revision snapshot before Rev ${nextRev}`,
    snapshotData: {
      projectName: boq.projectName,
      client: boq.client,
      totalEUR: boq.totalEUR,
      totalSAR: boq.totalSAR,
      totalFinalValue: boq.totalFinalValue,
      itemsCount: boq.items?.length || 0
    }
  };

  const updatedHistory = [...(boq.revisionHistory || []), currentSnap];

  await updateBOQ(
    boq.id,
    {
      revision: nextRev,
      revisionHistory: updatedHistory,
      status: 'DRAFT'
    },
    userId,
    userName,
    userEmail
  );

  await logAuditEvent(userId, userName, userEmail, 'CREATE_REVISION', `Created BOQ Revision Rev ${nextRev}`, boq.id, boq.boqNumber);
};

export const deleteBOQ = async (boqId: string, userId: string, userName: string, userEmail: string): Promise<void> => {
  const boqRef = doc(db, 'boqs', boqId);
  await deleteDoc(boqRef);
  await logAuditEvent(userId, userName, userEmail, 'DELETE_BOQ', `Deleted BOQ ${boqId}`, boqId);
};
