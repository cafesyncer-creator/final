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
import type { BrandConsolidatedReportBundle } from '@/lib/reports/brand-builder';
import {
  buildClientReportData,
  buildClientBrandConsolidatedReport,
} from '@/lib/reports/client-builder';
import { useAuth } from '@/lib/auth-context';

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
  const { profile, brand } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  const brandId = profile?.brand_id || brand?.id || '';

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        if (shopId === 'all') {
          const bundle = await buildClientBrandConsolidatedReport({
            brandId,
            shopId: 'all',
            startDate,
            endDate,
            month,
            reportType,
            includeItemDetails,
            gst,
          });

          if (!bundle) {
            throw new Error('Could not load brand consolidated preview data');
          }

          if (!cancelled) {
            setPayload({
              mode: 'brand',
              brand: bundle.pdfData.brand,
              bundle,
            });
          }
        } else {
          const reportData = await buildClientReportData({
            brandId,
            shopId,
            startDate,
            endDate,
            month,
            reportType,
            includeItemDetails,
            itemKindFilter,
            itemCategoryFilter,
            itemSearchFilter,
            gst,
          });

          if (!reportData) {
            throw new Error('Could not load shop report preview data');
          }

          if (!cancelled) {
            setPayload({
              mode: 'shop',
              brand: reportData.brand,
              reportData,
            });
          }
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
    brandId,
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

  if (payload.mode === 'brand') {
    const bundle: BrandConsolidatedReportBundle = payload.bundle;
    const pdf = bundle.pdfData;
    subtitle = 'All Outlets Combined';
    periodLabel = `${pdf.period.startDate} to ${pdf.period.endDate}`;
    generatedAtLabel = pdf.generatedAt;

    pages.push({
      title: 'Brand Executive Summary & Outlets',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
              <span className="text-[9px] uppercase text-slate-500 block">Total Income</span>
              <span className="text-xs font-bold text-emerald-700">
                <Money value={pdf.summary.totalIncome} />
              </span>
            </div>
            <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
              <span className="text-[9px] uppercase text-slate-500 block">Total Expense</span>
              <span className="text-xs font-bold text-rose-700">
                <Money value={pdf.summary.totalExpense} />
              </span>
            </div>
            <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
              <span className="text-[9px] uppercase text-slate-500 block">Net Profit</span>
              <span className="text-xs font-bold text-slate-900">
                <Money value={pdf.summary.netProfit} />
              </span>
            </div>
            <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
              <span className="text-[9px] uppercase text-slate-500 block">Active Outlets</span>
              <span className="text-xs font-bold text-slate-900">
                <Count value={pdf.summary.activeShopsCount} />
              </span>
            </div>
            {pdf.gst && pdf.gst.gstAmount > 0 && (
              <div className="col-span-4 grid grid-cols-2 gap-2 mt-1">
                <div className="p-2 rounded-[4px] border border-amber-200 bg-amber-50">
                  <span className="text-[9px] uppercase text-amber-800 font-semibold block">
                    Consolidated GST ({pdf.gst.type === 'percentage' ? `${pdf.gst.value}%` : 'Flat Amount'})
                  </span>
                  <span className="text-xs font-bold text-amber-700">
                    +<Money value={pdf.gst.gstAmount} />
                  </span>
                </div>
                <div className="p-2 rounded-[4px] border border-emerald-200 bg-emerald-50">
                  <span className="text-[9px] uppercase text-emerald-800 font-semibold block">
                    Grand Total (Brand + GST)
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    <Money value={pdf.gst.grandTotal} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-[4px] overflow-hidden">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: brandMeta.primaryColor || '#ea580c' }}>
                  <th className="py-1.5 px-2 text-left">Outlet</th>
                  <th className="py-1.5 px-2 text-right">Income</th>
                  <th className="py-1.5 px-2 text-right">Expense</th>
                  <th className="py-1.5 px-2 text-right">Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pdf.shops.map((s) => (
                  <tr key={s.code || s.name}>
                    <td className="py-1.5 px-2 font-medium text-slate-900">{s.name} ({s.code})</td>
                    <td className="py-1.5 px-2 text-right font-mono text-emerald-700"><Money value={s.income} /></td>
                    <td className="py-1.5 px-2 text-right font-mono text-rose-700"><Money value={s.expense} /></td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold"><Money value={s.closing} /></td>
                  </tr>
                ))}
              </tbody>
              {pdf.gst && pdf.gst.gstAmount > 0 && (
                <tfoot>
                  <tr className="bg-amber-50 font-semibold text-amber-900 border-t border-amber-200">
                    <td className="py-1.5 px-2">
                      GST ({pdf.gst.type === 'percentage' ? `${pdf.gst.value}%` : 'Flat Amount'})
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-amber-700">
                      +<Money value={pdf.gst.gstAmount} />
                    </td>
                    <td colSpan={2} className="py-1.5 px-2 text-[9px] text-amber-700">
                      Base Income: <Money value={pdf.gst.subtotal} />
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 font-bold text-emerald-950 border-t border-emerald-200">
                    <td className="py-1.5 px-2">
                      GRAND TOTAL (INCL. GST)
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-emerald-700">
                      <Money value={pdf.gst.grandTotal} />
                    </td>
                    <td colSpan={2} className="py-1.5 px-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ),
    });
  } else if (payload.mode === 'shop') {
    const r: ReportData = payload.reportData;
    subtitle = `${r.shop.name} (${r.shop.code})`;
    periodLabel = `${r.period.startDate} to ${r.period.endDate}`;
    generatedAtLabel = r.generatedAt;

    if (reportType === 'daily_summary' || reportType === 'full') {
      pages.push({
        title: 'Executive Financial Summary',
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Opening Cash</span>
                <span className="text-xs font-bold text-slate-900">
                  <Money value={r.summary.openingBalance} />
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Total Income</span>
                <span className="text-xs font-bold text-emerald-700">
                  <Money value={r.summary.totalIncome} />
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Total Expense</span>
                <span className="text-xs font-bold text-rose-700">
                  <Money value={r.summary.totalExpense} />
                </span>
              </div>
              <div className="p-2.5 rounded-[4px] border border-slate-200 bg-slate-50">
                <span className="text-[9px] uppercase text-slate-500 block">Closing Cash</span>
                <span className="text-xs font-bold text-slate-900">
                  <Money value={r.summary.closingBalance} />
                </span>
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

            <div className="border border-slate-200 rounded-[4px] overflow-hidden">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: brandMeta.primaryColor || '#ea580c' }}>
                    <th className="py-1.5 px-2 text-left">Date</th>
                    <th className="py-1.5 px-2 text-right">Opening</th>
                    <th className="py-1.5 px-2 text-right">Income</th>
                    <th className="py-1.5 px-2 text-right">Expense</th>
                    <th className="py-1.5 px-2 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.dailySummaries.slice(0, 15).map((d) => (
                    <tr key={d.date}>
                      <td className="py-1 px-2 font-mono">{d.date}</td>
                      <td className="py-1 px-2 text-right font-mono"><Money value={d.opening} /></td>
                      <td className="py-1 px-2 text-right font-mono text-emerald-700"><Money value={d.income} /></td>
                      <td className="py-1 px-2 text-right font-mono text-rose-700"><Money value={d.expense} /></td>
                      <td className="py-1 px-2 text-right font-mono font-bold"><Money value={d.closing} /></td>
                    </tr>
                  ))}
                </tbody>
                {r.gst && r.gst.gstAmount > 0 && (
                  <tfoot>
                    <tr className="bg-amber-50 font-semibold text-amber-900 border-t border-amber-200">
                      <td className="py-1.5 px-2">
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
                      <td className="py-1.5 px-2">
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
    }
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
