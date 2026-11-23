'use client';

import React, { useState } from 'react';
import { BrandProvider, BrandTheme, useBrandTheme } from './brand-provider';
import { SharedHeader, HeaderUser } from './header';
import { BrandAvatarOrLogo, SharedSidebar } from './sidebar';
import { PoweredByFooter } from './powered-by-footer';
import { ShopMobileNav } from '@/components/shop/shop-mobile-nav';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface SharedLayoutProps {
  user: HeaderUser;
  brand?: BrandTheme | null;
  children: React.ReactNode;
}

function BrandWelcomeBanner({ user }: { user: HeaderUser }) {
  const { isThemed, bundle } = useBrandTheme();
  if (!isThemed || !bundle || user.role === 'master') return null;

  const { settings, brand } = bundle;
  const brandName = settings.display_name || brand.name;
  const headerTitle =
    user.role === 'manager' && user.shopName
      ? `${brandName} - ${user.shopName}`
      : brandName;

  const bannerLogo =
    settings.logo_dark_url &&
    bundle.settings.primary_color &&
    bundle.settings.secondary_color
      ? settings.logo_dark_url
      : settings.logo_url;

  return (
    <div
      className="mb-5 px-4 py-3.5 sm:px-6 sm:py-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden"
      style={{
        borderRadius: 'var(--radius-card, 0.75rem)',
        background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.secondary_color} 100%)`,
        color: 'var(--brand-banner-foreground, #ffffff)',
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <BrandAvatarOrLogo
          src={bannerLogo}
          alt={brandName}
          sizeClass="h-12 min-w-[3rem]"
          textSizeClass="text-lg"
          bgColor="rgba(255,255,255,0.22)"
          fgColor="var(--brand-banner-foreground, #ffffff)"
          roundedClass="rounded-[var(--radius-btn,0.5rem)]"
        />

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-85 truncate">
            {settings.welcome_message || `Welcome back to ${brandName}`}
          </p>
          <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
            {headerTitle}
          </h2>
          {settings.tagline && (
            <p className="text-xs opacity-90 truncate">{settings.tagline}</p>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end text-right shrink-0 opacity-90">
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs">
          {user.role === 'admin' ? 'Brand Executive Portal' : user.shopCode || 'Outlet Ledger'}
        </span>
      </div>
    </div>
  );
}

export function SharedAppLayout({ user, brand, children }: SharedLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMaster = user.role === 'master';

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cafesync_demo_user');
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (err) {
      console.error('Sign out failed:', err);
    }
    window.location.href = '/login/';
  };

  return (
    <BrandProvider brand={isMaster ? null : brand}>
      <div
        className={cn(
          'min-h-screen flex flex-col antialiased',
          isMaster ? 'bg-[#28150E] text-[#F7E5BC]' : 'bg-[var(--surface-bg,#f8fafc)]'
        )}
      >
        <SharedSidebar
          role={user.role}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onSignOut={handleSignOut}
        />

        <div
          className={cn(
            'flex-1 flex flex-col transition-all duration-200 min-w-0',
            isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
          )}
        >
          <SharedHeader
            user={user}
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onSignOut={handleSignOut}
          />

          <main
            className={cn(
              'flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0'
            )}
          >
            {!isMaster && <BrandWelcomeBanner user={user} />}
            {children}
          </main>

          <PoweredByFooter
            variant={isMaster ? 'master' : 'brand'}
            role={user.role}
          />
        </div>

        {user.role === 'manager' && <ShopMobileNav />}
      </div>
    </BrandProvider>
  );
}
