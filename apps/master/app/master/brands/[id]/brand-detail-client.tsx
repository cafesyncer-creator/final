'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { SharedAppLayout } from '@/components/shared/layout-wrapper';
import { BrandDetailView } from '@/components/master/brand-detail-view';
import { DEMO_MASTER_BRANDS, DemoMasterBrand } from '@/lib/demo-master-data';
import { resolveBrandLogoUrl } from '@/lib/theme/brand-svg';
import { DEMO_ADMIN_SHOPS } from '@/lib/demo-admin-data';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function BrandDetailClient() {
  const params = useParams();
  const { profile, isLive } = useAuth();

  const brandId = useMemo(() => {
    let raw = (params?.id as string) || '';
    if (!raw || raw === '_placeholder') {
      if (typeof window !== 'undefined') {
        const parts = window.location.pathname.split('/').filter(Boolean);
        // /master/brands/<id>/ -> index of 'brands' is 1, id is index 2
        const bIdx = parts.indexOf('brands');
        if (bIdx !== -1 && parts[bIdx + 1] && parts[bIdx + 1] !== '_placeholder') {
          raw = parts[bIdx + 1];
        }
      }
    }
    return raw;
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ['master-brand-detail', brandId, isLive],
    queryFn: async () => {
      if (!isLive) {
        const baseDemo = DEMO_MASTER_BRANDS.find((b) => b.id === brandId) || DEMO_MASTER_BRANDS[0];
        const shops = DEMO_ADMIN_SHOPS.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          address: s.address,
          phone: s.phone,
          status: s.status,
        }));
        return {
          brand: baseDemo,
          shops,
          managersCount: 10,
          lastActivity: '5 mins ago',
        };
      }

      if (!brandId || brandId === '_placeholder') {
        return null;
      }

      const [
        { data: dbBrand, error: brandErr },
        { data: dbShops },
        { data: recentAudit },
      ] = await Promise.all([
        (supabase as any)
          .from('brands')
          .select('*, profiles(id, full_name, username, phone, role, is_active), brand_settings(logo_url, primary_color, secondary_color)')
          .eq('id', brandId)
          .maybeSingle(),
        (supabase as any)
          .from('shops')
          .select('*')
          .eq('brand_id', brandId)
          .order('name', { ascending: true }),
        (supabase as any)
          .from('audit_log')
          .select('created_at')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (brandErr) console.error('Brand detail load error:', brandErr);
      if (!dbBrand) return null;

      const brandProfiles = Array.isArray(dbBrand.profiles) ? dbBrand.profiles : [];
      const admins = brandProfiles.filter((p: any) => p.role === 'admin');
      const managers = brandProfiles.filter((p: any) => p.role === 'manager' && p.is_active);
      const bs = Array.isArray(dbBrand.brand_settings) ? dbBrand.brand_settings[0] : dbBrand.brand_settings;

      const brandRecord: DemoMasterBrand = {
        id: dbBrand.id,
        name: dbBrand.name,
        slug: dbBrand.slug,
        registration_no: dbBrand.registration_no,
        logo_url: resolveBrandLogoUrl(bs?.logo_url ?? dbBrand.logo_url, dbBrand.name, dbBrand.primary_color, dbBrand.secondary_color),
        primary_color: bs?.primary_color || dbBrand.primary_color || '#ea580c',
        secondary_color: bs?.secondary_color || dbBrand.secondary_color || '#9a3412',
        address: dbBrand.address || '',
        phone: dbBrand.phone || '',
        email: dbBrand.email || '',
        gstin: dbBrand.gstin,
        status: dbBrand.status,
        created_at: dbBrand.created_at,
        shops_count: (dbShops || []).length,
        admins_count: admins.length,
        monthly_volume: 0,
        admins: admins.map((a: any) => ({
          id: a.id,
          full_name: a.full_name,
          email: a.email || (a.username ? `${a.username}@${dbBrand.slug}.cafesync.app` : ''),
          phone: a.phone || '',
          is_active: a.is_active,
        })),
      };

      const shops = (dbShops || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        address: s.address || '',
        phone: s.phone || '',
        status: s.status || 'active',
      }));

      const lastActivity = recentAudit?.created_at
        ? new Date(recentAudit.created_at).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : 'No activity yet';

      return {
        brand: brandRecord,
        shops,
        managersCount: managers.length,
        lastActivity,
      };
    },
    enabled: Boolean(brandId || !isLive),
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
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#B9A58A] text-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#C68846]" />
          <span>Loading brand configuration &amp; outlet directory...</span>
        </div>
      ) : !data || !data.brand ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-[#B9A58A]">Brand not found or invalid identifier.</p>
          <Link href="/master/brands">
            <Button size="sm" variant="outline" className="border-[#4A2F25] text-[#F7E5BC] hover:bg-[#4A2F25]">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Brands List
            </Button>
          </Link>
        </div>
      ) : (
        <BrandDetailView
          brand={data.brand}
          shops={data.shops}
          managersCount={data.managersCount}
          lastActivity={data.lastActivity}
        />
      )}
    </SharedAppLayout>
  );
}

