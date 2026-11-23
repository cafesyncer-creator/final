'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DEMO_USERS, DEMO_BRANDS } from '@/lib/demo-data';
import { buildBrandCssVariables, cssVarsToStyleText } from '@/lib/theme/css-vars';
import { pickReadableTextColor } from '@/lib/theme/colors';
import { BrandLoginClient, type DemoQuickAccount } from './brand-login-client';
import { PoweredByFooter } from '@/components/shared/powered-by-footer';
import { AlertTriangle, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import type { PublicBrandLoginData } from '@/lib/theme/types';

export default function BrandSlugLoginClient() {
  const params = useParams();
  const pathname = usePathname();

  // Extract slug from params or fallback from window.location/pathname for Cloudflare Pages rewrite
  const rawParamSlug = (params?.slug as string) || '';
  const [effectiveSlug, setEffectiveSlug] = useState<string>(() => {
    if (rawParamSlug && rawParamSlug !== '_placeholder') return rawParamSlug;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/login\/([^/?#]+)/);
      if (match && match[1] && match[1] !== '_placeholder') {
        return decodeURIComponent(match[1]);
      }
    }
    return rawParamSlug;
  });

  const [loading, setLoading] = useState(true);
  const [brandLogin, setBrandLogin] = useState<PublicBrandLoginData | null>(null);

  useEffect(() => {
    let slugToUse = effectiveSlug;
    if (!slugToUse || slugToUse === '_placeholder') {
      if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/\/login\/([^/?#]+)/);
        if (match && match[1] && match[1] !== '_placeholder') {
          slugToUse = decodeURIComponent(match[1]);
          setEffectiveSlug(slugToUse);
        }
      }
    }

    if (!slugToUse || slugToUse === '_placeholder') {
      if (typeof window !== 'undefined') {
        window.location.replace('/login/');
      }
      return;
    }

    let isMounted = true;

    async function loadBrand() {
      setLoading(true);

      if (!isSupabaseConfigured()) {
        const found = (DEMO_BRANDS as any[]).find(
          (b: any) => b.slug.toLowerCase() === slugToUse.toLowerCase()
        );
        if (isMounted) {
          if (found) {
            setBrandLogin({
              brand_id: found.id,
              brand_name: found.name,
              slug: found.slug,
              display_name: found.name,
              tagline: 'Artisanal Coffee & Roastery',
              primary_color: found.primaryColor || '#ea580c',
              secondary_color: found.secondaryColor || '#9a3412',
              accent_color: '#f59e0b',
              font_family: 'Inter',
              radius: 'rounded',
              default_mode: 'light',
              login_layout: 'split',
              login_logo_size: 'lg',
              login_bg_url: null,
              login_bg_color: null,
              logo_dark_url: null,
              logo_url: found.logo_url || null,
              icon_url: null,
              welcome_message: `Welcome to ${found.name}`,
              status: found.status as 'active' | 'suspended',
            });
          } else {
            setBrandLogin(null);
          }
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await (supabase as any).rpc('get_public_brand_theme', {
          p_slug: slugToUse,
        });

        if (error || !data) {
          if (isMounted) {
            setBrandLogin(null);
            setLoading(false);
          }
          return;
        }

        const bData = data as any;
        if (isMounted) {
          setBrandLogin({
            brand_id: bData.brand_id || '',
            brand_name: bData.name || '',
            slug: bData.slug || slugToUse,
            display_name: bData.display_name || bData.name || '',
            tagline: bData.tagline || '',
            primary_color: bData.primary_color || '#ea580c',
            secondary_color: bData.secondary_color || '#9a3412',
            accent_color: bData.accent_color || '#f59e0b',
            font_family: bData.font_family || 'Inter',
            radius: bData.radius || 'rounded',
            default_mode: bData.default_mode || 'light',
            login_layout: (bData.login_layout as any) || 'split',
            login_logo_size: (bData.login_logo_size as any) || 'lg',
            login_bg_url: bData.login_bg_url || null,
            login_bg_color: bData.login_bg_color || null,
            logo_dark_url: bData.logo_dark_url || null,
            welcome_message: bData.welcome_message || `Welcome to ${bData.display_name || bData.name}`,
            status: bData.status || 'active',
            logo_url: bData.logo_url || null,
            icon_url: bData.icon_url || null,
          });
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setBrandLogin(null);
          setLoading(false);
        }
      }
    }

    loadBrand();

    return () => {
      isMounted = false;
    };
  }, [effectiveSlug, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="text-sm font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  // Neutral "Brand not found" screen for unknown slugs
  if (!brandLogin) {
    if (effectiveSlug === '_placeholder') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="text-sm font-medium">Redirecting to login...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col justify-between items-center bg-slate-50 p-4">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900">Brand Not Found</h1>
              <p className="text-sm text-slate-500">
                No active cafe organization matches the link{' '}
                <span className="font-mono text-slate-700">/login/{effectiveSlug}</span>. Please check the URL shared by your administrator.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Go to Platform Login</span>
            </Link>
          </div>
        </div>
        <PoweredByFooter variant="brand" />
      </div>
    );
  }

  // Suspended brand notice
  if (brandLogin.status === 'suspended') {
    return (
      <div className="min-h-screen flex flex-col justify-between items-center bg-slate-50 p-4">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900">
                {brandLogin.display_name} Portal Suspended
              </h1>
              <p className="text-sm text-slate-500">
                Access for this organization has been temporarily suspended by Platform Administration.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Login Hub</span>
            </Link>
          </div>
        </div>
        <PoweredByFooter variant="brand" />
      </div>
    );
  }

  const cssVars = buildBrandCssVariables(
    {
      primary_color: brandLogin.primary_color,
      secondary_color: brandLogin.secondary_color,
      accent_color: brandLogin.accent_color,
      font_family: brandLogin.font_family,
      radius: brandLogin.radius,
      sidebar_style: 'light',
      density: 'comfortable',
      default_mode: brandLogin.default_mode,
    },
    brandLogin.default_mode
  );
  const inlineCss = cssVarsToStyleText(cssVars, [':root', '.brand-portal-root']);
  const primaryFg = pickReadableTextColor(brandLogin.primary_color, '#ffffff', '#0f172a');

  const showDemoFill = !isSupabaseConfigured();
  const demoAccounts: DemoQuickAccount[] = showDemoFill
    ? Object.values(DEMO_USERS)
        .filter(
          (u) => u.role !== 'master' && u.brand?.id === brandLogin.brand_id
        )
        .map((u) => ({
          email: u.email,
          role: u.role,
          label:
            u.role === 'admin'
              ? `🏢 ${u.fullName} (Admin)`
              : `☕ ${u.shop?.name || u.fullName} (Manager)`,
        }))
    : [];

  return (
    <>
      <style
        id="brand-login-ssr-theme"
        dangerouslySetInnerHTML={{ __html: inlineCss }}
      />
      <div
        className="brand-portal-root min-h-screen"
        data-brand-mode={brandLogin.default_mode}
        data-brand-radius={brandLogin.radius}
        style={cssVars as React.CSSProperties}
      >
        <BrandLoginClient
          brandLogin={brandLogin}
          demoAccounts={demoAccounts}
          showDemoFill={showDemoFill}
          primaryFg={primaryFg}
        />
      </div>
    </>
  );
}
