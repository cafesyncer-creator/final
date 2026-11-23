'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { loginWithCredentials } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  User,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { PublicBrandLoginData } from '@/lib/theme/types';
import { PoweredByFooter } from '@/components/shared/powered-by-footer';

export interface DemoQuickAccount {
  email: string;
  label: string;
  role: string;
}

function LogoBadge({
  logoUrl,
  alt,
  size,
  primaryColor,
  primaryFg,
}: {
  logoUrl?: string | null;
  alt: string;
  size: 'sm' | 'md' | 'lg';
  primaryColor: string;
  primaryFg: string;
}) {
  const [imgErr, setImgErr] = useState(false);

  const heightCls =
    size === 'sm' ? 'h-12' : size === 'lg' ? 'h-24' : 'h-16';
  const boxCls =
    size === 'sm'
      ? 'h-12 w-12 text-lg'
      : size === 'lg'
        ? 'h-24 w-24 text-3xl'
        : 'h-16 w-16 text-2xl';

  if (logoUrl && !imgErr) {
    return (
      <img
        src={logoUrl}
        alt={alt}
        onError={() => setImgErr(true)}
        className={`${heightCls} max-w-[220px] w-auto object-contain drop-shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${boxCls} flex items-center justify-center font-extrabold rounded-[var(--radius-btn,0.5rem)] shadow-md`}
      style={{ backgroundColor: primaryColor, color: primaryFg }}
    >
      {(alt || 'B').trim().charAt(0).toUpperCase()}
    </div>
  );
}

function BrandLoginInner({
  brandLogin,
  demoAccounts,
  showDemoFill,
  primaryFg,
}: {
  brandLogin: PublicBrandLoginData;
  demoAccounts: DemoQuickAccount[];
  showDemoFill: boolean;
  primaryFg: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get('redirect') || '';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const brandName = brandLogin.display_name || brandLogin.brand_name;
  const isDarkDefault = brandLogin.default_mode === 'dark';
  const displayLogo =
    isDarkDefault && brandLogin.logo_dark_url
      ? brandLogin.logo_dark_url
      : brandLogin.logo_url;

  const errorMessage =
    customError ||
    (errorParam === 'inactive_account'
      ? 'Your account has been deactivated. Please contact your brand administrator.'
      : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setCustomError(null);

    try {
      const res = await loginWithCredentials(email, password, brandLogin.brand_id);
      if (!res.success) {
        setCustomError(res.error || 'Authentication failed. Please check your credentials.');
        setIsPending(false);
        return;
      }

      if (res.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      const dest = redirectParam || '/admin/';
      window.location.href = dest;
    } catch (err: any) {
      setCustomError(err?.message || 'Unexpected login error.');
      setIsPending(false);
    }
  };

  const bgStyle: React.CSSProperties = brandLogin.login_bg_url
    ? {
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.65)), url("${brandLogin.login_bg_url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : brandLogin.login_bg_color
      ? { backgroundColor: brandLogin.login_bg_color }
      : {
          background: `linear-gradient(135deg, ${brandLogin.primary_color}18 0%, ${brandLogin.secondary_color}28 100%)`,
        };

  const formCard = (
    <div
      className="w-full max-w-md border shadow-xl p-6 sm:p-8 space-y-6"
      style={{
        borderRadius: 'var(--radius-card, 0.75rem)',
        backgroundColor: 'var(--surface-card, #ffffff)',
        borderColor: 'var(--surface-border, #e2e8f0)',
        color: 'var(--surface-text, #0f172a)',
      }}
    >
      {/* Top logo & header (especially highlighted in centered layout or mobile split) */}
      <div
        className={
          brandLogin.login_layout === 'centered'
            ? 'flex flex-col items-center text-center space-y-3'
            : 'flex flex-col items-center md:items-start text-center md:text-left space-y-2.5'
        }
      >
        <div className={brandLogin.login_layout === 'split' ? 'md:hidden' : ''}>
          <LogoBadge
            logoUrl={displayLogo}
            alt={brandName}
            size={brandLogin.login_logo_size || 'md'}
            primaryColor={brandLogin.primary_color}
            primaryFg={primaryFg}
          />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {brandLogin.welcome_message || `Welcome back to ${brandName}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {brandLogin.login_layout === 'centered' && brandLogin.tagline
              ? brandLogin.tagline
              : `Sign in to access ${brandName} operations & ledger`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-[var(--radius-btn,0.5rem)] bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <input type="hidden" name="redirect" value={redirectParam} />
        <input type="hidden" name="expectedBrandId" value={brandLogin.brand_id} />

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">
            Username or Email
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`e.g. anna-nagar-01 or manager@${brandLogin.slug}.in`}
              required
              className="pl-9 h-10 text-sm"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="pl-9 h-10 text-sm"
              autoComplete="current-password"
            />
          </div>
        </div>


        <Button
          type="submit"
          className="w-full h-11 text-sm font-semibold shadow-sm"
          disabled={isPending}
          style={{
            backgroundColor: 'var(--brand-primary)',
            color: 'var(--brand-primary-foreground)',
            borderRadius: 'var(--radius-btn, 0.5rem)',
          }}
        >
          {isPending ? 'Signing In...' : `Continue to ${brandName}`}
          {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Scoped tenant access
          </span>
          <Link href="/login" className="hover:underline">
            Switch portal
          </Link>
        </div>
      </form>
    </div>
  );

  if (brandLogin.login_layout === 'split') {
    return (
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
        {/* Left Brand Showcase Column */}
        <div
          className="hidden md:flex flex-col justify-between p-10 lg:p-14 relative overflow-hidden"
          style={
            brandLogin.login_bg_url
              ? {
                  backgroundImage: `linear-gradient(155deg, ${brandLogin.primary_color}cc 0%, ${brandLogin.secondary_color}dd 100%), url("${brandLogin.login_bg_url}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: '#ffffff',
                }
              : {
                  background: `linear-gradient(155deg, ${brandLogin.primary_color} 0%, ${brandLogin.secondary_color} 100%)`,
                  color: 'var(--brand-banner-foreground, #ffffff)',
                }
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs">
              /{brandLogin.slug}
            </span>
          </div>

          <div className="space-y-6 max-w-md my-auto">
            <LogoBadge
              logoUrl={brandLogin.logo_dark_url || brandLogin.logo_url}
              alt={brandName}
              size={brandLogin.login_logo_size || 'lg'}
              primaryColor="rgba(255,255,255,0.22)"
              primaryFg="#ffffff"
            />
            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                {brandName}
              </h2>
              {brandLogin.tagline && (
                <p className="text-base opacity-90 leading-relaxed">
                  {brandLogin.tagline}
                </p>
              )}
              {brandLogin.welcome_message && (
                <p className="text-sm opacity-80 border-l-2 border-white/40 pl-3">
                  {brandLogin.welcome_message}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs opacity-75 flex items-center justify-between">
            <span>₹ INR • Asia/Kolkata</span>
          </div>
        </div>

        {/* Right Sign-In Column */}
        <div
          className="flex flex-col items-center justify-between p-4 sm:p-8 min-h-screen"
          style={bgStyle}
        >
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            {formCard}
          </div>
          <PoweredByFooter variant="brand" />
        </div>
      </div>
    );
  }

  // Centered Full-Bleed Mode
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-6"
      style={bgStyle}
    >
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {formCard}
      </div>
      <PoweredByFooter variant="brand" />
    </div>
  );
}

export function BrandLoginClient(props: {
  brandLogin: PublicBrandLoginData;
  demoAccounts: DemoQuickAccount[];
  showDemoFill: boolean;
  primaryFg: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
          Loading branded sign-in portal...
        </div>
      }
    >
      <BrandLoginInner {...props} />
    </Suspense>
  );
}

