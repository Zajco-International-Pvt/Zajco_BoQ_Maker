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

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  defaultRateToSAR: number;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', name: 'Euro (€)', symbol: '€', defaultRateToSAR: 5.0 },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$', defaultRateToSAR: 3.75 },
  { code: 'AED', name: 'UAE Dirham (AED / د.إ)', symbol: 'AED', defaultRateToSAR: 1.02 },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£', defaultRateToSAR: 4.85 },
  { code: 'SAR', name: 'Saudi Riyal (SAR / ﷼)', symbol: 'SAR', defaultRateToSAR: 1.0 },
  { code: 'QAR', name: 'Qatari Riyal (QAR)', symbol: 'QAR', defaultRateToSAR: 1.03 },
  { code: 'KWD', name: 'Kuwaiti Dinar (KWD)', symbol: 'KWD', defaultRateToSAR: 12.25 },
  { code: 'BHD', name: 'Bahraini Dinar (BHD)', symbol: 'BHD', defaultRateToSAR: 9.95 },
  { code: 'OMR', name: 'Omani Rial (OMR)', symbol: 'OMR', defaultRateToSAR: 9.75 },
  { code: 'CNY', name: 'Chinese Yuan (¥)', symbol: '¥', defaultRateToSAR: 0.52 },
  { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥', defaultRateToSAR: 0.025 },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹', defaultRateToSAR: 0.045 }
];

export const getCurrencySymbol = (code?: string): string => {
  if (!code) return '€';
  const match = SUPPORTED_CURRENCIES.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
  return match?.symbol || code.toUpperCase();
};

export const getDefaultRateToSAR = (code?: string, fallbackRate: number = 5.0): number => {
  if (!code) return fallbackRate;
  const match = SUPPORTED_CURRENCIES.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
  return match?.defaultRateToSAR ?? fallbackRate;
};

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
  isHeader?: boolean; // If true, row acts as a section header/category title
  isInstallation?: boolean; // If true, row represents installation/testing/commissioning service
  brand?: string;
  model?: string;
  system?: string;
  notes?: string;
}

export interface BOQCalculationSummary {
  purchaseBillAmountEUR: number;
  purchaseBillAmountSAR: number;
  sellingPriceWithoutInstallation: number;
  installationAmount: number;
  sellingPriceWithInstallation: number;
  profitAmount: number;
  profitPercentage: number;
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
    projectName?: string;
    client?: string;
    totalEUR: number;
    totalSAR: number;
    totalFinalValue: number;
    itemsCount: number;
  };
}

export interface BOQ {
  id: string;
  boqNumber: string;
  projectName?: string;
  client?: string;
  contractor?: string;
  consultant?: string;
  location?: string;
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
  calculationSummary?: BOQCalculationSummary;
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

export type ProcurementStatus = 
  | 'PURCHASES_POS_COMPLETED'
  | 'PENDING_POS'
  | 'URGENTLY_REQUIRED_MATERIALS'
  | 'SUPPLIER_DELAYS'
  | 'PRICE_SUPPLIER_ISSUES'
  | 'EXPECTED_DELIVERIES'
  | 'MATERIAL_SHORTAGES'
  | 'SUPPLIER_PAYMENT_ISSUES'
  | 'CRITICAL_STOCK_REQUIREMENTS'
  | 'CHAIRMAN_APPROVAL_REQUIRED'
  | 'NEW_ENQUIRY'
  | 'RFQ_SENT'
  | 'QUOTATION_IN_PROGRESS'
  | 'QUOTATION_RECEIVED'
  | 'UNDER_EVALUATION'
  | 'PO_ISSUED'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED';

export type ProcurementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface VendorQuotationEntry {
  id: string;
  vendorName: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  unitPrice: number;
  currency: string;
  discountPercentage?: number;
  netPrice: number;
  leadTime?: string;
  quoteReference?: string;
  quoteDate?: string;
  validUntil?: string;
  isAwarded?: boolean;
  notes?: string;
  createdAt: string;
}

export interface ProcurementActivityLog {
  id: string;
  timestamp: string;
  authorName: string;
  authorEmail?: string;
  action: string;
  note?: string;
}

export interface ProcurementItem {
  id: string;
  referenceNumber: string;
  itemName: string;
  description: string;
  category: string;
  brand?: string;
  model?: string;
  images?: string[]; // Base64 data URLs: "data:image/png;base64,..."
  quantity: number;
  unit: string;
  targetUnitPrice?: number;
  currency: string;
  priority: ProcurementPriority;
  status: ProcurementStatus;
  requestedBy?: string;
  assignedTo?: string;
  projectReference?: string;
  expectedDate?: string;
  vendorQuotes: VendorQuotationEntry[];
  activityLog: ProcurementActivityLog[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

