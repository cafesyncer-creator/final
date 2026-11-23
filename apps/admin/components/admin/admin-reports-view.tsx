'use client';

import React, { useCallback, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Layers,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getMonthBounds } from '@/lib/calculations/dates';
import { DemoShop } from '@/lib/demo-admin-data';
import type { ReportKindOption } from '@/lib/reports/types';
import {
  ItemWiseFilterState,
  ItemWiseSummaryView,
} from '@/components/shared/item-wise-summary-view';
import { ReportPreviewModal } from '@/components/shared/report-preview-modal';
import { useAuth } from '@/lib/auth-context';
import {
  buildClientReportData,
  buildClientBrandConsolidatedReport,
} from '@/lib/reports/client-builder';
import {
  exportReportExcel,
  exportReportPdf,
  exportBrandConsolidatedExcel,
  exportBrandConsolidatedPdf,
} from '@/lib/reports/client-exporter';

interface AdminReportsViewProps {
  shops: DemoShop[];
  currentMonth: string;
}

const REPORT_TYPE_OPTIONS: Array<{
  id: ReportKindOption;
  label: string;
  desc: string;
}> = [
  {
    id: 'daily_summary',
    label: 'Daily Summary',
    desc: 'Opening, Income, Expense & Closing balances',
  },
  {
    id: 'item_wise',
    label: 'Item-wise Summary',
    desc: 'Totals, quantities, average rates & purchase popup',
  },
  {
    id: 'salary',
    label: 'Salary',
    desc: 'Days worked, advances paid & net salary payable',
  },
  {
    id: 'full',
    label: 'Full Report (all)',
    desc: 'Daily, Item-wise Summary, Transactions & Salary combined',
  },
];

export function AdminReportsView({ shops, currentMonth }: AdminReportsViewProps) {
  const { profile, brand } = useAuth();
  const brandId = profile?.brand_id || brand?.id || '';

  const [selectedReport, setSelectedReport] =
    useState<ReportKindOption>('daily_summary');
  const [selectedShop, setSelectedShop] = useState('all');
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const bounds = getMonthBounds(currentMonth);
  const [startDate, setStartDate] = useState(bounds.start);
  const [endDate, setEndDate] = useState(bounds.end);
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

  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
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

  const handleDownloadExcel = async () => {
    setIsExcelLoading(true);
    const toastId = toast.loading('Generating Excel report...');
    try {
      if (selectedShop === 'all') {
        const bundle = await buildClientBrandConsolidatedReport({
          brandId,
          shopId: 'all',
          startDate: activeStart,
          endDate: activeEnd,
          month: selectedMonth,
          reportType: selectedReport,
          includeItemDetails,
          gst: activeGst,
        });
        if (!bundle) throw new Error('Failed to generate consolidated report');
        const filename = `CafeLedger_${selectedReport}_AllShops_${activeStart}_${activeEnd}.xlsx`;
        await exportBrandConsolidatedExcel(bundle, filename);
      } else {
        const reportData = await buildClientReportData({
          brandId,
          shopId: selectedShop,
          startDate: activeStart,
          endDate: activeEnd,
          month: selectedMonth,
          reportType: selectedReport,
          includeItemDetails,
          itemKindFilter: itemFilters.kind,
          itemCategoryFilter: itemFilters.category,
          itemSearchFilter: itemFilters.search,
          gst: activeGst,
        });
        if (!reportData) throw new Error('Failed to generate shop report');
        const filename = `CafeLedger_${selectedReport}_${selectedShop}_${activeStart}_${activeEnd}.xlsx`;
        await exportReportExcel(reportData, filename);
      }

      toast.success('Excel workbook downloaded successfully', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Excel download failed', { id: toastId });
    } finally {
      setIsExcelLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfLoading(true);
    const toastId = toast.loading('Generating branded A4 PDF report...');
    try {
      if (selectedShop === 'all') {
        const bundle = await buildClientBrandConsolidatedReport({
          brandId,
          shopId: 'all',
          startDate: activeStart,
          endDate: activeEnd,
          month: selectedMonth,
          reportType: selectedReport,
          includeItemDetails,
          gst: activeGst,
        });
        if (!bundle) throw new Error('Failed to generate consolidated PDF');
        const filename = `CafeLedger_${selectedReport}_AllShops_${activeStart}_${activeEnd}.pdf`;
        await exportBrandConsolidatedPdf(bundle, filename);
      } else {
        const reportData = await buildClientReportData({
          brandId,
          shopId: selectedShop,
          startDate: activeStart,
          endDate: activeEnd,
          month: selectedMonth,
          reportType: selectedReport,
          includeItemDetails,
          itemKindFilter: itemFilters.kind,
          itemCategoryFilter: itemFilters.category,
          itemSearchFilter: itemFilters.search,
          gst: activeGst,
        });
        if (!reportData) throw new Error('Failed to generate shop PDF');
        const filename = `CafeLedger_${selectedReport}_${selectedShop}_${activeStart}_${activeEnd}.pdf`;
        await exportReportPdf(reportData, filename);
      }

      toast.success('PDF statement downloaded successfully', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'PDF download failed', { id: toastId });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const supportsItemDetailsToggle =
    selectedReport === 'item_wise' || selectedReport === 'full';

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-[var(--brand-primary,#ea580c)]" />
            <span>Financial Reports & Statements</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View reports directly on screen or export Excel workbooks and A4 branded PDFs across any date range.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="min-h-[44px] text-white font-semibold gap-2 shrink-0"
          style={{ backgroundColor: 'var(--brand-primary, #ea580c)' }}
        >
          <Eye className="h-4 w-4" />
          <span>View Report (A4 Preview)</span>
        </Button>
      </div>

      {/* 2. REPORT TYPE SELECTOR + FILTERS */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs space-y-5">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--brand-primary,#ea580c)]" />
            <span>1. Choose Report Type</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {REPORT_TYPE_OPTIONS.map((opt) => {
              const active = selectedReport === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedReport(opt.id)}
                  className={`p-3 text-left rounded-lg border transition-all min-h-[68px] cursor-pointer ${
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
        </div>

        {/* Shop & Period Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              2. Target Outlet(s)
            </label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full min-h-[44px] px-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#ea580c)] bg-white font-medium"
            >
              <option value="all">All Outlets Combined (Brand Consolidated)</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              3. Time Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`min-h-[44px] px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                  periodMode === 'month'
                    ? 'border-[var(--brand-primary,#ea580c)] bg-orange-50/50 text-[var(--brand-primary,#ea580c)]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Calendar Month
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('range')}
                className={`min-h-[44px] px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                  periodMode === 'range'
                    ? 'border-[var(--brand-primary,#ea580c)] bg-orange-50/50 text-[var(--brand-primary,#ea580c)]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Custom Date Range
              </button>
            </div>
          </div>
        </div>

        {/* Date Inputs */}
        {periodMode === 'month' ? (
          <div className="space-y-1.5 max-w-xs">
            <label className="text-xs font-semibold text-slate-700">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full min-h-[44px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#ea580c)]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#ea580c)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#ea580c)]"
              />
            </div>
          </div>
        )}

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
            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-3 text-xs max-w-2xl">
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
                ℹ️ GST will be calculated at the end of all figures on total income (or consolidated brand income) and displayed in a dedicated GST section across A4 Preview, PDF, and Excel export.
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
              Include item-wise purchase details section in PDF (adds day-by-day tables after summary)
            </span>
          </label>
        )}
      </div>

      {/* 3. VIEW & DOWNLOAD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VIEW ON SCREEN */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">View On-Screen</h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  A4 Paper Preview with Zoom & Print
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Review numbers page by page in real A4 portrait layout before printing or downloading.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="w-full min-h-[44px] font-semibold gap-2"
          >
            <Eye className="h-4 w-4" />
            <span>Open A4 View</span>
          </Button>
        </div>

        {/* EXCEL DOWNLOAD */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Microsoft Excel (.xlsx)</h3>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Live formulas & Item Detail sheets
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Downloads sheets matching the selected report type (Item Summary, Item Details, Daily Summary, Salary).
            </p>
          </div>

          <Button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isExcelLoading}
            className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2"
          >
            {isExcelLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExcelLoading ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
          </Button>
        </div>

        {/* PDF DOWNLOAD */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-800">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Branded PDF (.pdf)</h3>
                <span className="text-[11px] text-[var(--brand-primary,#ea580c)] font-semibold">
                  A4 Print ready with Brand Logo
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Polished A4 portrait statement with un-cropped logo, right-aligned ₹ figures, and page numbers.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isPdfLoading}
            className="w-full min-h-[44px] bg-[var(--brand-primary,#ea580c)] hover:opacity-90 text-white flex items-center justify-center gap-2"
          >
            {isPdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isPdfLoading ? 'Generating PDF...' : 'Download PDF (.pdf)'}</span>
          </Button>
        </div>
      </div>

      {/* 4. INTERACTIVE ITEM-WISE SUMMARY TABLE + DETAIL POPUP */}
      {selectedReport === 'item_wise' && (
        <ItemWiseSummaryView
          shops={shops}
          selectedShopId={selectedShop}
          onSelectedShopChange={setSelectedShop}
          startDate={activeStart}
          endDate={activeEnd}
          onFilterStateChange={handleItemFilterChange}
        />
      )}

      {/* 5. A4 ON-SCREEN PREVIEW MODAL */}
      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        reportType={selectedReport}
        shopId={selectedShop}
        month={selectedMonth}
        startDate={activeStart}
        endDate={activeEnd}
        includeItemDetails={includeItemDetails}
        itemKindFilter={itemFilters.kind}
        itemCategoryFilter={itemFilters.category}
        itemSearchFilter={itemFilters.search}
        gst={activeGst}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isPdfLoading}
      />
    </div>
  );
}
