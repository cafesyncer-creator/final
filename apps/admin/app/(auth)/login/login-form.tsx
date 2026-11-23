'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { loginWithCredentials } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, Lock, User, AlertCircle, ArrowRight, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface LoginFormClientProps {
  isLiveSupabase: boolean;
}

function LoginFormInner({ isLiveSupabase }: LoginFormClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectParam = searchParams.get('redirect') || '';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setCustomError(null);
  };

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
      const res = await loginWithCredentials(email, password);
      if (!res.success) {
        setCustomError(res.error || 'Authentication failed. Please check your credentials.');
        setIsPending(false);
        return;
      }

      if (res.mustChangePassword) {
        router.push('/change-password');
        return;
      }

      const destination = redirectParam || '/admin/';
      window.location.href = destination;
    } catch (err: any) {
      setCustomError(err?.message || 'Unexpected login error.');
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white/95 backdrop-blur-xs">
      <CardHeader className="space-y-2 text-center pb-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
          <Coffee className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
          CafeLedger
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Multi-Tenant White-Label Cafe Accounts Platform
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              Email or Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLiveSupabase ? 'username or name@company.com' : 'master@cafeledger.io'}
                required
                className="pl-9 h-10 text-sm border-slate-200"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
            </div>
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
                className="pl-9 h-10 text-sm border-slate-200"
                autoComplete="current-password"
              />
            </div>
          </div>

          {!isLiveSupabase ? (
            <>
              {/* Demo Brand-Specific White-Label Portals */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>White-Label Brand Portals (Demo)</span>
                  <span className="text-[10px] font-normal text-slate-400">/login/[slug]</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <Link
                    href="/login/snaxia"
                    className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-slate-400 transition-colors"
                  >
                    <span className="truncate">Snaxia</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                  </Link>
                  <Link
                    href="/login/roast-and-brew"
                    className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-slate-400 transition-colors"
                  >
                    <span className="truncate">Roast &amp; Brew</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                  </Link>
                  <Link
                    href="/login/chai-craft"
                    className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 border border-slate-200 hover:border-slate-400 transition-colors"
                  >
                    <span className="truncate">Chai Craft</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                  </Link>
                </div>
              </div>

              {/* Quick Test Login Presets (Demo Only) */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Sparkles className="h-3.5 w-3.5 text-slate-600" />
                  <span>Quick Test Fill (Password: password123)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillCredentials('master@cafeledger.io')}
                    className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded px-2.5 py-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    👑 Platform Master
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin@snaxia.in')}
                    className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded px-2.5 py-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    🏢 Snaxia Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('admin@roastbrew.co')}
                    className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded px-2.5 py-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    ☕ Roast &amp; Brew Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredentials('manager.indiranagar@snaxia.in')}
                    className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded px-2.5 py-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    🧑‍🍳 Snaxia Manager
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-200/80">
              Brand admins &amp; shop managers can also sign in directly from their custom portal URL{' '}
              <span className="font-mono text-slate-800">/login/[brand-slug]</span>.
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-100 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Role-based guard routes you directly to `/admin` or `/shop`.
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6">
          <Button
            type="submit"
            className="w-full h-10 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800"
            disabled={isPending}
          >
            {isPending ? 'Authenticating...' : 'Sign In to Ledger'}
            {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function LoginFormClient({ isLiveSupabase }: LoginFormClientProps) {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading portal...</div>}>
      <LoginFormInner isLiveSupabase={isLiveSupabase} />
    </Suspense>
  );
}

