import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncBOQItemsToCatalog,
  syncAllBOQsToCatalog,
  deleteItemLibraryProduct
} from '../services/adminService';
import type { BOQ, BOQItem } from '../types';

// Hoisted mock variables
const { mockSetDoc, mockDeleteDoc, mockDoc, mockCollection } = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn((...args: unknown[]) => ({ args, id: (args[2] as string) || 'mock_doc_id' })),
  mockCollection: vi.fn((...args: unknown[]) => ({ args }))
}));

vi.mock('../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test_user_1', email: 'engineer@zajco.com' } }
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  setDoc: mockSetDoc,
  updateDoc: vi.fn(),
  deleteDoc: mockDeleteDoc,
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn()
}));

vi.mock('../services/auditService', () => ({
  logAuditEvent: vi.fn()
}));

describe('Product Catalog (Item Library) Automatic Sync Tests', () => {

  beforeEach(() => {
    mockSetDoc.mockClear();
    mockDeleteDoc.mockClear();
    mockDoc.mockClear();
  });

  it('should sync all non-header items with prices and details from a BOQ to itemLibrary', async () => {
    const sampleBOQ: Partial<BOQ> & { id: string; items: BOQItem[] } = {
      id: 'boq_hospital_01',
      boqNumber: 'BOQ-ZJO-26-05-12-001',
      projectName: 'Al-Noor Hospital Phase 2',
      system: 'Nurse Call',
      brand: 'Tunstall',
      date: '2026-05-12',
      items: [
        {
          id: 'item_header_0',
          serialNumber: 0,
          description: 'SECTION A: INPATIENT ROOM EQUIPMENT',
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
          isHeader: true
        },
        {
          id: 'item_callpoint_1',
          serialNumber: 1,
          description: 'IP Bedside Call Point Unit with Handset',
          brand: 'Tunstall',
          model: '76060550',
          system: 'Nurse Call',
          quantity: 25,
          pricingSource: 'Discounted Listed Price',
          unitPriceEUR: 85.50,
          totalEUR: 2137.50,
          unitPriceSAR: 427.50,
          totalSAR: 10687.50,
          profitPercentage: 20,
          percentageAdded: 85.50,
          unitPriceProfitIncl: 513.00,
          totalProfitIncl: 12825.00
        },
        {
          id: 'item_overdoor_2',
          serialNumber: 2,
          description: 'Multi-Colour LED Overdoor Light',
          brand: 'Tunstall',
          model: '76060300',
          system: 'Nurse Call',
          quantity: 15,
          pricingSource: 'Vendor Quotation',
          unitPriceEUR: 45.00,
          totalEUR: 675.00,
          unitPriceSAR: 225.00,
          totalSAR: 3375.00,
          profitPercentage: 15,
          percentageAdded: 33.75,
          unitPriceProfitIncl: 258.75,
          totalProfitIncl: 3881.25
        }
      ]
    };

    const count = await syncBOQItemsToCatalog(sampleBOQ);

    // Section header must be ignored; exactly 2 product items should be synced
    expect(count).toBe(2);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);

    // Verify first synced product payload
    const firstCallPayload = mockSetDoc.mock.calls[0][1];
    expect(firstCallPayload.id).toBe('boq_boq_hospital_01_item_callpoint_1');
    expect(firstCallPayload.description).toBe('IP Bedside Call Point Unit with Handset');
    expect(firstCallPayload.brand).toBe('Tunstall');
    expect(firstCallPayload.model).toBe('76060550');
    expect(firstCallPayload.system).toBe('Nurse Call');
    expect(firstCallPayload.defaultPriceEUR).toBe(85.50);
    expect(firstCallPayload.defaultPriceSAR).toBe(427.50);
    expect(firstCallPayload.defaultProfitPercentage).toBe(20);
    expect(firstCallPayload.unitPriceProfitIncl).toBe(513.00);
    expect(firstCallPayload.sourceBoqId).toBe('boq_hospital_01');
    expect(firstCallPayload.sourceBoqNumber).toBe('BOQ-ZJO-26-05-12-001');
    expect(firstCallPayload.sourceProjectName).toBe('Al-Noor Hospital Phase 2');
    expect(firstCallPayload.sourceDate).toBe('2026-05-12');
    expect(firstCallPayload.active).toBe(true);
  });

  it('should store items from different BOQs as separate distinct catalog items, preserving both historical prices', async () => {
    // Same item quoted at €100 in BOQ 1
    const boq1: Partial<BOQ> & { id: string; items: BOQItem[] } = {
      id: 'boq_project_A',
      boqNumber: 'BOQ-ZJO-26-01-01-001',
      projectName: 'Project Alpha',
      system: 'CCTV',
      brand: 'Honeywell',
      items: [
        {
          id: 'camera_1',
          serialNumber: 1,
          description: '4MP Outdoor Dome IP Camera',
          brand: 'Honeywell',
          model: 'HCD-400',
          quantity: 10,
          pricingSource: 'Listed Price',
          unitPriceEUR: 100,
          totalEUR: 1000,
          unitPriceSAR: 500,
          totalSAR: 5000,
          profitPercentage: 15,
          percentageAdded: 75,
          unitPriceProfitIncl: 575,
          totalProfitIncl: 5750
        }
      ]
    };

    // Same item quoted at €120 in BOQ 2
    const boq2: Partial<BOQ> & { id: string; items: BOQItem[] } = {
      id: 'boq_project_B',
      boqNumber: 'BOQ-ZJO-26-02-02-002',
      projectName: 'Project Beta',
      system: 'CCTV',
      brand: 'Honeywell',
      items: [
        {
          id: 'camera_1',
          serialNumber: 1,
          description: '4MP Outdoor Dome IP Camera',
          brand: 'Honeywell',
          model: 'HCD-400',
          quantity: 8,
          pricingSource: 'Listed Price',
          unitPriceEUR: 120,
          totalEUR: 960,
          unitPriceSAR: 600,
          totalSAR: 4800,
          profitPercentage: 20,
          percentageAdded: 120,
          unitPriceProfitIncl: 720,
          totalProfitIncl: 5760
        }
      ]
    };

    await syncBOQItemsToCatalog(boq1);
    await syncBOQItemsToCatalog(boq2);

    expect(mockSetDoc).toHaveBeenCalledTimes(2);

    const doc1Payload = mockSetDoc.mock.calls[0][1];
    const doc2Payload = mockSetDoc.mock.calls[1][1];

    // Verify distinct IDs
    expect(doc1Payload.id).toBe('boq_boq_project_A_camera_1');
    expect(doc2Payload.id).toBe('boq_boq_project_B_camera_1');
    expect(doc1Payload.id).not.toBe(doc2Payload.id);

    // Verify differing historical prices are preserved independently
    expect(doc1Payload.defaultPriceEUR).toBe(100);
    expect(doc1Payload.defaultPriceSAR).toBe(500);
    expect(doc1Payload.sourceProjectName).toBe('Project Alpha');

    expect(doc2Payload.defaultPriceEUR).toBe(120);
    expect(doc2Payload.defaultPriceSAR).toBe(600);
    expect(doc2Payload.sourceProjectName).toBe('Project Beta');
  });

  it('should sync all existing BOQs in bulk when syncAllBOQsToCatalog is called', async () => {
    const boqs: BOQ[] = [
      {
        id: 'boq_1',
        boqNumber: 'BOQ-001',
        projectName: 'Clinic X',
        items: [
          {
            id: 'item_1',
            serialNumber: 1,
            description: 'Item A',
            quantity: 1,
            pricingSource: '',
            unitPriceEUR: 10,
            totalEUR: 10,
            unitPriceSAR: 50,
            totalSAR: 50,
            profitPercentage: 10,
            percentageAdded: 5,
            unitPriceProfitIncl: 55,
            totalProfitIncl: 55
          }
        ]
      } as BOQ,
      {
        id: 'boq_2',
        boqNumber: 'BOQ-002',
        projectName: 'Clinic Y',
        items: [
          {
            id: 'item_2',
            serialNumber: 1,
            description: 'Item B',
            quantity: 2,
            pricingSource: '',
            unitPriceEUR: 20,
            totalEUR: 40,
            unitPriceSAR: 100,
            totalSAR: 200,
            profitPercentage: 15,
            percentageAdded: 15,
            unitPriceProfitIncl: 115,
            totalProfitIncl: 230
          }
        ]
      } as BOQ
    ];

    const result = await syncAllBOQsToCatalog(boqs);

    expect(result.boqsCount).toBe(2);
    expect(result.itemsCount).toBe(2);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });

  it('should delete or soft-delete item on deleteItemLibraryProduct', async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);

    await deleteItemLibraryProduct('item_123');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

});
