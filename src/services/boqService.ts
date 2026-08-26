import { db, auth } from '../config/firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where 
} from 'firebase/firestore';
import type { BOQ, BOQItem, BOQRevision, BOQStatus } from '../types';
import { logAuditEvent } from './auditService';

// Helper for exact calculations per row
export const calculateBOQItemRow = (item: Partial<BOQItem>, conversionRate: number = 5): BOQItem => {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPriceEUR = Math.max(0, Number(item.unitPriceEUR) || 0);
  const isManualSAR = !!item.isManualSAR;
  
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
    brand: item.brand || '',
    model: item.model || '',
    system: item.system || '',
    notes: item.notes || ''
  };
};

export const recalculateBOQTotals = (items: BOQItem[]) => {
  let totalEUR = 0;
  let totalSAR = 0;
  let totalProfit = 0;
  let totalFinalValue = 0;

  items.forEach(i => {
    totalEUR += i.totalEUR || 0;
    totalSAR += i.totalSAR || 0;
    const itemProfitAmount = ((i.totalProfitIncl || 0) - (i.totalSAR || 0));
    totalProfit += itemProfitAmount;
    totalFinalValue += i.totalProfitIncl || 0;
  });

  return {
    totalEUR: Number(totalEUR.toFixed(2)),
    totalSAR: Number(totalSAR.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalFinalValue: Number(totalFinalValue.toFixed(2))
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

export const createBOQ = async (boqData: Omit<BOQ, 'id'>, userId: string, userName: string, userEmail: string): Promise<string> => {
  const boqsRef = collection(db, 'boqs');
  const newDocRef = doc(boqsRef);

  const totals = recalculateBOQTotals(boqData.items || []);

  const newBOQ: BOQ = {
    ...boqData,
    id: newDocRef.id,
    ...totals,
    revision: boqData.revision ?? 0,
    status: boqData.status || 'DRAFT',
    createdBy: boqData.createdBy || userId,
    createdByName: boqData.createdByName || userName,
    createdByEmail: boqData.createdByEmail || userEmail,
    createdAt: boqData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(newDocRef, newBOQ);
  await logAuditEvent(userId, userName, userEmail, 'CREATE_BOQ', `Created BOQ ${newBOQ.boqNumber}`, newBOQ.id, newBOQ.boqNumber);

  return newDocRef.id;
};

export const updateBOQ = async (boqId: string, updates: Partial<BOQ>, userId: string, userName: string, userEmail: string): Promise<void> => {
  const boqRef = doc(db, 'boqs', boqId);

  let updatedTotals = {};
  if (updates.items) {
    updatedTotals = recalculateBOQTotals(updates.items);
  }

  // Prevent accidental modification/overwriting of original creator metadata and creation date
  const { createdBy, createdByName, createdByEmail, createdAt, ...restUpdates } = updates;

  const payload = {
    ...restUpdates,
    ...updatedTotals,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(boqRef, payload);
  await logAuditEvent(userId, userName, userEmail, 'UPDATE_BOQ', `Updated BOQ details/items`, boqId, updates.boqNumber);
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

export const duplicateBOQ = async (sourceBOQ: BOQ, userId: string, userName: string, userEmail: string): Promise<string> => {
  const newNumber = generateBOQNumber(Math.floor(Math.random() * 800) + 100);
  const newBOQData: Omit<BOQ, 'id'> = {
    ...sourceBOQ,
    boqNumber: newNumber,
    projectName: `${sourceBOQ.projectName} (Copy)`,
    revision: 0,
    revisionHistory: [],
    status: 'DRAFT',
    preparedBy: userName,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    createdByName: userName,
    createdByEmail: userEmail,
    excelFileUrl: undefined,
    pdfFileUrl: undefined
  };

  return await createBOQ(newBOQData, userId, userName, userEmail);
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
