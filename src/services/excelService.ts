import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import type { BOQ, SystemSettings, ProcurementItem } from '../types';
import { computeBOQCalculationSummary } from './boqService';
import { getProcurementStatusConfig } from './procurementService';

export interface ColumnMapping {
  serialNumber: string;
  description: string;
  quantity: string;
  pricingSource: string;
  unitPriceEUR: string;
  totalEUR: string;
  unitPriceSAR: string;
  totalSAR: string;
  profitPercentage: string;
  percentageAdded: string;
  unitPriceProfitIncl: string;
  totalProfitIncl: string;
}

export const exportBOQToExcel = async (
  boq: BOQ,
  settings?: SystemSettings
): Promise<{ blob: Blob; filename: string }> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ZAJCO BOQ Maker';
  workbook.lastModifiedBy = 'ZAJCO BOQ Maker';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('BOQ', {
    views: [{ showGridLines: true }]
  });

  const conversionRate = boq.conversionRate || 5;

  // Title / Company Header
  const companyName = settings?.companyName || 'ZAJCO ENGINEERING & CONTRACTING';
  worksheet.mergeCells('A1:L1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = companyName.toUpperCase();
  headerCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  worksheet.mergeCells('A2:L2');
  const subHeaderCell = worksheet.getCell('A2');
  subHeaderCell.value = 'BILL OF QUANTITIES (BOQ)';
  subHeaderCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  subHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  worksheet.getRow(2).height = 24;

  // Project Info Table (Rows 4 - 6)
  const metaStyle = { font: { name: 'Arial', size: 10, bold: true }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } } };
  const valStyle = { font: { name: 'Arial', size: 10 } };

  worksheet.getCell('A4').value = 'BOQ Number:';
  worksheet.getCell('A4').style = metaStyle;
  worksheet.getCell('B4').value = boq.boqNumber || '';
  worksheet.getCell('B4').style = valStyle;

  worksheet.getCell('D4').value = 'Date:';
  worksheet.getCell('D4').style = metaStyle;
  worksheet.getCell('E4').value = boq.date || '';
  worksheet.getCell('E4').style = valStyle;

  worksheet.getCell('G4').value = 'Revision:';
  worksheet.getCell('G4').style = metaStyle;
  worksheet.getCell('H4').value = `Rev ${boq.revision ?? 0}`;
  worksheet.getCell('H4').style = valStyle;

  worksheet.getCell('A5').value = 'System / Brand:';
  worksheet.getCell('A5').style = metaStyle;
  worksheet.getCell('B5').value = `${boq.system || ''} / ${boq.brand || ''}`;
  worksheet.getCell('B5').style = valStyle;

  worksheet.getCell('D5').value = 'EUR to SAR Rate:';
  worksheet.getCell('D5').style = metaStyle;
  worksheet.getCell('E5').value = Number(conversionRate) || 5;
  worksheet.getCell('E5').style = valStyle;
  worksheet.getCell('E5').numFmt = '#,##0.00';

  worksheet.getCell('G5').value = 'Status:';
  worksheet.getCell('G5').style = metaStyle;
  worksheet.getCell('H5').value = boq.status || 'DRAFT';
  worksheet.getCell('H5').style = valStyle;

  worksheet.getCell('A6').value = 'Prepared By:';
  worksheet.getCell('A6').style = metaStyle;
  worksheet.getCell('B6').value = boq.preparedBy || '';
  worksheet.getCell('B6').style = valStyle;

  worksheet.getCell('D6').value = 'Checked By:';
  worksheet.getCell('D6').style = metaStyle;
  worksheet.getCell('E6').value = boq.checkedBy || '';
  worksheet.getCell('E6').style = valStyle;

  // Table Column Headers at Row 10
  const headerTitle = boq.brand ? `${boq.brand.toUpperCase()} ITEM` : 'ITEM DESCRIPTION';
  const headers = [
    'S.No',
    headerTitle,
    'QTY',
    'Pricing Source',
    'Unit Price (EUR)',
    'Total Price with Qty (EUR)',
    'Unit Price (SAR)',
    'Total Price with Qty (SAR)',
    'Profit Percentage %',
    'Percentage Added',
    'Unit Price (Profit Incl)',
    'Total Price (profit incl)'
  ];

  const headerRow = worksheet.getRow(10);
  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark slate
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });
  headerRow.height = 32;

  // Add Data Rows starting at Row 11
  let startRowIdx = 11;
  const items = boq.items || [];

  items.forEach((item, index) => {
    const rowIdx = startRowIdx + index;
    const row = worksheet.getRow(rowIdx);

    // If Section Header Row
    if (item.isHeader) {
      row.getCell(1).value = (item.description || 'SECTION HEADER').toUpperCase();

      for (let c = 2; c <= 12; c++) {
        row.getCell(c).value = null;
      }

      worksheet.mergeCells(`A${rowIdx}:L${rowIdx}`);
      row.height = 24;

      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } }
        };
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      }
      return;
    }

    // Columns:
    // A: S.No (1)
    // B: Description (2)
    // C: Qty (3)
    // D: Pricing Source (4)
    // E: Unit Price EUR (5)
    // F: Total EUR (6) = C*E
    // G: Unit Price SAR (7) = E * Rate (or static if manual)
    // H: Total SAR (8) = C*G
    // I: Profit % (9)
    // J: Percentage Added (10) = G * I
    // K: Unit Price Profit Incl (11) = G + J
    // L: Total Profit Incl (12) = C * K

    row.getCell(1).value = item.serialNumber || index + 1;
    row.getCell(2).value = item.description || '';
    row.getCell(3).value = Number(item.quantity) || 0;
    row.getCell(4).value = item.pricingSource || 'Discounted Listed Price';

    // Unit Price EUR
    row.getCell(5).value = Number(item.unitPriceEUR) || 0;

    // Total EUR formula: =C{row}*E{row}
    row.getCell(6).value = { formula: `C${rowIdx}*E${rowIdx}`, result: Number(item.totalEUR) || 0 };

    // Unit Price SAR formula or manual (Reference E5 for Conversion Rate)
    if (item.isManualSAR) {
      row.getCell(7).value = Number(item.unitPriceSAR) || 0;
    } else {
      // Formula = E{row} * $E$5 (Conversion rate cell at E5)
      row.getCell(7).value = { formula: `E${rowIdx}*$E$5`, result: Number(item.unitPriceSAR) || 0 };
    }

    // Total SAR formula: =C{row}*G{row}
    row.getCell(8).value = { formula: `C${rowIdx}*G${rowIdx}`, result: Number(item.totalSAR) || 0 };

    // Profit %
    if (item.profitPercentage !== null && item.profitPercentage !== undefined && !isNaN(Number(item.profitPercentage))) {
      row.getCell(9).value = Number(item.profitPercentage) / 100; // stored as fraction in Excel
    } else {
      row.getCell(9).value = null;
    }

    // Percentage Added formula: =IF(ISNUMBER(I{row}), G{row}*I{row}, 0)
    row.getCell(10).value = { formula: `IF(ISNUMBER(I${rowIdx}), G${rowIdx}*I${rowIdx}, 0)`, result: Number(item.percentageAdded) || 0 };

    // Unit Price Profit Incl formula: =G{rowIdx}+J{rowIdx}
    row.getCell(11).value = { formula: `ROUND(G${rowIdx}+J${rowIdx},2)`, result: Number(item.unitPriceProfitIncl) || 0 };

    // Total Profit Incl formula: =C{rowIdx}*K{rowIdx}
    row.getCell(12).value = { formula: `ROUND(C${rowIdx}*K${rowIdx},2)`, result: Number(item.totalProfitIncl) || 0 };

    // Formatting
    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Alignment & Number formats
      if (c === 1) cell.alignment = { horizontal: 'center' };
      else if (c === 2) cell.alignment = { horizontal: 'left', wrapText: true };
      else if (c === 3) {
        cell.alignment = { horizontal: 'center' };
        cell.numFmt = '#,##0';
      }
      else if (c === 4) cell.alignment = { horizontal: 'center' };
      else if (c === 9) {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '0.0%';
      } else {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0.00';
      }
    }
  });

  // Totals Row
  let lastRowIdx = startRowIdx;
  if (items.length > 0) {
    const endRowIdx = startRowIdx + items.length - 1;
    const totalRowIdx = endRowIdx + 2; // Leave one blank row or direct
    lastRowIdx = totalRowIdx;
    const totalRow = worksheet.getRow(totalRowIdx);

    totalRow.getCell(2).value = 'TOTAL';
    totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
    totalRow.getCell(2).alignment = { horizontal: 'right' };

    totalRow.getCell(3).value = { formula: `SUM(C${startRowIdx}:C${endRowIdx})`, result: items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) };
    totalRow.getCell(3).numFmt = '#,##0';

    totalRow.getCell(6).value = { formula: `SUM(F${startRowIdx}:F${endRowIdx})`, result: Number(boq.totalEUR) || 0 };
    totalRow.getCell(6).numFmt = '#,##0.00';

    totalRow.getCell(8).value = { formula: `SUM(H${startRowIdx}:H${endRowIdx})`, result: Number(boq.totalSAR) || 0 };
    totalRow.getCell(8).numFmt = '#,##0.00';

    totalRow.getCell(12).value = { formula: `SUM(L${startRowIdx}:L${endRowIdx})`, result: Number(boq.totalFinalValue) || 0 };
    totalRow.getCell(12).numFmt = '#,##0.00';

    for (let c = 1; c <= 12; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Soft Amber accent
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFD97706' } },
        bottom: { style: 'double', color: { argb: 'FFD97706' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }
  }

  // Calculation Breakdown Summary Table
  const calcStartRow = lastRowIdx + 3;
  const summary = computeBOQCalculationSummary(items);

  // Summary Table Header Row
  worksheet.mergeCells(`B${calcStartRow}:D${calcStartRow}`);
  const calcHeaderCell = worksheet.getCell(`B${calcStartRow}`);
  calcHeaderCell.value = 'Calculation';
  calcHeaderCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  calcHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  calcHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  worksheet.mergeCells(`E${calcStartRow}:F${calcStartRow}`);
  const calcAmountCell = worksheet.getCell(`E${calcStartRow}`);
  calcAmountCell.value = 'Amount';
  calcAmountCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  calcAmountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  calcAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 2; c <= 6; c++) {
    const cell = worksheet.getRow(calcStartRow).getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  }
  worksheet.getRow(calcStartRow).height = 24;

  const summaryRowsData = [
    { label: 'Purchase Bill Amount (EUR)', val: summary.purchaseBillAmountEUR, numFmt: '€#,##0.00' },
    { label: 'Purchase Bill Amount (SAR)', val: summary.purchaseBillAmountSAR, numFmt: '#,##0.00' },
    { label: 'Our Selling Price without Installation Charge', val: summary.sellingPriceWithoutInstallation, numFmt: '#,##0.00', bold: true },
    { label: 'Installation , Testing and Commissioning', val: summary.installationAmount, numFmt: '#,##0.00' },
    { label: 'Our Selling Price with Installation Charge', val: summary.sellingPriceWithInstallation, numFmt: '#,##0.00', bold: true, highlight: true },
    { label: 'Our Profit Amount', val: summary.profitAmount, numFmt: '#,##0.00', isProfit: true },
    { label: 'Profit Percentage %', val: summary.profitPercentage, numFmt: '0.00%' }
  ];

  summaryRowsData.forEach((sRow, sIdx) => {
    const curRowIdx = calcStartRow + 1 + sIdx;
    const r = worksheet.getRow(curRowIdx);

    worksheet.mergeCells(`B${curRowIdx}:D${curRowIdx}`);
    const lblCell = r.getCell(2);
    lblCell.value = sRow.label;
    lblCell.font = { name: 'Arial', size: 9.5, bold: !!sRow.bold };
    lblCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.mergeCells(`E${curRowIdx}:F${curRowIdx}`);
    const valCell = r.getCell(5);
    valCell.value = sRow.val;
    valCell.font = { name: 'Arial', size: 9.5, bold: !!sRow.bold, color: sRow.isProfit ? { argb: 'FF059669' } : undefined };
    valCell.alignment = { horizontal: 'right', vertical: 'middle' };
    valCell.numFmt = sRow.numFmt;

    const bgArgb = sRow.highlight ? 'FFEFF6FF' : (sIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');

    for (let c = 2; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }
    r.height = 20;
  });

  // Column Widths
  const colWidths = [8, 45, 10, 22, 16, 20, 16, 22, 18, 18, 20, 22];
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // Generate Blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const safeProj = boq.projectName ? boq.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
  const safeNum = (boq.boqNumber || 'BOQ-001').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = safeProj ? `${safeNum}-${safeProj}.xlsx` : `${safeNum}.xlsx`;

  return { blob, filename };
};

export const triggerExcelDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export procurement items to a multi-sheet, fully-styled Excel (.xlsx) workbook.
 * Sheet 1: Procurement Enquiries (overview with calculated formulas and totals)
 * Sheet 2: Vendor Quotations (itemized breakdown of all supplier quotations)
 */
export const exportProcurementItemsToExcel = async (
  items: ProcurementItem[],
  settings?: SystemSettings | Partial<SystemSettings> | null
): Promise<{ blob: Blob; filename: string }> => {
  const workbook = new ExcelJS.Workbook();
  const companyName = settings?.companyName || 'ZAJCO ENGINEERING & CONTRACTING';
  workbook.creator = companyName;
  workbook.lastModifiedBy = 'ZAJCO Procurement Tracker';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Procurement Enquiries
  // -------------------------------------------------------------
  const worksheet = workbook.addWorksheet('Procurement Enquiries', {
    views: [{ showGridLines: true }]
  });

  // Row 1: Company Title Header
  worksheet.mergeCells('A1:X1');
  const mainHeaderCell = worksheet.getCell('A1');
  mainHeaderCell.value = companyName.toUpperCase();
  mainHeaderCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  mainHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Deep Navy
  mainHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // Row 2: Subtitle Bar
  worksheet.mergeCells('A2:X2');
  const subHeaderCell = worksheet.getCell('A2');
  subHeaderCell.value = 'PROCUREMENT & ENQUIRIES TRACKER';
  subHeaderCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  subHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 24;

  // Row 4: Meta Information
  const metaStyle = {
    font: { name: 'Arial', size: 10, bold: true },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } }
  };
  const valStyle = { font: { name: 'Arial', size: 10 } };

  worksheet.getCell('A4').value = 'Export Date:';
  worksheet.getCell('A4').style = metaStyle;
  worksheet.getCell('B4').value = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  worksheet.getCell('B4').style = valStyle;

  worksheet.getCell('D4').value = 'Total Items:';
  worksheet.getCell('D4').style = metaStyle;
  worksheet.getCell('E4').value = items.length;
  worksheet.getCell('E4').style = valStyle;

  worksheet.getCell('G4').value = 'Generated By:';
  worksheet.getCell('G4').style = metaStyle;
  worksheet.getCell('H4').value = 'ZAJCO BOQ Maker App';
  worksheet.getCell('H4').style = valStyle;

  worksheet.getRow(4).height = 20;

  // Row 6: Table Columns Header
  const headers = [
    'Ref No',
    'Item Name',
    'Description',
    'Category',
    'Brand',
    'Model',
    'Quantity',
    'Unit',
    'Target Unit Price',
    'Currency',
    'Total Target Value',
    'Status',
    'Priority',
    'Project Reference',
    'Requested By',
    'Assigned To',
    'Quotes Count',
    'Awarded / Best Vendor',
    'Best Quote Net Price',
    'Best Quote Total Value',
    'Lead Time',
    'Expected Date',
    'Notes / Remarks',
    'Date Added'
  ];

  const headerRowIdx = 6;
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.height = 28;

  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = headerRow.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  const startRowIdx = 7;

  if (items.length === 0) {
    const emptyRow = worksheet.getRow(startRowIdx);
    emptyRow.getCell(1).value = 'No procurement enquiries recorded.';
    worksheet.mergeCells(`A${startRowIdx}:X${startRowIdx}`);
    emptyRow.getCell(1).font = { name: 'Arial', size: 10, italic: true };
    emptyRow.getCell(1).alignment = { horizontal: 'center' };
  } else {
    items.forEach((item, index) => {
      const rowIdx = startRowIdx + index;
      const row = worksheet.getRow(rowIdx);
      row.height = 22;

      const quotes = item.vendorQuotes || [];
      const awardedQuote = quotes.find(q => q.isAwarded);
      const bestQuote = awardedQuote || (quotes.length > 0 ? [...quotes].sort((a, b) => a.netPrice - b.netPrice)[0] : null);

      const statusConf = getProcurementStatusConfig(item.status);

      row.getCell(1).value = item.referenceNumber || '';
      row.getCell(2).value = item.itemName || '';
      row.getCell(3).value = item.description || '';
      row.getCell(4).value = item.category || '';
      row.getCell(5).value = item.brand || '';
      row.getCell(6).value = item.model || '';
      row.getCell(7).value = Number(item.quantity) || 0;
      row.getCell(8).value = item.unit || 'PCS';
      row.getCell(9).value = item.targetUnitPrice !== undefined && item.targetUnitPrice !== null ? Number(item.targetUnitPrice) : 0;
      row.getCell(10).value = item.currency || 'SAR';

      // Total Target Value: formula = G{rowIdx}*I{rowIdx}
      row.getCell(11).value = {
        formula: `G${rowIdx}*I${rowIdx}`,
        result: (Number(item.quantity) || 0) * (Number(item.targetUnitPrice) || 0)
      };

      row.getCell(12).value = statusConf.label || item.status;
      row.getCell(13).value = item.priority || 'MEDIUM';
      row.getCell(14).value = item.projectReference || '';
      row.getCell(15).value = item.requestedBy || '';
      row.getCell(16).value = item.assignedTo || '';
      row.getCell(17).value = quotes.length;
      row.getCell(18).value = bestQuote ? (bestQuote.vendorName + (bestQuote.isAwarded ? ' (AWARDED)' : '')) : '-';
      row.getCell(19).value = bestQuote ? Number(bestQuote.netPrice) : 0;

      // Best Quote Total Value: formula = G{rowIdx}*S{rowIdx}
      row.getCell(20).value = bestQuote ? {
        formula: `G${rowIdx}*S${rowIdx}`,
        result: (Number(item.quantity) || 0) * (Number(bestQuote.netPrice) || 0)
      } : 0;

      row.getCell(21).value = bestQuote?.leadTime || '-';
      row.getCell(22).value = item.expectedDate || '-';
      row.getCell(23).value = item.notes || '';
      row.getCell(24).value = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';

      // Zebra striping
      const isEven = index % 2 === 0;
      const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      for (let c = 1; c <= 24; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments & Number formats
        if (c === 1 || c === 8 || c === 10 || c === 12 || c === 13 || c === 21 || c === 22 || c === 24) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (c === 7 || c === 17) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (c === 9 || c === 11 || c === 19 || c === 20) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    // Totals Row
    const endRowIdx = startRowIdx + items.length - 1;
    const totalRowIdx = endRowIdx + 2;
    const totalRow = worksheet.getRow(totalRowIdx);
    totalRow.height = 24;

    totalRow.getCell(2).value = 'TOTAL';
    totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true };
    totalRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    // Total Quantity: column 7 (G)
    totalRow.getCell(7).value = {
      formula: `SUM(G${startRowIdx}:G${endRowIdx})`,
      result: items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
    };
    totalRow.getCell(7).numFmt = '#,##0';

    // Total Target Value: column 11 (K)
    totalRow.getCell(11).value = {
      formula: `SUM(K${startRowIdx}:K${endRowIdx})`,
      result: items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.targetUnitPrice) || 0), 0)
    };
    totalRow.getCell(11).numFmt = '#,##0.00';

    // Total Best Quote Value: column 20 (T)
    totalRow.getCell(20).value = {
      formula: `SUM(T${startRowIdx}:T${endRowIdx})`,
      result: items.reduce((sum, it) => {
        const quotes = it.vendorQuotes || [];
        const awarded = quotes.find(q => q.isAwarded);
        const best = awarded || (quotes.length > 0 ? [...quotes].sort((a, b) => a.netPrice - b.netPrice)[0] : null);
        return sum + (best ? (Number(it.quantity) || 0) * (Number(best.netPrice) || 0) : 0);
      }, 0)
    };
    totalRow.getCell(20).numFmt = '#,##0.00';

    for (let c = 1; c <= 24; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Soft Amber accent
      cell.border = {
        top: { style: 'medium', color: { argb: 'FFD97706' } },
        bottom: { style: 'double', color: { argb: 'FFD97706' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }
  }

  // Column Widths for Sheet 1
  const colWidths = [16, 32, 35, 20, 18, 18, 12, 10, 18, 12, 20, 26, 14, 22, 20, 20, 14, 24, 20, 22, 16, 16, 30, 16];
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // -------------------------------------------------------------
  // Sheet 2: Vendor Quotations Breakdown
  // -------------------------------------------------------------
  const quotesWorksheet = workbook.addWorksheet('Vendor Quotations', {
    views: [{ showGridLines: true }]
  });

  // Row 1: Header
  quotesWorksheet.mergeCells('A1:Q1');
  const quoteHeaderCell = quotesWorksheet.getCell('A1');
  quoteHeaderCell.value = 'ALL RECEIVED VENDOR QUOTATIONS';
  quoteHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  quoteHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  quoteHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  quotesWorksheet.getRow(1).height = 32;

  // Row 3: Quote Column Headers
  const quoteHeaders = [
    'Item Ref No',
    'Item Name',
    'Item Qty',
    'Vendor Name',
    'Contact Person',
    'Phone',
    'Email',
    'Unit Price',
    'Currency',
    'Discount %',
    'Net Unit Price',
    'Net Total Value',
    'Lead Time',
    'Quote Reference',
    'Valid Until',
    'Awarded Status',
    'Notes / Remarks'
  ];

  const qHeaderRow = quotesWorksheet.getRow(3);
  qHeaderRow.height = 26;

  quoteHeaders.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = qHeaderRow.getCell(colIdx);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  let qCurrentRow = 4;
  let totalQuotesCount = 0;

  items.forEach(item => {
    (item.vendorQuotes || []).forEach((q) => {
      totalQuotesCount++;
      const row = quotesWorksheet.getRow(qCurrentRow);
      row.height = 20;

      row.getCell(1).value = item.referenceNumber || '';
      row.getCell(2).value = item.itemName || '';
      row.getCell(3).value = Number(item.quantity) || 0;
      row.getCell(4).value = q.vendorName || '';
      row.getCell(5).value = q.contactPerson || '-';
      row.getCell(6).value = q.contactPhone || '-';
      row.getCell(7).value = q.contactEmail || '-';
      row.getCell(8).value = Number(q.unitPrice) || 0;
      row.getCell(9).value = q.currency || item.currency || 'SAR';
      row.getCell(10).value = q.discountPercentage ? Number(q.discountPercentage) / 100 : 0;
      row.getCell(11).value = Number(q.netPrice) || 0;
      row.getCell(12).value = {
        formula: `C${qCurrentRow}*K${qCurrentRow}`,
        result: (Number(item.quantity) || 0) * (Number(q.netPrice) || 0)
      };
      row.getCell(13).value = q.leadTime || '-';
      row.getCell(14).value = q.quoteReference || '-';
      row.getCell(15).value = q.validUntil || '-';
      row.getCell(16).value = q.isAwarded ? 'AWARDED' : 'UNDER REVIEW';
      row.getCell(17).value = q.notes || '';

      const isEven = totalQuotesCount % 2 === 0;
      const bgArgb = q.isAwarded ? 'FFECFDF5' : (isEven ? 'FFFFFFFF' : 'FFF8FAFC');

      for (let c = 1; c <= 17; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        if (q.isAwarded && c === 16) {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (c === 1 || c === 9 || c === 13 || c === 14 || c === 15 || c === 16) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (c === 3) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (c === 10) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '0.0%';
        } else if (c === 8 || c === 11 || c === 12) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      qCurrentRow++;
    });
  });

  if (totalQuotesCount === 0) {
    const emptyRow = quotesWorksheet.getRow(4);
    emptyRow.getCell(1).value = 'No vendor quotations recorded yet.';
    quotesWorksheet.mergeCells('A4:Q4');
    emptyRow.getCell(1).font = { name: 'Arial', size: 10, italic: true };
    emptyRow.getCell(1).alignment = { horizontal: 'center' };
  }

  // Column Widths for Sheet 2
  const qColWidths = [16, 28, 12, 24, 20, 18, 24, 16, 12, 14, 16, 18, 16, 18, 16, 18, 28];
  qColWidths.forEach((w, idx) => {
    quotesWorksheet.getColumn(idx + 1).width = w;
  });

  // Generate Excel file buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `ZAJCO_Procurement_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { blob, filename };
};

export const downloadProcurementExcel = async (
  items: ProcurementItem[],
  settings?: SystemSettings | Partial<SystemSettings> | null
): Promise<void> => {
  const { blob, filename } = await exportProcurementItemsToExcel(items, settings);
  triggerExcelDownload(blob, filename);
};

// Excel Import Engine using SheetJS
export interface ExcelParseResult {
  headers: string[];
  rows: Record<string, any>[];
  suggestedMapping: ColumnMapping;
}

export const parseExcelFile = async (file: File): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to 2D Array to locate headers
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawData || rawData.length === 0) {
          throw new Error('The selected Excel file is empty.');
        }

        // Find header row (row containing S.No or QTY or Item)
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const rowStr = JSON.stringify(rawData[i]).toLowerCase();
          if (rowStr.includes('qty') || rowStr.includes('item') || rowStr.includes('s.no') || rowStr.includes('description')) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = (rawData[headerRowIndex] || []).map((h: any) => String(h || '').trim());

        // Parse rows below header
        const rowsData: Record<string, any>[] = [];
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          const rowObj: Record<string, any> = {};
          let hasContent = false;

          headers.forEach((h, colIdx) => {
            if (h) {
              const val = row[colIdx];
              rowObj[h] = val !== undefined ? val : '';
              if (val !== undefined && val !== null && val !== '') hasContent = true;
            }
          });

          if (hasContent) {
            rowsData.push(rowObj);
          }
        }

        // Auto Map Columns
        const suggestedMapping: ColumnMapping = {
          serialNumber: findBestMatch(headers, ['s.no', 'sno', 'sn', 'item no', 'no']),
          description: findBestMatch(headers, ['tunstall item', 'item description', 'description', 'particulars', 'item']),
          quantity: findBestMatch(headers, ['qty', 'quantity', 'count']),
          pricingSource: findBestMatch(headers, ['pricing source', 'source', 'price source']),
          unitPriceEUR: findBestMatch(headers, ['unit price (eur)', 'unit price eur', 'eur price', 'unit eur']),
          totalEUR: findBestMatch(headers, ['total price with qty (eur)', 'total eur', 'total price (eur)']),
          unitPriceSAR: findBestMatch(headers, ['unit price (sar)', 'unit price sar', 'sar price', 'unit sar']),
          totalSAR: findBestMatch(headers, ['total price with qty (sar)', 'total sar', 'total price (sar)']),
          profitPercentage: findBestMatch(headers, ['profit percentage %', 'profit %', 'profit percentage', 'percentage']),
          percentageAdded: findBestMatch(headers, ['percentage added', 'profit added', 'margin added']),
          unitPriceProfitIncl: findBestMatch(headers, ['unit price (profit incl)', 'unit price profit incl', 'unit price incl profit']),
          totalProfitIncl: findBestMatch(headers, ['total price (profit incl)', 'total profit incl', 'total incl profit'])
        };

        resolve({
          headers,
          rows: rowsData,
          suggestedMapping
        });

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

const findBestMatch = (headers: string[], keywords: string[]): string => {
  for (const kw of keywords) {
    const found = headers.find(h => h.toLowerCase().includes(kw.toLowerCase()));
    if (found) return found;
  }
  return '';
};
