'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Shield,
  Power,
  ChevronRight,
  MapPin,
  Mail,
  Paintbrush,
  Copy,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Count, Money } from '@/components/shared/format-values';
import { DemoMasterBrand } from '@/lib/demo-master-data';
import { CreateBrandModal } from './create-brand-modal';
import { toggleBrandStatusAction } from '@/app/master/actions';
import { slugifyBrandName } from '@/lib/theme/presets';
import { resolveBrandLogoUrl, generateBrandSvgDataUri } from '@/lib/theme/brand-svg';

interface BrandsListProps {
  initialBrands: DemoMasterBrand[];
}

export function BrandsList({ initialBrands }: BrandsListProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<DemoMasterBrand[]>(initialBrands);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  const filteredBrands = brands.filter((b) => {
    const slug = b.slug || slugifyBrandName(b.name);
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.registration_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.gstin && b.gstin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (brand: DemoMasterBrand) => {
    const newStatus = brand.status === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'suspend' : 'reactivate';

    if (
      !confirm(
        `Are you sure you want to ${actionText} "${brand.name}"? ${
          newStatus === 'suspended'
            ? 'When suspended, administrators and shop managers under this brand CANNOT log in.'
            : 'Access will be restored for all users of this brand.'
        }`
      )
    ) {
      return;
    }

    try {
      const res = await toggleBrandStatusAction(brand.id, newStatus);
      if (res.success) {
        toast.success(`Brand "${brand.name}" is now ${newStatus}`);
        setBrands((prev) =>
          prev.map((b) => (b.id === brand.id ? { ...b, status: newStatus } : b))
        );
      } else {
        toast.error(res.error || 'Failed to update brand status');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-800" />
            <span>Franchise Brands Portfolio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage multi-tenant cafe chains, dedicated administrators, unique registration numbers, and brand health.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Brand</span>
        </Button>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand name, registration number (BR-...), city, or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['all', 'active', 'suspended'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 3. BRANDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className={`rounded-xl border bg-white shadow-xs p-5 transition-all hover:shadow-md flex flex-col justify-between ${
              brand.status === 'active' ? 'border-slate-200' : 'border-rose-300 bg-rose-50/20'
            }`}
          >
            <div>
              {/* Header with Logo & Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {brand.logo_url ? (
                    <img
                      src={resolveBrandLogoUrl(brand.logo_url, brand.name, brand.primary_color, brand.secondary_color)}
                      alt={brand.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = generateBrandSvgDataUri(brand.name, brand.primary_color, brand.secondary_color);
                      }}
                      className="h-11 w-11 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shadow-2xs"
                    />
                  ) : (
                    <div
                      className="h-11 w-11 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-2xs"
                      style={{ backgroundColor: brand.primary_color }}
                    >
                      {brand.name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {brand.registration_no}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{brand.name}</h3>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    brand.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {brand.status}
                </span>
              </div>

              {/* Color badges & Corporate details */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] text-slate-400">Palette:</span>
                <span
                  className="h-4 w-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: brand.primary_color }}
                  title={`Primary: ${brand.primary_color}`}
                />
                <span
                  className="h-4 w-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: brand.secondary_color }}
                  title={`Secondary: ${brand.secondary_color}`}
                />
                {brand.gstin && (
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                    GST: {brand.gstin}
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{brand.address || 'Address pending'}</span>
                </div>
                {brand.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{brand.email}</span>
                  </div>
                )}
                {brand.admins && brand.admins.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Admin: {brand.admins[0].full_name} ({brand.admins[0].email})</span>
                  </div>
                )}
              </div>

              {/* Shareable Login Portal URL */}
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 truncate text-slate-600 font-mono">
                  <Link2 className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">/login/{brand.slug || slugifyBrandName(brand.name)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const origin = process.env.NEXT_PUBLIC_ADMIN_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                    const url = `${origin}/login/${brand.slug || slugifyBrandName(brand.name)}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Brand login link copied!');
                  }}
                  className="text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                  title="Copy branded login URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Metrics block */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs flex justify-between mb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outlets</span>
                  <span className="font-bold text-slate-800"><Count value={brand.shops_count} suffix="Cafes" /></span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Administrators</span>
                  <span className="font-bold text-slate-800"><Count value={brand.admins_count} suffix="Admin" /></span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly GMV</span>
                  <span className="font-bold text-emerald-700"><Money value={brand.monthly_volume} /></span>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(brand)}
                className={`h-8 px-2 text-xs ${
                  brand.status === 'active'
                    ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title={brand.status === 'active' ? 'Suspend brand (blocks logins)' : 'Reactivate brand'}
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                <span>{brand.status === 'active' ? 'Suspend' : 'Reactivate'}</span>
              </Button>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/master/brands/${brand.id}/theme`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-2xs"
                >
                  <Paintbrush className="h-3 w-3" />
                  <span>Theme Studio</span>
                </Link>

                <Link
                  href={`/master/brands/${brand.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
                >
                  <span>Details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBrands.length === 0 && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <img
            src="/brand/cafesync-icon-192.png"
            alt="CafeSync"
            className="h-10 w-10 mx-auto mb-2 object-contain opacity-60 rounded-md"
          />
          <h3 className="text-sm font-semibold text-slate-700">No Brands Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or status filter.</p>
        </div>
      )}

      {/* CREATE BRAND MODAL */}
      <CreateBrandModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

