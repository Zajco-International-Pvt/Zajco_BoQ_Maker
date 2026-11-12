import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncBOQItemsToCatalog,
  syncAllBOQsToCatalog,
  deleteItemLibraryProduct,
  extractCatalogProductsFromBOQs,
  getCombinedProductCatalog
} from '../services/adminService';
import type { BOQ, BOQItem, ItemLibraryProduct } from '../types';

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

  it('should extract catalog products across all users BOQs with creator names and pricing', () => {
    const multiUserBOQs: BOQ[] = [
      {
        id: 'boq_user_ahmed',
        boqNumber: 'BOQ-AHMED-01',
        projectName: 'Hospital Ward Wing A',
        createdBy: 'user_ahmed_1',
        createdByName: 'Ahmed Al-Mansoor',
        items: [
          {
            id: 'item_nurse_1',
            serialNumber: 1,
            description: 'Nurse Call Master Station IP',
            brand: 'Tunstall',
            model: 'NCM-100',
            system: 'Nurse Call',
            unitPriceEUR: 450,
            unitPriceSAR: 2250,
            profitPercentage: 20,
            unitPriceProfitIncl: 2700,
            isHeader: false
          }
        ]
      } as BOQ,
      {
        id: 'boq_user_sarah',
        boqNumber: 'BOQ-SARAH-02',
        projectName: 'Commercial Tower CCTV',
        createdBy: 'user_sarah_2',
        createdByName: 'Sarah Jenkins',
        items: [
          {
            id: 'item_cam_2',
            serialNumber: 1,
            description: '4K Varifocal Bullet Camera',
            brand: 'Honeywell',
            model: 'HBW-4K',
            system: 'CCTV',
            unitPriceEUR: 150,
            unitPriceSAR: 750,
            profitPercentage: 15,
            unitPriceProfitIncl: 862.5,
            isHeader: false
          }
        ]
      } as BOQ
    ];

    const extracted = extractCatalogProductsFromBOQs(multiUserBOQs);

    expect(extracted.length).toBe(2);
    expect(extracted[0].description).toBe('Nurse Call Master Station IP');
    expect(extracted[0].createdByName).toBe('Ahmed Al-Mansoor');
    expect(extracted[0].sourceProjectName).toBe('Hospital Ward Wing A');
    expect(extracted[0].defaultPriceSAR).toBe(2250);

    expect(extracted[1].description).toBe('4K Varifocal Bullet Camera');
    expect(extracted[1].createdByName).toBe('Sarah Jenkins');
    expect(extracted[1].sourceProjectName).toBe('Commercial Tower CCTV');
    expect(extracted[1].defaultPriceSAR).toBe(750);
  });

  it('should merge manual library products and multi-user BOQs into a unified catalog without duplicates', () => {
    const manualMasterProduct: ItemLibraryProduct = {
      id: 'manual_master_01',
      brand: 'Cisco',
      model: 'C9200L',
      description: 'Cisco Catalyst 24-Port Gigabit Switch',
      system: 'Networking',
      defaultPriceEUR: 300,
      defaultPriceSAR: 1500,
      defaultProfitPercentage: 15,
      pricingSource: 'Vendor Quotation',
      active: true,
      createdByName: 'Super Admin'
    };

    const multiUserBOQs: BOQ[] = [
      {
        id: 'boq_eng1',
        boqNumber: 'BOQ-001',
        projectName: 'Metro Station Project',
        createdBy: 'user_1',
        createdByName: 'Fahad Engineer',
        items: [
          {
            id: 'item_pa_1',
            serialNumber: 1,
            description: 'Ceiling Loudspeaker 6W',
            brand: 'Bosch',
            model: 'LBC3086',
            system: 'Public Address (PA)',
            unitPriceEUR: 25,
            unitPriceSAR: 125,
            profitPercentage: 15,
            unitPriceProfitIncl: 143.75,
            isHeader: false
          }
        ]
      } as BOQ,
      {
        id: 'boq_eng2',
        boqNumber: 'BOQ-002',
        projectName: 'School Campus PA System',
        createdBy: 'user_2',
        createdByName: 'Zaid Engineer',
        items: [
          {
            id: 'item_amp_2',
            serialNumber: 1,
            description: '240W Power Amplifier Mixer',
            brand: 'Bosch',
            model: 'PLE-1ME240',
            system: 'Public Address (PA)',
            unitPriceEUR: 220,
            unitPriceSAR: 1100,
            profitPercentage: 20,
            unitPriceProfitIncl: 1320,
            isHeader: false
          }
        ]
      } as BOQ
    ];

    const combined = getCombinedProductCatalog([manualMasterProduct], multiUserBOQs);

    expect(combined.length).toBe(3);
    const creatorNames = combined.map(p => p.createdByName);
    expect(creatorNames).toContain('Super Admin');
    expect(creatorNames).toContain('Fahad Engineer');
    expect(creatorNames).toContain('Zaid Engineer');
  });

  it('should filter out inactive items in getCombinedProductCatalog', () => {
    const inactiveProduct: ItemLibraryProduct = {
      id: 'boq_boq_del_item_1',
      brand: 'TestBrand',
      model: 'M-1',
      description: 'Deactivated Item',
      system: 'CCTV',
      defaultPriceEUR: 10,
      defaultPriceSAR: 50,
      defaultProfitPercentage: 15,
      pricingSource: 'Manual',
      active: false
    };

    const boq: BOQ = {
      id: 'boq_del',
      boqNumber: 'BOQ-DEL-01',
      items: [
        {
          id: 'item_1',
          serialNumber: 1,
          description: 'Deactivated Item',
          brand: 'TestBrand',
          model: 'M-1',
          system: 'CCTV',
          unitPriceEUR: 10,
          unitPriceSAR: 50,
          profitPercentage: 15,
          unitPriceProfitIncl: 57.5,
          isHeader: false
        }
      ]
    } as BOQ;

    const combined = getCombinedProductCatalog([inactiveProduct], [boq]);
    expect(combined.length).toBe(0);
  });

});
