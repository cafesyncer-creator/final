'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Store,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
import { Count, Money } from '@/components/shared/format-values';
import { formatCount } from '@/lib/calculations/format';
import { Button } from '@/components/ui/button';
import { DemoMasterBrand, DemoGlobalAuditLog } from '@/lib/demo-master-data';
import { resolveBrandLogoUrl, generateBrandSvgDataUri } from '@/lib/theme/brand-svg';

interface MasterDashboardViewProps {
  brands: DemoMasterBrand[];
  metrics: {
    totalBrands: number;
    activeBrands: number;
    suspendedBrands: number;
    totalShops: number;
    totalUsers: number;
    totalMonthlyVolume: number;
  };
  recentAuditLogs?: DemoGlobalAuditLog[];
  needsBackupReminder?: boolean;
}

export function MasterDashboardView({
  brands,
  metrics,
  needsBackupReminder,
}: MasterDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-800" />
            <span>Platform Master Administration</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cross-brand tenant orchestration, Brand Theme Studio, RLS isolation, and global audit oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/master/brands">
            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Onboard New Brand</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1.1 BACKUP REMINDER BANNER */}
      {needsBackupReminder && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Backup Reminder: No full platform backup has been taken in the last 7 days.</p>
              <p className="text-xs text-amber-700 mt-0.5">Regular disaster recovery archives safeguard tenant ledgers, configurations, and employee records.</p>
            </div>
          </div>
          <Link href="/master/backup" className="shrink-0">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs">
              Run Backup Now
            </Button>
          </Link>
        </div>
      )}

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Brands"
          value={metrics.totalBrands}
          valueType="count"
          subtitle={`${formatCount(metrics.activeBrands)} Active | ${formatCount(metrics.suspendedBrands)} Suspended`}
          icon={Building2}
          variant="highlight"
        />
        <StatCard
          title="Total Cafe Outlets"
          value={metrics.totalShops}
          valueType="count"
          subtitle="Operating across all brands"
          icon={Store}
          variant="default"
        />
        <StatCard
          title="Total Active Users"
          value={metrics.totalUsers}
          valueType="count"
          subtitle="Brand admins & shop managers"
          icon={Users}
          variant="income"
        />
        <StatCard
          title="Gross Monthly GMV"
          value={metrics.totalMonthlyVolume}
          valueType="money"
          subtitle="Consolidated cafe turnover"
          icon={Layers}
          variant="default"
        />
      </div>

      {/* 3. ACTIVE BRANDS PORTFOLIO TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              <span>Registered Franchise Brands</span>
            </h2>
            <p className="text-xs text-slate-500">
              Each brand operates in strict multi-tenant isolation with its own admins, outlets, and custom branding.
            </p>
          </div>

          <Link
            href="/master/brands"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View All Brands</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Brand & Registration</th>
                <th className="py-3 px-3">Colors</th>
                <th className="py-3 px-3 text-center">Outlets</th>
                <th className="py-3 px-3 text-center">Admins</th>
                <th className="py-3 px-3 text-right">Monthly GMV</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
                    No brands onboarded yet. Click <span className="font-semibold text-slate-700">Onboard New Brand</span> to create your first franchise brand.
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {b.logo_url ? (
                          <img
                            src={resolveBrandLogoUrl(b.logo_url, b.name, b.primary_color, b.secondary_color)}
                            alt={b.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = generateBrandSvgDataUri(b.name, b.primary_color, b.secondary_color);
                            }}
                            className="h-8 w-8 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                          />
                        ) : (
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                            style={{ backgroundColor: b.primary_color }}
                          >
                            {b.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/master/brands/${b.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1"
                          >
                            <span>{b.name}</span>
                            <ArrowUpRight className="h-3 w-3 opacity-40" />
                          </Link>
                          <span className="font-mono text-[10px] text-slate-400 block">{b.registration_no}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs inline-block"
                          style={{ backgroundColor: b.primary_color }}
                          title={`Primary: ${b.primary_color}`}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs inline-block"
                          style={{ backgroundColor: b.secondary_color }}
                          title={`Secondary: ${b.secondary_color}`}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      <Count value={b.shops_count} suffix="shops" />
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      <Count value={b.admins_count} suffix="admin" />
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      <Money value={b.monthly_volume} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/master/brands/${b.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <span>Manage</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

