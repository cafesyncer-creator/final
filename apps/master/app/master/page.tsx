'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { MasterDashboardView } from '@/components/master/master-dashboard-view';
import { getCurrentMonthKolkata, getMonthBounds } from '@/lib/calculations/dates';
import { DEMO_MASTER_BRANDS, DemoMasterBrand } from '@/lib/demo-master-data';
import { resolveBrandLogoUrl } from '@/lib/theme/brand-svg';
import { Loader2 } from 'lucide-react';

export default function MasterDashboardPage() {
  const { profile, isLive } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['master-dashboard', isLive],
    queryFn: async () => {
      if (!isLive) {
        const totalBrands = DEMO_MASTER_BRANDS.length;
        const activeBrands = DEMO_MASTER_BRANDS.filter((b) => b.status === 'active').length;
        const suspendedBrands = DEMO_MASTER_BRANDS.filter((b) => b.status === 'suspended').length;
        const totalShops = DEMO_MASTER_BRANDS.reduce((acc, b) => acc + b.shops_count, 0);
        const totalUsers = DEMO_MASTER_BRANDS.reduce((acc, b) => acc + b.admins_count + b.shops_count, 0);
        const totalMonthlyVolume = DEMO_MASTER_BRANDS.reduce((acc, b) => acc + b.monthly_volume, 0);

        return {
          brands: DEMO_MASTER_BRANDS,
          metrics: {
            totalBrands,
            activeBrands,
            suspendedBrands,
            totalShops,
            totalUsers,
            totalMonthlyVolume,
          },
          needsBackupReminder: false,
        };
      }

      const monthBounds = getMonthBounds(getCurrentMonthKolkata());

      const [
        { data: dbBrands, error: brandsErr },
        { data: dbSummaries },
        { count: activeUsersCount },
        { data: latestBackup },
      ] = await Promise.all([
        (supabase as any)
          .from('brands')
          .select('*, shops(id), profiles(id, full_name, username, phone, role, is_active), brand_settings(logo_url, primary_color, secondary_color)')
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('daily_summary')
          .select('shop_id, income')
          .gte('summary_date', monthBounds.start)
          .lte('summary_date', monthBounds.end),
        (supabase as any)
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .in('role', ['admin', 'manager'])
          .eq('is_active', true),
        (supabase as any)
          .from('backup_log')
          .select('created_at')
          .eq('scope', 'all')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (brandsErr) {
        console.error('Master dashboard brands query failed:', brandsErr);
      }

      let needsBackupReminder = false;
      if (!latestBackup || !latestBackup.created_at) {
        needsBackupReminder = true;
      } else {
        const lastBackupTime = new Date(latestBackup.created_at).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastBackupTime > sevenDaysMs) {
          needsBackupReminder = true;
        }
      }

      const shopToBrandMap = new Map<string, string>();
      (dbBrands || []).forEach((b: any) => {
        const brandShops = Array.isArray(b.shops) ? b.shops : [];
        brandShops.forEach((s: any) => {
          if (s?.id) shopToBrandMap.set(s.id, b.id);
        });
      });

      const monthlyVolumeByBrand = new Map<string, number>();
      (dbSummaries || []).forEach((sum: any) => {
        const bId = shopToBrandMap.get(sum.shop_id);
        if (!bId) return;
        monthlyVolumeByBrand.set(
          bId,
          (monthlyVolumeByBrand.get(bId) || 0) + (Number(sum.income) || 0)
        );
      });

      const brands: DemoMasterBrand[] = (dbBrands || []).map((b: any) => {
        const brandShops = Array.isArray(b.shops) ? b.shops : [];
        const brandProfiles = Array.isArray(b.profiles) ? b.profiles : [];
        const admins = brandProfiles.filter((p: any) => p.role === 'admin');
        const bs = Array.isArray(b.brand_settings) ? b.brand_settings[0] : b.brand_settings;

        return {
          id: b.id,
          name: b.name,
          slug: b.slug,
          registration_no: b.registration_no,
          logo_url: resolveBrandLogoUrl(bs?.logo_url ?? b.logo_url, b.name, b.primary_color, b.secondary_color),
          primary_color: bs?.primary_color || b.primary_color || '#ea580c',
          secondary_color: bs?.secondary_color || b.secondary_color || '#9a3412',
          address: b.address || '',
          phone: b.phone || '',
          email: b.email || '',
          gstin: b.gstin,
          status: b.status,
          created_at: b.created_at,
          shops_count: brandShops.length,
          admins_count: admins.length,
          monthly_volume: monthlyVolumeByBrand.get(b.id) || 0,
          admins: admins.map((a: any) => ({
            id: a.id,
            full_name: a.full_name,
            email: a.email || (a.username ? `${a.username}@${b.slug}.cafesync.app` : ''),
            phone: a.phone || '',
            is_active: a.is_active,
          })),
        };
      });

      const totalBrands = brands.length;
      const activeBrands = brands.filter((b) => b.status === 'active').length;
      const suspendedBrands = brands.filter((b) => b.status === 'suspended').length;
      const totalShops = brands.reduce((acc, b) => acc + b.shops_count, 0);
      const totalUsers =
        typeof activeUsersCount === 'number'
          ? activeUsersCount
          : brands.reduce((acc, b) => acc + b.admins_count + b.shops_count, 0);
      const totalMonthlyVolume = brands.reduce((acc, b) => acc + b.monthly_volume, 0);

      return {
        brands,
        metrics: {
          totalBrands,
          activeBrands,
          suspendedBrands,
          totalShops,
          totalUsers,
          totalMonthlyVolume,
        },
        needsBackupReminder,
      };
    },
  });

  const masterUser = {
    id: profile?.id,
    fullName: profile?.full_name || 'Platform Master',
    email: profile?.email || '',
    phone: profile?.phone || '',
    role: 'master' as const,
  };

  return (
    <SharedAppLayout user={masterUser}>
      {isLoading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#B9A58A] text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#C68846]" />
          <span>Loading platform administration dashboard...</span>
        </div>
      ) : (
        <MasterDashboardView
          brands={data.brands}
          needsBackupReminder={data.needsBackupReminder}
          metrics={data.metrics}
        />
      )}
    </SharedAppLayout>
  );
}
