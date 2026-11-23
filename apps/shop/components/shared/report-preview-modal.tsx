'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  PdfPreviewBrandMeta,
  PdfPreviewModal,
  PdfPreviewPageItem,
} from '@/components/shared/pdf-preview-modal';
import { Count, Money } from '@/components/shared/format-values';
import { formatRatePerUnit } from '@/lib/calculations/format';
import { formatQuantityWithUnit } from '@/lib/constants/units';
import type { ReportKindOption, ReportData } from '@/lib/reports/types';
import type {
  GroupedItemDetailsGroup,
  ItemWiseSummaryResult,
} from '@/lib/reports/item-wise';
import { buildClientReportData } from '@/lib/reports/client-builder';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportKindOption;
  shopId: string;
  month: string;
  startDate: string;
  endDate: string;
  includeItemDetails: boolean;
  itemKindFilter?: 'expense' | 'income' | 'both';
  itemCategoryFilter?: string;
  itemSearchFilter?: string;
  gst?: { type: 'percentage' | 'amount'; value: number } | null;
  onDownloadPdf: () => void | Promise<void>;
  isDownloadingPdf?: boolean;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!arr || arr.length === 0) return [];
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

const REPORT_LABELS: Record<ReportKindOption, string> = {
  daily_summary: 'Daily Summary Statement',
  item_wise: 'Item-wise Summary Report',
  salary: 'Staff Salary Statement',
  full: 'Full Consolidated Financial Report',
};

export function ReportPreviewModal({
  isOpen,
  onClose,
  reportType,
  shopId,
  month,
  startDate,
  endDate,
  includeItemDetails,
  itemKindFilter = 'expense',
  itemCategoryFilter = '',
  itemSearchFilter = '',
  gst = null,
  onDownloadPdf,
  isDownloadingPdf = false,
}: ReportPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const reportData = await buildClientReportData({
          shopId,
          startDate,
          endDate,
          month,
          reportType,
          includeItemDetails,
          gst,
        });

        if (!reportData) {
          throw new Error('Could not load report preview data');
        }

        if (!cancelled) {
          setPayload({
            mode: 'shop',
            brand: reportData.brand,
            reportData,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Preview generation failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    reportType,
    shopId,
    month,
    startDate,
    endDate,
    includeItemDetails,
    itemKindFilter,
    itemCategoryFilter,
    itemSearchFilter,
  ]);

  if (!isOpen) return null;

  if (loading || !payload || error) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md rounded-lg sm:rounded-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {error ? 'Preview Error' : 'Preparing A4 Report Preview...'}
            </DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-primary,#ea580c)]" />
              <span>Building live financial figures & A4 sheets...</span>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-xs text-slate-600">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const brandRaw = payload.brand || {};
  const brandMeta: PdfPreviewBrandMeta = {
    name: brandRaw.name || 'CafeLedger',
    logoUrl: brandRaw.logoUrl || null,
    primaryColor: brandRaw.primaryColor || '#ea580c',
    secondaryColor: brandRaw.secondaryColor || '#1e293b',
    registrationNo: brandRaw.registrationNo || null,
    gstin: brandRaw.gstin || null,
    address: brandRaw.address || null,
    pdfHeaderStyle: brandRaw.pdfHeaderStyle || 'left',
    pdfFooterText: brandRaw.pdfFooterText || null,
    pdfShowAddress: brandRaw.pdfShowAddress !== false,
    pdfShowGstin: brandRaw.pdfShowGstin !== false,
    pdfShowRegistrationNo: brandRaw.pdfShowRegistrationNo !== false,
    pdfSignatureLine: Boolean(brandRaw.pdfSignatureLine),
  };

  const pages: PdfPreviewPageItem[] = [];
  let subtitle = '';
  let periodLabel = `${startDate} to ${endDate}`;
  let generatedAtLabel = '';

  const renderItemSummaryTable = (
    rows: any[],
    grandTotalAmount: number,
    grandTotalPurchases: number,
    isContinuation: boolean
  ) => (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
        {isContinuation ? 'Item-wise Summary (Continued)' : 'Item-wise Summary'}
      </div>
      <div className="border border-slate-200 rounded-[4px] overflow-hidden">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr
              className="text-white"
              style={{ backgroundColor: brandMeta.primaryColor || '#ea580c' }}
            >
              <th className="py-1.5 px-2 text-left">Item</th>
              <th className="py-1.5 px-2 text-left">Category</th>
              <th className="py-1.5 px-2 text-right">Qty</th>
              <th className="py-1.5 px-2 text-right">Avg Rate</th>
              <th className="py-1.5 px-2 text-right">Entries</th>
              <th className="py-1.5 px-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 font-medium text-slate-900">
                  {r.itemName}
                  {r.unit ? ` (${r.unit})` : ''}
                </td>
                <td className="py-1.5 px-2 text-slate-600">{r.category}</td>
                <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                  {r.totalQuantity !== null && r.totalQuantity !== undefined
                    ? formatQuantityWithUnit(r.totalQuantity, r.unit)
                    : '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                  {r.averageRate !== null && r.averageRate !== undefined ? formatRatePerUnit(r.averageRate, r.unit) : '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                  <Count value={r.entryCount || 1} />
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                  <Money value={r.totalAmount} />
                </td>
              </tr>
            ))}
          </tbody>
          {!isContinuation && (
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t border-slate-300">
                <td colSpan={4} className="py-1.5 px-2">
                  Grand Total
                </td>
                <td className="py-1.5 px-2 text-right font-mono">
                  <Count value={grandTotalPurchases} />
                </td>
                <td className="py-1.5 px-2 text-right font-mono">
                  <Money value={grandTotalAmount} />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  // Single Shop preview
  const r: ReportData = payload.reportData;
  subtitle = `${r.shop.name} (${r.shop.code})`;
  periodLabel = `${r.period.startDate} to ${r.period.endDate}`;
  generatedAtLabel = r.generatedAt;

  if (reportType === 'daily_summary' || reportType === 'full') {
    const dayChunks = chunkArray(r.dailySummaries || [], 15);
    if (dayChunks.length === 0) {
      pages.push({
        title: 'Daily Financial Statement',
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Opening</span>
                <span className="text-xs font-bold"><Money value={r.summary.openingBalance} /></span>
              </div>
              <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Income</span>
                <span className="text-xs font-bold text-emerald-700"><Money value={r.summary.totalIncome} /></span>
              </div>
              <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Expense</span>
                <span className="text-xs font-bold text-rose-700"><Money value={r.summary.totalExpense} /></span>
              </div>
              <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Closing</span>
                <span className="text-xs font-bold"><Money value={r.summary.closingBalance} /></span>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center py-6">
              No daily summary rows recorded for this range.
            </p>
          </div>
        ),
      });
    } else {
      dayChunks.forEach((chunk, idx) => {
        pages.push({
          title:
            idx === 0
              ? 'Daily Financial Statement'
              : 'Daily Financial Statement (Continued)',
          content: (
            <div className="space-y-4">
              {idx === 0 && (
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase text-slate-500 block">Opening</span>
                    <span className="text-xs font-bold"><Money value={r.summary.openingBalance} /></span>
                  </div>
                  <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase text-slate-500 block">Income</span>
                    <span className="text-xs font-bold text-emerald-700"><Money value={r.summary.totalIncome} /></span>
                  </div>
                  <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase text-slate-500 block">Expense</span>
                    <span className="text-xs font-bold text-rose-700"><Money value={r.summary.totalExpense} /></span>
                  </div>
                  <div className="p-2 rounded-[4px] border border-slate-200 bg-slate-50">
                    <span className="text-[9px] uppercase text-slate-500 block">Closing</span>
                    <span className="text-xs font-bold"><Money value={r.summary.closingBalance} /></span>
                  </div>
                  {r.gst && r.gst.gstAmount > 0 && (
                    <div className="col-span-4 grid grid-cols-2 gap-2 mt-1">
                      <div className="p-2 rounded-[4px] border border-amber-200 bg-amber-50">
                        <span className="text-[9px] uppercase text-amber-800 font-semibold block">
                          GST ({r.gst.type === 'percentage' ? `${r.gst.value}%` : 'Flat Amount'})
                        </span>
                        <span className="text-xs font-bold text-amber-700">
                          +<Money value={r.gst.gstAmount} />
                        </span>
                      </div>
                      <div className="p-2 rounded-[4px] border border-emerald-200 bg-emerald-50">
                        <span className="text-[9px] uppercase text-emerald-800 font-semibold block">
                          Grand Total (Incl. GST)
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          <Money value={r.gst.grandTotal} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr
                      className="text-white"
                      style={{ backgroundColor: brandMeta.primaryColor || '#ea580c' }}
                    >
                      <th className="py-1.5 px-2 text-left">Date</th>
                      <th className="py-1.5 px-2 text-right">Opening</th>
                      <th className="py-1.5 px-2 text-right">Income</th>
                      <th className="py-1.5 px-2 text-right">Expense</th>
                      <th className="py-1.5 px-2 text-right">Net</th>
                      <th className="py-1.5 px-2 text-right">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chunk.map((d) => (
                      <tr key={d.date}>
                        <td className="py-1 px-2 font-mono">{d.date}</td>
                        <td className="py-1 px-2 text-right font-mono"><Money value={d.opening} /></td>
                        <td className="py-1 px-2 text-right font-mono text-emerald-700"><Money value={d.income} /></td>
                        <td className="py-1 px-2 text-right font-mono text-rose-700"><Money value={d.expense} /></td>
                        <td className="py-1 px-2 text-right font-mono font-bold"><Money value={d.net} /></td>
                        <td className="py-1 px-2 text-right font-mono font-semibold"><Money value={d.closing} /></td>
                      </tr>
                    ))}
                  </tbody>
                  {r.gst && r.gst.gstAmount > 0 && idx === dayChunks.length - 1 && (
                    <tfoot>
                      <tr className="bg-amber-50 font-semibold text-amber-900 border-t border-amber-200">
                        <td colSpan={2} className="py-1.5 px-2">
                          GST ({r.gst.type === 'percentage' ? `${r.gst.value}%` : 'Flat Amount'})
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-amber-700">
                          +<Money value={r.gst.gstAmount} />
                        </td>
                        <td colSpan={3} className="py-1.5 px-2 text-[9px] text-amber-700">
                          Base Subtotal: <Money value={r.gst.subtotal} />
                        </td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-950 border-t border-emerald-200">
                        <td colSpan={2} className="py-1.5 px-2">
                          GRAND TOTAL (INCL. GST)
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700">
                          <Money value={r.gst.grandTotal} />
                        </td>
                        <td colSpan={3} className="py-1.5 px-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ),
        });
      });
    }
  }

  if (reportType === 'salary' || reportType === 'full') {
    const salChunks = chunkArray(r.salaryRecords || [], 16);
    if (salChunks.length === 0 && reportType === 'salary') {
      pages.push({
        title: 'Staff Salary Statement',
        content: (
          <div className="py-10 text-center text-xs text-slate-500">
            No salary records found for this period.
          </div>
        ),
      });
    } else {
      salChunks.forEach((chunk, idx) => {
        pages.push({
          title:
            idx === 0
              ? 'Staff Salary & Balance Register'
              : 'Staff Salary & Balance Register (Continued)',
          content: (
            <div className="border border-slate-200 rounded-[4px] overflow-hidden">
              <table className="w-full text-[9.5px] border-collapse">
                <thead>
                  <tr
                    className="text-white"
                    style={{ backgroundColor: brandMeta.primaryColor || '#ea580c' }}
                  >
                    <th className="py-1.5 px-2 text-left">Employee</th>
                    <th className="py-1.5 px-2 text-right">Days</th>
                    <th className="py-1.5 px-2 text-right">Rate</th>
                    <th className="py-1.5 px-2 text-right">Gross</th>
                    <th className="py-1.5 px-2 text-right">Advance</th>
                    <th className="py-1.5 px-2 text-right">Paid</th>
                    <th className="py-1.5 px-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chunk.map((s, sIdx) => (
                    <tr key={`${s.employee}-${sIdx}`}>
                      <td className="py-1 px-2 font-medium text-slate-900">
                        {s.employee}
                      </td>
                      <td className="py-1 px-2 text-right font-mono">
                        <Count value={s.days} />
                      </td>
                      <td className="py-1 px-2 text-right font-mono">
                        <Money value={s.rate} />
                      </td>
                      <td className="py-1 px-2 text-right font-mono">
                        <Money value={s.gross} />
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-rose-700">
                        <Money value={s.advances} />
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-emerald-700">
                        <Money value={s.paid} />
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        <Money value={s.balance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        });
      });
    }
  }

  if (reportType === 'full' && (r.itemSummaryRows?.length || 0) > 0) {
    const itemChunks = chunkArray(r.itemSummaryRows || [], 15);
    const totalItemAmt = (r.itemSummaryRows || []).reduce(
      (a, b) => a + b.totalAmount,
      0
    );
    const totalItemEntries = (r.itemSummaryRows || []).reduce(
      (a: number, b: any) => a + (b.purchaseCount || b.qtyEntryCount || 1),
      0
    );
    itemChunks.forEach((chunk, idx) => {
      pages.push({
        title:
          idx === 0
            ? 'Item-wise Summary'
            : 'Item-wise Summary (Continued)',
        content: renderItemSummaryTable(
          chunk,
          totalItemAmt,
          totalItemEntries,
          idx > 0
        ),
      });
    });
  }

  if (pages.length === 0) {
    pages.push({
      title: REPORT_LABELS[reportType],
      content: (
        <div className="py-10 text-center text-xs text-slate-500">
          No report rows available for this period.
        </div>
      ),
    });
  }

  return (
    <PdfPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={REPORT_LABELS[reportType]}
      subtitle={subtitle}
      periodLabel={periodLabel}
      generatedAtLabel={generatedAtLabel}
      brand={brandMeta}
      pages={pages}
      onDownloadPdf={onDownloadPdf}
      isDownloading={isDownloadingPdf}
    />
  );
}
