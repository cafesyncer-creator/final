'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { BrandsList } from '@/components/master/brands-list';
import { getCurrentMonthKolkata, getMonthBounds } from '@/lib/calculations/dates';
import { DEMO_MASTER_BRANDS, DemoMasterBrand } from '@/lib/demo-master-data';
import { resolveBrandLogoUrl } from '@/lib/theme/brand-svg';
import { Loader2 } from 'lucide-react';

export default function MasterBrandsPage() {
  const { profile, isLive } = useAuth();

  const { data: brands, isLoading } = useQuery({
    queryKey: ['master-brands', isLive],
    queryFn: async () => {
      if (!isLive) {
        return [];
      }

      const monthBounds = getMonthBounds(getCurrentMonthKolkata());

      const [
        { data: dbBrands, error: brandsErr },
        { data: dbSummaries },
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
      ]);

      if (brandsErr) {
        console.error('Master brands query failed:', brandsErr);
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

      return (dbBrands || []).map((b: any) => {
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
      {isLoading || !brands ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#B9A58A] text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#C68846]" />
          <span>Loading franchise brand portfolio...</span>
        </div>
      ) : (
        <BrandsList initialBrands={brands} />
      )}
    </SharedAppLayout>
  );
}
