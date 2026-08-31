import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import type { BOQ, SystemSettings } from '../types';

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
  if (items.length > 0) {
    const endRowIdx = startRowIdx + items.length - 1;
    const totalRowIdx = endRowIdx + 2; // Leave one blank row or direct
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
