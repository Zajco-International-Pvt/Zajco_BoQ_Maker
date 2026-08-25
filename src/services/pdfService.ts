import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BOQ, SystemSettings } from '../types';

export const exportBOQToPDF = (boq: BOQ, settings?: SystemSettings): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

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

  doc.text(`Project Name: ${boq.projectName || '-'}`, 18, metaTop + 6);
  doc.text(`Client: ${boq.client || '-'}`, 18, metaTop + 14);

  doc.text(`System: ${boq.system || '-'}`, 100, metaTop + 6);
  doc.text(`Brand: ${boq.brand || '-'}`, 100, metaTop + 14);

  doc.text(`Main Contractor: ${boq.contractor || '-'}`, 180, metaTop + 6);
  doc.text(`Prepared By: ${boq.preparedBy || '-'}`, 180, metaTop + 14);

  // Table Data
  const headers = [
    'S.No',
    'Item Description',
    'Qty',
    'Source',
    'Unit EUR',
    'Total EUR',
    'Unit SAR',
    'Total SAR',
    'Profit %',
    'Added SAR',
    'Unit (Incl)',
    'Total Profit Incl'
  ];

  const rows = (boq.items || []).map((item, idx) => [
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
  ]);

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
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [180, 83, 9];
      }
    }
  });

  const safeProj = (boq.projectName || 'BOQ').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeNum = (boq.boqNumber || '001').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`BOQ-${safeNum}-${safeProj}.pdf`);
};
