import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BOQ, SystemSettings } from '../types';
import { getCurrencySymbol } from '../types';
import { computeBOQCalculationSummary } from './boqService';

export const exportBOQToPDF = (boq: BOQ, settings?: SystemSettings): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const baseCurr = boq.currency || 'EUR';
  const companyName = settings?.companyName || 'ZAJCO ENGINEERING & CONTRACTING';
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 58, 138); // Navy
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('BILL OF QUANTITIES (BOQ)', 14, 18);

  doc.setFontSize(10);
  doc.text(`BOQ No: ${boq.boqNumber}`, pageWidth - 14, 12, { align: 'right' });
  doc.text(`Date: ${boq.date} | Rev ${boq.revision ?? 0}`, pageWidth - 14, 18, { align: 'right' });

  // Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const metaTop = 28;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, metaTop, pageWidth - 28, 20, 'F');

  doc.text(`BOQ No: ${boq.boqNumber}`, 18, metaTop + 6);
  doc.text(`Date: ${boq.date} | Rev ${boq.revision ?? 0}`, 18, metaTop + 14);

  doc.text(`System: ${boq.system || '-'}`, 100, metaTop + 6);
  doc.text(`Brand: ${boq.brand || '-'}`, 100, metaTop + 14);

  doc.text(`Prepared By: ${boq.preparedBy || '-'}`, 180, metaTop + 6);
  doc.text(`Checked By: ${boq.checkedBy || '-'}`, 180, metaTop + 14);

  // Table Data
  const headers = [
    'S.No',
    'Item Description',
    'Qty',
    'Source',
    `Unit ${baseCurr}`,
    `Total ${baseCurr}`,
    'Unit SAR',
    'Total SAR',
    'Profit %',
    'Added SAR',
    'Unit (Incl)',
    'Total Profit Incl'
  ];

  const rows = (boq.items || []).map((item, idx) => {
    if (item.isHeader) {
      return [
        (item.description || 'SECTION HEADER').toUpperCase(),
        '', '', '', '', '', '', '', '', '', '', ''
      ];
    }
    return [
      item.serialNumber || idx + 1,
      item.description || '',
      item.quantity ?? 0,
      item.pricingSource || '',
      (item.unitPriceEUR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (item.totalEUR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (item.unitPriceSAR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (item.totalSAR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      item.profitPercentage !== null && item.profitPercentage !== undefined ? `${item.profitPercentage}%` : '-',
      (item.percentageAdded ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (item.unitPriceProfitIncl ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      (item.totalProfitIncl ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  // Totals Row
  rows.push([
    '',
    'TOTAL',
    (boq.items || []).reduce((acc, i) => acc + (i.quantity || 0), 0),
    '',
    '',
    (boq.totalEUR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '',
    (boq.totalSAR ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '',
    (boq.totalProfit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '',
    (boq.totalFinalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: metaTop + 24,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 14 },
      9: { halign: 'right', cellWidth: 18 },
      10: { halign: 'right', cellWidth: 20 },
      11: { halign: 'right', cellWidth: 24 }
    },
    didParseCell: (data) => {
      const isTotalRow = data.row.index === rows.length - 1;
      const itemIndex = data.row.index;
      const isHeaderRow = boq.items?.[itemIndex]?.isHeader;

      if (isTotalRow) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [180, 83, 9];
      } else if (isHeaderRow) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [30, 41, 59];
        data.cell.styles.textColor = [255, 255, 255];
        if (data.column.index === 0) {
          data.cell.colSpan = 12;
        }
      }
    }
  });

  // Calculation Breakdown Summary Table
  const summary = computeBOQCalculationSummary(boq.items || []);
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : metaTop + 30;
  const pageHeight = doc.internal.pageSize.getHeight();
  let tableStartY = finalY;
  if (finalY + 55 > pageHeight - 15) {
    doc.addPage();
    tableStartY = 15;
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [['Calculation', 'Amount']],
    body: [
      [`Purchase Bill Amount (${baseCurr})`, `${getCurrencySymbol(baseCurr)} ${summary.purchaseBillAmountEUR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Purchase Bill Amount (SAR)', `SAR ${summary.purchaseBillAmountSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Our Selling Price without Installation Charge', `SAR ${summary.sellingPriceWithoutInstallation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Installation , Testing and Commissioning', `SAR ${summary.installationAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Our Selling Price with Installation Charge', `SAR ${summary.sellingPriceWithInstallation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Our Profit Amount', `SAR ${summary.profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Profit Percentage %', `${(summary.profitPercentage * 100).toFixed(1)}% (${summary.profitPercentage.toFixed(2)})`]
    ],
    theme: 'grid',
    tableWidth: 150,
    margin: { left: 14 },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [238, 242, 255]; // Soft indigo
        data.cell.styles.textColor = [30, 58, 138];
      } else if (data.row.index === 5) {
        data.cell.styles.textColor = [5, 150, 105]; // Emerald for profit
      }
    }
  });

  const safeProj = boq.projectName ? boq.projectName.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
  const safeNum = (boq.boqNumber || 'BOQ-001').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = safeProj ? `${safeNum}-${safeProj}.pdf` : `${safeNum}.pdf`;
  doc.save(filename);
};

export interface DashboardPDFReportFilters {
  system?: string;
  status?: string;
  dateRange?: string;
  preparedBy?: string;
}

/**
 * Export Dashboard BOQ portfolio report to an executive landscape PDF document.
 */
export const exportDashboardBOQReportToPDF = (
  boqs: BOQ[],
  settings?: SystemSettings | Partial<SystemSettings> | null,
  filters?: DashboardPDFReportFilters
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const companyName = settings?.companyName || 'ZAJCO ENGINEERING & CONTRACTING';
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 58, 138); // Deep Navy
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 11);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('BOQ PORTFOLIO SUMMARY & REGISTER REPORT', 14, 18);

  const dateStr = new Date().toLocaleDateString();
  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`Total BOQs: ${boqs.length}`, pageWidth - 14, 18, { align: 'right' });

  // Summary KPIs Box
  const metaTop = 27;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, metaTop, pageWidth - 28, 18, 'F');

  const totalValueSAR = boqs.reduce((acc, b) => acc + (b.totalFinalValue || 0), 0);
  const approvedCount = boqs.filter(b => b.status === 'APPROVED').length;
  const submittedCount = boqs.filter(b => b.status === 'SUBMITTED').length;
  const draftCount = boqs.filter(b => b.status === 'DRAFT').length;
  const rejectedCount = boqs.filter(b => b.status === 'REJECTED').length;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Portfolio: SAR ${totalValueSAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 18, metaTop + 6);
  doc.text(`Filter System: ${filters?.system || 'All Systems'}`, 18, metaTop + 13);

  doc.text(`Approved: ${approvedCount} | Submitted: ${submittedCount} | Draft: ${draftCount} | Rejected: ${rejectedCount}`, 120, metaTop + 6);
  doc.text(`Filter Status: ${filters?.status || 'All'} | Range: ${filters?.dateRange || 'All Time'} | By: ${filters?.preparedBy || 'All'}`, 120, metaTop + 13);

  // Table Data
  const headers = [
    '#',
    'BOQ No',
    'Project Name',
    'System',
    'Brand',
    'Prepared By',
    'Date',
    'Status',
    'Value (SAR)'
  ];

  const rows = boqs.map((b, idx) => [
    idx + 1,
    b.boqNumber,
    b.projectName || '-',
    b.system || '-',
    b.brand || '-',
    b.preparedBy || '-',
    b.date || '-',
    b.status,
    (b.totalFinalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ]);

  // Total summary row
  rows.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    `${boqs.length} BOQs`,
    totalValueSAR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: metaTop + 22,
    head: [headers],
    body: rows,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: {},
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      const isTotalRow = data.row.index === rows.length - 1;
      if (isTotalRow) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [30, 58, 138];
      } else if (data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val === 'APPROVED') data.cell.styles.textColor = [16, 185, 129];
        else if (val === 'SUBMITTED') data.cell.styles.textColor = [59, 130, 246];
        else if (val === 'REJECTED') data.cell.styles.textColor = [239, 68, 68];
        else if (val === 'DRAFT') data.cell.styles.textColor = [217, 119, 6];
      }
    }
  });

  const filename = `ZAJCO-BOQ-Portfolio-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return doc;
};
