'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loginWithCredentials } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

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

      const destination = redirectParam || '/master/';
      window.location.href = destination;
    } catch (err: any) {
      setCustomError(err?.message || 'Unexpected login error.');
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border border-[#C4A482] bg-[#F8F3ED] text-[#3E2723] rounded-2xl">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <CardTitle className="text-xl font-bold tracking-tight text-[#3E2723]">
          Master Sign In
        </CardTitle>
        <CardDescription className="text-xs text-[#6D4C41]">
          Platform Administration &amp; Multi-Tenant Control
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <input type="hidden" name="redirect" value={redirectParam} />

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-[#4E342E]">
              Email or Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#8D6E63]" />
              <Input
                id="email"
                name="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cafesync@gmail.com"
                required
                className="pl-9 h-11 text-sm bg-white border-[#C4A482] text-[#3E2723] placeholder:text-[#A1887F] focus-visible:ring-[#8D5B4C] rounded-lg"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-[#4E342E]">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8D6E63]" />
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9 h-11 text-sm bg-white border-[#C4A482] text-[#3E2723] placeholder:text-[#A1887F] focus-visible:ring-[#8D5B4C] rounded-lg"
                autoComplete="current-password"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-6">
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold bg-[#8D5B4C] text-white hover:bg-[#734032] shadow-md transition-colors cursor-pointer rounded-lg border-0"
            disabled={isPending}
          >
            {isPending ? 'Authenticating...' : 'Sign In to Master Portal'}
            {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function LoginFormClient({ isLiveSupabase }: LoginFormClientProps) {
  return (
    <Suspense fallback={<div className="text-sm text-[#8D6E63]">Loading portal...</div>}>
      <LoginFormInner isLiveSupabase={isLiveSupabase} />
    </Suspense>
  );
}
