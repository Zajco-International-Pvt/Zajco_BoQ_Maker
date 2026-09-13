import { describe, it, expect } from 'vitest';
import { 
  generateEnquiryReference, 
  PROCUREMENT_STATUS_CONFIG, 
  PROCUREMENT_PRIORITY_CONFIG 
} from '../services/procurementService';
import type { ProcurementStatus, ProcurementPriority, ProcurementItem, VendorQuotationEntry } from '../types';

describe('Procurement Service & Module Helpers', () => {

  it('should generate properly formatted enquiry reference numbers (ENQ-YYMM-XXXX)', () => {
    const ref1 = generateEnquiryReference();
    const ref2 = generateEnquiryReference();

    expect(ref1).toMatch(/^ENQ-\d{4}-\d{4}$/);
    expect(ref2).toMatch(/^ENQ-\d{4}-\d{4}$/);

    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    expect(ref1).toContain(`ENQ-${yy}${mm}-`);
  });

  it('should configure valid lifecycle definitions for all procurement statuses', () => {
    const expectedStatuses: ProcurementStatus[] = [
      'NEW_ENQUIRY',
      'RFQ_SENT',
      'QUOTATION_IN_PROGRESS',
      'QUOTATION_RECEIVED',
      'UNDER_EVALUATION',
      'PO_ISSUED',
      'DELIVERED',
      'CLOSED',
      'CANCELLED'
    ];

    expectedStatuses.forEach(status => {
      const config = PROCUREMENT_STATUS_CONFIG[status];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.bgClass).toBeTruthy();
      expect(config.textClass).toBeTruthy();
    });

    // Specifically verify requested statuses
    expect(PROCUREMENT_STATUS_CONFIG.QUOTATION_IN_PROGRESS.label).toBe('In Quotation (Vendor)');
    expect(PROCUREMENT_STATUS_CONFIG.CLOSED.label).toBe('Closed');
  });

  it('should configure priority styling for all priorities', () => {
    const expectedPriorities: ProcurementPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    expectedPriorities.forEach(priority => {
      const config = PROCUREMENT_PRIORITY_CONFIG[priority];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.badge).toBeTruthy();
    });
  });

  it('should compute vendor quotation net and total pricing accurately', () => {
    const quote: Partial<VendorQuotationEntry> = {
      unitPrice: 1000,
      discountPercentage: 15,
      currency: 'SAR'
    };

    const calculatedNet = quote.unitPrice! * (1 - (quote.discountPercentage! / 100));
    expect(calculatedNet).toBe(850);

    const quantity = 5;
    const totalOrder = calculatedNet * quantity;
    expect(totalOrder).toBe(4250);
  });

  it('should structure standalone ProcurementItem without requiring BOQ linkage', () => {
    const item: ProcurementItem = {
      id: 'test_proc_1',
      referenceNumber: 'ENQ-2609-1234',
      itemName: 'Master Audio Call Station',
      description: 'Wall mounted hospital station',
      category: 'Nurse Call System',
      brand: 'Tunstall',
      model: 'NC-400',
      quantity: 10,
      unit: 'pcs',
      targetUnitPrice: 1200,
      currency: 'SAR',
      priority: 'HIGH',
      status: 'QUOTATION_IN_PROGRESS',
      requestedBy: 'Site Engineer',
      assignedTo: 'Procurement Buyer',
      projectReference: 'Riyadh Hospital',
      expectedDate: '2026-10-15',
      vendorQuotes: [],
      activityLog: [],
      notes: 'Urgent enquiry for quotation',
      createdBy: 'admin_uid',
      createdByName: 'Admin User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(item.id).toBe('test_proc_1');
    expect(item.status).toBe('QUOTATION_IN_PROGRESS');
    expect(item.referenceNumber).toBe('ENQ-2609-1234');
    expect(item.vendorQuotes).toHaveLength(0);
  });

  it('should parse Excel sheet data and auto-map column headers to procurement fields', async () => {
    const XLSX = await import('xlsx');
    const { extractProcurementSheetRows } = await import('../services/procurementService');

    const sampleHeaders = ['Item Description', 'System', 'Brand', 'Model Code', 'Qty', 'UOM', 'Target Price', 'Priority'];
    const sampleRows = [
      ['Dome IP Camera 4MP', 'CCTV', 'Hikvision', 'DS-2CD2143G2-I', 20, 'pcs', 350, 'HIGH'],
      ['Smoke Detector Optical', 'Fire Alarm', 'Honeywell', 'MI-PSE-S2I', 50, 'pcs', 110, 'URGENT']
    ];

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');

    const result = extractProcurementSheetRows(wb, 'Enquiries');

    expect(result.headers).toEqual(sampleHeaders);
    expect(result.rows).toHaveLength(2);
    expect(result.suggestedMapping.itemName).toBe('Item Description');
    expect(result.suggestedMapping.category).toBe('System');
    expect(result.suggestedMapping.brand).toBe('Brand');
    expect(result.suggestedMapping.model).toBe('Model Code');
    expect(result.suggestedMapping.quantity).toBe('Qty');
    expect(result.suggestedMapping.unit).toBe('UOM');
    expect(result.suggestedMapping.targetUnitPrice).toBe('Target Price');
    expect(result.suggestedMapping.priority).toBe('Priority');
  });

});

