'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { UserRole } from '@/lib/supabase/types';
import { DEMO_USERS } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Store, AlertTriangle, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { ForcePasswordChangeModal } from '@/components/shared/force-password-change-modal';

export interface UserSessionProfile {
  id: string;
  email: string | null;
  role: UserRole;
  brand_id: string | null;
  shop_id: string | null;
  full_name: string;
  is_active: boolean;
  must_change_password: boolean;
}

export interface BrandMeta {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
}

export interface ShopMeta {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: UserSessionProfile | null;
  brand: BrandMeta | null;
  shop: ShopMeta | null;
  isLoading: boolean;
  isLive: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  brand: null,
  shop: null,
  isLoading: true,
  isLive: false,
  refreshAuth: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserSessionProfile | null>(null);
  const [brand, setBrand] = useState<BrandMeta | null>(null);
  const [shop, setShop] = useState<ShopMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLive = isSupabaseConfigured();

  const loadProfile = useCallback(async (userId: string, userEmail?: string) => {
    try {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, role, brand_id, shop_id, full_name, is_active, must_change_password')
        .eq('id', userId)
        .maybeSingle();

      if (profErr || !prof) {
        setUser(null);
        setProfile(null);
        setBrand(null);
        setShop(null);
        return;
      }

      setUser({ id: userId, email: userEmail });
      setProfile(prof as UserSessionProfile);

      if (prof.brand_id) {
        const { data: b } = await supabase
          .from('brands')
          .select('id, name, slug, status')
          .eq('id', prof.brand_id)
          .maybeSingle();
        if (b) setBrand(b as BrandMeta);
      }

      if (prof.shop_id) {
        const { data: s } = await supabase
          .from('shops')
          .select('id, name, code, status')
          .eq('id', prof.shop_id)
          .maybeSingle();
        if (s) setShop(s as ShopMeta);
      }
    } catch (err) {
      console.warn('Error loading user profile:', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);

    if (!isLive) {
      try {
        const demoRaw = localStorage.getItem('cafesync_demo_user') || localStorage.getItem('cafeledger_demo_user');
        if (demoRaw) {
          const parsed = JSON.parse(demoRaw);
          const demoUser = DEMO_USERS[parsed.email] || Object.values(DEMO_USERS).find((u) => u.email === parsed.email);
          if (demoUser) {
            setUser({ id: demoUser.id, email: demoUser.email });
            setProfile({
              id: demoUser.id,
              email: demoUser.email,
              role: demoUser.role,
              brand_id: demoUser.brand?.id || null,
              shop_id: demoUser.shop?.id || null,
              full_name: demoUser.fullName,
              is_active: true,
              must_change_password: false,
            });
            setBrand({
              id: demoUser.brand?.id || 'demo-brand',
              name: demoUser.brand?.name || 'Snaxia Artisanal Cafes',
              slug: 'snaxia',
              status: 'active',
            });
            setShop({
              id: demoUser.shop?.id || 'demo-shop',
              name: demoUser.shop?.name || 'Snaxia Indiranagar',
              code: demoUser.shop?.code || 'SNX-BLR-01',
              status: 'active',
            });
            setIsLoading(false);
            return;
          }
        }
      } catch {}

      setUser(null);
      setProfile(null);
      setBrand(null);
      setShop(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setBrand(null);
        setShop(null);
      }
    } catch (err) {
      console.warn('Session verification exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLive, loadProfile]);

  useEffect(() => {
    refreshAuth();

    if (isLive) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            await loadProfile(session.user.id, session.user.email);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setBrand(null);
          setShop(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isLive, refreshAuth, loadProfile]);

  const signOut = async () => {
    if (!isLive) {
      localStorage.removeItem('cafesync_demo_user');
      localStorage.removeItem('cafeledger_demo_user');
      setUser(null);
      setProfile(null);
      setBrand(null);
      setShop(null);
      window.location.href = '/login/';
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setBrand(null);
      setShop(null);
      window.location.href = '/login/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        brand,
        shop,
        isLoading,
        isLive,
        refreshAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// -----------------------------------------------------------------------------
// SKELETON PLACEHOLDER FOR ZERO-FLASH LOADING
// -----------------------------------------------------------------------------
function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header skeleton */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="w-32 h-5 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-8 rounded bg-slate-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
      </header>

      {/* Body skeleton */}
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white p-3 space-y-2 animate-pulse">
              <div className="w-16 h-3 bg-slate-200 rounded" />
              <div className="w-24 h-6 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
          <div className="w-40 h-5 bg-slate-200 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-full h-10 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// REQUIRE ROLE GUARD
// -----------------------------------------------------------------------------
export function RequireRole({
  role = 'manager',
  children,
}: {
  role?: 'manager';
  children: React.ReactNode;
}) {
  const { user, profile, brand, shop, isLoading, signOut, refreshAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const redirectUrl = pathname ? `/login/?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  if (!user || !profile) {
    return <AuthLoadingSkeleton />;
  }

  // Inactive Account Check
  if (!profile.is_active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl text-red-900">Account Deactivated</CardTitle>
            <CardDescription>
              Your user account has been deactivated by the system administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <p className="text-sm text-slate-600">
              Please contact your brand management team or platform administrator to restore access.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Role check: Only role=manager is allowed in the shop app
  if (profile.role !== role) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_APP_URL;
    const masterUrl = process.env.NEXT_PUBLIC_MASTER_APP_URL;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-200 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Store className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl text-slate-900">Access Restricted</CardTitle>
            <CardDescription>
              This portal is strictly for Shop Managers. Your account is registered with the role: <span className="font-semibold text-slate-800 uppercase">{profile.role}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {profile.role === 'admin' && adminUrl && (
              <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <a href={adminUrl}>
                  Open Brand Admin Portal <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            {profile.role === 'master' && masterUrl && (
              <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                <a href={masterUrl}>
                  Open Master Portal <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign In as Different User
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Suspended Brand Check
  if (brand?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl text-rose-950">Organization Suspended</CardTitle>
            <CardDescription>
              {brand.name || 'Your brand organization'} has been temporarily suspended.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <p className="text-sm text-slate-600">
              Operations and daily accounting for this brand are temporarily locked. Please contact your Brand Director or CafeSync support.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inactive Shop Check
  if (shop?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-200 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <Store className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl text-slate-900">Outlet Inactive</CardTitle>
            <CardDescription>
              Outlet {shop.name} ({shop.code}) is currently marked as inactive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-center">
            <p className="text-sm text-slate-600">
              Daily entries are locked for inactive outlets. Contact your Brand Administrator to reactivate this outlet.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Must Change Password Check
  if (profile.must_change_password) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <ForcePasswordChangeModal
          initialRequired={true}
          userName={profile.full_name}
        />
      </div>
    );
  }

  return <>{children}</>;
}

