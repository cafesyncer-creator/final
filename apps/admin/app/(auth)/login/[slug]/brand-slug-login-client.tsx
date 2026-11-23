'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
              status: (found.status as any) || 'active',
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

        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.brand_id) {
          if (isMounted) {
            setBrandLogin(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setBrandLogin({
            brand_id: row.brand_id,
            brand_name: row.brand_name || '',
            slug: row.slug || slugToUse,
            display_name: row.display_name || row.brand_name,
            tagline: row.tagline,
            welcome_message: row.welcome_message,
            logo_url: row.logo_url,
            logo_dark_url: row.logo_dark_url,
            icon_url: row.icon_url,
            login_bg_url: row.login_bg_url,
            login_bg_color: row.login_bg_color,
            primary_color: row.primary_color || '#ea580c',
            secondary_color: row.secondary_color || '#9a3412',
            accent_color: row.accent_color || '#f59e0b',
            font_family: row.font_family || 'Inter',
            radius: row.radius || 'rounded',
            default_mode: (row.default_mode as any) || 'light',
            login_layout: (row.login_layout as any) || 'split',
            login_logo_size: (row.login_logo_size as any) || 'md',
            status: (row.status as any) || 'active',
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load public brand info:', err);
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
  }, [effectiveSlug]);

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
      <div className="min-h-screen flex flex-col justify-between items-center p-4 bg-slate-50">
        <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Workspace Not Found</h1>
          <p className="text-sm text-slate-600 mb-6">
            We could not find an active brand workspace at <code className="bg-slate-200 px-1 py-0.5 rounded">/login/{effectiveSlug}</code>.
            Please verify the URL or sign in through the central portal.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950 underline underline-offset-4"
          >
            <ArrowLeft className="w-4 h-4" /> Central Sign In
          </Link>
        </div>
        <PoweredByFooter variant="brand" />
      </div>
    );
  }

  if (brandLogin.status === 'suspended') {
    return (
      <div className="min-h-screen flex flex-col justify-between items-center p-4 bg-slate-50">
        <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Workspace Suspended</h1>
          <p className="text-sm text-slate-600 mb-6">
            The workspace for <strong>{brandLogin.display_name}</strong> is currently suspended.
            Please contact support or the platform administrator to reactivate access.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-950 underline underline-offset-4"
          >
            <ArrowLeft className="w-4 h-4" /> Central Sign In
          </Link>
        </div>
        <PoweredByFooter variant="brand" />
      </div>
    );
  }

  const brandSettingsObj: any = {
    brand_id: brandLogin.brand_id,
    display_name: brandLogin.display_name,
    primary_color: brandLogin.primary_color,
    secondary_color: brandLogin.secondary_color,
    accent_color: brandLogin.accent_color,
    font_family: brandLogin.font_family,
    radius: brandLogin.radius,
    default_mode: brandLogin.default_mode,
  };

  const cssVars = buildBrandCssVariables(brandSettingsObj, brandLogin.default_mode || 'light');
  const inlineCss = cssVarsToStyleText(cssVars, [':root', '.brand-portal-root']);

  const demoAccounts: DemoQuickAccount[] = [];

  const primaryFg = pickReadableTextColor(brandLogin.primary_color);

  return (
    <>
      <style id="brand-dynamic-css" dangerouslySetInnerHTML={{ __html: inlineCss }} />
      <BrandLoginClient
        brandLogin={brandLogin}
        demoAccounts={demoAccounts}
        showDemoFill={false}
        primaryFg={primaryFg}
      />
    </>
  );
}

