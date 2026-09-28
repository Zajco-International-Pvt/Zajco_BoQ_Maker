import { describe, it, expect } from 'vitest';
import { 
  generateEnquiryReference, 
  PROCUREMENT_STATUS_CONFIG, 
  PROCUREMENT_PRIORITY_CONFIG,
  ACTIVE_PROCUREMENT_STATUSES,
  normalizeProcurementStatus,
  matchProcurementStatus
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

  it('should configure valid lifecycle definitions for all active procurement statuses', () => {
    const expectedStatuses: ProcurementStatus[] = [
      'PURCHASES_POS_COMPLETED',
      'PENDING_POS',
      'URGENTLY_REQUIRED_MATERIALS',
      'SUPPLIER_DELAYS',
      'PRICE_SUPPLIER_ISSUES',
      'EXPECTED_DELIVERIES',
      'MATERIAL_SHORTAGES',
      'SUPPLIER_PAYMENT_ISSUES',
      'CRITICAL_STOCK_REQUIREMENTS',
      'CHAIRMAN_APPROVAL_REQUIRED',
      'NEW_ENQUIRY',
      'RFQ_SENT',
      'QUOTATION_IN_PROGRESS',
      'QUOTATION_RECEIVED',
      'UNDER_EVALUATION',
      'PO_ISSUED',
      'DELIVERED',
      'CLOSED'
    ];

    expect(ACTIVE_PROCUREMENT_STATUSES).toEqual(expectedStatuses);

    expectedStatuses.forEach(status => {
      const config = PROCUREMENT_STATUS_CONFIG[status];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.bgClass).toBeTruthy();
      expect(config.textClass).toBeTruthy();
    });

    // Specifically verify all requested status labels
    expect(PROCUREMENT_STATUS_CONFIG.PURCHASES_POS_COMPLETED.label).toBe('Purchases/POs completed');
    expect(PROCUREMENT_STATUS_CONFIG.PENDING_POS.label).toBe('Pending purchase orders');
    expect(PROCUREMENT_STATUS_CONFIG.URGENTLY_REQUIRED_MATERIALS.label).toBe('Urgently required materials');
    expect(PROCUREMENT_STATUS_CONFIG.SUPPLIER_DELAYS.label).toBe('Supplier delays');
    expect(PROCUREMENT_STATUS_CONFIG.PRICE_SUPPLIER_ISSUES.label).toBe('Price/supplier issues');
    expect(PROCUREMENT_STATUS_CONFIG.EXPECTED_DELIVERIES.label).toBe('Expected deliveries');
    expect(PROCUREMENT_STATUS_CONFIG.MATERIAL_SHORTAGES.label).toBe('Material shortages affecting projects');
    expect(PROCUREMENT_STATUS_CONFIG.SUPPLIER_PAYMENT_ISSUES.label).toBe('Supplier payment issues');
    expect(PROCUREMENT_STATUS_CONFIG.CRITICAL_STOCK_REQUIREMENTS.label).toBe('Critical stock requirements');
    expect(PROCUREMENT_STATUS_CONFIG.CHAIRMAN_APPROVAL_REQUIRED.label).toBe('Chairman approval required');
    expect(PROCUREMENT_STATUS_CONFIG.NEW_ENQUIRY.label).toBe('New Enquiry');
    expect(PROCUREMENT_STATUS_CONFIG.RFQ_SENT.label).toBe('RFQ Sent');
    expect(PROCUREMENT_STATUS_CONFIG.QUOTATION_IN_PROGRESS.label).toBe('Quotation in Progress');
    expect(PROCUREMENT_STATUS_CONFIG.QUOTATION_RECEIVED.label).toBe('Quotation Received');
    expect(PROCUREMENT_STATUS_CONFIG.UNDER_EVALUATION.label).toBe('Under Evaluation');
    expect(PROCUREMENT_STATUS_CONFIG.PO_ISSUED.label).toBe('PO Issued');
    expect(PROCUREMENT_STATUS_CONFIG.DELIVERED.label).toBe('Delivered');
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
      status: 'PENDING_POS',
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
    expect(item.status).toBe('PENDING_POS');
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

  it('should support storing multiple Base64 encoded images on ProcurementItem', () => {
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const itemWithImages: ProcurementItem = {
      id: 'test_item_img_1',
      referenceNumber: 'ENQ-2609-5678',
      itemName: 'Access Control Controller',
      description: '4-door IP controller with enclosure',
      category: 'Access Control',
      images: [sampleBase64],
      quantity: 2,
      unit: 'pcs',
      currency: 'SAR',
      priority: 'HIGH',
      status: 'PENDING_POS',
      vendorQuotes: [],
      activityLog: [],
      createdBy: 'admin_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    expect(itemWithImages.images).toBeDefined();
    expect(itemWithImages.images).toHaveLength(1);
    expect(itemWithImages.images![0]).toMatch(/^data:image\/[a-zA-Z]+;base64,/);
  });

  it('should normalize statuses and match raw text into valid active procurement statuses', () => {
    expect(normalizeProcurementStatus('NEW_ENQUIRY')).toBe('NEW_ENQUIRY');
    expect(normalizeProcurementStatus('PO_ISSUED')).toBe('PO_ISSUED');
    expect(normalizeProcurementStatus('DELIVERED')).toBe('DELIVERED');
    expect(normalizeProcurementStatus('CLOSED')).toBe('CLOSED');
    expect(normalizeProcurementStatus('QUOTATION_RECEIVED')).toBe('QUOTATION_RECEIVED');
    expect(normalizeProcurementStatus('RFQ_SENT')).toBe('RFQ_SENT');
    expect(normalizeProcurementStatus('QUOTATION_IN_PROGRESS')).toBe('QUOTATION_IN_PROGRESS');
    expect(normalizeProcurementStatus('UNDER_EVALUATION')).toBe('UNDER_EVALUATION');

    expect(matchProcurementStatus('Purchase Order Completed')).toBe('PURCHASES_POS_COMPLETED');
    expect(matchProcurementStatus('Supplier Delay on Shipment')).toBe('SUPPLIER_DELAYS');
    expect(matchProcurementStatus('Needs Chairman Approval')).toBe('CHAIRMAN_APPROVAL_REQUIRED');
    expect(matchProcurementStatus('Critical Stock Requirement')).toBe('CRITICAL_STOCK_REQUIREMENTS');
    expect(matchProcurementStatus('Material Shortage On Site')).toBe('MATERIAL_SHORTAGES');
    expect(matchProcurementStatus('Supplier Payment Pending')).toBe('SUPPLIER_PAYMENT_ISSUES');
    expect(matchProcurementStatus('Expected Delivery next week')).toBe('EXPECTED_DELIVERIES');
    expect(matchProcurementStatus('New Enquiry Received')).toBe('NEW_ENQUIRY');
    expect(matchProcurementStatus('RFQ Sent to Suppliers')).toBe('RFQ_SENT');
    expect(matchProcurementStatus('Quotation In Progress')).toBe('QUOTATION_IN_PROGRESS');
    expect(matchProcurementStatus('Quotation Received from Vendor')).toBe('QUOTATION_RECEIVED');
    expect(matchProcurementStatus('Under Evaluation Stage')).toBe('UNDER_EVALUATION');
    expect(matchProcurementStatus('PO Issued to Vendor')).toBe('PO_ISSUED');
    expect(matchProcurementStatus('Items Delivered to Site')).toBe('DELIVERED');
    expect(matchProcurementStatus('Procurement Closed')).toBe('CLOSED');
  });

  it('should reject non-image files in convertFileToBase64', async () => {
    const { convertFileToBase64 } = await import('../services/procurementService');
    const fakeTextFile = new File(['hello text'], 'notes.txt', { type: 'text/plain' });

    await expect(convertFileToBase64(fakeTextFile)).rejects.toThrow(/File must be an image format/);
  });

});

