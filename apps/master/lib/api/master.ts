import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DEFAULT_SEED_CONFIG } from '@/lib/master-constants';
import { buildDefaultBrandSettings, slugifyBrandName } from '@/lib/theme/presets';
import { normalizeHex } from '@/lib/theme/colors';
import { isValidCuratedFont } from '@/lib/theme/font-options';
import type { BrandSettings } from '@/lib/theme/types';

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getCallerProfile() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return null;

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    ...profile,
    email: authData.user.email,
  };
}

// -----------------------------------------------------------------------------
// 1. BRAND CREATION & ONBOARDING
// -----------------------------------------------------------------------------

export async function createBrandAction(formData: {
  name: string;
  slug?: string;
  registrationNo: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  // First Admin Account
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword?: string;
}): Promise<ActionResult> {
  const {
    name,
    registrationNo,
    primaryColor,
    secondaryColor,
    logoUrl,
    address,
    phone,
    email,
    gstin,
    adminName,
    adminEmail,
    adminPhone,
  } = formData;

  const tempAdminPassword = formData.adminPassword || 'AdminPass' + Math.floor(1000 + Math.random() * 9000) + '!';

  if (!name.trim() || !registrationNo.trim() || !adminName.trim() || !adminEmail.trim()) {
    return { success: false, error: 'Brand name, registration number, and first administrator details are required.' };
  }

  const cleanSlug = slugifyBrandName(formData.slug?.trim() || name.trim());
  const cleanPrimary = normalizeHex(primaryColor, '#ea580c');
  const cleanSecondary = normalizeHex(secondaryColor, '#9a3412');

  if (!isSupabaseConfigured()) {
    const brandId = `11111111-1111-4444-8888-${Date.now().toString().slice(-12).padStart(12, '0')}`;
    return {
      success: true,
      data: {
        brand: {
          id: brandId,
          name: name.trim(),
          slug: cleanSlug,
          registration_no: registrationNo.trim().toUpperCase(),
        },
        adminEmail: adminEmail.trim(),
        adminPassword: tempAdminPassword,
      },
    };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    // 1. Check registration number uniqueness
    const { data: existingBrand } = await (supabase as any)
      .from('brands')
      .select('id')
      .eq('registration_no', registrationNo.trim().toUpperCase())
      .maybeSingle();

    if (existingBrand) {
      return { success: false, error: `Registration number "${registrationNo}" is already taken.` };
    }

    // Check slug uniqueness
    let finalSlug = cleanSlug;
    const { data: slugConflict } = await (supabase as any)
      .from('brands')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (slugConflict) {
      finalSlug = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // 2. Insert into brands
    const { data: newBrand, error: brandErr } = await (supabase as any)
      .from('brands')
      .insert({
        name: name.trim(),
        slug: finalSlug,
        registration_no: registrationNo.trim().toUpperCase(),
        primary_color: cleanPrimary,
        secondary_color: cleanSecondary,
        logo_url: logoUrl?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        gstin: gstin?.trim() || null,
        status: 'active',
      })
      .select()
      .single();

    if (brandErr) {
      return { success: false, error: `Brand creation failed: ${brandErr.message}` };
    }

    const brandId = newBrand.id;

    // Seed / sync brand_settings immediately
    await (supabase as any).from('brand_settings').upsert({
      brand_id: brandId,
      logo_url: logoUrl?.trim() || null,
      display_name: name.trim(),
      primary_color: cleanPrimary,
      secondary_color: cleanSecondary,
      welcome_message: `Welcome back to ${name.trim()}`,
      updated_by: caller.id,
      updated_at: new Date().toISOString(),
    });

    // 3. Create First Administrator Account
    // Try via RPC 'rpc_master_create_brand_admin' first (atomic, zero Edge function dependency)
    let adminCreated = false;
    let adminError: string | null = null;

    try {
      const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('rpc_master_create_brand_admin', {
        p_brand_id: brandId,
        p_name: adminName.trim(),
        p_email: adminEmail.trim().toLowerCase(),
        p_phone: adminPhone?.trim() || null,
        p_password: tempAdminPassword,
      });

      if (!rpcErr && rpcRes?.success) {
        adminCreated = true;
      } else if (rpcErr && rpcErr.code !== 'PGRST202') {
        adminError = rpcErr.message;
      }
    } catch (e: any) {
      adminError = e?.message;
    }

    // Fallback to Edge function if RPC not present
    if (!adminCreated) {
      try {
        const { data: adminResult, error: adminErr } = await supabase.functions.invoke('create-brand-admin', {
          body: {
            brandId,
            name: adminName.trim(),
            email: adminEmail.trim().toLowerCase(),
            phone: adminPhone?.trim() || '',
            temporaryPassword: tempAdminPassword,
          },
        });

        if (!adminErr && adminResult?.success) {
          adminCreated = true;
        } else if (adminErr) {
          adminError = adminResult?.error || adminErr.message;
        }
      } catch (e: any) {
        adminError = e?.message;
      }
    }

    if (!adminCreated) {
      console.warn(`Brand "${name}" created (ID: ${brandId}), but admin creation requires RPC or Edge Function:`, adminError);
    }

    // 4. Seed Default Payment Modes
    for (const mode of DEFAULT_SEED_CONFIG.paymentModes) {
      await (supabase as any).from('payment_modes').insert({
        brand_id: brandId,
        name: mode,
        is_active: true,
      });
    }

    // 5. Seed Starter Expense Items
    for (const exp of DEFAULT_SEED_CONFIG.expenseItems) {
      await (supabase as any).from('items').insert({
        brand_id: brandId,
        name: exp.name,
        kind: 'expense',
        type: 'expense',
        category: exp.category,
        is_active: true,
      });
    }

    // 6. Seed Starter Income Items
    for (const inc of DEFAULT_SEED_CONFIG.incomeItems) {
      await (supabase as any).from('items').insert({
        brand_id: brandId,
        name: inc.name,
        kind: 'income',
        type: 'sale',
        category: inc.category,
        is_active: true,
      });
    }

    // 7. Write Audit Log
    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'CREATE',
      table_name: 'brands',
      record_id: brandId,
      new_data: {
        brand_name: name.trim(),
        slug: finalSlug,
        registration_no: registrationNo.trim(),
        admin_email: adminEmail.trim(),
      },
    });

    return {
      success: true,
      data: {
        brand: { ...newBrand, slug: finalSlug },
        adminEmail,
        adminPassword: tempAdminPassword,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to onboard brand' };
  }
}

// -----------------------------------------------------------------------------
// 2. BRAND UPDATES & STATUS (SUSPEND / REACTIVATE)
// -----------------------------------------------------------------------------

export async function updateBrandAction(formData: {
  brandId: string;
  name: string;
  slug?: string;
  registrationNo: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}): Promise<ActionResult> {
  const { brandId, name, slug, registrationNo, address, phone, email, gstin } = formData;
  const cleanSlug = slug ? slugifyBrandName(slug) : undefined;

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      registration_no: registrationNo.trim().toUpperCase(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      gstin: gstin?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (cleanSlug) updatePayload.slug = cleanSlug;
    if (formData.primaryColor) updatePayload.primary_color = normalizeHex(formData.primaryColor);
    if (formData.secondaryColor) updatePayload.secondary_color = normalizeHex(formData.secondaryColor);
    if (formData.logoUrl !== undefined) updatePayload.logo_url = formData.logoUrl?.trim() || null;

    const { data: updated, error } = await (supabase as any)
      .from('brands')
      .update(updatePayload)
      .eq('id', brandId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'brands',
      record_id: brandId,
      new_data: { name, slug: updated?.slug, registrationNo },
    });

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleBrandStatusAction(brandId: string, status: 'active' | 'suspended'): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    // 1. Update brand status
    const { data: updatedBrand, error } = await (supabase as any)
      .from('brands')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)
      .select('slug')
      .single();

    if (error) return { success: false, error: error.message };

    // 2. Cascade suspension/activation: suspend or reactivate all profiles under this brand
    const isActive = status === 'active';
    await (supabase as any)
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('brand_id', brandId);

    // 3. Audit log
    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: status === 'suspended' ? 'SUSPEND' : 'REACTIVATE',
      table_name: 'brands',
      record_id: brandId,
      new_data: { status, cascade_profiles_active: isActive },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBrandAction(brandId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    const { data: result, error: fnErr } = await supabase.functions.invoke('delete-brand', {
      body: { brandId },
    });

    if (fnErr || !result?.success) {
      return {
        success: false,
        error: result?.error || fnErr?.message || 'Failed to delete brand via Edge Function',
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 3. BRAND ADMINISTRATOR ACTIONS
// -----------------------------------------------------------------------------

export async function createBrandAdminAction(formData: {
  brandId: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
}): Promise<ActionResult> {
  const { brandId, name, email, phone } = formData;
  const tempPassword = formData.password || 'AdminPass' + Math.floor(1000 + Math.random() * 9000) + '!';

  if (!brandId || !name.trim() || !email.trim()) {
    return { success: false, error: 'Brand, full name, and email are required.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      data: {
        id: `demo-admin-${Date.now()}`,
        email,
        temporaryPassword: tempPassword,
      },
    };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    // Try RPC first (atomic, zero Edge function dependency)
    try {
      const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('rpc_master_create_brand_admin', {
        p_brand_id: brandId,
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone?.trim() || null,
        p_password: tempPassword,
      });

      if (!rpcErr && rpcRes?.success) {
        return {
          success: true,
          data: {
            id: rpcRes.user_id,
            email,
            temporaryPassword: tempPassword,
          },
        };
      }
    } catch {
      // Fall through to Edge Function
    }

    const { data: result, error: fnErr } = await supabase.functions.invoke('create-brand-admin', {
      body: {
        brandId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        temporaryPassword: tempPassword,
      },
    });

    if (fnErr || !result?.success) {
      return {
        success: false,
        error: result?.error || fnErr?.message || 'Failed to create brand admin via Edge Function',
      };
    }

    return {
      success: true,
      data: {
        id: result.data?.id,
        email,
        temporaryPassword: tempPassword,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetBrandAdminPasswordAction(adminUserId: string, newPassword?: string): Promise<ActionResult> {
  const tempPass = newPassword || 'ResetAdmin' + Math.floor(1000 + Math.random() * 9000) + '!';

  if (!isSupabaseConfigured()) {
    return { success: true, data: { temporaryPassword: tempPass } };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    const { data: result, error: fnErr } = await supabase.functions.invoke('reset-manager-password', {
      body: {
        userId: adminUserId,
        temporaryPassword: tempPass,
      },
    });

    if (fnErr || !result?.success) {
      return {
        success: false,
        error: result?.error || fnErr?.message || 'Failed to reset admin password via Edge Function',
      };
    }

    return { success: true, data: { temporaryPassword: tempPass } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 4. "VIEW AS ADMIN" READ-ONLY AUDIT ACTION
// -----------------------------------------------------------------------------

export async function logViewAsAdminAction(brandId: string, brandName: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'VIEW_AS_ADMIN',
      table_name: 'brands',
      record_id: brandId,
      new_data: {
        brand_name: brandName,
        initiated_by: caller.email,
        note: 'Master opened read-only administrative inspection view',
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 5. THEME STUDIO ACTION
// -----------------------------------------------------------------------------

export interface SaveBrandThemeInput {
  brandId: string;
  slug: string;
  settings: {
    logo_url: string | null;
    logo_dark_url: string | null;
    icon_url: string | null;
    login_bg_url: string | null;
    login_bg_color: string | null;
    display_name: string;
    tagline: string | null;
    welcome_message: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_family: string;
    radius: string;
    sidebar_style: string;
    density: string;
    default_mode: string;
    allow_user_mode_switch: boolean;
    login_layout: string;
    login_logo_size: string;
    pdf_header_style: string;
    pdf_footer_text: string | null;
    pdf_show_address: boolean;
    pdf_show_gstin: boolean;
    pdf_show_registration_no: boolean;
    pdf_signature_line: boolean;
  };
}

export async function saveBrandThemeAction(
  input: SaveBrandThemeInput
): Promise<{ success: boolean; slug?: string; settings?: BrandSettings; error?: string }> {
  const cleanSlug = slugifyBrandName(input.slug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
    return {
      success: false,
      error: 'Invalid URL slug. Use lowercase letters, numbers, and hyphens only.',
    };
  }

  const displayName = (input.settings.display_name || '').trim();
  if (!displayName) {
    return { success: false, error: 'Display name is required.' };
  }

  const normalizedPatch: Partial<BrandSettings> = {
    logo_url: input.settings.logo_url?.trim() || null,
    logo_dark_url: input.settings.logo_dark_url?.trim() || null,
    icon_url: input.settings.icon_url?.trim() || null,
    login_bg_url: input.settings.login_bg_url?.trim() || null,
    login_bg_color: input.settings.login_bg_color
      ? normalizeHex(input.settings.login_bg_color, '#fff7ed')
      : '#fff7ed',
    display_name: displayName,
    tagline: input.settings.tagline?.trim() || null,
    welcome_message: input.settings.welcome_message?.trim() || null,
    primary_color: normalizeHex(input.settings.primary_color, '#ea580c'),
    secondary_color: normalizeHex(input.settings.secondary_color, '#9a3412'),
    accent_color: normalizeHex(input.settings.accent_color, '#f59e0b'),
    font_family: isValidCuratedFont(input.settings.font_family)
      ? input.settings.font_family
      : 'Inter',
    radius: ['sharp', 'rounded', 'pill'].includes(input.settings.radius)
      ? (input.settings.radius as BrandSettings['radius'])
      : 'rounded',
    sidebar_style: ['light', 'dark', 'brand'].includes(input.settings.sidebar_style)
      ? (input.settings.sidebar_style as BrandSettings['sidebar_style'])
      : 'light',
    density: ['comfortable', 'compact'].includes(input.settings.density)
      ? (input.settings.density as BrandSettings['density'])
      : 'comfortable',
    default_mode: input.settings.default_mode === 'dark' ? 'dark' : 'light',
    allow_user_mode_switch: Boolean(input.settings.allow_user_mode_switch),
    login_layout: input.settings.login_layout === 'centered' ? 'centered' : 'split',
    login_logo_size: ['sm', 'md', 'lg'].includes(input.settings.login_logo_size)
      ? (input.settings.login_logo_size as BrandSettings['login_logo_size'])
      : 'md',
    pdf_header_style: input.settings.pdf_header_style === 'centered' ? 'centered' : 'left',
    pdf_footer_text: input.settings.pdf_footer_text?.trim() || null,
    pdf_show_address: Boolean(input.settings.pdf_show_address),
    pdf_show_gstin: Boolean(input.settings.pdf_show_gstin),
    pdf_show_registration_no: Boolean(input.settings.pdf_show_registration_no),
    pdf_signature_line: Boolean(input.settings.pdf_signature_line),
  };

  if (!isSupabaseConfigured()) {
    return { success: true, slug: cleanSlug, settings: normalizedPatch as any };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    const { data: slugConflict } = await (supabase as any)
      .from('brands')
      .select('id, name')
      .eq('slug', cleanSlug)
      .neq('id', input.brandId)
      .maybeSingle();

    if (slugConflict) {
      return {
        success: false,
        error: `Slug "${cleanSlug}" is already used by "${slugConflict.name}".`,
      };
    }

    // 1. Update core brand slug + colors
    const { error: brandErr } = await (supabase as any)
      .from('brands')
      .update({
        slug: cleanSlug,
        logo_url: normalizedPatch.logo_url,
        primary_color: normalizedPatch.primary_color,
        secondary_color: normalizedPatch.secondary_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.brandId);

    if (brandErr) {
      return { success: false, error: brandErr.message };
    }

    // 2. Upsert full brand_settings
    const { data: savedRow, error: settingsErr } = await (supabase as any)
      .from('brand_settings')
      .upsert(
        {
          brand_id: input.brandId,
          ...normalizedPatch,
          updated_by: caller.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'brand_id' }
      )
      .select()
      .single();

    if (settingsErr) {
      return { success: false, error: settingsErr.message };
    }

    // 3. Audit log
    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'brand_settings',
      record_id: input.brandId,
      new_data: {
        slug: cleanSlug,
        display_name: normalizedPatch.display_name,
        primary_color: normalizedPatch.primary_color,
        font_family: normalizedPatch.font_family,
        sidebar_style: normalizedPatch.sidebar_style,
        login_layout: normalizedPatch.login_layout,
      },
    });

    return { success: true, slug: cleanSlug, settings: savedRow as BrandSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save brand theme' };
  }
}

export async function logThemePreviewAsAdminAction(
  brandId: string,
  brandName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const caller = await getCallerProfile();
    if (!caller || (caller.role !== 'master' && (caller.role as string) !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Platform Master access required.' };
    }

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'VIEW_AS_ADMIN',
      table_name: 'brand_settings',
      record_id: brandId,
      new_data: {
        brand_name: brandName,
        source: 'Brand Theme Studio',
        initiated_by: caller.email,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Audit log failed' };
  }
}

