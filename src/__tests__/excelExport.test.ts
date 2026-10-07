import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { exportBOQToExcel, exportProcurementItemsToExcel } from '../services/excelService';
import { calculateBOQItemRow, recalculateBOQTotals } from '../services/boqService';
import type { BOQ, BOQItem, ProcurementItem } from '../types';

describe('Excel Export Service Tests', () => {
  it('should export BOQ to Excel with correct formula references (E5 conversion rate) and valid non-zero values', async () => {
    const item1 = calculateBOQItemRow({
      serialNumber: 1,
      description: 'Tunstall Com Station IP',
      quantity: 2,
      unitPriceEUR: 100,
      profitPercentage: 20,
      pricingSource: 'Discounted Listed Price'
    }, 5);

    const item2 = calculateBOQItemRow({
      serialNumber: 2,
      description: 'Manual SAR Item Switch',
      quantity: 3,
      unitPriceEUR: 0,
      unitPriceSAR: 1500,
      isManualSAR: true,
      profitPercentage: 10,
      pricingSource: 'Special Deal'
    }, 5);

    const items: BOQItem[] = [item1, item2];
    const totals = recalculateBOQTotals(items);

    const testBOQ: BOQ = {
      id: 'boq-test-1',
      boqNumber: 'BOQ-TEST-001',
      projectName: 'Alpha Hospital Project',
      client: 'MOH',
      contractor: 'Zajco Contracting',
      consultant: 'Dar Al-Handasah',
      location: 'Riyadh',
      system: 'Nurse Call System',
      brand: 'Tunstall',
      preparedBy: 'John Engineer',
      checkedBy: 'Manager',
      date: '2026-08-31',
      revision: 1,
      status: 'APPROVED',
      currency: 'SAR',
      conversionRate: 5,
      ...totals,
      items,
      createdBy: 'user1',
      createdByName: 'John Doe',
      createdByEmail: 'john@example.com',
      createdAt: '2026-08-31T10:00:00Z',
      updatedAt: '2026-08-31T10:00:00Z'
    };

    const { blob, filename } = await exportBOQToExcel(testBOQ);
    expect(blob).toBeDefined();
    expect(filename).toBe('BOQ-TEST-001-Alpha_Hospital_Project.xlsx');

    // Parse the generated Excel buffer to inspect cell formulas and contents
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet('BOQ');
    expect(worksheet).toBeDefined();

    // Check Conversion Rate cell at E5
    const rateCell = worksheet?.getCell('E5');
    expect(rateCell?.value).toBe(5);

    // Check Row 11 (Item 1: EUR item)
    const row11 = worksheet?.getRow(11);
    expect(row11?.getCell(1).value).toBe(1); // S.No
    expect(row11?.getCell(2).value).toBe('Tunstall Com Station IP');
    expect(row11?.getCell(3).value).toBe(2); // Qty
    expect(row11?.getCell(5).value).toBe(100); // Unit EUR

    // Total EUR formula: C11*E11
    const totalEurCell = row11?.getCell(6);
    expect((totalEurCell?.value as any)?.formula).toBe('C11*E11');
    expect((totalEurCell?.value as any)?.result).toBe(200);

    // Unit Price SAR formula: E11*$E$5 (NOT $H$6!)
    const unitSarCell = row11?.getCell(7);
    expect((unitSarCell?.value as any)?.formula).toBe('E11*$E$5');
    expect((unitSarCell?.value as any)?.result).toBe(500);

    // Total SAR formula: C11*G11
    const totalSarCell = row11?.getCell(8);
    expect((totalSarCell?.value as any)?.formula).toBe('C11*G11');
    expect((totalSarCell?.value as any)?.result).toBe(1000);

    // Profit %: 20% = 0.2
    const profitPctCell = row11?.getCell(9);
    expect(profitPctCell?.value).toBe(0.2);

    // Percentage Added formula: IF(ISNUMBER(I11), G11*I11, 0)
    const pctAddedCell = row11?.getCell(10);
    expect((pctAddedCell?.value as any)?.formula).toBe('IF(ISNUMBER(I11), G11*I11, 0)');
    expect((pctAddedCell?.value as any)?.result).toBe(100);

    // Unit Price Profit Incl formula: ROUND(G11+J11,2)
    const unitProfitCell = row11?.getCell(11);
    expect((unitProfitCell?.value as any)?.formula).toBe('ROUND(G11+J11,2)');
    expect((unitProfitCell?.value as any)?.result).toBe(600);

    // Total Profit Incl formula: ROUND(C11*K11,2)
    const totalProfitCell = row11?.getCell(12);
    expect((totalProfitCell?.value as any)?.formula).toBe('ROUND(C11*K11,2)');
    expect((totalProfitCell?.value as any)?.result).toBe(1200);

    // Check Row 12 (Item 2: Manual SAR item)
    const row12 = worksheet?.getRow(12);
    expect(row12?.getCell(7).value).toBe(1500); // static value for manual SAR

    // Check Totals row at Row 14 (startRow 11 + 2 items - 1 = 12; totalRowIdx = 12 + 2 = 14)
    const totalRow = worksheet?.getRow(14);
    expect(totalRow?.getCell(2).value).toBe('TOTAL');
    expect((totalRow?.getCell(3).value as any)?.formula).toBe('SUM(C11:C12)');
    expect((totalRow?.getCell(3).value as any)?.result).toBe(5); // 2 + 3
    expect((totalRow?.getCell(6).value as any)?.formula).toBe('SUM(F11:F12)');
    expect((totalRow?.getCell(8).value as any)?.formula).toBe('SUM(H11:H12)');
    expect((totalRow?.getCell(12).value as any)?.formula).toBe('SUM(L11:L12)');
  });

  it('should export BOQ with section header rows seamlessly', async () => {
    const headerItem = calculateBOQItemRow({
      description: '1.0 MAIN CONTROL EQUIPMENT',
      isHeader: true
    }, 5);

    const normalItem = calculateBOQItemRow({
      serialNumber: 1,
      description: 'Nurse Station Terminal',
      quantity: 5,
      unitPriceEUR: 200,
      profitPercentage: 20
    }, 5);

    const items: BOQItem[] = [headerItem, normalItem];
    const totals = recalculateBOQTotals(items);

    const testBOQ: BOQ = {
      id: 'boq-header-test',
      boqNumber: 'BOQ-HDR-001',
      projectName: 'Hospital Wing',
      system: 'Nurse Call',
      brand: 'Tunstall',
      preparedBy: 'Engineer',
      checkedBy: 'Supervisor',
      date: '2026-08-31',
      revision: 0,
      status: 'DRAFT',
      currency: 'EUR',
      conversionRate: 5,
      ...totals,
      items,
      createdBy: 'user1',
      createdAt: '2026-08-31T10:00:00Z',
      updatedAt: '2026-08-31T10:00:00Z'
    };

    const { blob } = await exportBOQToExcel(testBOQ);
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet('BOQ');
    const headerRow = worksheet?.getRow(11);
    expect(headerRow?.getCell(1).value).toBe('1.0 MAIN CONTROL EQUIPMENT');

    const normalRow = worksheet?.getRow(12);
    expect(normalRow?.getCell(1).value).toBe(1);
    expect(normalRow?.getCell(3).value).toBe(5);

    // Verify Calculation Summary Table in Excel
    // totalRowIdx = 12 + 2 = 14; calcStartRow = 14 + 3 = 17
    const calcHeader = worksheet?.getRow(17);
    expect(calcHeader?.getCell(2).value).toBe('Calculation');
    expect(calcHeader?.getCell(5).value).toBe('Amount');

    // Row 18: Purchase Bill Amount (EUR)
    const calcRow1 = worksheet?.getRow(18);
    expect(calcRow1?.getCell(2).value).toBe('Purchase Bill Amount (EUR)');
    expect(calcRow1?.getCell(5).value).toBe(1000); // 5 * 200

    // Row 19: Purchase Bill Amount (SAR)
    const calcRow2 = worksheet?.getRow(19);
    expect(calcRow2?.getCell(2).value).toBe('Purchase Bill Amount (SAR)');
    expect(calcRow2?.getCell(5).value).toBe(5000); // 1000 * 5

    // Row 20: Selling Price without Installation Charge
    const calcRow3 = worksheet?.getRow(20);
    expect(calcRow3?.getCell(2).value).toBe('Our Selling Price without Installation Charge');
    expect(calcRow3?.getCell(5).value).toBe(6000); // 5000 * 1.2
  });

  it('should export procurement items and vendor quotations to Excel with correct structure and formulas', async () => {
    const testItems: ProcurementItem[] = [
      {
        id: 'proc-1',
        referenceNumber: 'PR-2026-001',
        itemName: 'IP Nurse Call Master Station',
        description: 'Touchscreen master station with intercom',
        category: 'Nurse Call System',
        brand: 'Tunstall',
        model: 'NC-MS-100',
        quantity: 5,
        unit: 'PCS',
        targetUnitPrice: 2500,
        currency: 'SAR',
        priority: 'HIGH',
        status: 'PENDING_POS',
        requestedBy: 'Engineer Ali',
        assignedTo: 'Procurement Specialist',
        projectReference: 'Hospital Phase 2',
        expectedDate: '2026-10-15',
        notes: 'Urgent for commissioning',
        vendorQuotes: [
          {
            id: 'quote-1',
            vendorName: 'Saudi Medical Supplies Co.',
            contactPerson: 'Mr. Fahad',
            contactPhone: '+966 50 123 4567',
            contactEmail: 'fahad@sms.com.sa',
            unitPrice: 2400,
            currency: 'SAR',
            discountPercentage: 5,
            netPrice: 2280,
            leadTime: '3 Weeks',
            quoteReference: 'SMS-2026-99',
            isAwarded: true,
            notes: 'Official authorized distributor',
            createdAt: '2026-09-20T10:00:00Z'
          },
          {
            id: 'quote-2',
            vendorName: 'Gulf Electronics Ltd.',
            unitPrice: 2600,
            currency: 'SAR',
            discountPercentage: 0,
            netPrice: 2600,
            leadTime: '4 Weeks',
            isAwarded: false,
            createdAt: '2026-09-21T10:00:00Z'
          }
        ],
        activityLog: [],
        createdBy: 'user-admin',
        createdAt: '2026-09-18T08:00:00Z',
        updatedAt: '2026-09-21T12:00:00Z'
      },
      {
        id: 'proc-2',
        referenceNumber: 'PR-2026-002',
        itemName: 'Corridor Dome Lamp 4-Color',
        description: 'LED corridor lamp',
        category: 'Nurse Call System',
        brand: 'Tunstall',
        model: 'CL-4C',
        quantity: 50,
        unit: 'PCS',
        targetUnitPrice: 180,
        currency: 'SAR',
        priority: 'MEDIUM',
        status: 'PURCHASES_POS_COMPLETED',
        requestedBy: 'Site Supervisor',
        projectReference: 'Hospital Phase 2',
        vendorQuotes: [],
        activityLog: [],
        createdBy: 'user-admin',
        createdAt: '2026-09-19T08:00:00Z',
        updatedAt: '2026-09-22T08:00:00Z'
      }
    ];

    const { blob, filename } = await exportProcurementItemsToExcel(testItems, {
      companyName: 'ZAJCO INTERNATIONAL'
    });

    expect(blob).toBeDefined();
    expect(filename).toContain('ZAJCO_Procurement_Tracker_');
    expect(filename.endsWith('.xlsx')).toBe(true);

    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Verify Sheet 1: Procurement Enquiries
    const sheet1 = workbook.getWorksheet('Procurement Enquiries');
    expect(sheet1).toBeDefined();

    // Check title banner
    const titleCell = sheet1?.getCell('A1');
    expect(titleCell?.value).toBe('ZAJCO INTERNATIONAL');

    // Check row 7 (Item 1)
    const row7 = sheet1?.getRow(7);
    expect(row7?.getCell(1).value).toBe('PR-2026-001');
    expect(row7?.getCell(2).value).toBe('IP Nurse Call Master Station');
    expect(row7?.getCell(7).value).toBe(5); // Qty
    expect(row7?.getCell(9).value).toBe(2500); // Target Unit Price
    expect(row7?.getCell(11).value).toEqual({
      formula: 'G7*I7',
      result: 12500 // 5 * 2500
    });
    expect(row7?.getCell(18).value).toBe('Saudi Medical Supplies Co. (AWARDED)');
    expect(row7?.getCell(19).value).toBe(2280);

    // Check row 8 (Item 2)
    const row8 = sheet1?.getRow(8);
    expect(row8?.getCell(1).value).toBe('PR-2026-002');
    expect(row8?.getCell(7).value).toBe(50);
    expect(row8?.getCell(11).value).toEqual({
      formula: 'G8*I8',
      result: 9000 // 50 * 180
    });

    // Check Totals row at row 10 (startRow 7 + 2 items = endRow 8; totalRow = 8 + 2 = 10)
    const totalRow = sheet1?.getRow(10);
    expect(totalRow?.getCell(2).value).toBe('TOTAL');
    expect(totalRow?.getCell(7).value).toEqual({
      formula: 'SUM(G7:G8)',
      result: 55 // 5 + 50
    });
    expect(totalRow?.getCell(11).value).toEqual({
      formula: 'SUM(K7:K8)',
      result: 21500 // 12500 + 9000
    });

    // Verify Sheet 2: Vendor Quotations
    const sheet2 = workbook.getWorksheet('Vendor Quotations');
    expect(sheet2).toBeDefined();

    const quoteHeader = sheet2?.getCell('A1');
    expect(quoteHeader?.value).toBe('ALL RECEIVED VENDOR QUOTATIONS');

    const quote1Row = sheet2?.getRow(4);
    expect(quote1Row?.getCell(1).value).toBe('PR-2026-001');
    expect(quote1Row?.getCell(4).value).toBe('Saudi Medical Supplies Co.');
    expect(quote1Row?.getCell(8).value).toBe(2400); // Unit price
    expect(quote1Row?.getCell(10).value).toBe(0.05); // Discount 5%
    expect(quote1Row?.getCell(11).value).toBe(2280); // Net price
    expect(quote1Row?.getCell(12).value).toEqual({
      formula: 'C4*K4',
      result: 11400 // 5 * 2280
    });
    expect(quote1Row?.getCell(16).value).toBe('AWARDED');
  });

  it('should handle empty procurement items list without errors', async () => {
    const { blob, filename } = await exportProcurementItemsToExcel([]);
    expect(blob).toBeDefined();
    expect(filename).toContain('.xlsx');

    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet1 = workbook.getWorksheet('Procurement Enquiries');
    expect(sheet1?.getCell('A7').value).toBe('No procurement enquiries recorded.');

    const sheet2 = workbook.getWorksheet('Vendor Quotations');
    expect(sheet2?.getCell('A4').value).toBe('No vendor quotations recorded yet.');
  });

  it('should export BOQ with custom or alternative currency (e.g. USD) with dynamic labels', async () => {
    const item = calculateBOQItemRow({
      serialNumber: 1,
      description: 'US Supply Item',
      quantity: 10,
      unitPriceEUR: 100, // base currency unit price
      profitPercentage: 15
    }, 3.75);

    const items: BOQItem[] = [item];
    const totals = recalculateBOQTotals(items);

    const usdBOQ: BOQ = {
      id: 'boq-usd-test',
      boqNumber: 'BOQ-USD-001',
      projectName: 'USD Project',
      system: 'CCTV',
      brand: 'Hikvision',
      preparedBy: 'Engineer',
      checkedBy: 'Supervisor',
      date: '2026-08-31',
      revision: 0,
      status: 'DRAFT',
      currency: 'USD',
      conversionRate: 3.75,
      ...totals,
      items,
      createdBy: 'user1',
      createdAt: '2026-08-31T10:00:00Z',
      updatedAt: '2026-08-31T10:00:00Z'
    };

    const { blob } = await exportBOQToExcel(usdBOQ);
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet('BOQ');
    expect(worksheet?.getCell('D5').value).toBe('USD to SAR Rate:');
    expect(worksheet?.getRow(10).getCell(5).value).toBe('Unit Price (USD)');
    expect(worksheet?.getRow(10).getCell(6).value).toBe('Total Price with Qty (USD)');

    // Calculation row for Purchase Bill Amount (USD)
    // totalRowIdx = 11 + 2 = 13; calcStartRow = 13 + 3 = 16; calcRow1 = 17
    const calcRow1 = worksheet?.getRow(17);
    expect(calcRow1?.getCell(2).value).toBe('Purchase Bill Amount (USD)');
    expect(calcRow1?.getCell(5).value).toBe(1000); // 10 * 100
  });
});

