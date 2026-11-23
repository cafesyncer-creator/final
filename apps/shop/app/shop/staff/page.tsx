'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { StaffSalaryManager, EmployeeSalaryItem } from '@/components/shop/staff-salary-manager';
import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getCurrentMonthKolkata, getPreviousMonth, getNextMonth, formatDisplayMonth } from '@/lib/calculations/dates';
import { DEMO_EMPLOYEES, DEMO_PAYMENT_MODES } from '@/lib/demo-shop-data';
import { Users, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function StaffSalaryContent() {
  const { profile, shop, brand } = useAuth();
  const searchParams = useSearchParams();

  const currentMonth = getCurrentMonthKolkata();
  const selectedMonth = searchParams.get('month') || currentMonth;
  const prevMonth = getPreviousMonth(selectedMonth);
  const nextMonth = getNextMonth(selectedMonth);

  const isLive = isSupabaseConfigured();
  const shopId = profile?.shop_id || shop?.id;
  const brandId = profile?.brand_id || brand?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['staff-salary', shopId, brandId, selectedMonth],
    queryFn: async () => {
      if (!isLive) {
        const salaryRecordMap: Record<string, any> = {};
        const employeesData: EmployeeSalaryItem[] = DEMO_EMPLOYEES.map((emp) => {
          const rate = Number(emp.rate_per_day ?? 0);
          const days = selectedMonth === currentMonth ? 26 : 28;
          const overtime = 0;
          const gross = Math.round((days * rate + overtime) * 100) / 100;
          const advances = 1500;
          const paid = 0;
          const balance = Math.round((gross - advances - paid) * 100) / 100;

          return {
            id: emp.id,
            name: emp.name,
            phone: emp.phone,
            role_title: emp.role_title,
            rate_per_day: rate,
            days_worked: days,
            overtime_pay: overtime,
            gross,
            advances_total: advances,
            paid_total: paid,
            balance,
          };
        });

        return {
          employeesData,
          paymentModes: DEMO_PAYMENT_MODES,
          isMonthClosed: false,
        };
      }

      const [empsRes, modesRes, recordsRes, monthRecRes] = await Promise.all([
        shopId
          ? supabase
              .from('employees')
              .select('id, name, phone, role_title, rate_per_day, is_active')
              .eq('shop_id', shopId)
              .eq('is_active', true)
              .order('name', { ascending: true })
          : Promise.resolve({ data: [] }),
        brandId
          ? supabase
              .from('payment_modes')
              .select('id, name')
              .eq('brand_id', brandId)
              .eq('is_active', true)
              .order('name', { ascending: true })
          : Promise.resolve({ data: [] }),
        shopId
          ? supabase
              .from('salary_records')
              .select('employee_id, days_worked, rate_snapshot, overtime_pay, gross, advances_total, paid_total, balance')
              .eq('shop_id', shopId)
              .eq('month', selectedMonth)
          : Promise.resolve({ data: [] }),
        shopId
          ? supabase
              .from('month_openings')
              .select('closed_at')
              .eq('shop_id', shopId)
              .eq('month', selectedMonth)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const rawEmployees = (empsRes as any)?.data || [];
      const paymentModes = (modesRes as any)?.data || [];
      const salaryRecordMap: Record<string, any> = {};
      ((recordsRes as any)?.data || []).forEach((r: any) => {
        salaryRecordMap[r.employee_id] = r;
      });

      const isMonthClosed = Boolean((monthRecRes as any)?.data?.closed_at);

      const employeesData: EmployeeSalaryItem[] = rawEmployees.map((emp: any) => {
        const rec = salaryRecordMap[emp.id];
        const rate = Number(rec?.rate_snapshot ?? emp.rate_per_day ?? 0);
        const days = rec ? Number(rec.days_worked || 0) : 0;
        const overtime = rec ? Number(rec.overtime_pay || 0) : 0;
        const gross = rec ? Number(rec.gross || 0) : Math.round((days * rate + overtime) * 100) / 100;
        const advances = rec ? Number(rec.advances_total || 0) : 0;
        const paid = Number(rec?.paid_total || 0);
        const balance = rec ? Number(rec.balance || 0) : Math.round((gross - advances - paid) * 100) / 100;

        return {
          id: emp.id,
          name: emp.name,
          phone: emp.phone,
          role_title: emp.role_title,
          rate_per_day: rate,
          days_worked: days,
          overtime_pay: overtime,
          gross,
          advances_total: advances,
          paid_total: paid,
          balance,
        };
      });

      return {
        employeesData,
        paymentModes,
        isMonthClosed,
      };
    },
  });

  const managerUser = {
    fullName: profile?.full_name || 'Shop Manager',
    email: profile?.email || '',
    phone: '',
    role: 'manager' as const,
    shopName: shop?.name || 'Shop Counter',
    shopCode: shop?.code || 'SHOP-01',
  };

  return (
    <SharedAppLayout user={managerUser} brand={brand as any}>
      <div className="space-y-6">
        {/* Header & Month Navigator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-[var(--brand-primary,#ea580c)]" />
              <span>Staff Attendance & Salary Ledger</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter days worked, issue advances, and track monthly salary balances.
            </p>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-2">
            <Link
              href={`/shop/staff?month=${prevMonth}`}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>

            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white min-w-[100px] text-center">
              {formatDisplayMonth(selectedMonth)}
            </span>

            <Link
              href={`/shop/staff?month=${nextMonth}`}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Staff Salary Component */}
        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-xs">Loading employee attendance...</span>
          </div>
        ) : (
          <StaffSalaryManager
            employees={data?.employeesData || []}
            selectedMonth={selectedMonth}
            paymentModes={data?.paymentModes || []}
            isMonthClosed={data?.isMonthClosed || false}
          />
        )}
      </div>
    </SharedAppLayout>
  );
}

export default function ShopStaffSalaryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading staff salary ledger...</div>}>
      <StaffSalaryContent />
    </Suspense>
  );
}
