/**
 * CafeLedger Excel Report Generator
 * Powered by ExcelJS
 *
 * Supports:
 * - 'daily_summary': Daily Summary + Transactions
 * - 'salary': Salary Payroll sheet
 * - 'full': Daily Summary + Item Summary + Item Details + Transactions + Salary
 * All totals use real Excel =SUM(...) formulas with ₹ Indian currency formatting.
 */

import ExcelJS from 'exceljs';
import { ReportData } from './types';
import { ensureContrastColor, normalizeHex, pickReadableTextColor } from '../theme/colors';

export async function generateExcelReport(data: ReportData): Promise<Buffer> {
  const reportType = data.reportType || 'full';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = data.brand.name || 'CafeLedger';
  workbook.created = new Date();

  const safePrimary = normalizeHex(data.brand.primaryColor, '#ea580c');
  const titleColor = ensureContrastColor(safePrimary, '#ffffff', 4.5);
  const headerFgHex = pickReadableTextColor(safePrimary, '#ffffff', '#0f172a');

  const brandArgb = `FF${safePrimary.replace('#', '').toUpperCase()}`;
  const titleArgb = `FF${titleColor.replace('#', '').toUpperCase()}`;
  const headerFgArgb = `FF${headerFgHex.replace('#', '').toUpperCase()}`;

  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: brandArgb },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: headerFgArgb },
  };

  const currencyFormat = '"₹"#,##0.00;[Red]-"₹"#,##0.00;"₹"0.00';

  const includeDailyAndTxns = reportType === 'daily_summary' || reportType === 'full';
  const includeItems = reportType === 'full';
  const includeSalary = reportType === 'salary' || reportType === 'full';

  // ----------------------------------------------------------------------------
  // SHEET 1: Daily Summary
  // ----------------------------------------------------------------------------
  if (includeDailyAndTxns) {
    const summarySheet = workbook.addWorksheet('Daily Summary', {
      views: [{ showGridLines: true }],
    });

    summarySheet.addRow([`${data.brand.name} - ${data.shop.name} (${data.shop.code})`]);
    summarySheet.addRow([`Period: ${data.period.startDate} to ${data.period.endDate} | Generated: ${data.generatedAt}`]);
    summarySheet.addRow([]);

    summarySheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    summarySheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const summaryHeaderRow = summarySheet.addRow([
      'Date',
      'Opening',
      'Income',
      'Expense',
      'Net',
      'Closing',
    ]);
    summaryHeaderRow.font = headerFont;
    summaryHeaderRow.fill = headerFill;
    summaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    summarySheet.columns = [
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];

    const summaryStartRowIndex = 5;
    data.dailySummaries.forEach((row) => {
      const r = summarySheet.addRow([
        row.date,
        row.opening,
        row.income,
        row.expense,
        row.net,
        row.closing,
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).numFmt = currencyFormat;
      r.getCell(3).numFmt = currencyFormat;
      r.getCell(4).numFmt = currencyFormat;
      r.getCell(5).numFmt = currencyFormat;
      r.getCell(6).numFmt = currencyFormat;
    });

    const summaryEndRowIndex = summaryStartRowIndex + Math.max(data.dailySummaries.length - 1, 0);

    if (data.dailySummaries.length > 0) {
      const summaryTotalRow = summarySheet.addRow([
        'TOTAL',
        '',
        { formula: `SUM(C${summaryStartRowIndex}:C${summaryEndRowIndex})` },
        { formula: `SUM(D${summaryStartRowIndex}:D${summaryEndRowIndex})` },
        { formula: `SUM(E${summaryStartRowIndex}:E${summaryEndRowIndex})` },
        '',
      ]);
      summaryTotalRow.font = { bold: true };
      summaryTotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      summaryTotalRow.getCell(3).numFmt = currencyFormat;
      summaryTotalRow.getCell(4).numFmt = currencyFormat;
      summaryTotalRow.getCell(5).numFmt = currencyFormat;

      if (data.gst && data.gst.gstAmount > 0) {
        const gstRow = summarySheet.addRow([
          `GST (${data.gst.type === 'percentage' ? `${data.gst.value}%` : 'Flat Amount'})`,
          `Base: ₹${data.gst.subtotal.toFixed(2)}`,
          data.gst.gstAmount,
          '',
          '',
          '',
        ]);
        gstRow.font = { bold: true, color: { argb: 'FFB45309' } };
        gstRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFBEB' },
        };
        gstRow.getCell(3).numFmt = currencyFormat;

        const grandTotalRow = summarySheet.addRow([
          'GRAND TOTAL (INCL. GST)',
          '',
          data.gst.grandTotal,
          '',
          '',
          '',
        ]);
        grandTotalRow.font = { bold: true, color: { argb: 'FF166534' } };
        grandTotalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDF4' },
        };
        grandTotalRow.getCell(3).numFmt = currencyFormat;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // SHEET 2 & 3: Item Summary & Item Details (when Full Report)
  // ----------------------------------------------------------------------------
  if (includeItems) {
    const itemSummaryRows = data.itemSummaryRows || [];
    const itemSheet = workbook.addWorksheet('Item Summary', {
      views: [{ showGridLines: true }],
    });
    itemSheet.addRow([`${data.brand.name} - Item-wise Summary (${data.shop.name})`]);
    itemSheet.addRow([`Period: ${data.period.startDate} to ${data.period.endDate}`]);
    itemSheet.addRow([]);
    itemSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    itemSheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const itemHeader = itemSheet.addRow([
      'Item',
      'Type',
      'Category',
      'Unit',
      'Total Quantity',
      'Total Amount (₹)',
      'Purchases',
      'Average Rate (₹)',
      '% Share',
    ]);
    itemHeader.font = headerFont;
    itemHeader.fill = headerFill;
    itemHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    itemSheet.columns = [
      { width: 28 },
      { width: 12 },
      { width: 16 },
      { width: 10 },
      { width: 16 },
      { width: 18 },
      { width: 12 },
      { width: 16 },
      { width: 12 },
    ];

    const isStart = 5;
    itemSummaryRows.forEach((row) => {
      const r = itemSheet.addRow([
        row.itemName,
        row.kind.toUpperCase(),
        row.category,
        row.unit || '-',
        row.totalQuantity !== null ? row.totalQuantity : '-',
        row.totalAmount,
        row.purchaseCount,
        row.avgRate !== null ? row.avgRate : '-',
        row.percentOfTotal / 100,
      ]);
      r.getCell(6).numFmt = currencyFormat;
      if (row.avgRate !== null) r.getCell(8).numFmt = currencyFormat;
      r.getCell(9).numFmt = '0.0%';
    });

    if (itemSummaryRows.length > 0) {
      const isEnd = isStart + itemSummaryRows.length - 1;
      const tot = itemSheet.addRow([
        'GRAND TOTAL',
        '',
        '',
        '',
        '',
        { formula: `SUM(F${isStart}:F${isEnd})` },
        { formula: `SUM(G${isStart}:G${isEnd})` },
        '',
        1,
      ]);
      tot.font = { bold: true };
      tot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      tot.getCell(6).numFmt = currencyFormat;
      tot.getCell(9).numFmt = '0.0%';
    }

    const detailsSheet = workbook.addWorksheet('Item Details', {
      views: [{ showGridLines: true }],
    });
    detailsSheet.addRow([`${data.brand.name} - Item Purchase Details (${data.shop.name})`]);
    detailsSheet.addRow([`Period: ${data.period.startDate} to ${data.period.endDate}`]);
    detailsSheet.addRow([]);
    detailsSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    detailsSheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const detHeader = detailsSheet.addRow([
      'Item',
      'Date',
      'Quantity',
      'Unit',
      'Unit Price (₹)',
      'Amount (₹)',
      'Mode',
      'Note',
      'Entered By',
    ]);
    detHeader.font = headerFont;
    detHeader.fill = headerFill;
    detHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    (data.groupedItemDetails || []).forEach((grp) => {
      const label = grp.unit ? `${grp.itemName} (${grp.unit})` : grp.itemName;
      const startR = detailsSheet.rowCount + 1;
      grp.rows.forEach((r) => {
        const row = detailsSheet.addRow([
          label,
          r.dateFormatted,
          r.quantity ?? '-',
          r.unit || '-',
          r.unitPrice ?? null,
          r.amount,
          r.modeName,
          r.note || '-',
          r.enteredByName,
        ]);
        if (r.unitPrice !== null) row.getCell(5).numFmt = currencyFormat;
        row.getCell(6).numFmt = currencyFormat;
      });
      const endR = detailsSheet.rowCount;
      const subRow = detailsSheet.addRow([
        `Subtotal — ${label}`,
        `${grp.rows.length} entries`,
        grp.subtotalQuantity ?? '-',
        grp.unit || '-',
        grp.avgRate ?? null,
        { formula: `SUM(F${startR}:F${endR})` },
        '',
        '',
        '',
      ]);
      subRow.font = { bold: true };
      subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      if (grp.avgRate !== null) subRow.getCell(5).numFmt = currencyFormat;
      subRow.getCell(6).numFmt = currencyFormat;
      detailsSheet.addRow([]);
    });

    detailsSheet.columns = [
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 10 },
      { width: 16 },
      { width: 18 },
      { width: 12 },
      { width: 26 },
      { width: 18 },
    ];
  }

  // ----------------------------------------------------------------------------
  // SHEET 4: Transactions
  // ----------------------------------------------------------------------------
  if (includeDailyAndTxns) {
    const txnSheet = workbook.addWorksheet('Transactions', {
      views: [{ showGridLines: true }],
    });

    txnSheet.addRow([`${data.brand.name} - Detailed Transactions`]);
    txnSheet.addRow([`Shop: ${data.shop.name} | Range: ${data.period.startDate} to ${data.period.endDate}`]);
    txnSheet.addRow([]);

    txnSheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    txnSheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const txnHeaderRow = txnSheet.addRow([
      'DATE',
      'DESCRIPTION',
      'MOP',
      'INCOME',
      'EXPENSES',
    ]);
    txnHeaderRow.font = headerFont;
    txnHeaderRow.fill = headerFill;
    txnHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    txnSheet.columns = [
      { width: 14 },
      { width: 38 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
    ];

    const txnStartRowIndex = 5;
    const txns = data.transactions || [];
    txns.forEach((tx) => {
      const r = txnSheet.addRow([
        tx.date,
        tx.description,
        tx.mop,
        tx.income > 0 ? tx.income : null,
        tx.expense > 0 ? tx.expense : null,
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).numFmt = currencyFormat;
      r.getCell(5).numFmt = currencyFormat;
    });

    const txnEndRowIndex = txnStartRowIndex + Math.max(txns.length - 1, 0);

    if (txns.length > 0) {
      const txnTotalRow = txnSheet.addRow([
        'TOTAL',
        '',
        '',
        { formula: `SUM(D${txnStartRowIndex}:D${txnEndRowIndex})` },
        { formula: `SUM(E${txnStartRowIndex}:E${txnEndRowIndex})` },
      ]);
      txnTotalRow.font = { bold: true };
      txnTotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      txnTotalRow.getCell(4).numFmt = currencyFormat;
      txnTotalRow.getCell(5).numFmt = currencyFormat;
    }
  }

  // ----------------------------------------------------------------------------
  // SHEET 5: Salary
  // ----------------------------------------------------------------------------
  if (includeSalary) {
    const salarySheet = workbook.addWorksheet('Salary', {
      views: [{ showGridLines: true }],
    });

    salarySheet.addRow([`${data.brand.name} - Employee Payroll Summary`]);
    salarySheet.addRow([`Shop: ${data.shop.name} | Period: ${data.period.startDate} to ${data.period.endDate}`]);
    salarySheet.addRow([]);

    salarySheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: titleArgb } };
    salarySheet.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };

    const salaryHeaderRow = salarySheet.addRow([
      'Employee',
      'Role',
      'Days Worked',
      'Rate / Day',
      'Gross',
      'Advances',
      'Paid',
      'Balance',
    ]);
    salaryHeaderRow.font = headerFont;
    salaryHeaderRow.fill = headerFill;
    salaryHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

    salarySheet.columns = [
      { width: 26 },
      { width: 20 },
      { width: 13 },
      { width: 15 },
      { width: 17 },
      { width: 17 },
      { width: 17 },
      { width: 17 },
    ];

    const salaryStartRowIndex = 5;
    const salaries = data.salaryRecords || [];
    salaries.forEach((sal) => {
      const r = salarySheet.addRow([
        sal.employee,
        sal.role || '-',
        sal.days,
        sal.rate,
        sal.gross,
        sal.advances,
        sal.paid,
        sal.balance,
      ]);
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).numFmt = currencyFormat;
      r.getCell(5).numFmt = currencyFormat;
      r.getCell(6).numFmt = currencyFormat;
      r.getCell(7).numFmt = currencyFormat;
      r.getCell(8).numFmt = currencyFormat;
    });

    const salaryEndRowIndex = salaryStartRowIndex + Math.max(salaries.length - 1, 0);

    if (salaries.length > 0) {
      const salaryTotalRow = salarySheet.addRow([
        'TOTAL',
        '',
        '',
        '',
        { formula: `SUM(E${salaryStartRowIndex}:E${salaryEndRowIndex})` },
        { formula: `SUM(F${salaryStartRowIndex}:F${salaryEndRowIndex})` },
        { formula: `SUM(G${salaryStartRowIndex}:G${salaryEndRowIndex})` },
        { formula: `SUM(H${salaryStartRowIndex}:H${salaryEndRowIndex})` },
      ]);
      salaryTotalRow.font = { bold: true };
      salaryTotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      salaryTotalRow.getCell(5).numFmt = currencyFormat;
      salaryTotalRow.getCell(6).numFmt = currencyFormat;
      salaryTotalRow.getCell(7).numFmt = currencyFormat;
      salaryTotalRow.getCell(8).numFmt = currencyFormat;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
