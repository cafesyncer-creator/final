'use client';

import React, { useState, useCallback } from 'react';
import {
  Menu,
  User,
  LogOut,
  Store,
  ChevronDown,
  Sun,
  Moon,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrandTheme } from './brand-provider';
import { BrandAvatarOrLogo } from './sidebar';
import { ActivityDrawer } from './activity-drawer';
import { ScreenHelpTour } from './screen-help-tour';
import { UserRole } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export interface HeaderUser {
  id?: string;
  fullName: string;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  role: UserRole;
  brandId?: string | null;
  shopName?: string | null;
  shopCode?: string | null;
  mustChangePassword?: boolean;
}

interface HeaderProps {
  user: HeaderUser;
  onMobileMenuToggle?: () => void;
  onSignOut?: () => void;
}

export function SharedHeader({
  user,
  onMobileMenuToggle,
  onSignOut,
}: HeaderProps) {
  const { bundle, mode, canSwitchMode, isSwitchingMode, toggleUserMode } =
    useBrandTheme();
  const [activityOpen, setActivityOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const handleUnreadChange = useCallback((c: number) => setUnreadCount(c), []);
  const isMaster = user.role === 'master';
  const canSeeActivity = user.role === 'master' || user.role === 'admin';
  const settings = bundle?.settings;

  const brandName = isMaster
    ? 'CafeLedger'
    : settings?.display_name || bundle?.brand.name || 'CafeLedger';

  const logoSrc = isMaster
    ? null
    : mode === 'dark' && settings?.logo_dark_url
      ? settings.logo_dark_url
      : settings?.logo_url || null;

  const roleBadgeMap: Record<
    UserRole,
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    master: { label: 'Platform Master', variant: 'destructive' },
    admin: { label: 'Brand Admin', variant: 'default' },
    manager: { label: 'Shop Manager', variant: 'secondary' },
  };

  return (
    <header
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b px-3 sm:px-6 backdrop-blur-sm transition-colors"
      style={
        isMaster
          ? {
              backgroundColor: 'rgba(235, 222, 210, 0.95)',
              borderColor: '#CBB6A2',
              color: '#3E2723',
            }
          : {
              backgroundColor: 'var(--surface-card, #ffffff)',
              borderColor: 'var(--surface-border, #e2e8f0)',
              color: 'var(--surface-text, #0f172a)',
            }
      }
    >
      {/* Left: Mobile Toggle & Brand / Shop Identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden shrink-0 h-9 w-9", isMaster && "text-[#3E2723] hover:bg-[#DAC9B9]")}
          onClick={onMobileMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2.5 min-w-0">
          {isMaster ? (
            <img
              src="/brand/cafesync-icon-192.png"
              alt="CafeSync Master"
              className="h-9 w-9 object-contain rounded-md shadow-xs shrink-0"
            />
          ) : (
            <BrandAvatarOrLogo
              src={logoSrc}
              alt={brandName}
              sizeClass="h-10 min-w-[2.5rem]"
              textSizeClass="text-base"
              roundedClass="rounded-[var(--radius-btn,0.5rem)]"
            />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn("font-bold tracking-tight text-sm sm:text-base truncate", isMaster && "text-[#F7E5BC]")}>
                {isMaster
                  ? 'CafeSync'
                  : user.role === 'manager' && user.shopName
                    ? `${brandName} - ${user.shopName}`
                    : brandName}
              </span>
              <Badge
                variant={isMaster ? 'default' : roleBadgeMap[user.role]?.variant || 'default'}
                className={cn(
                  "text-[10px] px-1.5 py-0 shrink-0 hidden sm:inline-flex",
                  isMaster && "bg-[#B46D31] text-[#F7E5BC] hover:bg-[#B46D31] border-transparent font-medium"
                )}
              >
                {isMaster ? 'Master' : roleBadgeMap[user.role]?.label || user.role}
              </Badge>
            </div>

            {user.shopName && (
              <p className="flex items-center gap-1 text-[11px] text-slate-500 font-medium truncate">
                <Store className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{user.shopName}</span>
                {user.shopCode && (
                  <span className="text-[10px] opacity-75 shrink-0">
                    ({user.shopCode})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Activity Bell / Help / Mode Toggle / Currency / User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        <ScreenHelpTour role={user.role} />

        {canSeeActivity && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setActivityOpen(true)}
            title="Activity notifications"
            aria-label="Open recent activity"
            className={cn(
              "relative h-9 w-9 shrink-0",
              isMaster && "border-[#4A2F25] bg-[#35201A] text-[#F7E5BC] hover:bg-[#432920] hover:text-[#EBAB51]"
            )}
          >
            <Bell className={cn("h-4 w-4", isMaster ? "text-[#F7E5BC]" : "text-slate-700")} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white"
                aria-label={`${unreadCount} unread notifications`}
              />
            )}
          </Button>
        )}

        {!isMaster && canSwitchMode && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleUserMode}
            disabled={isSwitchingMode}
            title={
              mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
            }
            aria-label="Toggle Light/Dark Mode"
            className="h-9 w-9 shrink-0"
          >
            {mode === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </Button>
        )}

        <span
          className={cn(
            "hidden lg:inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-[var(--radius-btn,0.375rem)]",
            isMaster
              ? "text-[#6D4C41] bg-[#E8DFD5] border border-[#CBB6A2]"
              : "text-slate-500 bg-slate-100"
          )}
        >
          ₹ INR | IST
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-1.5 border-slate-200 pl-2 pr-2.5 py-1 h-9 rounded-full shrink-0",
                isMaster && "border-[#CBB6A2] bg-[#E8DFD5] text-[#3E2723] hover:bg-[#DAC9B9]"
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-slate-700",
                  isMaster ? "bg-[#DAC9B9] text-[#8D5B4C]" : "bg-slate-100"
                )}
              >
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline text-xs font-medium max-w-[110px] truncate">
                {user.fullName}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5", isMaster ? "text-[#6D4C41]" : "text-slate-400")} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">
                  {user.fullName}
                </p>
                {user.email && (
                  <p className="text-xs leading-none text-slate-500 truncate">
                    {user.email}
                  </p>
                )}
                {user.phone && (
                  <p className="text-[11px] leading-none text-slate-400 mt-1">
                    {user.phone}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {user.shopName && (
              <>
                <div className="px-2 py-1.5 text-xs text-slate-500">
                  <div className="font-medium text-slate-700">Assigned Shop:</div>
                  <div className="text-slate-600 truncate">{user.shopName}</div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={onSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {canSeeActivity && (
        <ActivityDrawer
          open={activityOpen}
          onOpenChange={setActivityOpen}
          role={user.role === 'master' ? 'master' : 'admin'}
          onUnreadCountChange={handleUnreadChange}
        />
      )}
    </header>
  );
}
