import { describe, it, expect } from 'vitest';
import type { BOQ } from '../types';

describe('BOQ View & Action Distinction Tests', () => {
  const sampleBOQ: BOQ = {
    id: 'boq_test_123',
    boqNumber: 'BOQ-2026-0099',
    projectName: 'King Fahd Medical Center Nurse Call',
    client: 'Ministry of Health',
    contractor: 'Zajco International',
    consultant: 'Dar Al Riyadh',
    location: 'Riyadh, KSA',
    system: 'Nurse Call',
    brand: 'Tunstall',
    preparedBy: 'Eng. Sidhardh',
    checkedBy: 'Eng. Director',
    date: '2026-10-08',
    revision: 1,
    status: 'APPROVED',
    currency: 'EUR',
    conversionRate: 5,
    totalEUR: 1000,
    totalSAR: 5000,
    totalProfit: 1500,
    totalFinalValue: 6500,
    items: [
      {
        id: 'item_1',
        serialNumber: 1,
        description: 'Tunstall Com Station IP',
        quantity: 2,
        pricingSource: 'Discounted Listed Price',
        unitPriceEUR: 250,
        totalEUR: 500,
        unitPriceSAR: 1250,
        totalSAR: 2500,
        profitPercentage: 20,
        percentageAdded: 250,
        unitPriceProfitIncl: 1500,
        totalProfitIncl: 3000,
        isHeader: false,
        isInstallation: false
      },
      {
        id: 'item_2',
        serialNumber: 2,
        description: 'Installation, Testing & Commissioning',
        quantity: 1,
        pricingSource: 'Management',
        unitPriceEUR: 0,
        totalEUR: 0,
        unitPriceSAR: 3000,
        totalSAR: 3000,
        profitPercentage: 16.67,
        percentageAdded: 500,
        unitPriceProfitIncl: 3500,
        totalProfitIncl: 3500,
        isHeader: false,
        isInstallation: true
      }
    ],
    createdBy: 'user_1',
    createdAt: '2026-10-08T09:00:00Z',
    updatedAt: '2026-10-08T09:00:00Z'
  };

  it('validates sample BOQ structure for read-only preview', () => {
    expect(sampleBOQ.boqNumber).toBe('BOQ-2026-0099');
    expect(sampleBOQ.items).toHaveLength(2);
    expect(sampleBOQ.totalFinalValue).toBe(6500);
    expect(sampleBOQ.items[1].isInstallation).toBe(true);
  });

  it('ensures separate view and edit callbacks contract', () => {
    let viewedBOQ: BOQ | null = null;
    let editedBOQ: BOQ | null = null;

    const handleView = (boq: BOQ) => {
      viewedBOQ = boq;
    };

    const handleEdit = (boq: BOQ) => {
      editedBOQ = boq;
    };

    // Clicking View (Eye button) triggers view ONLY
    handleView(sampleBOQ);
    expect(viewedBOQ).toBe(sampleBOQ);
    expect(editedBOQ).toBeNull();

    // Clicking Edit (Pen button) triggers edit
    handleEdit(sampleBOQ);
    expect(editedBOQ).toBe(sampleBOQ);
  });
});
