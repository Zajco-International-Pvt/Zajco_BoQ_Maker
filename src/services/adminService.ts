import { db } from '../config/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, getDocs 
} from 'firebase/firestore';
import type { UserProfile, SystemSettings, ItemLibraryProduct, VendorPrice, BOQTemplate, AuditLog } from '../types';
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

// Item Library (Product Database)
export const getItemLibraryProducts = async (): Promise<ItemLibraryProduct[]> => {
  const snap = await getDocs(collection(db, 'itemLibrary'));
  const products: ItemLibraryProduct[] = [];
  snap.forEach(d => {
    products.push({ id: d.id, ...d.data() } as ItemLibraryProduct);
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
