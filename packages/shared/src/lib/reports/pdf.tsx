/**
 * CafeLedger PDF Report Generator
 * Powered by @react-pdf/renderer
 *
 * A4 Portrait layout supporting:
 * - 'daily_summary': KPIs + Daily Summary + Expense by Category
 * - 'salary': Payroll KPIs + Employee Salary Table
 * - 'full': Daily Summary + Expense Breakdown + Item-wise Summary (+ optional Item Details) + Salary
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from '@react-pdf/renderer';
import { ReportData } from './types';
import { formatINR } from '../calculations/currency';
import { formatCount } from '../calculations/format';
import { formatQuantityWithUnit } from '../constants/units';
import { ensureContrastColor, pickReadableTextColor } from '../theme/colors';

export function createPdfStyles(primaryColor: string = '#ea580c') {
  const safeAccentText = ensureContrastColor(primaryColor, '#ffffff', 4.5);
  const logoBadgeFg = pickReadableTextColor(primaryColor, '#ffffff', '#0f172a');

  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 56,
      paddingHorizontal: 36,
      fontSize: 8.5,
      fontFamily: 'Helvetica',
      color: '#1f2937',
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1.5,
      borderBottomColor: primaryColor,
      paddingBottom: 12,
      marginBottom: 14,
    },
    headerCentered: {
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      borderBottomWidth: 1.5,
      borderBottomColor: primaryColor,
      paddingBottom: 12,
      marginBottom: 14,
      gap: 6,
    },
    brandBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    brandBlockCentered: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 6,
      objectFit: 'contain',
    },
    monogramBox: {
      width: 44,
      height: 44,
      borderRadius: 6,
      backgroundColor: primaryColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monogramText: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      color: logoBadgeFg,
    },
    brandTitle: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: safeAccentText,
    },
    brandSub: {
      fontSize: 8,
      color: '#6b7280',
      marginTop: 2,
    },
    metaBlock: {
      alignItems: 'flex-end',
    },
    metaBlockCentered: {
      alignItems: 'center',
    },
    reportTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      textTransform: 'uppercase',
    },
    metaText: {
      fontSize: 8,
      color: '#4b5563',
      marginTop: 2,
    },
    cardsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 16,
    },
    card: {
      flex: 1,
      padding: 8,
      backgroundColor: '#f9fafb',
      borderRadius: 4,
      borderWidth: 0.8,
      borderColor: '#e5e7eb',
    },
    cardHighlight: {
      flex: 1,
      padding: 8,
      backgroundColor: '#fff7ed',
      borderRadius: 4,
      borderWidth: 1,
      borderColor: primaryColor,
    },
    cardLabel: {
      fontSize: 7.5,
      color: '#6b7280',
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    cardValue: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    cardValuePositive: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#15803d',
    },
    cardValueNegative: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#b91c1c',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 6,
      borderBottomWidth: 0.8,
      borderBottomColor: '#e5e7eb',
      paddingBottom: 3,
    },
    sectionTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: safeAccentText,
      textTransform: 'uppercase',
    },
    table: {
      width: '100%',
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: '#e5e7eb',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f3f4f6',
      borderBottomWidth: 0.8,
      borderBottomColor: '#d1d5db',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    tableHeaderCell: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 7.5,
      color: '#374151',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#f3f4f6',
      paddingVertical: 3.5,
      paddingHorizontal: 4,
    },
    tableRowAlt: {
      flexDirection: 'row',
      backgroundColor: '#fafafa',
      borderBottomWidth: 0.5,
      borderBottomColor: '#f3f4f6',
      paddingVertical: 3.5,
      paddingHorizontal: 4,
    },
    tableCell: {
      fontSize: 7.5,
      color: '#1f2937',
    },
    tableCellRight: {
      fontSize: 7.5,
      color: '#1f2937',
      textAlign: 'right',
    },
    tableTotalRow: {
      flexDirection: 'row',
      backgroundColor: '#f9fafb',
      borderTopWidth: 1,
      borderTopColor: '#d1d5db',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    tableTotalCell: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    tableTotalCellRight: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      textAlign: 'right',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 36,
      right: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#e5e7eb',
      paddingTop: 6,
    },
    footerText: {
      fontSize: 7,
      color: '#9ca3af',
    },
  });
}

export function CafeLedgerPdfDocument({ data }: { data: ReportData }) {
  const reportType = data.reportType || 'full';
  const primaryColor = data.brand.primaryColor || '#ea580c';
  const styles = createPdfStyles(primaryColor);
  const isCentered = data.brand.pdfHeaderStyle === 'centered';
  const showReg = data.brand.pdfShowRegistrationNo !== false;
  const showGstin = data.brand.pdfShowGstin !== false;
  const showAddress = data.brand.pdfShowAddress !== false;
  const isSafeRaster =
    typeof data.brand.logoUrl === 'string' && data.brand.logoUrl.startsWith('data:image/');

  const regParts: string[] = [];
  if (showReg && data.brand.registrationNo) regParts.push(`Reg: ${data.brand.registrationNo}`);
  if (showGstin && data.brand.gstin) regParts.push(`GSTIN: ${data.brand.gstin}`);

  const docTitleMap = {
    daily_summary: 'Daily Financial Statement',
    item_wise: 'Item-wise Summary Statement',
    salary: 'Employee Salary Statement',
    full: 'Full Financial Statement',
  };

  const showDaily = reportType === 'daily_summary' || reportType === 'full';
  const showItemSection =
    reportType === 'full' && data.itemSummaryRows && data.itemSummaryRows.length > 0;
  const showSalary = reportType === 'salary' || reportType === 'full';

  const salaries = data.salaryRecords || [];
  const salaryTotals = salaries.reduce(
    (acc, s) => ({
      gross: acc.gross + s.gross,
      advances: acc.advances + s.advances,
      paid: acc.paid + s.paid,
      balance: acc.balance + s.balance,
    }),
    { gross: 0, advances: 0, paid: 0, balance: 0 }
  );

  return (
    <Document title={`${data.brand.name} - ${docTitleMap[reportType]}`}>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* HEADER */}
        <View style={isCentered ? styles.headerCentered : styles.headerContainer}>
          <View style={isCentered ? styles.brandBlockCentered : styles.brandBlock}>
            {isSafeRaster && data.brand.logoUrl ? (
              <Image style={styles.logo} src={data.brand.logoUrl} />
            ) : (
              <View style={styles.monogramBox}>
                <Text style={styles.monogramText}>
                  {(data.brand.name || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={isCentered ? { alignItems: 'center' } : undefined}>
              <Text style={styles.brandTitle}>{data.brand.name}</Text>
              {regParts.length > 0 && (
                <Text style={styles.brandSub}>{regParts.join(' | ')}</Text>
              )}
              {showAddress && data.brand.address && (
                <Text style={styles.brandSub}>{data.brand.address}</Text>
              )}
              <Text style={styles.brandSub}>
                Shop: {data.shop.name} ({data.shop.code})
              </Text>
            </View>
          </View>

          <View style={isCentered ? styles.metaBlockCentered : styles.metaBlock}>
            <Text style={styles.reportTitle}>{docTitleMap[reportType]}</Text>
            <Text style={styles.metaText}>
              Period: {data.period.startDate} to {data.period.endDate}
            </Text>
            <Text style={styles.metaText}>Generated: {data.generatedAt}</Text>
          </View>
        </View>

        {/* SUMMARY CARDS */}
        {reportType === 'salary' ? (
          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Employees</Text>
              <Text style={styles.cardValue}>{formatCount(salaries.length)} staff</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total Gross</Text>
              <Text style={styles.cardValue}>{formatINR(salaryTotals.gross)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Advances</Text>
              <Text style={styles.cardValueNegative}>{formatINR(salaryTotals.advances)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Paid</Text>
              <Text style={styles.cardValuePositive}>{formatINR(salaryTotals.paid)}</Text>
            </View>
            <View style={styles.cardHighlight}>
              <Text style={styles.cardLabel}>Balance Due</Text>
              <Text style={styles.cardValue}>{formatINR(salaryTotals.balance)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Opening Balance</Text>
              <Text style={styles.cardValue}>{formatINR(data.summary.openingBalance)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total Income</Text>
              <Text style={styles.cardValuePositive}>{formatINR(data.summary.totalIncome)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total Expenses</Text>
              <Text style={styles.cardValueNegative}>{formatINR(data.summary.totalExpense)}</Text>
            </View>
            <View style={styles.cardHighlight}>
              <Text style={styles.cardLabel}>Profit / Loss</Text>
              <Text
                style={
                  data.summary.profitLoss >= 0
                    ? styles.cardValuePositive
                    : styles.cardValueNegative
                }
              >
                {formatINR(data.summary.profitLoss)}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Closing Balance</Text>
              <Text style={styles.cardValue}>{formatINR(data.summary.closingBalance)}</Text>
            </View>
          </View>
        )}

        {/* OPTIONAL GST KPI ROW */}
        {showDaily && data.gst && data.gst.gstAmount > 0 && (
          <View style={[styles.cardsContainer, { marginTop: -10, marginBottom: 14 }]}>
            <View style={[styles.card, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Text style={[styles.cardLabel, { color: '#92400e' }]}>Subtotal (Base Income)</Text>
              <Text style={[styles.cardValue, { color: '#78350f' }]}>{formatINR(data.gst.subtotal)}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Text style={[styles.cardLabel, { color: '#92400e' }]}>
                GST ({data.gst.type === 'percentage' ? `${data.gst.value}%` : 'Flat Amount'})
              </Text>
              <Text style={[styles.cardValuePositive, { color: '#b45309' }]}>+{formatINR(data.gst.gstAmount)}</Text>
            </View>
            <View style={[styles.cardHighlight, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
              <Text style={[styles.cardLabel, { color: '#166534' }]}>Grand Total (Incl. GST)</Text>
              <Text style={[styles.cardValuePositive, { color: '#15803d' }]}>{formatINR(data.gst.grandTotal)}</Text>
            </View>
          </View>
        )}

        {/* DAILY SUMMARY TABLE */}
        {showDaily && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Summary</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Date</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Opening</Text>
                <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Income</Text>
                <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Expense</Text>
                <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Net</Text>
                <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Closing</Text>
              </View>

              {data.dailySummaries.slice(0, 31).map((row, idx) => (
                <View
                  key={idx}
                  style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCell, { width: '16%' }]}>{row.date}</Text>
                  <Text style={[styles.tableCellRight, { width: '16%' }]}>{formatINR(row.opening, false)}</Text>
                  <Text style={[styles.tableCellRight, { width: '17%', color: '#15803d' }]}>{formatINR(row.income, false)}</Text>
                  <Text style={[styles.tableCellRight, { width: '17%', color: '#b91c1c' }]}>{formatINR(row.expense, false)}</Text>
                  <Text style={[styles.tableCellRight, { width: '17%' }]}>{formatINR(row.net, false)}</Text>
                  <Text style={[styles.tableCellRight, { width: '17%' }]}>{formatINR(row.closing, false)}</Text>
                </View>
              ))}

              <View style={styles.tableTotalRow}>
                <Text style={[styles.tableTotalCell, { width: '16%' }]}>TOTAL</Text>
                <Text style={[styles.tableTotalCellRight, { width: '16%' }]}>-</Text>
                <Text style={[styles.tableTotalCellRight, { width: '17%', color: '#15803d' }]}>
                  {formatINR(data.summary.totalIncome, false)}
                </Text>
                <Text style={[styles.tableTotalCellRight, { width: '17%', color: '#b91c1c' }]}>
                  {formatINR(data.summary.totalExpense, false)}
                </Text>
                <Text style={[styles.tableTotalCellRight, { width: '17%' }]}>
                  {formatINR(data.summary.profitLoss, false)}
                </Text>
                <Text style={[styles.tableTotalCellRight, { width: '17%' }]}>
                  {formatINR(data.summary.closingBalance, false)}
                </Text>
              </View>

              {data.gst && data.gst.gstAmount > 0 && (
                <>
                  <View style={[styles.tableTotalRow, { backgroundColor: '#fffbeb', borderTopWidth: 0.5, borderTopColor: '#fde68a' }]}>
                    <Text style={[styles.tableTotalCell, { width: '32%', color: '#92400e' }]}>
                      GST ({data.gst.type === 'percentage' ? `${data.gst.value}%` : 'FLAT AMOUNT'})
                    </Text>
                    <Text style={[styles.tableTotalCellRight, { width: '17%', color: '#b45309' }]}>
                      +{formatINR(data.gst.gstAmount, false)}
                    </Text>
                    <Text style={[styles.tableTotalCellRight, { width: '51%', color: '#92400e', fontSize: 7 }]}>
                      Calculated on Total Income ({formatINR(data.gst.subtotal, false)})
                    </Text>
                  </View>
                  <View style={[styles.tableTotalRow, { backgroundColor: '#f0fdf4', borderTopWidth: 1, borderTopColor: '#86efac' }]}>
                    <Text style={[styles.tableTotalCell, { width: '32%', color: '#166534', fontFamily: 'Helvetica-Bold' }]}>
                      GRAND TOTAL (INCL. GST)
                    </Text>
                    <Text style={[styles.tableTotalCellRight, { width: '17%', color: '#166534', fontFamily: 'Helvetica-Bold' }]}>
                      {formatINR(data.gst.grandTotal, false)}
                    </Text>
                    <Text style={[styles.tableTotalCellRight, { width: '51%' }]}>-</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* EXPENSE BY CATEGORY */}
        {showDaily && data.expenseCategories && data.expenseCategories.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expense By Category</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Share %</Text>
              </View>
              {data.expenseCategories.map((cat, cIdx) => (
                <View
                  key={cIdx}
                  style={cIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={[styles.tableCell, { width: '50%' }]}>{cat.category}</Text>
                  <Text style={[styles.tableCellRight, { width: '25%' }]}>{formatINR(cat.amount)}</Text>
                  <Text style={[styles.tableCellRight, { width: '25%' }]}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ITEM-WISE SUMMARY (IN FULL REPORT) */}
        {showItemSection && data.itemSummaryRows && (
          <View break>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Item-wise Summary</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Item</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Total Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Total Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Entries</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Avg Rate</Text>
              </View>
              {data.itemSummaryRows.map((row, idx) => (
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: '28%', fontFamily: 'Helvetica-Bold' }]}>
                    {row.itemName}
                    {row.unit ? ` (${row.unit})` : ''}
                  </Text>
                  <Text style={[styles.tableCell, { width: '14%' }]}>{row.category}</Text>
                  <Text style={[styles.tableCellRight, { width: '16%' }]}>
                    {formatQuantityWithUnit(row.totalQuantity, row.unit)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '16%' }]}>
                    {formatINR(row.totalAmount, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '10%' }]}>
                    {formatCount(row.purchaseCount)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '16%' }]}>
                    {row.avgRate !== null ? formatINR(row.avgRate, false) : '-'}
                  </Text>
                </View>
              ))}
            </View>

            {data.includeItemDetails &&
              data.groupedItemDetails &&
              data.groupedItemDetails.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Item-wise Details</Text>
                  </View>
                  {data.groupedItemDetails.map((grp, gIdx) => (
                    <View key={gIdx} style={{ marginBottom: 8 }} wrap={false}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                        {grp.itemName}
                        {grp.unit ? ` (${grp.unit})` : ''} — {grp.category}
                      </Text>
                      <View style={styles.table}>
                        {grp.rows.slice(0, 40).map((r, rIdx) => (
                          <View key={rIdx} style={rIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                            <Text style={[styles.tableCell, { width: '16%' }]}>{r.dateFormatted}</Text>
                            <Text style={[styles.tableCellRight, { width: '16%' }]}>
                              {formatQuantityWithUnit(r.quantity, r.unit)}
                            </Text>
                            <Text style={[styles.tableCellRight, { width: '16%' }]}>
                              {r.unitPrice !== null ? formatINR(r.unitPrice, false) : '-'}
                            </Text>
                            <Text style={[styles.tableCellRight, { width: '18%' }]}>
                              {formatINR(r.amount, false)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '14%', paddingLeft: 6 }]}>{r.modeName}</Text>
                            <Text style={[styles.tableCell, { width: '20%' }]}>{r.note || '-'}</Text>
                          </View>
                        ))}
                        <View style={styles.tableTotalRow}>
                          <Text style={[styles.tableTotalCell, { width: '16%' }]}>Subtotal</Text>
                          <Text style={[styles.tableTotalCellRight, { width: '16%' }]}>
                            {formatQuantityWithUnit(grp.subtotalQuantity, grp.unit)}
                          </Text>
                          <Text style={[styles.tableTotalCellRight, { width: '16%' }]}>
                            {grp.avgRate !== null ? formatINR(grp.avgRate, false) : '-'}
                          </Text>
                          <Text style={[styles.tableTotalCellRight, { width: '18%' }]}>
                            {formatINR(grp.subtotalAmount)}
                          </Text>
                          <Text style={[styles.tableTotalCell, { width: '34%' }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}

        {/* SALARY TABLE */}
        {showSalary && (
          <View break={reportType === 'full'}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Employee Payroll & Advances</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Employee</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Days</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Rate</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Gross</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Advances</Text>
                <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Balance</Text>
              </View>
              {salaries.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '100%', color: '#6b7280' }]}>
                    No salary records found for this period.
                  </Text>
                </View>
              ) : (
                salaries.map((sal, sIdx) => (
                  <View
                    key={sIdx}
                    style={sIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, { width: '24%' }]}>{sal.employee}</Text>
                    <Text style={[styles.tableCellRight, { width: '10%' }]}>{formatCount(sal.days, 1)}</Text>
                    <Text style={[styles.tableCellRight, { width: '12%' }]}>{formatINR(sal.rate, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '14%' }]}>{formatINR(sal.gross, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '13%', color: '#b91c1c' }]}>{formatINR(sal.advances, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '13%' }]}>{formatINR(sal.paid, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '14%', fontFamily: 'Helvetica-Bold' }]}>
                      {formatINR(sal.balance, false)}
                    </Text>
                  </View>
                ))
              )}
              {salaries.length > 0 && (
                <View style={styles.tableTotalRow}>
                  <Text style={[styles.tableTotalCell, { width: '46%' }]}>TOTAL</Text>
                  <Text style={[styles.tableTotalCellRight, { width: '14%' }]}>
                    {formatINR(salaryTotals.gross, false)}
                  </Text>
                  <Text style={[styles.tableTotalCellRight, { width: '13%', color: '#b91c1c' }]}>
                    {formatINR(salaryTotals.advances, false)}
                  </Text>
                  <Text style={[styles.tableTotalCellRight, { width: '13%' }]}>
                    {formatINR(salaryTotals.paid, false)}
                  </Text>
                  <Text style={[styles.tableTotalCellRight, { width: '14%' }]}>
                    {formatINR(salaryTotals.balance, false)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* OPTIONAL SIGNATURE LINE */}
        {data.brand.pdfSignatureLine && (
          <View style={{ marginTop: 22, alignItems: 'flex-end' }}>
            <View style={{ width: 170, borderTopWidth: 0.8, borderTopColor: '#9ca3af', paddingTop: 4, alignItems: 'center' }}>
              <Text style={{ fontSize: 7.5, color: '#4b5563' }}>
                Authorized Signatory — {data.brand.name}
              </Text>
            </View>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.brand.pdfFooterText
              ? `${data.brand.pdfFooterText} • Powered by CafeLedger`
              : `${data.brand.name} • Powered by CafeLedger`}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdfReport(data: ReportData): Promise<Buffer> {
  const doc = <CafeLedgerPdfDocument data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
