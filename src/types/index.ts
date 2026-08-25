export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin: string;
}

export type BOQStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface BOQItem {
  id: string;
  serialNumber: number;
  description: string;
  quantity: number;
  pricingSource: string;
  unitPriceEUR: number;
  totalEUR: number;
  unitPriceSAR: number;
  totalSAR: number;
  profitPercentage: number | null; // e.g. 40, 2, 0.4, 1, or null
  percentageAdded: number;
  unitPriceProfitIncl: number;
  totalProfitIncl: number;
  isManualSAR?: boolean; // If true, EUR conversion doesn't overwrite unitPriceSAR
  brand?: string;
  model?: string;
  system?: string;
  notes?: string;
}

export interface BOQAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface BOQRevision {
  revisionNumber: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  notes?: string;
  snapshotData: {
    projectName: string;
    client: string;
    totalEUR: number;
    totalSAR: number;
    totalFinalValue: number;
    itemsCount: number;
  };
}

export interface BOQ {
  id: string;
  boqNumber: string;
  projectName: string;
  client: string;
  contractor: string;
  consultant: string;
  location: string;
  system: string;
  brand: string;
  preparedBy: string;
  checkedBy: string;
  date: string;
  revision: number;
  revisionHistory?: BOQRevision[];
  status: BOQStatus;
  currency: string;
  conversionRate: number; // EUR to SAR rate, default 5
  totalEUR: number;
  totalSAR: number;
  totalProfit: number;
  totalFinalValue: number;
  items: BOQItem[];
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
  excelFileUrl?: string;
  pdfFileUrl?: string;
  notes?: string;
  attachments?: BOQAttachment[];
  approvalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BOQTemplate {
  id: string;
  name: string;
  description: string;
  system: string;
  brand: string;
  defaultItems: Omit<BOQItem, 'id'>[];
  createdBy: string;
  createdAt: string;
}

export interface ItemLibraryProduct {
  id: string;
  brand: string;
  model: string;
  description: string;
  system: string;
  vendor?: string;
  unit?: string;
  defaultPriceEUR: number;
  defaultPriceSAR: number;
  defaultProfitPercentage: number;
  pricingSource: string;
  active: boolean;
}

export interface VendorPrice {
  id: string;
  vendor: string;
  brand: string;
  model: string;
  description: string;
  currency: string;
  unitPrice: number;
  discount: number;
  finalPrice: number;
  validUntil?: string;
  source: string;
  notes?: string;
  updatedAt: string;
}

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string;
  vatNumber: string;
  defaultCurrency: string;
  eurToSarRate: number; // Default 5
  defaultProfitPercentage: number; // e.g. 15
  boqNumberFormat: string; // e.g. BOQ-ZJO-YY-MM-DD-{SEQ}
  defaultPricingSource: string;
  defaultTerms: string;
  footerText: string;
  pricingSourcesList: string[];
  systemsList: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  boqId?: string;
  boqNumber?: string;
  timestamp: string;
  ipAddress?: string;
}
