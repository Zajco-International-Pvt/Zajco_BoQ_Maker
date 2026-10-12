import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { exportDashboardBOQReportToExcel } from '../services/excelService';
import { exportDashboardBOQReportToPDF } from '../services/pdfService';
import type { BOQ, SystemSettings } from '../types';

describe('Dashboard Report Generation Tests', () => {
  const sampleSettings: SystemSettings = {
    companyName: 'Zajco International Pvt',
    companyAddress: 'Riyadh, Saudi Arabia',
    companyLogoUrl: '',
    vatNumber: '300123456700003',
    defaultCurrency: 'SAR',
    eurToSarRate: 5,
    defaultProfitPercentage: 15,
    boqNumberFormat: 'BOQ-ZJO-YY-MM-DD-{SEQ}',
    defaultPricingSource: 'Standard',
    defaultTerms: 'Standard Terms',
    footerText: 'Confidential',
    pricingSourcesList: ['Standard', 'Special Deal'],
    systemsList: ['Nurse Call System', 'CCTV', 'Access Control']
  };

  const sampleBOQs: BOQ[] = [
    {
      id: 'boq-1',
      boqNumber: 'BOQ-ZJO-001',
      projectName: 'City Hospital Wing A',
      client: 'Ministry of Health',
      system: 'Nurse Call System',
      brand: 'Tunstall',
      preparedBy: 'Eng. Sarah',
      checkedBy: 'Eng. Ahmed',
      date: '2026-09-15',
      revision: 0,
      status: 'APPROVED',
      currency: 'SAR',
      conversionRate: 5,
      totalEUR: 10000,
      totalSAR: 50000,
      totalProfit: 7500,
      totalFinalValue: 57500,
      items: [],
      createdBy: 'user-1',
      createdAt: '2026-09-15T08:00:00Z',
      updatedAt: '2026-09-15T08:00:00Z'
    },
    {
      id: 'boq-2',
      boqNumber: 'BOQ-ZJO-002',
      projectName: 'Mall Surveillance Upgrade',
      client: 'Retail Group',
      system: 'CCTV',
      brand: 'Axis',
      preparedBy: 'Eng. John',
      checkedBy: 'Eng. Ahmed',
      date: '2026-10-01',
      revision: 1,
      status: 'SUBMITTED',
      currency: 'SAR',
      conversionRate: 5,
      totalEUR: 20000,
      totalSAR: 100000,
      totalProfit: 15000,
      totalFinalValue: 115000,
      items: [],
      createdBy: 'user-2',
      createdAt: '2026-10-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z'
    },
    {
      id: 'boq-3',
      boqNumber: 'BOQ-ZJO-003',
      projectName: 'Office Tower Access',
      client: 'Alpha Properties',
      system: 'Access Control',
      brand: 'HID',
      preparedBy: 'Eng. Sarah',
      checkedBy: 'Eng. Ahmed',
      date: '2026-10-10',
      revision: 0,
      status: 'DRAFT',
      currency: 'SAR',
      conversionRate: 5,
      totalEUR: 5000,
      totalSAR: 25000,
      totalProfit: 3000,
      totalFinalValue: 28000,
      items: [],
      createdBy: 'user-1',
      createdAt: '2026-10-10T10:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z'
    }
  ];

  it('should export dashboard BOQ report to Excel with multi-sheet structure and verified totals', async () => {
    const { blob, filename } = await exportDashboardBOQReportToExcel(sampleBOQs, sampleSettings, {
      system: 'All Systems',
      status: 'ALL',
      dateRange: 'All Time',
      preparedBy: 'All Engineers'
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(filename).toMatch(/^ZAJCO-BOQ-Portfolio-Report-\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Read back with ExcelJS to inspect internal contents
    const arrayBuffer = await blob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    expect(workbook.worksheets.length).toBe(2);
    const summarySheet = workbook.getWorksheet('Executive Summary');
    const registerSheet = workbook.getWorksheet('BOQ Register');

    expect(summarySheet).toBeDefined();
    expect(registerSheet).toBeDefined();

    // Check Company Header
    expect(summarySheet?.getCell('A1').value).toBe('ZAJCO INTERNATIONAL PVT');
    expect(summarySheet?.getCell('A2').value).toBe('BOQ PORTFOLIO EXECUTIVE SUMMARY REPORT');

    // Check Total Count in summary
    expect(summarySheet?.getCell('E4').value).toBe(3);

    // Check Register Sheet Headers
    expect(registerSheet?.getCell('B4').value).toBe('BOQ Number');
    expect(registerSheet?.getCell('C4').value).toBe('Project Name');
    expect(registerSheet?.getCell('F4').value).toBe('Prepared By');
    expect(registerSheet?.getCell('G4').value).toBe('Date');

    // Check first data row in Register
    expect(registerSheet?.getCell('B5').value).toBe('BOQ-ZJO-001');
    expect(registerSheet?.getCell('C5').value).toBe('City Hospital Wing A');
    expect(registerSheet?.getCell('F5').value).toBe('Eng. Sarah');
    expect(registerSheet?.getCell('G5').value).toBe('2026-09-15');
    expect(registerSheet?.getCell('I5').value).toBe(57500);

    // Check total row in Register (3 items + header + 1 => row 8)
    const totalRow = registerSheet?.getRow(8);
    expect(totalRow?.getCell(2).value).toBe('TOTAL');
    expect(totalRow?.getCell(8).value).toBe('3 BOQs');
    expect(totalRow?.getCell(9).value).toBe(57500 + 115000 + 28000); // 200,500
  });

  it('should generate landscape PDF report without errors and call doc.save', () => {
    const doc = exportDashboardBOQReportToPDF(sampleBOQs, sampleSettings, {
      system: 'Nurse Call System',
      status: 'APPROVED',
      dateRange: 'This Month',
      preparedBy: 'Eng. Sarah'
    });

    expect(doc).toBeDefined();
    expect(doc.internal.pageSize.getWidth()).toBeGreaterThan(doc.internal.pageSize.getHeight()); // landscape orientation
  });
});
