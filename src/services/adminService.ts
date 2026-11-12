import { db } from '../config/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc 
} from 'firebase/firestore';
import type { UserProfile, SystemSettings, ItemLibraryProduct, VendorPrice, BOQTemplate, AuditLog, BOQ, BOQItem } from '../types';
import { logAuditEvent } from './auditService';

export const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'ZAJCO ENGINEERING & CONTRACTING',
  companyAddress: 'Riyadh, Kingdom of Saudi Arabia',
  companyLogoUrl: '',
  vatNumber: '300123456700003',
  defaultCurrency: 'SAR',
  eurToSarRate: 5,
  defaultProfitPercentage: 15,
  boqNumberFormat: 'BOQ-ZJO-YY-MM-DD-{SEQ}',
  defaultPricingSource: 'Discounted Listed Price',
  defaultTerms: 'Valid for 30 days from proposal date.',
  footerText: 'ZAJCO BOQ Maker - Corporate ERP System',
  pricingSourcesList: [
    'Discounted Listed Price',
    'Vendor Quotation',
    'Management',
    'Previous BOQ',
    'Manual',
    'Other'
  ],
  systemsList: [
    'Nurse Call',
    'CCTV',
    'Access Control',
    'SMATV',
    'AV System',
    'Public Address (PA)',
    'Structured Cabling',
    'Networking',
    'IP Telephony',
    'Fire Alarm',
    'BMS',
    'ELV / MEP General'
  ]
};

// System Settings
export const getSystemSettings = async (isAdmin: boolean = false): Promise<SystemSettings> => {
  try {
    const docRef = doc(db, 'settings', 'globalDoc');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() } as SystemSettings;
    } else {
      if (isAdmin) {
        try {
          await setDoc(docRef, DEFAULT_SETTINGS);
        } catch (e) {
          console.warn('Firestore setDoc settings warning:', e);
        }
      }
      return DEFAULT_SETTINGS;
    }
  } catch (err) {
    console.warn('Using default settings fallback:', err);
    return DEFAULT_SETTINGS;
  }
};

export const updateSystemSettings = async (
  newSettings: SystemSettings, 
  adminUser: UserProfile
): Promise<void> => {
  const docRef = doc(db, 'settings', 'globalDoc');
  await setDoc(docRef, newSettings, { merge: true });
  await logAuditEvent(adminUser.uid, adminUser.name, adminUser.email, 'UPDATE_SETTINGS', 'Updated global system settings & exchange rates');
};

// User Management
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const querySnap = await getDocs(collection(db, 'users'));
  const users: UserProfile[] = [];
  querySnap.forEach(d => {
    users.push(d.data() as UserProfile);
  });
  return users;
};

export const updateUserRoleAndStatus = async (
  targetUid: string, 
  role: 'ADMIN' | 'USER', 
  status: 'ACTIVE' | 'DISABLED',
  adminUser: UserProfile
): Promise<void> => {
  const userRef = doc(db, 'users', targetUid);
  await updateDoc(userRef, { role, status });
  await logAuditEvent(adminUser.uid, adminUser.name, adminUser.email, 'UPDATE_USER_PERMISSIONS', `Updated user ${targetUid} role to ${role}, status to ${status}`);
};

// Audit Logs
export const getAuditLogs = async (maxLogs: number = 100): Promise<AuditLog[]> => {
  try {
    const logsRef = collection(db, 'auditLogs');
    const querySnap = await getDocs(logsRef);
    const logs: AuditLog[] = [];
    querySnap.forEach(d => {
      logs.push({ id: d.id, ...d.data() } as AuditLog);
    });
    return logs
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, maxLogs);
  } catch (err) {
    console.warn('getAuditLogs warning:', err);
    return [];
  }
};

// Item Library (Product Database / Product Catalog)
export const getItemLibraryProducts = async (): Promise<ItemLibraryProduct[]> => {
  const snap = await getDocs(collection(db, 'itemLibrary'));
  const products: ItemLibraryProduct[] = [];
  snap.forEach(d => {
    const data = d.data() as ItemLibraryProduct;
    if (data.active !== false) {
      products.push({ ...data, id: d.id });
    }
  });
  return products;
};

export const saveItemLibraryProduct = async (product: Omit<ItemLibraryProduct, 'id'>, id?: string): Promise<void> => {
  if (id) {
    await setDoc(doc(db, 'itemLibrary', id), product, { merge: true });
  } else {
    const newRef = doc(collection(db, 'itemLibrary'));
    await setDoc(newRef, { id: newRef.id, ...product });
  }
};

export const deleteItemLibraryProduct = async (id: string): Promise<void> => {
  const docRef = doc(db, 'itemLibrary', id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    // Fallback if rule restricts delete to Admin: soft delete via active: false
    await setDoc(docRef, { active: false, updatedAt: new Date().toISOString() }, { merge: true });
  }
};

/**
 * Automatically syncs line items from a BOQ into the Product Catalog (itemLibrary).
 * Each valid line item is saved as a catalog entry with its pricing, details, and BOQ reference.
 */
export const syncBOQItemsToCatalog = async (
  boq: Partial<BOQ> & { id: string; items?: BOQItem[] }
): Promise<number> => {
  if (!boq.id || !boq.items || !Array.isArray(boq.items) || boq.items.length === 0) {
    return 0;
  }

  const validItems = boq.items.filter(
    (item) => !item.isHeader && item.description && item.description.trim().length > 0
  );

  if (validItems.length === 0) return 0;

  let syncedCount = 0;
  const writePromises = validItems.map(async (item, idx) => {
    const rawItemId = item.id ? item.id.replace(/[^a-zA-Z0-9_-]/g, '_') : `row_${idx}`;
    const cleanBoqId = boq.id!.replace(/[^a-zA-Z0-9_-]/g, '_');
    const catalogDocId = `boq_${cleanBoqId}_${rawItemId}`;

    const cleanDescription = item.description.trim().substring(0, 990);
    const brand = (item.brand || boq.brand || '').trim();
    const model = (item.model || '').trim();
    const system = (item.system || boq.system || '').trim();
    const priceEUR = Math.max(0, Number(item.unitPriceEUR) || 0);
    const priceSAR = Math.max(0, Number(item.unitPriceSAR) || 0);
    const profitPct =
      item.profitPercentage !== null && item.profitPercentage !== undefined && !isNaN(Number(item.profitPercentage))
        ? Number(item.profitPercentage)
        : 15;
    const priceProfitIncl =
      Number(item.unitPriceProfitIncl) ||
      Number((priceSAR + priceSAR * (profitPct / 100)).toFixed(2));

    const catalogProduct: ItemLibraryProduct = {
      id: catalogDocId,
      brand,
      model,
      description: cleanDescription,
      system,
      defaultPriceEUR: priceEUR,
      defaultPriceSAR: priceSAR,
      defaultProfitPercentage: profitPct,
      pricingSource: item.pricingSource || 'Discounted Listed Price',
      active: true,
      sourceBoqId: boq.id,
      sourceBoqNumber: boq.boqNumber || '',
      sourceProjectName: boq.projectName || '',
      sourceDate: boq.date || new Date().toISOString().split('T')[0],
      unitPriceProfitIncl: priceProfitIncl,
      updatedAt: new Date().toISOString(),
      createdBy: boq.createdBy || ''
    };

    const docRef = doc(db, 'itemLibrary', catalogDocId);
    await setDoc(docRef, catalogProduct, { merge: true });
    syncedCount++;
  });

  await Promise.all(writePromises);
  return syncedCount;
};

const syncedBOQCache = new Map<string, string>();

/**
 * Clear the cache of synced BOQs (useful for testing or full forced re-sync)
 */
export const clearSyncedBOQCache = (): void => {
  syncedBOQCache.clear();
};

/**
 * Syncs line items from all provided BOQs into the Product Catalog.
 * Skips unchanged BOQs to prevent unnecessary writes and lag.
 */
export const syncAllBOQsToCatalog = async (
  boqs: BOQ[],
  force: boolean = false
): Promise<{ boqsCount: number; itemsCount: number }> => {
  let totalItemsSynced = 0;
  let boqsWithItemsCount = 0;

  for (const boq of boqs) {
    if (boq.id && boq.items && boq.items.length > 0) {
      const lastSynced = syncedBOQCache.get(boq.id);
      if (!force && lastSynced && boq.updatedAt && lastSynced === boq.updatedAt) {
        continue;
      }

      const count = await syncBOQItemsToCatalog(boq as Partial<BOQ> & { id: string; items: BOQItem[] });
      if (boq.updatedAt) {
        syncedBOQCache.set(boq.id, boq.updatedAt);
      }
      if (count > 0) {
        totalItemsSynced += count;
        boqsWithItemsCount++;
      }
    }
  }

  return { boqsCount: boqsWithItemsCount, itemsCount: totalItemsSynced };
};

// Vendor Price Catalog
export const getVendorPrices = async (): Promise<VendorPrice[]> => {
  const snap = await getDocs(collection(db, 'vendorPrices'));
  const list: VendorPrice[] = [];
  snap.forEach(d => {
    list.push({ id: d.id, ...d.data() } as VendorPrice);
  });
  return list;
};

export const saveVendorPrice = async (item: Omit<VendorPrice, 'id'>): Promise<void> => {
  const newRef = doc(collection(db, 'vendorPrices'));
  await setDoc(newRef, { id: newRef.id, ...item, updatedAt: new Date().toISOString() });
};

// BOQ Templates
export const getBOQTemplates = async (): Promise<BOQTemplate[]> => {
  const snap = await getDocs(collection(db, 'templates'));
  const templates: BOQTemplate[] = [];
  snap.forEach(d => {
    templates.push({ id: d.id, ...d.data() } as BOQTemplate);
  });
  return templates;
};

export const saveBOQTemplate = async (template: Omit<BOQTemplate, 'id'>): Promise<string> => {
  const newRef = doc(collection(db, 'templates'));
  const data = { id: newRef.id, ...template };
  await setDoc(newRef, data);
  return newRef.id;
};
