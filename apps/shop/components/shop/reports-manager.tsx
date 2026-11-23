'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentMonthKolkata, getMonthBounds } from '@/lib/calculations/dates';
import type { ReportKindOption } from '@/lib/reports/types';
import { toast } from 'sonner';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Calendar,
  Eye,
  Layers,
} from 'lucide-react';
import {
  ItemWiseFilterState,
  ItemWiseSummaryView,
} from '@/components/shared/item-wise-summary-view';
import { buildClientReportData } from '@/lib/reports/client-builder';
import { exportReportExcel, exportReportPdf } from '@/lib/reports/client-exporter';
import { ReportPreviewModal } from '@/components/shared/report-preview-modal';

interface ReportsManagerProps {
  shopId: string;
  shopName: string;
  brandName: string;
}

const SHOP_REPORT_OPTIONS: Array<{
  id: ReportKindOption;
  label: string;
  desc: string;
}> = [
  {
    id: 'daily_summary',
    label: 'Daily Summary',
    desc: 'Opening, Income, Expense & Closing per day',
  },
  {
    id: 'item_wise',
    label: 'Item-wise Summary',
    desc: 'Totals, quantity bought & item detail popup',
  },
  {
    id: 'salary',
    label: 'Salary',
    desc: 'Staff attendance, advances & balance payable',
  },
  {
    id: 'full',
    label: 'Full Report (all)',
    desc: 'All daily, item-wise & salary sheets combined',
  },
];

export function ReportsManager({ shopId, shopName, brandName }: ReportsManagerProps) {
  const currentMonth = getCurrentMonthKolkata();
  const [selectedReport, setSelectedReport] =
    useState<ReportKindOption>('daily_summary');
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const initialBounds = getMonthBounds(currentMonth);
  const [startDate, setStartDate] = useState(initialBounds.start);
  const [endDate, setEndDate] = useState(initialBounds.end);
  const [includeItemDetails, setIncludeItemDetails] = useState(false);

  // Optional GST Configuration
  const [enableGst, setEnableGst] = useState(false);
  const [gstType, setGstType] = useState<'percentage' | 'amount'>('percentage');
  const [gstValue, setGstValue] = useState<string>('5');

  const [itemFilters, setItemFilters] = useState<ItemWiseFilterState>({
    kind: 'expense',
    category: '',
    search: '',
  });
  const handleItemFilterChange = useCallback((f: ItemWiseFilterState) => {
    setItemFilters(f);
  }, []);

  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const activeStart =
    periodMode === 'month' ? getMonthBounds(selectedMonth).start : startDate;
  const activeEnd =
    periodMode === 'month' ? getMonthBounds(selectedMonth).end : endDate;

  const parsedGstVal = parseFloat(gstValue) || 0;
  const activeGst =
    enableGst && parsedGstVal > 0
      ? { type: gstType, value: parsedGstVal }
      : null;

  const downloadExcel = async () => {
    setIsDownloadingExcel(true);
    const toastId = toast.loading('Generating Excel report...');

    try {
      const reportData = await buildClientReportData({
        shopId,
        startDate: activeStart,
        endDate: activeEnd,
        month: selectedMonth,
        reportType: selectedReport,
        includeItemDetails,
        gst: activeGst,
      });

      if (!reportData) {
        throw new Error('Failed to assemble report data');
      }

      const filename = `${brandName}_${shopName}_${selectedReport}_${activeStart}_${activeEnd}.xlsx`.replace(
        /\s+/g,
        '_'
      );
      await exportReportExcel(reportData, filename);

      toast.success('Excel report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Error downloading report', { id: toastId });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const downloadPdf = async () => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Rendering branded A4 PDF statement...');

    try {
      const reportData = await buildClientReportData({
        shopId,
        startDate: activeStart,
        endDate: activeEnd,
        month: selectedMonth,
        reportType: selectedReport,
        includeItemDetails,
        gst: activeGst,
      });

      if (!reportData) {
        throw new Error('Failed to assemble report data');
      }

      const filename = `${brandName}_${shopName}_${selectedReport}_${activeStart}_${activeEnd}.pdf`.replace(
        /\s+/g,
        '_'
      );
      await exportReportPdf(reportData, filename);

      toast.success('PDF statement downloaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Error downloading PDF', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const supportsItemDetailsToggle =
    selectedReport === 'item_wise' || selectedReport === 'full';

  return (
    <div className="space-y-6">
      {/* Report Type & Period Selection */}
      <Card className="border-slate-200 shadow-xs rounded-lg">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--brand-primary,#ea580c)]" />
                <span>Choose Report & Time Period</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                View any report right on screen or download Excel / branded PDF for your shop.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="min-h-[44px] text-white font-semibold gap-2 shrink-0"
              style={{ backgroundColor: 'var(--brand-primary, #ea580c)' }}
            >
              <Eye className="h-4 w-4" />
              <span>View Report On-Screen</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* Report Type Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SHOP_REPORT_OPTIONS.map((opt) => {
              const active = selectedReport === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedReport(opt.id)}
                  className={`p-3 text-left rounded-lg border transition-all min-h-[64px] cursor-pointer ${
                    active
                      ? 'border-[var(--brand-primary,#ea580c)] bg-orange-50/40 ring-1 ring-[var(--brand-primary,#ea580c)]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {opt.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Period Mode & Date Controls */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 pt-3 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Period Mode
              </label>
              <div className="inline-grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPeriodMode('month')}
                  className={`min-h-[38px] px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    periodMode === 'month'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Calendar Month
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('range')}
                  className={`min-h-[38px] px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    periodMode === 'range'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {periodMode === 'month' ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="report-month-select"
                  className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Select Month</span>
                </label>
                <input
                  id="report-month-select"
                  type="month"
                  value={selectedMonth}
                  max={currentMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs min-h-[44px] w-full sm:w-52 cursor-pointer"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white min-h-[44px]"
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500 pb-2">
              Showing: <span className="font-mono font-semibold text-slate-700">{activeStart}</span> to{' '}
              <span className="font-mono font-semibold text-slate-700">{activeEnd}</span>
            </div>
          </div>

          {/* Optional GST Calculation Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableGst}
                  onChange={(e) => setEnableGst(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary,#ea580c)]"
                />
                <span>Apply GST Calculation (Optional)</span>
              </label>
              <Badge variant={enableGst ? 'default' : 'outline'} className="text-[10px] font-medium">
                {enableGst ? 'Active' : 'Optional / Off'}
              </Badge>
            </div>

            {enableGst && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">Calculation Mode:</span>
                    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setGstType('percentage')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded ${
                          gstType === 'percentage'
                            ? 'bg-[var(--brand-primary,#ea580c)] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGstType('amount')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded ${
                          gstType === 'amount'
                            ? 'bg-[var(--brand-primary,#ea580c)] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Flat Amount (₹)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-slate-700 font-semibold">
                      {gstType === 'percentage' ? 'GST Rate (%):' : 'GST Amount (₹):'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={gstType === 'percentage' ? '0.1' : '1'}
                      value={gstValue}
                      onChange={(e) => setGstValue(e.target.value)}
                      placeholder={gstType === 'percentage' ? 'e.g. 5 or 18' : 'e.g. 500'}
                      className="w-24 px-2.5 py-1 text-xs font-bold rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {gstType === 'percentage' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 text-[11px]">Quick standard rates:</span>
                    {[5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setGstValue(String(rate))}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          gstValue === String(rate)
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-amber-800/90 leading-tight">
                  ℹ️ GST will be calculated at the end of all figures on total income and displayed in a dedicated GST section across A4 Preview, PDF, and Excel export.
                </p>
              </div>
            )}
          </div>

          {supportsItemDetailsToggle && (
            <label className="flex items-center gap-2.5 pt-2 border-t border-slate-100 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeItemDetails}
                onChange={(e) => setIncludeItemDetails(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[var(--brand-primary,#ea580c)]"
              />
              <span className="font-medium">
                Include item-wise purchase details in PDF download
              </span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* View & Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-lg">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px]">
                On-Screen
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold text-slate-900 mt-2">
              A4 Page Viewer
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              View paginated A4 sheets on screen with Zoom +/- controls before downloading.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="w-full min-h-[44px] font-bold gap-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Report</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-lg hover:border-emerald-300 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                .XLSX
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold text-slate-900 mt-2">
              Excel Workbook
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Native <code>=SUM(...)</code> formulas with Item Summary, Item Details & Daily sheets.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button
              type="button"
              onClick={downloadExcel}
              disabled={isDownloadingExcel || isDownloadingPdf}
              className="w-full min-h-[44px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
            >
              {isDownloadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Excel</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-lg hover:border-[var(--brand-primary,#ea580c)]/40 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-orange-100 text-[var(--brand-primary,#ea580c)] flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] text-[var(--brand-primary,#ea580c)] bg-orange-50">
                A4 PDF
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold text-slate-900 mt-2">
              Branded PDF Statement
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              A4 portrait statement with un-cropped brand logo and clear totals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Button
              type="button"
              onClick={downloadPdf}
              disabled={isDownloadingExcel || isDownloadingPdf}
              className="w-full min-h-[44px] font-bold bg-[var(--brand-primary,#ea580c)] hover:opacity-90 text-white shadow-xs gap-2"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Rendering...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Item-wise Summary + Detail Popup when selected */}
      {selectedReport === 'item_wise' && (
        <ItemWiseSummaryView
          lockedShopId={shopId}
          startDate={activeStart}
          endDate={activeEnd}
          onFilterStateChange={handleItemFilterChange}
        />
      )}

      {/* A4 Preview Modal */}
      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        reportType={selectedReport}
        shopId={shopId}
        month={selectedMonth}
        startDate={activeStart}
        endDate={activeEnd}
        includeItemDetails={includeItemDetails}
        itemKindFilter={itemFilters.kind}
        itemCategoryFilter={itemFilters.category}
        itemSearchFilter={itemFilters.search}
        gst={activeGst}
        onDownloadPdf={downloadPdf}
        isDownloadingPdf={isDownloadingPdf}
      />
    </div>
  );
}
