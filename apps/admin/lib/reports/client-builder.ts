import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { formatDate } from '@/lib/calculations/dates';
import { DEMO_BRAND, DEMO_USERS } from '@/lib/demo-data';
import { DEMO_ADMIN_SHOPS } from '@/lib/demo-admin-data';
import { DEMO_EMPLOYEES, DEMO_ITEMS, DEMO_PAYMENT_MODES } from '@/lib/demo-shop-data';
import type {
  ReportData,
  ReportDailySummaryRow,
  ReportTransactionRow,
  ReportSalaryRow,
  ReportExpenseCategoryRow,
  ReportKindOption,
  ReportBrandInfo,
} from '@/lib/reports/types';
import type { ItemSummaryRow, GroupedItemDetailsGroup, ItemWiseSummaryResult } from '@/lib/reports/item-wise';
import type { BrandConsolidatedReportBundle } from '@/lib/reports/brand-builder';
import type { BrandPdfData } from '@/lib/reports/brand-pdf';

export interface ClientReportBuildParams {
  brandId?: string;
  shopId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  month?: string;    // YYYY-MM
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
  itemKindFilter?: 'expense' | 'income' | 'both';
  itemCategoryFilter?: string;
  itemSearchFilter?: string;
  gst?: { type: 'percentage' | 'amount'; value: number } | null;
}

export async function buildClientReportData(
  params: ClientReportBuildParams
): Promise<ReportData | null> {
  const { shopId, startDate, endDate, reportType = 'full', includeItemDetails = false } = params;

  if (!isSupabaseConfigured()) {
    const demoUser = Object.values(DEMO_USERS).find((u) => u.shop?.id === shopId) || DEMO_USERS['manager.indiranagar@snaxia.in'];
    const demoShop = demoUser?.shop || { id: shopId, name: 'Indiranagar Flagship', code: 'SNX-BLR-01', address: '12th Main Road, Indiranagar, Bengaluru' };

    const dailySummaries: ReportDailySummaryRow[] = [];
    const transactions: ReportTransactionRow[] = [];
    let curBal = 25000;
    let totInc = 0;
    let totExp = 0;

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      const inc = 14000 + ((d.getDate() * 750) % 9000);
      const exp = 6000 + ((d.getDate() * 420) % 5000);
      const net = inc - exp;
      const closing = curBal + net;

      dailySummaries.push({
        date: formatDate(dStr),
        opening: curBal,
        income: inc,
        expense: exp,
        net,
        closing,
      });

      transactions.push({
        date: formatDate(dStr),
        description: 'Counter Sales & Delivery',
        mop: 'UPI / CASH',
        income: inc,
        expense: 0,
      });

      transactions.push({
        date: formatDate(dStr),
        description: 'Dairy, Bakery & Provisions',
        mop: 'CASH',
        income: 0,
        expense: exp,
      });

      totInc += inc;
      totExp += exp;
      curBal = closing;
    }

    const salaryRecords: ReportSalaryRow[] = DEMO_EMPLOYEES.map((emp) => ({
      shopName: demoShop.name,
      employee: emp.name,
      role: emp.role_title,
      days: 26,
      rate: emp.rate_per_day,
      gross: emp.rate_per_day * 26,
      advances: 1500,
      paid: (emp.rate_per_day * 26) - 1500,
      balance: 0,
    }));

    const expenseCategories: ReportExpenseCategoryRow[] = [
      { category: 'Dairy & Milk', amount: totExp * 0.45, percentage: 45 },
      { category: 'Coffee Beans & Tea', amount: totExp * 0.25, percentage: 25 },
      { category: 'Bakery & Snacks', amount: totExp * 0.20, percentage: 20 },
      { category: 'Kitchen Supplies & Cleaning', amount: totExp * 0.10, percentage: 10 },
    ];

    const itemSummaryRows: ItemSummaryRow[] = DEMO_ITEMS.map((item, idx) => ({
      itemKey: item.id,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      kind: item.kind as 'income' | 'expense',
      unit: item.kind === 'expense' ? 'kg' : 'pcs',
      purchaseCount: 12 + idx,
      qtyEntryCount: 12 + idx,
      totalQuantity: (idx + 1) * 35,
      quantifiedAmount: (idx + 1) * 1450,
      totalAmount: (idx + 1) * 1450,
      avgRate: 1450 / 35,
      percentOfTotal: 10,
    }));

    return {
      reportType,
      includeItemDetails,
      brand: {
        name: DEMO_BRAND.name,
        registrationNo: DEMO_BRAND.registration_no || 'KA-BLR-2023-9941',
        primaryColor: DEMO_BRAND.primary_color || '#ea580c',
        secondaryColor: DEMO_BRAND.secondary_color || '#9a3412',
        logoUrl: DEMO_BRAND.logo_url,
        gstin: '29ABCDE1234F1Z5',
        tagline: 'Artisanal Cafe & Bakery Management',
        pdfHeaderStyle: 'left',
        pdfShowAddress: true,
        pdfShowGstin: true,
        pdfShowRegistrationNo: true,
        pdfSignatureLine: true,
      },
      shop: {
        name: demoShop.name,
        code: demoShop.code,
        address: (demoShop as any).address || null,
      },
      period: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      },
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      summary: {
        openingBalance: 25000,
        totalIncome: totInc,
        totalExpense: totExp,
        profitLoss: totInc - totExp,
        closingBalance: curBal,
      },
      dailySummaries,
      transactions,
      salaryRecords,
      expenseCategories,
      itemSummaryRows,
      gst: params.gst && params.gst.value > 0 ? {
        type: params.gst.type,
        value: params.gst.value,
        ratePct: params.gst.type === 'percentage' ? params.gst.value : undefined,
        gstAmount: params.gst.type === 'percentage'
          ? Math.round(totInc * (params.gst.value / 100) * 100) / 100
          : Math.round(params.gst.value * 100) / 100,
        subtotal: totInc,
        grandTotal: Math.round((totInc + (params.gst.type === 'percentage' ? totInc * (params.gst.value / 100) : params.gst.value)) * 100) / 100,
      } : null,
    };
  }

  // Live Supabase Queries
  try {
    // 1. Fetch Shop details
    const { data: shop } = await (supabase as any)
      .from('shops')
      .select('id, name, code, brand_id, address')
      .eq('id', shopId)
      .maybeSingle();

    if (!shop) return null;
    const shopData = shop as any;

    // 2. Fetch Brand & Settings
    const [brandRes, settingsRes] = await Promise.all([
      (supabase as any).from('brands').select('*').eq('id', shopData.brand_id).maybeSingle(),
      (supabase as any).from('brand_settings').select('*').eq('brand_id', shopData.brand_id).maybeSingle(),
    ]);

    const brandData = (brandRes.data || {}) as any;
    const settings = (settingsRes.data || {}) as any;

    // 3. Fetch Daily Summary in range
    const { data: dailyData } = await (supabase as any)
      .from('daily_summary')
      .select('summary_date, opening, income, expense, closing')
      .eq('shop_id', shopId)
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date', { ascending: true });

    // 4. Fetch Transactions in range
    const { data: txnsData } = await (supabase as any)
      .from('transactions')
      .select(`
        id,
        txn_date,
        kind,
        item_id,
        item_name_snapshot,
        mode_name_snapshot,
        amount,
        quantity,
        unit_snapshot,
        rate,
        note,
        txn_type
      `)
      .eq('shop_id', shopId)
      .gte('txn_date', startDate)
      .lte('txn_date', endDate)
      .eq('is_deleted', false)
      .order('txn_date', { ascending: true })
      .order('created_at', { ascending: true });

    // 5. Fetch Salary Records in range
    const startMonth = startDate.substring(0, 7);
    const endMonth = endDate.substring(0, 7);

    const [empRes, salaryRes] = await Promise.all([
      (supabase as any).from('employees').select('id, name, role_title, rate_per_day').eq('shop_id', shopId),
      (supabase as any)
        .from('salary_records')
        .select('*')
        .eq('shop_id', shopId)
        .gte('month', startMonth)
        .lte('month', endMonth),
    ]);

    // Build Daily Summaries
    const dailySummaries: ReportDailySummaryRow[] = (dailyData || []).map((d: any) => ({
      date: formatDate(d.summary_date),
      opening: Number(d.opening),
      income: Number(d.income),
      expense: Number(d.expense),
      net: Number(d.income) - Number(d.expense),
      closing: Number(d.closing),
    }));

    // Build Transactions
    const transactions: ReportTransactionRow[] = (txnsData || []).map((t: any) => ({
      date: formatDate(t.txn_date),
      description: t.item_name_snapshot || (t.note ? `Note: ${t.note}` : 'Transaction'),
      mop: t.mode_name_snapshot || 'N/A',
      income: t.kind === 'income' ? Number(t.amount) : 0,
      expense: t.kind === 'expense' ? Number(t.amount) : 0,
    }));

    // Build Salary Records
    const empMap = new Map<string, any>((empRes.data || []).map((e: any) => [e.id, e]));
    const salaryRecords: ReportSalaryRow[] = (salaryRes.data || []).map((sr: any) => {
      const emp = empMap.get(sr.employee_id) || {};
      return {
        shopName: shopData.name,
        employee: emp.name || 'Staff Member',
        role: emp.role_title,
        days: Number(sr.days_worked) || 0,
        rate: Number(sr.rate_snapshot) || Number(emp.rate_per_day) || 0,
        gross: Number(sr.gross) || 0,
        advances: Number(sr.advances_total) || 0,
        paid: Number(sr.paid_total) || 0,
        balance: Number(sr.balance) || 0,
      };
    });

    // Build Totals
    const totIncome = transactions.reduce((sum, t) => sum + t.income, 0);
    const totExpense = transactions.reduce((sum, t) => sum + t.expense, 0);
    const openBal = dailySummaries.length > 0 ? dailySummaries[0].opening : 0;
    const closeBal = dailySummaries.length > 0 ? dailySummaries[dailySummaries.length - 1].closing : openBal + totIncome - totExpense;

    // Build Expense Categories
    const catMap = new Map<string, number>();
    (txnsData || [])
      .filter((t: any) => t.kind === 'expense')
      .forEach((t: any) => {
        const cat = t.item_name_snapshot ? t.item_name_snapshot.split(' - ')[0] || 'General' : 'General';
        catMap.set(cat, (catMap.get(cat) || 0) + Number(t.amount));
      });

    const expenseCategories: ReportExpenseCategoryRow[] = Array.from(catMap.entries()).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totExpense > 0 ? Math.round((amt / totExpense) * 100) : 0,
    }));

    // Build Item Summary Rows
    const itemMap = new Map<string, {
      itemName: string;
      kind: 'income' | 'expense';
      unit: string;
      totalQty: number;
      totalAmt: number;
      count: number;
    }>();

    (txnsData || []).forEach((t: any) => {
      const key = t.item_id || t.item_name_snapshot || 'Other';
      const prev = itemMap.get(key) || {
        itemName: t.item_name_snapshot || 'General Entry',
        kind: t.kind,
        unit: t.unit_snapshot || '',
        totalQty: 0,
        totalAmt: 0,
        count: 0,
      };
      prev.totalQty += Number(t.quantity) || 0;
      prev.totalAmt += Number(t.amount) || 0;
      prev.count += 1;
      itemMap.set(key, prev);
    });

    const grandItemTotal = Array.from(itemMap.values()).reduce((acc, i) => acc + i.totalAmt, 0);
    const itemSummaryRows: ItemSummaryRow[] = Array.from(itemMap.entries()).map(([k, i]) => ({
      itemKey: k,
      itemId: k.startsWith('item-') ? k : null,
      itemName: i.itemName,
      category: 'General',
      kind: i.kind,
      unit: i.unit,
      purchaseCount: i.count,
      qtyEntryCount: i.totalQty > 0 ? i.count : 0,
      totalQuantity: i.totalQty > 0 ? i.totalQty : null,
      quantifiedAmount: i.totalAmt,
      totalAmount: i.totalAmt,
      avgRate: i.totalQty > 0 ? i.totalAmt / i.totalQty : null,
      percentOfTotal: grandItemTotal > 0 ? Math.round((i.totalAmt / grandItemTotal) * 100) : 0,
    }));

    return {
      reportType,
      includeItemDetails,
      brand: {
        name: settings.display_name || brandData.name || 'CafeLedger',
        registrationNo: brandData.registration_no || '',
        primaryColor: settings.primary_color || brandData.primary_color || '#ea580c',
        secondaryColor: settings.secondary_color || brandData.secondary_color || '#9a3412',
        logoUrl: settings.logo_url || null,
        gstin: brandData.gstin || '',
        tagline: settings.tagline || '',
        pdfHeaderStyle: settings.pdf_header_style || 'left',
        pdfShowAddress: settings.pdf_show_address !== false,
        pdfShowGstin: settings.pdf_show_gstin !== false,
        pdfShowRegistrationNo: settings.pdf_show_registration_no !== false,
        pdfSignatureLine: Boolean(settings.pdf_signature_line),
      },
      shop: {
        name: shopData.name,
        code: shopData.code,
        address: shopData.address || null,
      },
      period: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      },
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      summary: {
        openingBalance: openBal,
        totalIncome: totIncome,
        totalExpense: totExpense,
        profitLoss: totIncome - totExpense,
        closingBalance: closeBal,
      },
      dailySummaries,
      transactions,
      salaryRecords,
      expenseCategories,
      itemSummaryRows,
      gst: params.gst && params.gst.value > 0 ? {
        type: params.gst.type,
        value: params.gst.value,
        ratePct: params.gst.type === 'percentage' ? params.gst.value : undefined,
        gstAmount: params.gst.type === 'percentage'
          ? Math.round(totIncome * (params.gst.value / 100) * 100) / 100
          : Math.round(params.gst.value * 100) / 100,
        subtotal: totIncome,
        grandTotal: Math.round((totIncome + (params.gst.type === 'percentage' ? totIncome * (params.gst.value / 100) : params.gst.value)) * 100) / 100,
      } : null,
    };
  } catch (err) {
    console.error('Failed to build report data:', err);
    return null;
  }
}

// -----------------------------------------------------------------------------
// BRAND CONSOLIDATED REPORT (All Shops)
// -----------------------------------------------------------------------------

export async function buildClientBrandConsolidatedReport(params: {
  brandId: string;
  shopId?: string;
  startDate: string;
  endDate: string;
  month?: string;
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
  gst?: { type: 'percentage' | 'amount'; value: number } | null;
}): Promise<BrandConsolidatedReportBundle | null> {
  const reportType: ReportKindOption = params.reportType || 'daily_summary';
  const shopFilter = params.shopId || 'all';
  const targetMonth = params.month || params.startDate.substring(0, 7);

  if (!isSupabaseConfigured()) {
    const brandShops = DEMO_ADMIN_SHOPS;
    const dailySummaries: ReportDailySummaryRow[] = [];
    const salaryRecords: ReportSalaryRow[] = [];

    const shopSummaries: Record<string, { income: number; expense: number; closing: number; opening: number }> = {};
    brandShops.forEach((s) => {
      shopSummaries[s.id] = {
        income: 520000,
        expense: 295000,
        closing: 225000,
        opening: 25000,
      };
    });

    const pdfData: BrandPdfData = {
      brand: {
        name: DEMO_BRAND.name,
        registrationNo: DEMO_BRAND.registration_no || '',
        logoUrl: DEMO_BRAND.logo_url || null,
        primaryColor: DEMO_BRAND.primary_color || '#ea580c',
        secondaryColor: DEMO_BRAND.secondary_color || '#9a3412',
        address: 'Bengaluru, India',
        gstin: '29ABCDE1234F1Z5',
        pdfHeaderStyle: 'left',
        pdfFooterText: 'Generated by CafeSync SaaS',
        pdfShowAddress: true,
        pdfShowGstin: true,
        pdfShowRegistrationNo: true,
        pdfSignatureLine: true,
      },
      period: {
        startDate: formatDate(params.startDate),
        endDate: formatDate(params.endDate),
      },
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportType,
      includeItemDetails: Boolean(params.includeItemDetails),
      shops: brandShops.map((s) => ({
        name: s.name,
        code: s.code,
        income: 520000,
        expense: 295000,
        net: 225000,
        closing: 225000,
        status: s.status,
      })),
      summary: {
        totalIncome: 520000 * brandShops.length,
        totalExpense: 295000 * brandShops.length,
        netProfit: (520000 - 295000) * brandShops.length,
        activeShopsCount: brandShops.length,
      },
    };

    return {
      pdfData,
      dailySummaries,
      salaryRecords,
    };
  }

  try {
    // 1. Fetch Brand & Brand Settings
    const [brandRes, settingsRes] = await Promise.all([
      (supabase as any).from('brands').select('*').eq('id', params.brandId).maybeSingle(),
      (supabase as any).from('brand_settings').select('*').eq('brand_id', params.brandId).maybeSingle(),
    ]);

    const brandData = (brandRes.data || {}) as any;
    const settings = (settingsRes.data || {}) as any;

    // 2. Fetch Shops
    let shopsQuery = (supabase as any)
      .from('shops')
      .select('id, name, code, status')
      .eq('brand_id', params.brandId)
      .order('name', { ascending: true });

    if (shopFilter !== 'all') {
      shopsQuery = shopsQuery.eq('id', shopFilter);
    }

    const { data: dbShops } = await shopsQuery;
    const shops = dbShops || [];
    const shopIds = shops.map((s: any) => s.id);

    const summariesByShop: Record<string, { income: number; expense: number; closing: number; opening: number }> = {};
    const dailyMap = new Map<string, { opening: number; income: number; expense: number; closing: number }>();
    let salaryRecords: ReportSalaryRow[] = [];

    if (shopIds.length > 0) {
      // 3. Fetch Daily Summaries
      const { data: dbSummaries } = await (supabase as any)
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

        const prev = dailyMap.get(s.summary_date) || { opening: 0, income: 0, expense: 0, closing: 0 };
        prev.opening += Number(s.opening) || 0;
        prev.income += Number(s.income) || 0;
        prev.expense += Number(s.expense) || 0;
        prev.closing += Number(s.closing) || 0;
        dailyMap.set(s.summary_date, prev);
      });

      // 4. Fetch Salary Records
      if (reportType === 'salary' || reportType === 'full') {
        const shopMap = new Map<string, any>(shops.map((s: any) => [s.id, s]));
        const { data: dbSal } = await (supabase as any)
          .from('salary_records')
          .select('shop_id, days_worked, rate_snapshot, gross, advances_total, paid_total, balance, employees(name, role_title)')
          .in('shop_id', shopIds)
          .eq('month', targetMonth);

        salaryRecords = (dbSal || []).map((sr: any) => {
          const s = shopMap.get(sr.shop_id);
          return {
            shopName: s?.name || 'Outlet',
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

    const dailySummaries: ReportDailySummaryRow[] = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, agg]) => ({
        date: formatDate(dateStr),
        opening: agg.opening,
        income: agg.income,
        expense: agg.expense,
        net: agg.income - agg.expense,
        closing: agg.closing,
      }));

    let grandOpening = 0;
    let grandIncome = 0;
    let grandExpense = 0;
    let grandClosing = 0;

    Object.values(summariesByShop).forEach((s) => {
      grandOpening += s.opening;
      grandIncome += s.income;
      grandExpense += s.expense;
      grandClosing += s.closing;
    });

    const pdfData: BrandPdfData = {
      brand: {
        name: settings.display_name || brandData.name || 'CafeLedger',
        registrationNo: brandData.registration_no || '',
        logoUrl: settings.logo_url || null,
        primaryColor: settings.primary_color || brandData.primary_color || '#ea580c',
        secondaryColor: settings.secondary_color || brandData.secondary_color || '#9a3412',
        address: brandData.address || '',
        gstin: brandData.gstin || '',
        pdfHeaderStyle: settings.pdf_header_style || 'left',
        pdfFooterText: settings.pdf_footer_text || '',
        pdfShowAddress: settings.pdf_show_address !== false,
        pdfShowGstin: settings.pdf_show_gstin !== false,
        pdfShowRegistrationNo: settings.pdf_show_registration_no !== false,
        pdfSignatureLine: Boolean(settings.pdf_signature_line),
      },
      period: {
        startDate: formatDate(params.startDate),
        endDate: formatDate(params.endDate),
      },
      generatedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reportType,
      includeItemDetails: Boolean(params.includeItemDetails),
      shops: shops.map((s: any) => {
        const sum = summariesByShop[s.id] || { income: 0, expense: 0, closing: 0 };
        return {
          name: s.name,
          code: s.code,
          income: sum.income,
          expense: sum.expense,
          net: sum.income - sum.expense,
          closing: sum.closing,
          status: s.status || 'active',
        };
      }),
      summary: {
        totalIncome: grandIncome,
        totalExpense: grandExpense,
        netProfit: grandIncome - grandExpense,
        activeShopsCount: shops.length,
      },
      salaryRecords,
      gst: params.gst && params.gst.value > 0 ? {
        type: params.gst.type,
        value: params.gst.value,
        ratePct: params.gst.type === 'percentage' ? params.gst.value : undefined,
        gstAmount: params.gst.type === 'percentage'
          ? Math.round(grandIncome * (params.gst.value / 100) * 100) / 100
          : Math.round(params.gst.value * 100) / 100,
        subtotal: grandIncome,
        grandTotal: Math.round((grandIncome + (params.gst.type === 'percentage' ? grandIncome * (params.gst.value / 100) : params.gst.value)) * 100) / 100,
      } : null,
    };

    return {
      pdfData,
      dailySummaries,
      salaryRecords,
      gst: pdfData.gst,
    };
  } catch (err) {
    console.error('Failed to build brand consolidated report:', err);
    return null;
  }
}
