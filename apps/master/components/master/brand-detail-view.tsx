'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Store,
  Users,
  Shield,
  Eye,
  KeyRound,
  Power,
  Edit,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Clock,
  Paintbrush,
  Link2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveBrandLogoUrl, generateBrandSvgDataUri } from '@/lib/theme/brand-svg';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Count, Money } from '@/components/shared/format-values';
import { DemoMasterBrand } from '@/lib/demo-master-data';
import { slugifyBrandName } from '@/lib/theme/presets';
import {
  updateBrandAction,
  toggleBrandStatusAction,
  createBrandAdminAction,
  resetBrandAdminPasswordAction,
  logViewAsAdminAction,
} from '@/app/master/actions';

interface BrandDetailViewProps {
  brand: DemoMasterBrand;
  shops: Array<{ id: string; name: string; code: string; address: string; phone: string; status: string }>;
  managersCount: number;
  lastActivity: string;
}

export function BrandDetailView({
  brand,
  shops,
  managersCount,
  lastActivity,
}: BrandDetailViewProps) {
  const [currentBrand, setCurrentBrand] = useState<DemoMasterBrand>(brand);
  const [isViewAsAdminActive, setIsViewAsAdminActive] = useState(false);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [tempPassModal, setTempPassModal] = useState<{ email: string; pass: string } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState(brand.name);
  const [editSlug, setEditSlug] = useState(brand.slug || slugifyBrandName(brand.name));
  const [editRegNo, setEditRegNo] = useState(brand.registration_no);
  const [editAddress, setEditAddress] = useState(brand.address || '');
  const [editPhone, setEditPhone] = useState(brand.phone || '');
  const [editEmail, setEditEmail] = useState(brand.email || '');
  const [editGstin, setEditGstin] = useState(brand.gstin || '');

  // Add Admin form state
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('AdminPass123!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleViewAsAdmin = async () => {
    const newState = !isViewAsAdminActive;
    if (newState) {
      try {
        await logViewAsAdminAction(currentBrand.id, currentBrand.name);
        toast.info(`Entered read-only administrative inspection view. Logged to audit log.`);
      } catch (err: any) {
        toast.error(err.message);
      }
    }
    setIsViewAsAdminActive(newState);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanSlug = slugifyBrandName(editSlug || editName);
      const res = await updateBrandAction({
        brandId: currentBrand.id,
        name: editName,
        slug: cleanSlug,
        registrationNo: editRegNo,
        address: editAddress,
        phone: editPhone,
        email: editEmail,
        gstin: editGstin,
      });

      if (res.success) {
        toast.success(`Brand details updated`);
        setCurrentBrand((prev) => ({
          ...prev,
          name: editName,
          slug: cleanSlug,
          registration_no: editRegNo,
          address: editAddress,
          phone: editPhone,
          email: editEmail,
          gstin: editGstin,
        }));
        setIsEditOpen(false);
      } else {
        toast.error(res.error || 'Failed to update brand');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = currentBrand.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'reactivate'} "${currentBrand.name}"?`)) {
      return;
    }

    try {
      const res = await toggleBrandStatusAction(currentBrand.id, newStatus);
      if (res.success) {
        toast.success(`Brand is now ${newStatus}`);
        setCurrentBrand((prev) => ({ ...prev, status: newStatus }));
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createBrandAdminAction({
        brandId: currentBrand.id,
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: adminPassword,
      });

      if (res.success) {
        toast.success(`Administrator ${adminName} onboarded`);
        setCurrentBrand((prev) => ({
          ...prev,
          admins_count: prev.admins_count + 1,
          admins: [
            ...prev.admins,
            {
              id: res.data?.id || 'admin-' + Date.now(),
              full_name: adminName.trim(),
              email: adminEmail.trim(),
              phone: adminPhone.trim() || '',
              is_active: true,
            },
          ],
        }));
        setIsAddAdminOpen(false);
        setTempPassModal({ email: adminEmail, pass: adminPassword });
      } else {
        toast.error(res.error || 'Failed to add admin');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAdminPass = async (adminId: string, email: string) => {
    const tempPass = 'ResetPass' + Math.floor(1000 + Math.random() * 9000) + '!';
    try {
      const res = await resetBrandAdminPasswordAction(adminId, tempPass);
      if (res.success) {
        setTempPassModal({ email, pass: tempPass });
      } else {
        toast.error(res.error || 'Password reset failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. "VIEW AS ADMIN" READ-ONLY BANNER */}
      {isViewAsAdminActive && (
        <div className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6 text-indigo-700 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-950">
                  Read-Only Inspection Mode: Viewing as Brand Administrator
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 font-bold uppercase">
                  Audit Log Active
                </span>
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                You are inspecting {currentBrand.name} without tenant boundary restrictions. All modifications and transaction entries are strictly disabled in Master view.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleToggleViewAsAdmin}
            className="bg-indigo-700 hover:bg-indigo-800 text-white shrink-0"
          >
            Exit Inspection Mode
          </Button>
        </div>
      )}

      {/* 2. BREADCRUMB & HEADER */}
      <div className="space-y-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/master/brands" className="hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            <span>Brand Portfolios</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{currentBrand.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {currentBrand.logo_url ? (
              <img
                src={resolveBrandLogoUrl(currentBrand.logo_url, currentBrand.name, currentBrand.primary_color, currentBrand.secondary_color)}
                alt={currentBrand.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = generateBrandSvgDataUri(currentBrand.name, currentBrand.primary_color, currentBrand.secondary_color);
                }}
                className="h-14 w-14 rounded-xl object-contain border border-slate-200 bg-white p-1 shadow-xs"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-xs"
                style={{ backgroundColor: currentBrand.primary_color }}
              >
                {currentBrand.name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {currentBrand.registration_no}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {currentBrand.name}
                </h1>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    currentBrand.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {currentBrand.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Registered Office: {currentBrand.address || 'Address not listed'} • GSTIN: {currentBrand.gstin || 'Unregistered'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              href={`/master/brands/${currentBrand.id}/theme`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition-colors"
            >
              <Paintbrush className="h-3.5 w-3.5" />
              <span>Brand Theme Studio</span>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleViewAsAdmin}
              className={`text-xs flex items-center gap-1.5 ${
                isViewAsAdminActive ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : ''
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isViewAsAdminActive ? 'Exit Admin View' : 'View as Admin'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className={`text-xs ${
                currentBrand.status === 'active'
                  ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Power className="h-3.5 w-3.5 mr-1" />
              <span>{currentBrand.status === 'active' ? 'Suspend Brand' : 'Reactivate'}</span>
            </Button>
          </div>
        </div>

        {/* Shareable Branded Login URL Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Link2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-medium">Branded Login Portal:</span>
            <code className="font-mono font-semibold text-slate-900 truncate">
              /login/{currentBrand.slug || slugifyBrandName(currentBrand.name)}
            </code>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px]"
              onClick={() => {
                const slug = currentBrand.slug || slugifyBrandName(currentBrand.name);
                const origin = process.env.NEXT_PUBLIC_ADMIN_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                navigator.clipboard.writeText(`${origin}/login/${slug}`);
                toast.success('Brand login link copied!');
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy URL
            </Button>
            <Link
              href={`${process.env.NEXT_PUBLIC_ADMIN_APP_URL || ''}/login/${currentBrand.slug || slugifyBrandName(currentBrand.name)}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span>Open Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Outlets</span>
          <div className="text-xl font-bold text-slate-900 mt-1"><Count value={shops.length} suffix="Cafes" /></div>
          <span className="text-[11px] text-slate-500">Operating under this brand</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shop Managers</span>
          <div className="text-xl font-bold text-slate-900 mt-1"><Count value={managersCount} suffix="Staff" /></div>
          <span className="text-[11px] text-slate-500">Active counter logins</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Monthly Volume</span>
          <div className="text-xl font-bold text-emerald-700 mt-1"><Money value={currentBrand.monthly_volume} /></div>
          <span className="text-[11px] text-emerald-600 font-semibold">Aggregated turnover</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Activity</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{lastActivity}</div>
          <span className="text-[11px] text-slate-500">Live transaction stream</span>
        </div>
      </div>

      {/* 4. BRAND ADMINISTRATORS */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-700" />
              <span>Brand Administrators</span>
            </h2>
            <p className="text-xs text-slate-500">
              Users with admin privileges can configure outlets, manage items, and oversee payroll for this brand only.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddAdminOpen(true)}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Admin</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Administrator Name</th>
                <th className="py-2.5 px-3">Login Email</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentBrand.admins.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{adm.full_name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{adm.email}</td>
                  <td className="py-2.5 px-3 text-slate-600">{adm.phone || '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetAdminPass(adm.id, adm.email)}
                      className="h-7 px-2 text-[11px]"
                    >
                      <KeyRound className="h-3 w-3 mr-1 text-slate-600" />
                      <span>Reset Password</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. REGISTERED OUTLETS UNDER THIS BRAND */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Store className="h-4 w-4 text-slate-700" />
              <span>Registered Outlets (<Count value={shops.length} />)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Cafe branches created by the brand admin. Managers enter daily transactions for these shops.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Outlet Name</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Address</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shops.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{s.name}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">{s.code}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.address || '—'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{s.phone || '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT BRAND LEGAL DETAILS MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Building2 className="h-5 w-5 text-slate-800" />
              <span>Edit Brand Details &amp; Slug</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Brand Name *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Portal URL Slug *</label>
                <input
                  type="text"
                  required
                  value={editSlug}
                  onChange={(e) =>
                    setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Registration No *</label>
                <input
                  type="text"
                  required
                  value={editRegNo}
                  onChange={(e) => setEditRegNo(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Registered Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">GSTIN</label>
              <input
                type="text"
                value={editGstin}
                onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg"
              />
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-600 flex items-center justify-between gap-2">
              <span>Logos, colors, fonts, layout &amp; PDF styles live in Brand Theme Studio.</span>
              <Link
                href={`/master/brands/${currentBrand.id}/theme`}
                onClick={() => setIsEditOpen(false)}
                className="font-semibold text-slate-900 underline shrink-0"
              >
                Open Studio
              </Link>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD ADMIN MODAL */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Shield className="h-5 w-5 text-slate-800" />
              <span>Add Brand Administrator</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Administrator Name *</label>
              <input
                type="text"
                required
                placeholder="Rohan Sharma"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Login Email *</label>
              <input
                type="email"
                required
                placeholder="rohan@brand.in"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                placeholder="+91 98000 00000"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Temporary Password *</span>
                <span className="text-[10px] text-amber-700">must_change_password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddAdminOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white">
                {isSubmitting ? 'Onboarding...' : 'Onboard Administrator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREDENTIALS DIALOG */}
      <Dialog open={!!tempPassModal} onOpenChange={(open) => !open && setTempPassModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              <span>Admin Login Credentials</span>
            </DialogTitle>
          </DialogHeader>

          {tempPassModal && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600">Share these temporary login details with the administrator:</p>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 font-mono text-emerald-950 space-y-1">
                <div>Email: <strong>{tempPassModal.email}</strong></div>
                <div>Temporary Password: <strong>{tempPassModal.pass}</strong></div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${tempPassModal.email}\nPassword: ${tempPassModal.pass}`);
                    toast.success('Copied to clipboard');
                    setTempPassModal(null);
                  }}
                  className="w-full bg-slate-900 text-white"
                >
                  Copy & Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

