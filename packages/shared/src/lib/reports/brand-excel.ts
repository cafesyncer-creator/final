import ExcelJS from 'exceljs';
import { ensureContrastColor, normalizeHex, pickReadableTextColor } from '../theme/colors';
import type { BrandConsolidatedReportBundle } from './brand-builder';

export async function generateBrandConsolidatedExcel(
  bundle: BrandConsolidatedReportBundle
): Promise<Buffer> {
  const { pdfData, dailySummaries, salaryRecords } = bundle;
  const reportType = pdfData.reportType || 'daily_summary';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = pdfData.brand.name;
  workbook.created = new Date();

  const safePrimary = normalizeHex(pdfData.brand.primaryColor, '#ea580c');
  const titleColor = ensureContrastColor(safePrimary, '#ffffff', 4.5);
  const headerFg = pickReadableTextColor(safePrimary, '#ffffff', '#0f172a');

  const headerArgb = `FF${safePrimary.replace('#', '').toUpperCase()}`;
  const titleArgb = `FF${titleColor.replace('#', '').toUpperCase()}`;
  const headerFgArgb = `FF${headerFg.replace('#', '').toUpperCase()}`;

  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerArgb },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: headerFgArgb },
  };
  const currencyFormat = '"₹"#,##0.00;[Red]-"₹"#,##0.00;"₹"0.00';

  if (reportType === 'daily_summary' || reportType === 'full') {
    const sheet = workbook.addWorksheet('Brand Performance', {
      views: [{ showGridLines: true }],
    });
    sheet.addRow([`${pdfData.brand.name} - Consolidated Brand Statement`]);
    sheet.addRow([
      `Period: ${pdfData.period.startDate} to ${pdfData.period.endDate} | Generated: ${pdfData.generatedAt}`,
    ]);
    sheet.addRow([]);
    sheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    sheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const hRow = sheet.addRow([
      'Shop Name',
      'Code',
      'Total Income',
      'Total Expenses',
      'Net Profit/Loss',
      'Closing Balance',
      'Status',
    ]);
    hRow.font = headerFont;
    hRow.fill = headerFill;
    hRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const startRow = 5;
    pdfData.shops.forEach((s) => {
      const row = sheet.addRow([
        s.name,
        s.code,
        s.income,
        s.expense,
        s.net,
        s.closing,
        s.status.toUpperCase(),
      ]);
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = currencyFormat;
      row.getCell(6).numFmt = currencyFormat;
    });

    if (pdfData.shops.length > 0) {
      const endRow = startRow + pdfData.shops.length - 1;
      const tot = sheet.addRow([
        'TOTAL CONSOLIDATED',
        `${pdfData.shops.length} SHOPS`,
        { formula: `SUM(C${startRow}:C${endRow})` },
        { formula: `SUM(D${startRow}:D${endRow})` },
        { formula: `SUM(E${startRow}:E${endRow})` },
        { formula: `SUM(F${startRow}:F${endRow})` },
        '',
      ]);
      tot.font = { bold: true };
      tot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      tot.getCell(3).numFmt = currencyFormat;
      tot.getCell(4).numFmt = currencyFormat;
      tot.getCell(5).numFmt = currencyFormat;
      tot.getCell(6).numFmt = currencyFormat;

      if (pdfData.gst && pdfData.gst.gstAmount > 0) {
        const gstRow = sheet.addRow([
          `GST (${pdfData.gst.type === 'percentage' ? `${pdfData.gst.value}%` : 'Flat Amount'})`,
          `Base: ₹${pdfData.gst.subtotal.toFixed(2)}`,
          pdfData.gst.gstAmount,
          '',
          '',
          '',
          '',
        ]);
        gstRow.font = { bold: true, color: { argb: 'FFB45309' } };
        gstRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        gstRow.getCell(3).numFmt = currencyFormat;

        const grandRow = sheet.addRow([
          'GRAND TOTAL (INCL. GST)',
          '',
          pdfData.gst.grandTotal,
          '',
          '',
          '',
          '',
        ]);
        grandRow.font = { bold: true, color: { argb: 'FF166534' } };
        grandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        grandRow.getCell(3).numFmt = currencyFormat;
      }
    }

    sheet.columns.forEach((col, idx) => {
      col.width = idx === 0 ? 28 : idx === 1 ? 16 : 20;
    });

    // Sheet: Daily Summary
    const dSheet = workbook.addWorksheet('Daily Summary', {
      views: [{ showGridLines: true }],
    });
    dSheet.addRow([`${pdfData.brand.name} - Daily Consolidated Totals`]);
    dSheet.addRow([`Period: ${pdfData.period.startDate} to ${pdfData.period.endDate}`]);
    dSheet.addRow([]);
    dSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    const dh = dSheet.addRow(['Date', 'Opening', 'Income', 'Expense', 'Net', 'Closing']);
    dh.font = headerFont;
    dh.fill = headerFill;
    const dStart = 5;
    dailySummaries.forEach((d) => {
      const r = dSheet.addRow([d.date, d.opening, d.income, d.expense, d.net, d.closing]);
      for (let c = 2; c <= 6; c += 1) r.getCell(c).numFmt = currencyFormat;
    });
    if (dailySummaries.length > 0) {
      const dEnd = dStart + dailySummaries.length - 1;
      const dt = dSheet.addRow([
        'TOTAL',
        '',
        { formula: `SUM(C${dStart}:C${dEnd})` },
        { formula: `SUM(D${dStart}:D${dEnd})` },
        { formula: `SUM(E${dStart}:E${dEnd})` },
        '',
      ]);
      dt.font = { bold: true };
      dt.getCell(3).numFmt = currencyFormat;
      dt.getCell(4).numFmt = currencyFormat;
      dt.getCell(5).numFmt = currencyFormat;

      if (pdfData.gst && pdfData.gst.gstAmount > 0) {
        const dGstRow = dSheet.addRow([
          `GST (${pdfData.gst.type === 'percentage' ? `${pdfData.gst.value}%` : 'Flat Amount'})`,
          `Base: ₹${pdfData.gst.subtotal.toFixed(2)}`,
          pdfData.gst.gstAmount,
          '',
          '',
          '',
        ]);
        dGstRow.font = { bold: true, color: { argb: 'FFB45309' } };
        dGstRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        dGstRow.getCell(3).numFmt = currencyFormat;

        const dGrandRow = dSheet.addRow([
          'GRAND TOTAL (INCL. GST)',
          '',
          pdfData.gst.grandTotal,
          '',
          '',
          '',
        ]);
        dGrandRow.font = { bold: true, color: { argb: 'FF166534' } };
        dGrandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        dGrandRow.getCell(3).numFmt = currencyFormat;
      }
    }
    dSheet.columns.forEach((c, idx) => {
      c.width = idx === 0 ? 15 : 18;
    });
  }

  if (reportType === 'full') {
    const itemRows = pdfData.itemSummaryRows || [];
    const iSheet = workbook.addWorksheet('Item Summary', {
      views: [{ showGridLines: true }],
    });
    iSheet.addRow([`${pdfData.brand.name} - Item-wise Summary`]);
    iSheet.addRow([`Period: ${pdfData.period.startDate} to ${pdfData.period.endDate}`]);
    iSheet.addRow([]);
    iSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    const ih = iSheet.addRow([
      'Item',
      'Type',
      'Category',
      'Unit',
      'Total Quantity',
      'Total Amount (₹)',
      'Purchases',
      'Avg Rate (₹)',
      '% Share',
    ]);
    ih.font = headerFont;
    ih.fill = headerFill;
    const iStart = 5;
    itemRows.forEach((row) => {
      const r = iSheet.addRow([
        row.itemName,
        row.kind.toUpperCase(),
        row.category,
        row.unit || '-',
        row.totalQuantity ?? '-',
        row.totalAmount,
        row.purchaseCount,
        row.avgRate ?? '-',
        row.percentOfTotal / 100,
      ]);
      r.getCell(6).numFmt = currencyFormat;
      if (row.avgRate !== null) r.getCell(8).numFmt = currencyFormat;
      r.getCell(9).numFmt = '0.0%';
    });
    if (itemRows.length > 0) {
      const iEnd = iStart + itemRows.length - 1;
      const it = iSheet.addRow([
        'GRAND TOTAL',
        '',
        '',
        '',
        '',
        { formula: `SUM(F${iStart}:F${iEnd})` },
        { formula: `SUM(G${iStart}:G${iEnd})` },
        '',
        1,
      ]);
      it.font = { bold: true };
      it.getCell(6).numFmt = currencyFormat;
      it.getCell(9).numFmt = '0.0%';
    }
    iSheet.columns.forEach((c, idx) => {
      c.width = idx === 0 ? 28 : 16;
    });

    const detSheet = workbook.addWorksheet('Item Details', {
      views: [{ showGridLines: true }],
    });
    detSheet.addRow([`${pdfData.brand.name} - Item Purchase Details`]);
    detSheet.addRow([`Period: ${pdfData.period.startDate} to ${pdfData.period.endDate}`]);
    detSheet.addRow([]);
    detSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    const detH = detSheet.addRow([
      'Item',
      'Date',
      'Shop',
      'Quantity',
      'Unit',
      'Unit Price (₹)',
      'Amount (₹)',
      'Mode',
      'Note',
      'Entered By',
    ]);
    detH.font = headerFont;
    detH.fill = headerFill;
    (pdfData.groupedItemDetails || []).forEach((grp) => {
      const label = grp.unit ? `${grp.itemName} (${grp.unit})` : grp.itemName;
      const startR = detSheet.rowCount + 1;
      grp.rows.forEach((r) => {
        const row = detSheet.addRow([
          label,
          r.dateFormatted,
          `${r.shopName} (${r.shopCode})`,
          r.quantity ?? '-',
          r.unit || '-',
          r.unitPrice ?? null,
          r.amount,
          r.modeName,
          r.note || '-',
          r.enteredByName,
        ]);
        if (r.unitPrice !== null) row.getCell(6).numFmt = currencyFormat;
        row.getCell(7).numFmt = currencyFormat;
      });
      const endR = detSheet.rowCount;
      const sub = detSheet.addRow([
        `Subtotal — ${label}`,
        `${grp.rows.length} entries`,
        '',
        grp.subtotalQuantity ?? '-',
        grp.unit || '-',
        grp.avgRate ?? null,
        { formula: `SUM(G${startR}:G${endR})` },
        '',
        '',
        '',
      ]);
      sub.font = { bold: true };
      if (grp.avgRate !== null) sub.getCell(6).numFmt = currencyFormat;
      sub.getCell(7).numFmt = currencyFormat;
      detSheet.addRow([]);
    });
    detSheet.columns.forEach((c, idx) => {
      c.width = idx === 0 ? 28 : idx >= 8 ? 22 : 15;
    });
  }

  if (reportType === 'salary' || reportType === 'full') {
    const sSheet = workbook.addWorksheet('Salary', {
      views: [{ showGridLines: true }],
    });
    sSheet.addRow([`${pdfData.brand.name} - Brand Payroll Summary`]);
    sSheet.addRow([`Period: ${pdfData.period.startDate} to ${pdfData.period.endDate}`]);
    sSheet.addRow([]);
    sSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    const sh = sSheet.addRow([
      'Shop',
      'Employee',
      'Role',
      'Days',
      'Rate',
      'Gross',
      'Advances',
      'Paid',
      'Balance',
    ]);
    sh.font = headerFont;
    sh.fill = headerFill;
    const sStart = 5;
    salaryRecords.forEach((sal) => {
      const r = sSheet.addRow([
        sal.shopName || 'Outlet',
        sal.employee,
        sal.role || '-',
        sal.days,
        sal.rate,
        sal.gross,
        sal.advances,
        sal.paid,
        sal.balance,
      ]);
      for (let c = 5; c <= 9; c += 1) r.getCell(c).numFmt = currencyFormat;
    });
    if (salaryRecords.length > 0) {
      const sEnd = sStart + salaryRecords.length - 1;
      const st = sSheet.addRow([
        'TOTAL',
        `${salaryRecords.length} Staff`,
        '',
        '',
        '',
        { formula: `SUM(F${sStart}:F${sEnd})` },
        { formula: `SUM(G${sStart}:G${sEnd})` },
        { formula: `SUM(H${sStart}:H${sEnd})` },
        { formula: `SUM(I${sStart}:I${sEnd})` },
      ]);
      st.font = { bold: true };
      for (let c = 6; c <= 9; c += 1) st.getCell(c).numFmt = currencyFormat;
    }
    sSheet.columns.forEach((c, idx) => {
      c.width = idx <= 2 ? 22 : 15;
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

