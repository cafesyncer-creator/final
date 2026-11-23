'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store,
  Users,
  Wrench,
  FileSpreadsheet,
  Settings,
  Shield,
  Layers,
  History,
  Tag,
  X,
  CalendarCheck,
  Building2,
  UploadCloud,
  Archive,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandTheme } from './brand-provider';
import { UserRole } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarProps {
  role: UserRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSignOut?: () => void;
}

export function BrandAvatarOrLogo({
  src,
  alt,
  sizeClass = 'h-11 w-11',
  textSizeClass = 'text-base',
  bgColor,
  fgColor,
  roundedClass = 'rounded-lg',
  isIconOnly = false,
}: {
  src?: string | null;
  alt: string;
  sizeClass?: string;
  textSizeClass?: string;
  bgColor?: string;
  fgColor?: string;
  roundedClass?: string;
  isIconOnly?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={cn(
          isIconOnly ? sizeClass : `${sizeClass} max-w-[144px] w-auto`,
          'object-contain shrink-0',
          roundedClass
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center font-bold shrink-0 shadow-xs',
        sizeClass,
        textSizeClass,
        roundedClass
      )}
      style={{
        backgroundColor: bgColor || 'var(--brand-primary, #0f172a)',
        color: fgColor || 'var(--brand-primary-foreground, #ffffff)',
      }}
    >
      {(alt || 'C').trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function SharedSidebar({
  role,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const { isThemed, bundle, mode } = useBrandTheme();
  const isMaster = role === 'master';

  const handleSignOutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSignOut) {
      onSignOut();
      return;
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cafesync_demo_user');
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }
    window.location.href = '/login/';
  };

  const masterNavItems: NavItem[] = [
    { title: 'Master Dashboard', href: '/master', icon: Layers },
    { title: 'Brand Portfolios', href: '/master/brands', icon: Building2 },
    { title: 'Platform Audit Log', href: '/master/audit', icon: History },
    { title: 'Backup & Restore', href: '/master/backup', icon: Archive },
    { title: 'Master Settings', href: '/master/settings', icon: Settings },
  ];

  const adminNavItems: NavItem[] = [
    { title: 'Brand Overview', href: '/admin', icon: Layers },
    { title: 'Shops & Outlets', href: '/admin/shops', icon: Store },
    { title: 'Shop Managers', href: '/admin/users', icon: Shield },
    { title: 'Items & Modes', href: '/admin/items', icon: Tag },
    { title: 'Staff & Employees', href: '/admin/employees', icon: Users },
    { title: 'Assets Register', href: '/admin/assets', icon: Wrench },
    { title: 'Excel & PDF Reports', href: '/admin/reports', icon: FileSpreadsheet },
    { title: 'Data Import (Excel)', href: '/admin/import', icon: UploadCloud },
    { title: 'Settings & Backup', href: '/admin/settings', icon: Settings },
  ];

  const managerNavItems: NavItem[] = [
    { title: 'Daily Entry (Home)', href: '/shop', icon: Layers },
    { title: 'Items Catalog', href: '/shop/items', icon: Tag },
    { title: 'Staff & Salary', href: '/shop/staff', icon: Users },
    { title: 'Month Summary', href: '/shop/summary', icon: CalendarCheck },
    { title: 'Assets & Equipment', href: '/shop/assets', icon: Wrench },
    { title: 'Reports (Excel & PDF)', href: '/shop/reports', icon: FileSpreadsheet },
  ];

  const navMap: Record<UserRole, NavItem[]> = {
    master: masterNavItems,
    admin: adminNavItems,
    manager: managerNavItems,
  };

  const currentNav = navMap[role] || [];
  const settings = bundle?.settings;
  const brandName = isMaster
    ? 'CafeLedger'
    : settings?.display_name || bundle?.brand.name || 'CafeLedger';

  const isSidebarDarkBg =
    !isMaster &&
    (settings?.sidebar_style === 'dark' ||
      settings?.sidebar_style === 'brand' ||
      mode === 'dark');

  const logoSrc = isMaster
    ? null
    : isSidebarDarkBg && settings?.logo_dark_url
      ? settings.logo_dark_url
      : settings?.logo_url || null;

  const iconSrc = isMaster ? null : settings?.icon_url || logoSrc;

  // Render Master's CafeSync branded dark sidebar
  if (isMaster) {
    const masterNavContent = (
      <div className="flex flex-col h-full bg-[#28150E] border-r border-[#4A2F25] text-[#F7E5BC]">
        <div className="flex h-16 items-center justify-between px-4 border-b border-[#4A2F25] bg-[#28150E]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/brand/cafesync-icon-192.png"
              alt="CafeSync"
              className="h-10 w-10 min-w-[2.5rem] object-contain rounded-md shrink-0 shadow-xs"
            />
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <span className="font-bold text-[#F7E5BC] tracking-tight text-base block truncate">
                  CafeSync
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B46D31] block">
                  Master
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex h-8 w-8 text-[#B9A58A] hover:text-[#F7E5BC] hover:bg-[#35201A]"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-[#B9A58A] hover:text-[#F7E5BC] hover:bg-[#35201A]"
              onClick={onCloseMobile}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[#B9A58A] uppercase">
              Platform Management
            </div>
          )}

          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/master'
                ? pathname === '/master'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={item.title}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors select-none',
                  isCollapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-[#C68846] text-[#28150E] font-semibold shadow-xs'
                    : 'text-[#F7E5BC] hover:bg-[#35201A] hover:text-[#EBAB51]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-[#4A2F25] bg-[#35201A]/60 space-y-2">
          <button
            type="button"
            onClick={handleSignOutClick}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer text-left',
              isCollapsed && 'justify-center px-2'
            )}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 shrink-0 text-rose-400" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
          {!isCollapsed && (
            <div className="flex items-center justify-between text-[11px] text-[#B9A58A] px-2 py-0.5">
              <span>CafeSync Master</span>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            </div>
          )}
        </div>
      </div>
    );

    return (
      <>
        <aside
          className={cn(
            'hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30 transition-all duration-200',
            isCollapsed ? 'md:w-20' : 'md:w-64'
          )}
        >
          {masterNavContent}
        </aside>

        {isOpenMobile && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={onCloseMobile}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white shadow-xl">
              {masterNavContent}
            </div>
          </div>
        )}
      </>
    );
  }

  // Brand-Themed Sidebar for /admin and /shop
  const themedNavContent = (
    <div
      className="flex flex-col h-full border-r transition-colors"
      style={{
        backgroundColor: 'var(--sidebar-bg, #ffffff)',
        color: 'var(--sidebar-text, #334155)',
        borderColor: 'var(--sidebar-border, #e2e8f0)',
      }}
    >
      {/* Sidebar Top with prominent 44px logo or square icon when collapsed */}
      <div
        className={cn(
          'flex min-h-[4.5rem] items-center justify-between px-4 border-b gap-2',
          isCollapsed && 'px-2 justify-center'
        )}
        style={{ borderColor: 'var(--sidebar-border, #e2e8f0)' }}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <BrandAvatarOrLogo
              src={iconSrc}
              alt={brandName}
              sizeClass="h-10 w-10"
              textSizeClass="text-sm"
              bgColor={isThemed ? settings?.primary_color : undefined}
              roundedClass="rounded-[var(--radius-btn,0.5rem)]"
              isIconOnly
            />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                className="hidden md:inline-flex items-center justify-center p-1 rounded opacity-70 hover:opacity-100 cursor-pointer"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <BrandAvatarOrLogo
                src={logoSrc}
                alt={brandName}
                sizeClass="h-11 min-w-[2.75rem]"
                textSizeClass="text-lg"
                roundedClass="rounded-[var(--radius-btn,0.5rem)]"
              />
              <div className="min-w-0">
                <span className="font-bold tracking-tight text-sm leading-tight block truncate">
                  {brandName}
                </span>
                <span
                  className="text-[10px] font-medium block truncate"
                  style={{ color: 'var(--sidebar-muted-text, #64748b)' }}
                >
                  {role === 'admin' ? 'Brand Console' : 'Outlet Register'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="hidden md:inline-flex items-center justify-center p-1.5 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={onCloseMobile}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!isCollapsed && (
          <div
            className="px-3 mb-2 text-[11px] font-semibold tracking-wider uppercase"
            style={{ color: 'var(--sidebar-muted-text, #94a3b8)' }}
          >
            {role === 'admin' ? 'Brand Operations' : 'Shop Management'}
          </div>
        )}

        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin' || item.href === '/shop'
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={item.title}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all select-none',
                isCollapsed && 'justify-center px-2'
              )}
              style={{
                borderRadius: 'var(--radius-btn, 0.5rem)',
                backgroundColor: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </div>

      {/* Sidebar Footer with Sign Out & subtle "Powered by CafeLedger" */}
      <div
        className="p-3 border-t space-y-2"
        style={{ borderColor: 'var(--sidebar-border, #e2e8f0)' }}
      >
        <button
          type="button"
          onClick={handleSignOutClick}
          title="Sign Out"
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer rounded-[var(--radius-btn,0.5rem)] hover:opacity-80 text-left',
            isCollapsed && 'justify-center px-2'
          )}
          style={{
            color:
              settings?.sidebar_style === 'brand' || settings?.sidebar_style === 'dark'
                ? '#fda4af'
                : '#e11d48',
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {!isCollapsed && (
          <div
            className="flex items-center justify-between text-[10px] px-2 py-0.5"
            style={{ color: 'var(--sidebar-muted-text, #64748b)' }}
          >
            <span>{brandName}</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:fixed md:inset-y-0 z-30 transition-all duration-200',
          isCollapsed ? 'md:w-20' : 'md:w-64'
        )}
      >
        {themedNavContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col shadow-xl">
            {themedNavContent}
          </div>
        </div>
      )}
    </>
  );
}
