import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getBrandThemeById } from '@/lib/theme/server';
import { resolvePdfSafeLogoDataUri } from './logo-helper';
import { BrandPdfData } from './brand-pdf';
import {
  fetchAllGroupedItemDetailsForExport,
  fetchItemWiseSummary,
} from './item-wise';
import { ReportDailySummaryRow, ReportKindOption, ReportSalaryRow } from './types';
import { formatDate, getTodayKolkata } from '@/lib/calculations/dates';
import { ensureContrastColor, normalizeHex, pickReadableTextColor } from '@/lib/theme/colors';
import { DEMO_BRAND, DEMO_USERS } from '@/lib/demo-data';
import { DEMO_ADMIN_SHOPS } from '@/lib/demo-admin-data';
import { DEMO_EMPLOYEES } from '@/lib/demo-shop-data';

export interface BrandConsolidatedReportBundle {
  pdfData: BrandPdfData;
  dailySummaries: ReportDailySummaryRow[];
  salaryRecords: ReportSalaryRow[];
  gst?: import('./types').ReportGstInfo | null;
}

export async function buildBrandConsolidatedReport(params: {
  brandId: string;
  shopId?: string;
  startDate: string;
  endDate: string;
  month?: string;
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
}): Promise<BrandConsolidatedReportBundle> {
  const reportType: ReportKindOption = params.reportType || 'daily_summary';
  const shopFilter = params.shopId || 'all';
  const targetMonth = params.month || params.startDate.substring(0, 7);

  const bundle = await getBrandThemeById(params.brandId);
  const pdfSafeLogo = await resolvePdfSafeLogoDataUri(
    bundle.settings.logo_url,
    params.brandId
  );

  const summariesByShop: Record<string, { income: number; expense: number; closing: number; opening: number }> = {};
  const dailyMap = new Map<string, { opening: number; income: number; expense: number; closing: number }>();
  let shops: any[] = [];
  let salaryRecords: ReportSalaryRow[] = [];

  if (isSupabaseConfigured()) {
    const supabase = (await createClient()) as any;
    let shopsQuery = supabase
      .from('shops')
      .select('id, name, code, status')
      .eq('brand_id', params.brandId)
      .order('name', { ascending: true });
    if (shopFilter !== 'all') {
      shopsQuery = shopsQuery.eq('id', shopFilter);
    }
    const { data: dbShops } = await shopsQuery;
    shops = dbShops || [];
    const shopMap = new Map<string, { name: string; code: string }>();
    shops.forEach((s: any) => shopMap.set(s.id, { name: s.name, code: s.code }));

    const shopIds = shops.map((s) => s.id);
    if (shopIds.length > 0) {
      const { data: dbSummaries } = await supabase
        .from('daily_summary')
        .select('shop_id, summary_date, opening, income, expense, closing')
        .in('shop_id', shopIds)
        .gte('summary_date', params.startDate)
        .lte('summary_date', params.endDate)
        .order('summary_date', { ascending: true });

      (dbSummaries || []).forEach((s: any) => {
        if (!summariesByShop[s.shop_id]) {
          summariesByShop[s.shop_id] = {
            income: 0,
            expense: 0,
            closing: 0,
            opening: Number(s.opening) || 0,
          };
        }
        summariesByShop[s.shop_id].income += Number(s.income) || 0;
        summariesByShop[s.shop_id].expense += Number(s.expense) || 0;
        summariesByShop[s.shop_id].closing = Number(s.closing) || 0;

        const prev = dailyMap.get(s.summary_date) || {
          opening: 0,
          income: 0,
          expense: 0,
          closing: 0,
        };
        prev.opening += Number(s.opening) || 0;
        prev.income += Number(s.income) || 0;
        prev.expense += Number(s.expense) || 0;
        prev.closing += Number(s.closing) || 0;
        dailyMap.set(s.summary_date, prev);
      });

      if (reportType === 'salary' || reportType === 'full') {
        const { data: dbSal } = await supabase
          .from('salary_records')
          .select('shop_id, days_worked, rate_snapshot, gross, advances_total, paid_total, balance, employees(name, role_title)')
          .in('shop_id', shopIds)
          .eq('month', targetMonth);

        salaryRecords = (dbSal || []).map((sr: any) => {
          const shopMeta = shopMap.get(sr.shop_id);
          return {
            shopName: shopMeta?.name || 'Outlet',
            employee: sr.employees?.name || 'Staff Member',
            role: sr.employees?.role_title || undefined,
            days: Number(sr.days_worked) || 0,
            rate: Number(sr.rate_snapshot) || 0,
            gross: Number(sr.gross) || 0,
            advances: Number(sr.advances_total) || 0,
            paid: Number(sr.paid_total) || 0,
            balance: Number(sr.balance) || 0,
          };
        });
      }
    }
  } else {
    const brandDemoShops =
      params.brandId === DEMO_BRAND.id
        ? DEMO_ADMIN_SHOPS
        : Object.values(DEMO_USERS)
            .filter((u) => u.brand?.id === params.brandId && u.shop)
            .map((u) => ({
              id: u.shop!.id,
              brand_id: params.brandId,
              name: u.shop!.name,
              code: u.shop!.code,
              status: 'active',
              month_summary: {
                income: 615000,
                expense: 342000,
                closing: 273000,
              },
            }));

    const fallbackShops =
      brandDemoShops.length > 0
        ? brandDemoShops
        : [
            {
              id: `demo-flagship-${params.brandId}`,
              brand_id: params.brandId,
              name: `${bundle.settings.display_name} Flagship`,
              code: 'MAIN-01',
              status: 'active',
              month_summary: { income: 520000, expense: 295000, closing: 225000 },
            },
          ];

    shops =
      shopFilter === 'all'
        ? fallbackShops
        : fallbackShops.filter((s) => s.id === shopFilter);

    dailyMap.set(params.startDate, {
      opening: 25000,
      income: 28450,
      expense: 11200,
      closing: 42250,
    });
    dailyMap.set(params.endDate, {
      opening: 42250,
      income: 31900,
      expense: 12800,
      closing: 61350,
    });

    if (reportType === 'salary' || reportType === 'full') {
      salaryRecords = DEMO_EMPLOYEES.slice(0, 4).map((e, idx) => {
        const shopObj = shops[idx % shops.length];
        const days = 26;
        const gross = days * e.rate_per_day;
        const advances = 1500;
        return {
          shopName: shopObj?.name || 'Outlet',
          employee: e.name,
          role: e.role_title,
          days,
          rate: e.rate_per_day,
          gross,
          advances,
          paid: 0,
          balance: gross - advances,
        };
      });
    }
  }

  let brandTotalIncome = 0;
  let brandTotalExpense = 0;
  const mappedShops = shops.map((s: any) => {
    const perf =
      summariesByShop[s.id] ||
      (s.month_summary
        ? {
            income: s.month_summary.income,
            expense: s.month_summary.expense,
            closing: s.month_summary.closing,
          }
        : { income: 0, expense: 0, closing: 0 });
    brandTotalIncome += perf.income;
    brandTotalExpense += perf.expense;
    return {
      name: s.name,
      code: s.code,
      income: perf.income,
      expense: perf.expense,
      net: perf.income - perf.expense,
      closing: perf.closing,
      status: s.status || 'active',
    };
  });

  const dailySummaries: ReportDailySummaryRow[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, val]) => ({
      date: formatDate(date),
      opening: Math.round(val.opening * 100) / 100,
      income: Math.round(val.income * 100) / 100,
      expense: Math.round(val.expense * 100) / 100,
      net: Math.round((val.income - val.expense) * 100) / 100,
      closing: Math.round(val.closing * 100) / 100,
    }));

  let itemSummaryRows: BrandPdfData['itemSummaryRows'];
  let groupedItemDetails: BrandPdfData['groupedItemDetails'];

  if (reportType === 'full') {
    const iw = await fetchItemWiseSummary({
      brandId: params.brandId,
      shopId: shopFilter,
      startDate: params.startDate,
      endDate: params.endDate,
      kind: 'both',
    });
    itemSummaryRows = iw.rows;
    groupedItemDetails = await fetchAllGroupedItemDetailsForExport({
      brandId: params.brandId,
      shopId: shopFilter,
      startDate: params.startDate,
      endDate: params.endDate,
      kind: 'both',
    });
  }

  return {
    pdfData: {
      reportType,
      includeItemDetails: Boolean(params.includeItemDetails),
      brand: {
        name: bundle.settings.display_name || bundle.brand.name,
        registrationNo: bundle.brand.registration_no,
        logoUrl: pdfSafeLogo,
        primaryColor: bundle.settings.primary_color,
        secondaryColor: bundle.settings.secondary_color,
        address: bundle.brand.address,
        gstin: bundle.brand.gstin,
        pdfHeaderStyle: bundle.settings.pdf_header_style,
        pdfFooterText: bundle.settings.pdf_footer_text,
        pdfShowAddress: bundle.settings.pdf_show_address,
        pdfShowGstin: bundle.settings.pdf_show_gstin,
        pdfShowRegistrationNo: bundle.settings.pdf_show_registration_no,
        pdfSignatureLine: bundle.settings.pdf_signature_line,
      },
      period: {
        startDate: formatDate(params.startDate),
        endDate: formatDate(params.endDate),
      },
      generatedAt: formatDate(getTodayKolkata()),
      summary: {
        totalIncome: brandTotalIncome,
        totalExpense: brandTotalExpense,
        netProfit: brandTotalIncome - brandTotalExpense,
        activeShopsCount: shops.length,
      },
      shops: mappedShops,
      itemSummaryRows,
      groupedItemDetails,
      salaryRecords,
    },
    dailySummaries,
    salaryRecords,
  };
}

export { generateBrandConsolidatedExcel } from './brand-excel';

