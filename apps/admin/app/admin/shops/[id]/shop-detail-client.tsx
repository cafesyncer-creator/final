'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { ShopDetailView } from '@/components/admin/shop-detail-view';
import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getTodayKolkata, getCurrentMonthKolkata, getMonthBounds } from '@/lib/calculations/dates';
import { DEMO_ADMIN_SHOPS, DemoShop } from '@/lib/demo-admin-data';
import { DEMO_EMPLOYEES, DEMO_ASSETS, DEMO_PAYMENT_MODES } from '@/lib/demo-shop-data';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export function ShopDetailClient() {
  const { profile, brand } = useAuth();
  const searchParams = useSearchParams();
  const routeParams = useParams();

  const [shopId, setShopId] = useState<string>(() => {
    const raw = (routeParams?.id as string) || '';
    if (raw && raw !== '_placeholder') return raw;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/admin\/shops\/([^/]+)/);
      if (match && match[1] && match[1] !== '_placeholder') {
        return decodeURIComponent(match[1]);
      }
    }
    return '';
  });

  useEffect(() => {
    const raw = (routeParams?.id as string) || '';
    if (raw && raw !== '_placeholder') {
      setShopId(raw);
    } else if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/admin\/shops\/([^/]+)/);
      if (match && match[1] && match[1] !== '_placeholder') {
        setShopId(decodeURIComponent(match[1]));
      }
    }
  }, [routeParams]);

  const isLive = isSupabaseConfigured();
  const today = getTodayKolkata();
  const currentMonth = getCurrentMonthKolkata();
  const selectedDate = searchParams.get('date') || today;
  const selectedMonth = searchParams.get('month') || currentMonth;
  const bounds = getMonthBounds(selectedMonth);

  const brandId = profile?.brand_id || brand?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-shop-detail', shopId, selectedDate, selectedMonth, brandId],
    queryFn: async () => {
      if (!isLive) {
        const demoShop = DEMO_ADMIN_SHOPS.find((s) => s.id === shopId) || DEMO_ADMIN_SHOPS[0];
        const days: any[] = [];
        let curBal = 18500;
        for (let i = 1; i <= 28; i++) {
          const dStr = `${selectedMonth}-${String(i).padStart(2, '0')}`;
          const inc = 15000 + ((i * 450) % 8000);
          const exp = 6500 + ((i * 300) % 4000);
          const cl = curBal + inc - exp;
          days.push({
            date: dStr,
            opening: curBal,
            income: inc,
            expense: exp,
            closing: cl,
            profit_loss: inc - exp,
            has_entries: true,
          });
          curBal = cl;
        }

        return {
          shop: demoShop,
          dailySummary: { opening: 18500, income: 24200, expense: 8400, closing: 34300 },
          transactions: [
            {
              id: 'demo-1',
              txn_date: selectedDate,
              kind: 'income',
              amount: 8500,
              item_name_snapshot: 'Counter Sales',
              mode_name_snapshot: 'CASH',
              note: 'Morning session',
              created_at: new Date().toISOString(),
            },
          ],
          monthSummary: {
            opening: 18500,
            income: 585000,
            expense: 285000,
            profit_loss: 300000,
            closing: 318500,
            days,
            paymentModes: [
              { mode_id: 'cash', mode_name: 'Cash', total_amount: 320000, percentage: 55 },
              { mode_id: 'upi', mode_name: 'UPI / QR', total_amount: 265000, percentage: 45 },
            ],
            topExpenseCategories: [
              { category: 'Dairy & Milk', total_amount: 120000, percentage: 42 },
              { category: 'Coffee Beans', total_amount: 85000, percentage: 30 },
              { category: 'Staff Advance', total_amount: 45000, percentage: 16 },
              { category: 'Supplies', total_amount: 35000, percentage: 12 },
            ],
          },
          employees: DEMO_EMPLOYEES.map((e) => ({
            id: e.id,
            employee_id: e.id,
            name: e.name,
            role_title: e.role_title,
            rate_per_day: e.rate_per_day,
            days_worked: 26,
            gross: e.rate_per_day * 26,
            advances_total: 1500,
            paid_total: e.rate_per_day * 26 - 1500,
            balance: 0,
            is_active: e.is_active,
          })),
          assets: DEMO_ASSETS,
          paymentModes: DEMO_PAYMENT_MODES,
        };
      }

      // Live Supabase Queries
      const [
        { data: dbShop },
        { data: dbDaySummary },
        { data: dbTxns },
        { data: dbMonthSummaries },
        { data: mo },
        { data: monthTxns },
        { data: dbEmps },
        { data: dbAssets },
        { data: dbModes },
      ] = await Promise.all([
        (supabase as any)
          .from('shops')
          .select('*, profiles!shop_id(id, full_name, phone)')
          .eq('id', shopId)
          .maybeSingle(),
        (supabase as any)
          .from('daily_summary')
          .select('*')
          .eq('shop_id', shopId)
          .eq('summary_date', selectedDate)
          .maybeSingle(),
        (supabase as any)
          .from('transactions')
          .select('*')
          .eq('shop_id', shopId)
          .eq('txn_date', selectedDate)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('daily_summary')
          .select('*')
          .eq('shop_id', shopId)
          .gte('summary_date', bounds.start)
          .lte('summary_date', bounds.end)
          .order('summary_date', { ascending: true }),
        (supabase as any)
          .from('month_openings')
          .select('opening_balance')
          .eq('shop_id', shopId)
          .eq('month', selectedMonth)
          .maybeSingle(),
        (supabase as any)
          .from('transactions')
          .select('kind, amount, item_name_snapshot, mode_name_snapshot')
          .eq('shop_id', shopId)
          .gte('txn_date', bounds.start)
          .lte('txn_date', bounds.end)
          .eq('is_deleted', false),
        (supabase as any)
          .from('employees')
          .select('*, salary_records(*)')
          .eq('shop_id', shopId)
          .eq('is_active', true),
        (supabase as any)
          .from('assets')
          .select('*, asset_service_logs(*)')
          .eq('shop_id', shopId),
        (supabase as any)
          .from('payment_modes')
          .select('*')
          .eq('brand_id', brandId || '')
          .order('name', { ascending: true }),
      ]);

      if (!dbShop) return null;

      const shop: DemoShop = {
        id: dbShop.id,
        brand_id: dbShop.brand_id,
        name: dbShop.name,
        code: dbShop.code,
        address: dbShop.address || '',
        phone: dbShop.phone || '',
        status: dbShop.status,
        created_at: dbShop.created_at,
        managers: Array.isArray(dbShop.profiles)
          ? dbShop.profiles.map((p: any) => ({
              id: p.id,
              full_name: p.full_name,
              phone: p.phone,
              email: '',
            }))
          : [],
      };

      const dailySummary = {
        opening: Number(dbDaySummary?.opening) || 0,
        income: Number(dbDaySummary?.income) || 0,
        expense: Number(dbDaySummary?.expense) || 0,
        closing: Number(dbDaySummary?.closing) || 0,
      };

      let mIncome = 0;
      let mExpense = 0;
      const days = (dbMonthSummaries || []).map((ds: any) => {
        const inc = Number(ds.income) || 0;
        const exp = Number(ds.expense) || 0;
        mIncome += inc;
        mExpense += exp;
        return {
          date: ds.summary_date,
          opening: Number(ds.opening) || 0,
          income: inc,
          expense: exp,
          closing: Number(ds.closing) || 0,
          profit_loss: inc - exp,
          has_entries: inc > 0 || exp > 0,
        };
      });

      const mOpening =
        mo?.opening_balance !== undefined
          ? Number(mo.opening_balance)
          : days.length > 0
          ? days[0].opening
          : 0;
      const mClosing = days.length > 0 ? days[days.length - 1].closing : mOpening + mIncome - mExpense;

      // Aggregations for Month Summary
      const modeMap = new Map<string, number>();
      const catMap = new Map<string, number>();
      (monthTxns || []).forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        if (t.kind === 'income') {
          const mode = t.mode_name_snapshot || 'Cash';
          modeMap.set(mode, (modeMap.get(mode) || 0) + amt);
        } else if (t.kind === 'expense') {
          const cat = t.item_name_snapshot ? t.item_name_snapshot.split(' - ')[0] || 'General' : 'General';
          catMap.set(cat, (catMap.get(cat) || 0) + amt);
        }
      });

      const paymentModes: any[] = Array.from(modeMap.entries()).map(([mode_name, total_amount]) => ({
        mode_id: mode_name,
        mode_name,
        total_amount,
        percentage: mIncome > 0 ? Math.round((total_amount / mIncome) * 100) : 0,
      }));

      const topExpenseCategories: any[] = Array.from(catMap.entries()).map(([category, total_amount]) => ({
        category,
        total_amount,
        percentage: mExpense > 0 ? Math.round((total_amount / mExpense) * 100) : 0,
      }));

      const monthSummary = {
        opening: mOpening,
        income: mIncome,
        expense: mExpense,
        profit_loss: mIncome - mExpense,
        closing: mClosing,
        days,
        paymentModes,
        topExpenseCategories,
      };

      const employees: any[] = (dbEmps || []).map((e: any) => {
        const rec = Array.isArray(e.salary_records)
          ? e.salary_records.find((r: any) => r.month === selectedMonth)
          : null;
        return {
          id: e.id,
          employee_id: e.id,
          name: e.name,
          role_title: e.role_title,
          rate_per_day: Number(e.rate_per_day),
          days_worked: Number(rec?.days_worked) || 0,
          overtime_pay: Number(rec?.overtime_pay) || 0,
          gross: Number(rec?.gross) || 0,
          advances_total: Number(rec?.advances_total) || 0,
          paid_total: Number(rec?.paid_total) || 0,
          balance: Number(rec?.balance) || 0,
          is_active: e.is_active,
        };
      });

      const assets: any[] = (dbAssets || []).map((a: any) => ({
        ...a,
        service_logs: a.asset_service_logs || [],
      }));

      return {
        shop,
        dailySummary,
        transactions: dbTxns || [],
        monthSummary,
        employees,
        assets,
        paymentModes: dbModes || [],
      };
    },
    enabled: Boolean(shopId),
  });

  const adminUser = {
    id: profile?.id,
    fullName: profile?.full_name || 'Admin',
    email: profile?.email || '',
    username: profile?.username,
    phone: profile?.phone || '',
    role: 'admin' as const,
    brandId: profile?.brand_id,
  };

  return (
    <SharedAppLayout user={adminUser} brand={brand as any}>
      {isLoading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary,#ea580c)]" />
          <span>Loading outlet details...</span>
        </div>
      ) : (
        <ShopDetailView
          shop={data.shop}
          date={selectedDate}
          month={selectedMonth}
          dailySummary={data.dailySummary}
          transactions={data.transactions}
          monthSummary={data.monthSummary}
          employees={data.employees}
          assets={data.assets}
          paymentModes={data.paymentModes}
          brandName={brand?.name || 'CafeLedger'}
        />
      )}
    </SharedAppLayout>
  );
}

