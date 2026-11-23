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
import { formatINR } from '../calculations/currency';
import { formatCount } from '../calculations/format';
import { formatQuantityWithUnit } from '../constants/units';
import { ensureContrastColor, pickReadableTextColor } from '../theme/colors';
import type { GroupedItemDetailsGroup, ItemSummaryRow } from './item-wise';
import type { ReportKindOption, ReportSalaryRow } from './types';

export interface BrandPdfData {
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
  brand: {
    name: string;
    registrationNo: string;
    logoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
    address?: string | null;
    gstin?: string | null;
    pdfHeaderStyle?: 'left' | 'centered';
    pdfFooterText?: string | null;
    pdfShowAddress?: boolean;
    pdfShowGstin?: boolean;
    pdfShowRegistrationNo?: boolean;
    pdfSignatureLine?: boolean;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    activeShopsCount: number;
  };
  shops: Array<{
    name: string;
    code: string;
    income: number;
    expense: number;
    net: number;
    closing: number;
    status: string;
  }>;
  itemSummaryRows?: ItemSummaryRow[];
  groupedItemDetails?: GroupedItemDetailsGroup[];
  salaryRecords?: ReportSalaryRow[];
  gst?: import('./types').ReportGstInfo | null;
}

export function createBrandPdfStyles(primaryColor: string = '#ea580c') {
  const safeAccentText = ensureContrastColor(primaryColor, '#ffffff', 4.5);
  const tableHeaderText = pickReadableTextColor(primaryColor, '#ffffff', '#0f172a');

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
      color: tableHeaderText,
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
    periodBlock: {
      alignItems: 'flex-end',
    },
    periodBlockCentered: {
      alignItems: 'center',
    },
    periodTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    periodSub: {
      fontSize: 8,
      color: '#4b5563',
      marginTop: 2,
    },
    kpiGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: '#f9fafb',
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 6,
      padding: 8,
    },
    kpiTitle: {
      fontSize: 7.5,
      color: '#6b7280',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 4,
    },
    kpiValue: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    sectionHeading: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: safeAccentText,
      textTransform: 'uppercase',
      marginTop: 8,
      marginBottom: 5,
    },
    tableContainer: {
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 14,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: primaryColor,
      paddingVertical: 5,
      paddingHorizontal: 6,
    },
    tableHeaderCell: {
      color: tableHeaderText,
      fontFamily: 'Helvetica-Bold',
      fontSize: 7.5,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
      paddingVertical: 4,
      paddingHorizontal: 6,
      backgroundColor: '#ffffff',
    },
    tableRowAlt: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
      paddingVertical: 4,
      paddingHorizontal: 6,
      backgroundColor: '#f9fafb',
    },
    tableCell: {
      fontSize: 7.5,
      color: '#374151',
    },
    tableCellRight: {
      fontSize: 7.5,
      color: '#374151',
      textAlign: 'right',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 36,
      right: 36,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7.5,
      color: '#9ca3af',
    },
  });
}

export function BrandConsolidatedPdfDocument({ data }: { data: BrandPdfData }) {
  const reportType = data.reportType || 'daily_summary';
  const styles = createBrandPdfStyles(data.brand.primaryColor);
  const isCentered = data.brand.pdfHeaderStyle === 'centered';
  const showReg = data.brand.pdfShowRegistrationNo !== false;
  const showGstin = data.brand.pdfShowGstin !== false;
  const showAddress = data.brand.pdfShowAddress !== false;
  const isSafeRaster =
    typeof data.brand.logoUrl === 'string' && data.brand.logoUrl.startsWith('data:image/');

  const regParts: string[] = [];
  if (showReg && data.brand.registrationNo) regParts.push(`Reg: ${data.brand.registrationNo}`);
  if (showGstin && data.brand.gstin) regParts.push(`GSTIN: ${data.brand.gstin}`);

  const docHeading =
    reportType === 'salary'
      ? 'Consolidated Payroll Statement'
      : reportType === 'full'
        ? 'Consolidated Full Brand Statement'
        : 'Consolidated Brand Statement';

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
    <Document title={`${data.brand.name} ${docHeading}`}>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* HEADER */}
        <View style={isCentered ? styles.headerCentered : styles.headerContainer}>
          <View style={isCentered ? styles.brandBlockCentered : styles.brandBlock}>
            {isSafeRaster && data.brand.logoUrl ? (
              <Image src={data.brand.logoUrl} style={styles.logo} />
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
            </View>
          </View>
          <View style={isCentered ? styles.periodBlockCentered : styles.periodBlock}>
            <Text style={styles.periodTitle}>{docHeading}</Text>
            <Text style={styles.periodSub}>
              {data.period.startDate} to {data.period.endDate}
            </Text>
            <Text style={styles.periodSub}>Generated: {data.generatedAt}</Text>
          </View>
        </View>

        {/* KPI CARDS */}
        {reportType === 'salary' ? (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>Staff Count</Text>
              <Text style={styles.kpiValue}>{formatCount(salaries.length)} Staff</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>Total Gross</Text>
              <Text style={styles.kpiValue}>{formatINR(salaryTotals.gross)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>Total Advances</Text>
              <Text style={[styles.kpiValue, { color: '#9f1239' }]}>{formatINR(salaryTotals.advances)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>Net Balance Due</Text>
              <Text style={styles.kpiValue}>{formatINR(salaryTotals.balance)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>Active Outlets</Text>
              <Text style={styles.kpiValue}>{formatCount(data.summary.activeShopsCount)} Shops</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#bbf7d0' }]}>
              <Text style={[styles.kpiTitle, { color: '#15803d' }]}>Total Brand Income</Text>
              <Text style={[styles.kpiValue, { color: '#166534' }]}>
                {formatINR(data.summary.totalIncome, false)}
              </Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#fecdd3' }]}>
              <Text style={[styles.kpiTitle, { color: '#be123c' }]}>Total Brand Expenses</Text>
              <Text style={[styles.kpiValue, { color: '#9f1239' }]}>
                {formatINR(data.summary.totalExpense, false)}
              </Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: data.summary.netProfit >= 0 ? '#bbf7d0' : '#fecdd3' }]}>
              <Text style={[styles.kpiTitle, { color: data.summary.netProfit >= 0 ? '#15803d' : '#be123c' }]}>
                Net Brand Profit
              </Text>
              <Text style={[styles.kpiValue, { color: data.summary.netProfit >= 0 ? '#166534' : '#9f1239' }]}>
                {formatINR(data.summary.netProfit, false)}
              </Text>
            </View>
          </View>
        )}

        {/* OPTIONAL BRAND CONSOLIDATED GST KPI */}
        {(reportType === 'daily_summary' || reportType === 'full') && data.gst && data.gst.gstAmount > 0 && (
          <View style={[styles.kpiGrid, { marginTop: -6, marginBottom: 14 }]}>
            <View style={[styles.kpiCard, { borderColor: '#fed7aa', backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.kpiTitle, { color: '#9a3412' }]}>
                Consolidated GST ({data.gst.type === 'percentage' ? `${data.gst.value}%` : 'Flat Amount'})
              </Text>
              <Text style={[styles.kpiValue, { color: '#b45309' }]}>
                +{formatINR(data.gst.gstAmount, false)}
              </Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#86efac', backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.kpiTitle, { color: '#166534' }]}>Grand Total (Brand + GST)</Text>
              <Text style={[styles.kpiValue, { color: '#15803d' }]}>
                {formatINR(data.gst.grandTotal, false)}
              </Text>
            </View>
          </View>
        )}

        {/* SHOP COMPARISON TABLE */}
        {(reportType === 'daily_summary' || reportType === 'full') && (
          <View>
            <Text style={styles.sectionHeading}>Outlet Performance Summary</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Shop & Location</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Code</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Income</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Expenses</Text>
                <Text style={[styles.tableHeaderCell, { width: '19%', textAlign: 'right' }]}>Net Profit</Text>
              </View>

              {data.shops.map((s, idx) => (
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: '30%', fontFamily: 'Helvetica-Bold' }]}>{s.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%', color: '#6b7280' }]}>{s.code}</Text>
                  <Text style={[styles.tableCellRight, { width: '18%', color: '#166534' }]}>
                    {formatINR(s.income, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '18%', color: '#9f1239' }]}>
                    {formatINR(s.expense, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '19%', fontFamily: 'Helvetica-Bold', color: s.net >= 0 ? '#166534' : '#9f1239' }]}>
                    {formatINR(s.net, false)}
                  </Text>
                </View>
              ))}

              <View style={[styles.tableRow, { backgroundColor: '#f3f4f6', borderTopWidth: 1.5, borderTopColor: '#d1d5db' }]}>
                <Text style={[styles.tableCell, { width: '45%', fontFamily: 'Helvetica-Bold' }]}>
                  TOTAL CONSOLIDATED ({formatCount(data.shops.length)} SHOPS)
                </Text>
                <Text style={[styles.tableCellRight, { width: '18%', fontFamily: 'Helvetica-Bold', color: '#166534' }]}>
                  {formatINR(data.summary.totalIncome, false)}
                </Text>
                <Text style={[styles.tableCellRight, { width: '18%', fontFamily: 'Helvetica-Bold', color: '#9f1239' }]}>
                  {formatINR(data.summary.totalExpense, false)}
                </Text>
                <Text style={[styles.tableCellRight, { width: '19%', fontFamily: 'Helvetica-Bold', color: data.summary.netProfit >= 0 ? '#166534' : '#9f1239' }]}>
                  {formatINR(data.summary.netProfit, false)}
                </Text>
              </View>

              {data.gst && data.gst.gstAmount > 0 && (
                <>
                  <View style={[styles.tableRow, { backgroundColor: '#fffbeb', borderTopWidth: 0.8, borderTopColor: '#fed7aa' }]}>
                    <Text style={[styles.tableCell, { width: '45%', fontFamily: 'Helvetica-Bold', color: '#9a3412' }]}>
                      GST ({data.gst.type === 'percentage' ? `${data.gst.value}%` : 'FLAT AMOUNT'})
                    </Text>
                    <Text style={[styles.tableCellRight, { width: '18%', fontFamily: 'Helvetica-Bold', color: '#b45309' }]}>
                      +{formatINR(data.gst.gstAmount, false)}
                    </Text>
                    <Text style={[styles.tableCellRight, { width: '37%', color: '#9a3412', fontSize: 7.5 }]}>
                      Base: {formatINR(data.gst.subtotal, false)}
                    </Text>
                  </View>
                  <View style={[styles.tableRow, { backgroundColor: '#f0fdf4', borderTopWidth: 1, borderTopColor: '#86efac' }]}>
                    <Text style={[styles.tableCell, { width: '45%', fontFamily: 'Helvetica-Bold', color: '#166534' }]}>
                      GRAND TOTAL (INCL. GST)
                    </Text>
                    <Text style={[styles.tableCellRight, { width: '18%', fontFamily: 'Helvetica-Bold', color: '#166534' }]}>
                      {formatINR(data.gst.grandTotal, false)}
                    </Text>
                    <Text style={[styles.tableCellRight, { width: '37%' }]}>-</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* BRAND ITEM-WISE SUMMARY (IN FULL REPORT) */}
        {reportType === 'full' && data.itemSummaryRows && data.itemSummaryRows.length > 0 && (
          <View break>
            <Text style={styles.sectionHeading}>Item-wise Summary (All Outlets)</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '28%' }]}>Item</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Category</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Total Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Total Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Count</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Avg Rate</Text>
              </View>
              {data.itemSummaryRows.map((row, idx) => (
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: '28%', fontFamily: 'Helvetica-Bold' }]}>
                    {row.itemName}
                    {row.unit ? ` (${row.unit})` : ''}
                  </Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{row.category}</Text>
                  <Text style={[styles.tableCellRight, { width: '15%' }]}>
                    {formatQuantityWithUnit(row.totalQuantity, row.unit)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '17%' }]}>
                    {formatINR(row.totalAmount, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '10%' }]}>
                    {formatCount(row.purchaseCount)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '15%' }]}>
                    {row.avgRate !== null ? formatINR(row.avgRate, false) : '-'}
                  </Text>
                </View>
              ))}
            </View>

            {data.includeItemDetails &&
              data.groupedItemDetails &&
              data.groupedItemDetails.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.sectionHeading}>Item-wise Details (Day-by-Day)</Text>
                  {data.groupedItemDetails.map((grp, gIdx) => (
                    <View key={gIdx} style={{ marginBottom: 8 }} wrap={false}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                        {grp.itemName}
                        {grp.unit ? ` (${grp.unit})` : ''} — {grp.category}
                      </Text>
                      <View style={styles.tableContainer}>
                        {grp.rows.slice(0, 40).map((r, rIdx) => (
                          <View key={rIdx} style={rIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                            <Text style={[styles.tableCell, { width: '14%' }]}>{r.dateFormatted}</Text>
                            <Text style={[styles.tableCell, { width: '18%' }]}>{r.shopName}</Text>
                            <Text style={[styles.tableCellRight, { width: '14%' }]}>
                              {formatQuantityWithUnit(r.quantity, r.unit)}
                            </Text>
                            <Text style={[styles.tableCellRight, { width: '14%' }]}>
                              {r.unitPrice !== null ? formatINR(r.unitPrice, false) : '-'}
                            </Text>
                            <Text style={[styles.tableCellRight, { width: '16%' }]}>
                              {formatINR(r.amount, false)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '24%', paddingLeft: 6 }]}>{r.note || r.modeName}</Text>
                          </View>
                        ))}
                        <View style={[styles.tableRow, { backgroundColor: '#f3f4f6' }]}>
                          <Text style={[styles.tableCell, { width: '32%', fontFamily: 'Helvetica-Bold' }]}>Subtotal</Text>
                          <Text style={[styles.tableCellRight, { width: '14%', fontFamily: 'Helvetica-Bold' }]}>
                            {formatQuantityWithUnit(grp.subtotalQuantity, grp.unit)}
                          </Text>
                          <Text style={[styles.tableCellRight, { width: '14%', fontFamily: 'Helvetica-Bold' }]}>
                            {grp.avgRate !== null ? formatINR(grp.avgRate, false) : '-'}
                          </Text>
                          <Text style={[styles.tableCellRight, { width: '16%', fontFamily: 'Helvetica-Bold' }]}>
                            {formatINR(grp.subtotalAmount)}
                          </Text>
                          <Text style={[styles.tableCell, { width: '24%' }]} />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
          </View>
        )}

        {/* BRAND SALARY RECORDS (SALARY OR FULL) */}
        {(reportType === 'salary' || reportType === 'full') && (
          <View break={reportType === 'full'}>
            <Text style={styles.sectionHeading}>Employee Payroll Across Outlets</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Shop</Text>
                <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Employee</Text>
                <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Days</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Gross</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Advances</Text>
                <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Balance</Text>
              </View>
              {salaries.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '100%', color: '#6b7280' }]}>
                    No payroll records found for this period.
                  </Text>
                </View>
              ) : (
                salaries.map((s, idx) => (
                  <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{s.shopName || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '22%', fontFamily: 'Helvetica-Bold' }]}>{s.employee}</Text>
                    <Text style={[styles.tableCellRight, { width: '8%' }]}>{formatCount(s.days, 1)}</Text>
                    <Text style={[styles.tableCellRight, { width: '12%' }]}>{formatINR(s.gross, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '12%', color: '#9f1239' }]}>{formatINR(s.advances, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '12%' }]}>{formatINR(s.paid, false)}</Text>
                    <Text style={[styles.tableCellRight, { width: '14%', fontFamily: 'Helvetica-Bold' }]}>
                      {formatINR(s.balance, false)}
                    </Text>
                  </View>
                ))
              )}
              {salaries.length > 0 && (
                <View style={[styles.tableRow, { backgroundColor: '#f3f4f6', borderTopWidth: 1.5, borderTopColor: '#d1d5db' }]}>
                  <Text style={[styles.tableCell, { width: '50%', fontFamily: 'Helvetica-Bold' }]}>
                    TOTAL PAYROLL ({formatCount(salaries.length)} STAFF)
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '12%', fontFamily: 'Helvetica-Bold' }]}>
                    {formatINR(salaryTotals.gross, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '12%', fontFamily: 'Helvetica-Bold', color: '#9f1239' }]}>
                    {formatINR(salaryTotals.advances, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '12%', fontFamily: 'Helvetica-Bold' }]}>
                    {formatINR(salaryTotals.paid, false)}
                  </Text>
                  <Text style={[styles.tableCellRight, { width: '14%', fontFamily: 'Helvetica-Bold' }]}>
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

export async function generateBrandConsolidatedPdf(data: BrandPdfData): Promise<Buffer> {
  const doc = <BrandConsolidatedPdfDocument data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
