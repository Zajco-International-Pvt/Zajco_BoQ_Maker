import { describe, it, expect, vi, beforeEach } from 'vitest';
import { duplicateBOQ, sanitizeForFirestore } from '../services/boqService';
import type { BOQ } from '../types';

// Hoisted mock variables
const { mockSetDoc, mockDoc, mockCollection } = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => ({ args, id: 'new_duplicated_doc_id' })),
  mockCollection: vi.fn((...args: unknown[]) => ({ args }))
}));

vi.mock('../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user_active_123', email: 'active@zajco.com', displayName: 'Active Engineer' } }
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  setDoc: mockSetDoc,
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

describe('duplicateBOQ and sanitizeForFirestore Unit Tests', () => {

  beforeEach(() => {
    mockSetDoc.mockClear();
    mockDoc.mockClear();
  });

  describe('sanitizeForFirestore', () => {
    it('should recursively strip undefined properties without altering defined or null values', () => {
      const input = {
        name: 'Project Test',
        excelFileUrl: undefined,
        pdfFileUrl: undefined,
        nested: {
          valid: 123,
          removed: undefined,
          nullVal: null
        },
        items: [
          { id: '1', note: undefined, desc: 'Item 1' },
          { id: '2', validField: true }
        ]
      };

      const sanitized = sanitizeForFirestore(input);

      expect(sanitized).not.toHaveProperty('excelFileUrl');
      expect(sanitized).not.toHaveProperty('pdfFileUrl');
      expect(sanitized.nested).not.toHaveProperty('removed');
      expect(sanitized.nested.valid).toBe(123);
      expect(sanitized.nested.nullVal).toBeNull();
      expect(sanitized.items[0]).not.toHaveProperty('note');
      expect(sanitized.items[0].desc).toBe('Item 1');
    });
  });

  describe('duplicateBOQ', () => {
    const sampleApprovedBOQ: BOQ = {
      id: 'source_boq_999',
      boqNumber: 'BOQ-ZJO-26-01-01-001',
      projectName: 'Hospital Nurse Call Project',
      client: 'Ministry of Health',
      contractor: 'Zajco International',
      consultant: 'Dar Al-Handasah',
      location: 'Riyadh',
      system: 'Nurse Call',
      brand: 'Tunstall',
      preparedBy: 'Original Engineer',
      checkedBy: 'Head of Engineering',
      date: '2026-01-01',
      revision: 3,
      revisionHistory: [
        {
          revisionNumber: 0,
          createdAt: '2026-01-01T10:00:00.000Z',
          createdBy: 'user_orig_888',
          createdByName: 'Original Engineer',
          snapshotData: { totalEUR: 1000, totalSAR: 5000, totalFinalValue: 6000, itemsCount: 2 }
        }
      ],
      status: 'APPROVED',
      approvedBy: 'General Manager',
      approvedAt: '2026-01-10T14:00:00.000Z',
      approvalNotes: 'Approved with discounted margins',
      currency: 'SAR',
      conversionRate: 5,
      totalEUR: 1000,
      totalSAR: 5000,
      totalProfit: 1000,
      totalFinalValue: 6000,
      items: [
        {
          id: 'item_old_1',
          serialNumber: 1,
          description: 'Nurse Call Station',
          quantity: 10,
          pricingSource: 'Discounted Listed Price',
          unitPriceEUR: 100,
          totalEUR: 1000,
          unitPriceSAR: 500,
          totalSAR: 5000,
          profitPercentage: 20,
          percentageAdded: 100,
          unitPriceProfitIncl: 600,
          totalProfitIncl: 6000
        }
      ],
      createdBy: 'user_orig_888',
      createdByName: 'Original Engineer',
      createdByEmail: 'orig@zajco.com',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-10T14:00:00.000Z',
      excelFileUrl: 'https://storage.googleapis.com/test/old.xlsx',
      pdfFileUrl: 'https://storage.googleapis.com/test/old.pdf'
    };

    it('should create a brand new draft copy with a fresh BOQ number, suffix (Copy), and reset revision', async () => {
      const newId = await duplicateBOQ(
        sampleApprovedBOQ,
        'user_active_123',
        'Active Engineer',
        'active@zajco.com'
      );

      expect(newId).toBe('new_duplicated_doc_id');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      const savedData = mockSetDoc.mock.calls[0][1];

      // Verification of identity & numbering
      expect(savedData.id).toBe('new_duplicated_doc_id');
      expect(savedData.boqNumber).toMatch(/^BOQ-ZJO-\d{2}-\d{2}-\d{2}-\d{3}$/);
      expect(savedData.projectName).toBe('Hospital Nurse Call Project (Copy)');

      // Verification of status & revisions
      expect(savedData.status).toBe('DRAFT');
      expect(savedData.revision).toBe(0);
      expect(savedData.revisionHistory).toEqual([]);

      // Verification of ownership
      expect(savedData.createdBy).toBe('user_active_123');
      expect(savedData.createdByName).toBe('Active Engineer');
      expect(savedData.createdByEmail).toBe('active@zajco.com');
      expect(savedData.preparedBy).toBe('Active Engineer');

      // Previous approval and previous export URLs must NEVER be copied
      expect(savedData.approvedBy).toBeUndefined();
      expect(savedData.approvedAt).toBeUndefined();
      expect(savedData.approvalNotes).toBeUndefined();
      expect(savedData.excelFileUrl).toBeUndefined();
      expect(savedData.pdfFileUrl).toBeUndefined();

      // No undefined fields must be present in savedData
      for (const [_key, value] of Object.entries(savedData)) {
        expect(value).not.toBeUndefined();
      }

      // Verification that items received fresh IDs
      expect(savedData.items).toHaveLength(1);
      expect(savedData.items[0].id).not.toBe('item_old_1');
      expect(savedData.items[0].description).toBe('Nurse Call Station');
      expect(savedData.items[0].totalProfitIncl).toBe(6000);
      expect(savedData.totalFinalValue).toBe(6000);
    });

    it('should fall back to auth.currentUser if userId/userName/userEmail arguments are omitted', async () => {
      await duplicateBOQ(sampleApprovedBOQ);

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const savedData = mockSetDoc.mock.calls[0][1];

      expect(savedData.createdBy).toBe('user_active_123');
      expect(savedData.createdByName).toBe('Active Engineer');
      expect(savedData.createdByEmail).toBe('active@zajco.com');
    });

    it('should handle source BOQ with empty/missing projectName gracefully without producing "undefined (Copy)"', async () => {
      const boqWithoutName = { ...sampleApprovedBOQ, projectName: undefined };
      await duplicateBOQ(boqWithoutName as any, 'user_active_123', 'Active Engineer', 'active@zajco.com');

      const savedData = mockSetDoc.mock.calls[0][1];
      expect(savedData.projectName).toBe('BOQ (Copy)');
    });
  });

});
