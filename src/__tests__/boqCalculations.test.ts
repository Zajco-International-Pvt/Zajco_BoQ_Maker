import { describe, it, expect } from 'vitest';
import { calculateBOQItemRow, recalculateBOQTotals, generateBOQNumber, computeBOQCalculationSummary } from '../services/boqService';
import type { BOQItem } from '../types';

describe('BOQ Calculations Engine Tests', () => {

  it('should correctly calculate Tunstall sample row (EUR to SAR conversion + Profit %)', () => {
    // Tunstall - 76060550 Com Station IP
    // EUR Price = 412.54, Qty = 3, Rate = 5, Profit % = 40
    const rawItem: Partial<BOQItem> = {
      serialNumber: 1,
      description: 'Tunstall - 76060550 Com Station IP',
      quantity: 3,
      unitPriceEUR: 412.54,
      profitPercentage: 40,
      pricingSource: 'Discounted Listed Price'
    };

    const calculated = calculateBOQItemRow(rawItem, 5);

    expect(calculated.totalEUR).toBe(1237.62); // 412.54 * 3
    expect(calculated.unitPriceSAR).toBe(2062.70); // 412.54 * 5
    expect(calculated.totalSAR).toBe(6188.10); // 2062.70 * 3
    expect(calculated.percentageAdded).toBe(825.08); // 2062.70 * 0.40
    expect(calculated.unitPriceProfitIncl).toBe(2887.78); // 2062.70 + 825.08
    expect(calculated.totalProfitIncl).toBe(8663.34); // 2887.78 * 3
  });

  it('should handle decimal profit percentages correctly (0.4%, 2%, 15%, blank)', () => {
    const rawItem1: Partial<BOQItem> = {
      quantity: 10,
      unitPriceEUR: 100,
      profitPercentage: 0.4 // 0.4%
    };
    const calc1 = calculateBOQItemRow(rawItem1, 5);
    expect(calc1.unitPriceSAR).toBe(500.00);
    expect(calc1.percentageAdded).toBe(2.00); // 500 * 0.004

    const rawItemBlank: Partial<BOQItem> = {
      quantity: 5,
      unitPriceEUR: 50,
      profitPercentage: null
    };
    const calcBlank = calculateBOQItemRow(rawItemBlank, 5);
    expect(calcBlank.percentageAdded).toBe(0);
    expect(calcBlank.unitPriceProfitIncl).toBe(250.00);
  });

  it('should support Manual SAR Price without overwriting EUR conversion', () => {
    const manualItem: Partial<BOQItem> = {
      description: '24 PORT POE SWITCH',
      quantity: 4,
      unitPriceEUR: 0,
      unitPriceSAR: 4200.00,
      isManualSAR: true,
      profitPercentage: 12
    };

    const calc = calculateBOQItemRow(manualItem, 5);
    expect(calc.unitPriceSAR).toBe(4200.00);
    expect(calc.totalSAR).toBe(16800.00);
    expect(calc.percentageAdded).toBe(504.00); // 4200 * 0.12
    expect(calc.unitPriceProfitIncl).toBe(4704.00);
    expect(calc.totalProfitIncl).toBe(18816.00);
  });

  it('should correctly sum total EUR, total SAR, total profit amount, and final BOQ value', () => {
    const items: BOQItem[] = [
      calculateBOQItemRow({ quantity: 2, unitPriceEUR: 100, profitPercentage: 20 }, 5),
      calculateBOQItemRow({ quantity: 1, unitPriceEUR: 0, unitPriceSAR: 1000, isManualSAR: true, profitPercentage: 10 }, 5)
    ];

    const totals = recalculateBOQTotals(items);

    // Item 1: EUR = 200, SAR = 1000, Profit Incl = (500 + 100) * 2 = 1200
    // Item 2: EUR = 0, SAR = 1000, Profit Incl = (1000 + 100) * 1 = 1100
    expect(totals.totalEUR).toBe(200);
    expect(totals.totalSAR).toBe(2000);
    expect(totals.totalProfit).toBe(300); // 200 + 100
    expect(totals.totalFinalValue).toBe(2300); // 1200 + 1100
  });

  it('should support Section Header rows with 0 values without breaking totals', () => {
    const headerRow = calculateBOQItemRow({
      description: 'SECTION 1: CONTROL EQUIPMENT',
      isHeader: true
    }, 5);

    expect(headerRow.isHeader).toBe(true);
    expect(headerRow.quantity).toBe(0);
    expect(headerRow.unitPriceEUR).toBe(0);
    expect(headerRow.totalEUR).toBe(0);
    expect(headerRow.unitPriceSAR).toBe(0);
    expect(headerRow.totalSAR).toBe(0);
    expect(headerRow.totalProfitIncl).toBe(0);

    const normalItem = calculateBOQItemRow({
      quantity: 2,
      unitPriceEUR: 100,
      profitPercentage: 20
    }, 5);

    const totals = recalculateBOQTotals([headerRow, normalItem]);
    expect(totals.totalEUR).toBe(200);
    expect(totals.totalSAR).toBe(1000);
    expect(totals.totalFinalValue).toBe(1200);
  });

  it('should correctly compute commercial calculation summary (Purchase SAR, Selling price with/without installation, Profit amount, Profit %)', () => {
    // Supply items: Purchase SAR = 17,430.35, Selling = 21,932.76
    // Installation item: 8,750.00
    const supplyItem: Partial<BOQItem> = {
      serialNumber: 1,
      description: 'Nurse Call Supply Hardware Packages',
      quantity: 1,
      unitPriceEUR: 3486.07,
      unitPriceSAR: 17430.35,
      isManualSAR: true,
      profitPercentage: 25.83086386
    };

    const installItem: Partial<BOQItem> = {
      serialNumber: 2,
      description: 'Installation , Testing and Commissioning',
      quantity: 1,
      unitPriceEUR: 0,
      unitPriceSAR: 8750.00,
      isManualSAR: true,
      profitPercentage: 0
    };

    const calcSupply = calculateBOQItemRow(supplyItem, 5);
    const calcInstall = calculateBOQItemRow(installItem, 5);

    const summary = computeBOQCalculationSummary([calcSupply, calcInstall]);

    expect(summary.purchaseBillAmountSAR).toBe(17430.35);
    expect(summary.sellingPriceWithoutInstallation).toBe(21932.76);
    expect(summary.installationAmount).toBe(8750.00);
    expect(summary.sellingPriceWithInstallation).toBe(30682.76);
    expect(summary.profitAmount).toBe(4502.41);
    expect(summary.profitPercentage).toBeCloseTo(0.21, 2);
  });

  it('should dynamically reflect installation row when description is updated or toggled', () => {
    const row = calculateBOQItemRow({
      description: 'Installation & Testing',
      quantity: 1,
      unitPriceSAR: 5000,
      unitPriceEUR: 0
    }, 5);

    expect(row.isInstallation).toBe(true);
    expect(row.isManualSAR).toBe(true);
    expect(row.totalSAR).toBe(5000);
    expect(row.totalProfitIncl).toBe(5000);

    const totals = recalculateBOQTotals([row]);
    expect(totals.calculationSummary.installationAmount).toBe(5000);
    expect(totals.calculationSummary.sellingPriceWithInstallation).toBe(5000);
    expect(totals.calculationSummary.sellingPriceWithoutInstallation).toBe(0);
  });

  it('should generate valid auto BOQ number format', () => {
    const boqNum = generateBOQNumber(42, 'BOQ-ZJO');
    expect(boqNum).toMatch(/^BOQ-ZJO-\d{2}-\d{2}-\d{2}-042$/);
  });
});
