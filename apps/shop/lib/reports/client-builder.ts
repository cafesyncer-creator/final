import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const supabase = createClient();
import { formatDate } from '@/lib/calculations/dates';
import { calculatePeriodSummary } from '@/lib/calculations/financials';
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
} from '@/lib/reports/types';
import type { ItemSummaryRow, GroupedItemDetailsGroup } from '@/lib/reports/item-wise';

export interface ClientReportBuildParams {
  shopId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  month?: string;    // YYYY-MM
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
  gst?: { type: 'percentage' | 'amount'; value: number } | null;
}

export async function buildClientReportData(
  params: ClientReportBuildParams
): Promise<ReportData | null> {
  const { shopId, startDate, endDate, reportType = 'full', includeItemDetails = false } = params;

  if (!isSupabaseConfigured()) {
    // Local demo data generator
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

    let demoGstInfo = null;
    if (params.gst && params.gst.value > 0) {
      const subtotal = totInc;
      const gstAmount =
        params.gst.type === 'percentage'
          ? Math.round(subtotal * (params.gst.value / 100) * 100) / 100
          : Math.round(params.gst.value * 100) / 100;
      demoGstInfo = {
        type: params.gst.type,
        value: params.gst.value,
        ratePct: params.gst.type === 'percentage' ? params.gst.value : undefined,
        gstAmount,
        subtotal,
        grandTotal: Math.round((subtotal + gstAmount) * 100) / 100,
      };
    }

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
      gst: demoGstInfo,
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

    // Aggregate Expense by category
    const catMap = new Map<string, number>();
    let totalExpCalc = 0;
    (txnsData || []).forEach((t: any) => {
      if (t.kind === 'expense') {
        const amt = Number(t.amount) || 0;
        totalExpCalc += amt;
        const cat = t.item_name_snapshot ? 'Supplies' : 'General';
        catMap.set(cat, (catMap.get(cat) || 0) + amt);
      }
    });

    const expenseCategories: ReportExpenseCategoryRow[] = Array.from(catMap.entries()).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalExpCalc > 0 ? Math.round((amt / totalExpCalc) * 100) : 0,
    }));

    // Build Salary rows
    const empMap = new Map<string, any>(((empRes as any)?.data || []).map((e: any) => [e.id, e]));
    const salaryRecords: ReportSalaryRow[] = ((salaryRes as any)?.data || []).map((s: any) => {
      const emp = empMap.get(s.employee_id);
      return {
        shopName: shopData.name,
        employee: emp?.name || 'Staff Member',
        role: emp?.role_title || 'Staff',
        days: Number(s.days_worked || 0),
        rate: Number(s.rate_snapshot || emp?.rate_per_day || 0),
        gross: Number(s.gross || 0),
        advances: Number(s.advances_total || 0),
        paid: Number(s.paid_total || 0),
        balance: Number(s.balance || 0),
      };
    });

    // Build Item Summaries
    const itemMap = new Map<string, ItemSummaryRow>();
    let grandItemAmt = 0;
    (txnsData || []).forEach((t: any) => {
      grandItemAmt += Number(t.amount) || 0;
      const key = t.item_id || t.item_name_snapshot || 'other';
      const name = t.item_name_snapshot || 'Other';
      const amt = Number(t.amount) || 0;
      const qty = t.quantity ? Number(t.quantity) : null;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          itemKey: key,
          itemId: t.item_id || null,
          itemName: name,
          category: 'Operations',
          kind: t.kind as 'income' | 'expense',
          unit: t.unit_snapshot || 'pcs',
          purchaseCount: 1,
          qtyEntryCount: qty ? 1 : 0,
          totalQuantity: qty,
          quantifiedAmount: qty ? amt : 0,
          totalAmount: amt,
          avgRate: qty && qty > 0 ? amt / qty : null,
          percentOfTotal: 0,
        });
      } else {
        const existing = itemMap.get(key)!;
        existing.purchaseCount += 1;
        existing.totalAmount += amt;
        if (qty) {
          existing.qtyEntryCount += 1;
          existing.quantifiedAmount += amt;
          existing.totalQuantity = (existing.totalQuantity || 0) + qty;
        }
        if (existing.totalQuantity && existing.totalQuantity > 0) {
          existing.avgRate = existing.quantifiedAmount / existing.totalQuantity;
        }
      }
    });

    const itemSummaryRows: ItemSummaryRow[] = Array.from(itemMap.values()).map((row) => ({
      ...row,
      percentOfTotal: grandItemAmt > 0 ? Math.round((row.totalAmount / grandItemAmt) * 100) : 0,
    }));

    const totalIncome = (txnsData || [])
      .filter((t: any) => t.kind === 'income')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const totalExpense = (txnsData || [])
      .filter((t: any) => t.kind === 'expense')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const openingBalance = dailySummaries.length > 0 ? dailySummaries[0].opening : 0;
    const closingBalance = dailySummaries.length > 0 ? dailySummaries[dailySummaries.length - 1].closing : openingBalance + totalIncome - totalExpense;

    let gstInfo = null;
    if (params.gst && params.gst.value > 0) {
      const subtotal = totalIncome;
      const gstAmount =
        params.gst.type === 'percentage'
          ? Math.round(subtotal * (params.gst.value / 100) * 100) / 100
          : Math.round(params.gst.value * 100) / 100;
      gstInfo = {
        type: params.gst.type,
        value: params.gst.value,
        ratePct: params.gst.type === 'percentage' ? params.gst.value : undefined,
        gstAmount,
        subtotal,
        grandTotal: Math.round((subtotal + gstAmount) * 100) / 100,
      };
    }

    return {
      reportType,
      includeItemDetails,
      brand: {
        name: settings?.display_name || brandData?.name || 'CafeSync',
        registrationNo: brandData?.registration_no || '',
        primaryColor: settings?.primary_color || '#ea580c',
        secondaryColor: settings?.secondary_color || '#9a3412',
        logoUrl: settings?.logo_url || null,
        gstin: brandData?.gstin || null,
        tagline: settings?.tagline || null,
        pdfHeaderStyle: settings?.pdf_header_style || 'left',
        pdfShowAddress: settings?.pdf_show_address ?? true,
        pdfShowGstin: settings?.pdf_show_gstin ?? true,
        pdfShowRegistrationNo: settings?.pdf_show_reg_no ?? true,
        pdfSignatureLine: settings?.pdf_signature_line ?? true,
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
        openingBalance,
        totalIncome,
        totalExpense,
        profitLoss: totalIncome - totalExpense,
        closingBalance,
      },
      dailySummaries,
      transactions,
      salaryRecords,
      expenseCategories,
      itemSummaryRows,
      gst: gstInfo,
    };
  } catch (err) {
    console.error('Failed to build client report data:', err);
    return null;
  }
}
