import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  generateReadablePassword,
  slugifyUsername,
  isValidUsername,
  buildSyntheticEmail,
} from '@/lib/passwords';
import { DEMO_ADMIN_SHOPS } from '@/lib/demo-admin-data';

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper to get active session profile
async function getCallerProfile() {
  if (!isSupabaseConfigured()) {
    return {
      id: 'demo-admin-user-id',
      brandId: 'demo-brand-1',
      role: 'admin',
      fullName: 'Demo Administrator',
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, brand_id, full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: profile.id,
    brandId: profile.brand_id,
    role: profile.role,
    fullName: profile.full_name,
  };
}

async function getBrandSlug(brandId: string): Promise<string> {
  if (!isSupabaseConfigured()) return 'snaxia';
  const { data } = await (supabase as any)
    .from('brands')
    .select('slug')
    .eq('id', brandId)
    .maybeSingle();
  return data?.slug || 'brand';
}

// -----------------------------------------------------------------------------
// 1. SHOPS ACTIONS
// -----------------------------------------------------------------------------

export async function createShopAction(formData: {
  name: string;
  code: string;
  address?: string;
  phone?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized. Admin credentials required.' };
  }

  const name = formData.name.trim();
  const code = formData.code.trim().toUpperCase();
  const address = formData.address?.trim() || '';
  const phone = formData.phone?.trim() || '';

  if (!name || !code) {
    return { success: false, error: 'Shop name and unique code are required.' };
  }

  if (!isSupabaseConfigured()) {
    const newShop = {
      id: `shop-${Date.now()}`,
      brand_id: caller.brandId,
      name,
      code,
      address,
      phone,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      managers: [],
    };
    return { success: true, data: newShop };
  }

  try {
    // Check code uniqueness within brand
    const { data: existing } = await (supabase as any)
      .from('shops')
      .select('id')
      .eq('brand_id', caller.brandId)
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Shop code "${code}" is already in use for this brand.` };
    }

    const { data: newShop, error } = await (supabase as any)
      .from('shops')
      .insert({
        brand_id: caller.brandId,
        name,
        code,
        address,
        phone,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Audit log
    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'CREATE',
      table_name: 'shops',
      record_id: newShop.id,
      new_data: { name, code, address, phone },
    });

    return { success: true, data: newShop };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create shop' };
  }
}

export async function updateShopAction(formData: {
  shopId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { shopId } = formData;
  const name = formData.name.trim();
  const code = formData.code.trim().toUpperCase();
  const address = formData.address?.trim() || '';
  const phone = formData.phone?.trim() || '';

  if (!shopId || !name || !code) {
    return { success: false, error: 'Shop ID, name, and unique code are required.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true, data: { id: shopId, name, code, address, phone } };
  }

  try {
    const { data: existing } = await (supabase as any)
      .from('shops')
      .select('id')
      .eq('brand_id', caller.brandId)
      .eq('code', code)
      .neq('id', shopId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Shop code "${code}" is already used by another outlet in this brand.` };
    }

    const { data: updated, error } = await (supabase as any)
      .from('shops')
      .update({
        name,
        code,
        address,
        phone,
        ...(formData.status ? { status: formData.status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId)
      .eq('brand_id', caller.brandId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'shops',
      record_id: shopId,
      new_data: { name, code, address, phone },
    });

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update shop' };
  }
}

export async function toggleShopStatusAction(
  shopId: string,
  status: 'active' | 'inactive'
): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!shopId) return { success: false, error: 'Shop ID is required.' };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await (supabase as any)
      .from('shops')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .eq('brand_id', caller.brandId);

    if (error) {
      return { success: false, error: error.message };
    }

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'shops',
      record_id: shopId,
      new_data: { status },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle shop status' };
  }
}

export async function deleteShopAction(shopId: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized. Admin credentials required.' };
  }

  if (!shopId) return { success: false, error: 'Shop ID required.' };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data: result, error: rpcErr } = await (supabase as any).rpc('rpc_admin_delete_shop', {
      p_shop_id: shopId,
    });

    if (rpcErr || !result?.success) {
      return {
        success: false,
        error: result?.error || rpcErr?.message || 'Failed to delete shop',
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete shop' };
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVILEGED EDGE FUNCTION ACTIONS: CREATE SHOP + MANAGER, ADD MANAGER, RESET PASSWORD
// -----------------------------------------------------------------------------

export async function createShopWithManagerAction(formData: {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  managerName: string;
  managerPhone?: string;
  username: string;
  temporaryPassword?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized. Admin credentials required.' };
  }

  const name = formData.name.trim();
  const code = formData.code.trim().toUpperCase();
  const address = formData.address?.trim() || '';
  const phone = formData.phone?.trim() || '';
  const managerName = formData.managerName.trim();
  const managerPhone = formData.managerPhone?.trim() || '';
  const username = slugifyUsername(formData.username || '');
  const tempPassword = (formData.temporaryPassword || '').trim() || generateReadablePassword();

  if (!name || !code) {
    return { success: false, error: 'Shop name and code are required.' };
  }
  if (!managerName) {
    return { success: false, error: 'Manager full name is required.' };
  }
  if (!username || !isValidUsername(username)) {
    return {
      success: false,
      error: 'Username must be 3-30 characters using only lowercase letters, numbers, hyphens or underscores.',
    };
  }

  const brandSlug = await getBrandSlug(caller.brandId);
  const syntheticEmail = buildSyntheticEmail(username, brandSlug);
  const loginPath = `/login/${brandSlug}`;

  if (!isSupabaseConfigured()) {
    const shopId = `shop-${Date.now()}`;
    const shopPayload = {
      id: shopId,
      brand_id: caller.brandId,
      name,
      code,
      address,
      phone,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      managers: [
        {
          id: `mgr-${Date.now()}`,
          full_name: managerName,
          email: syntheticEmail,
          username,
          phone: managerPhone,
          is_active: true,
          must_change_password: true,
        },
      ],
    };
    return {
      success: true,
      data: {
        shop: shopPayload,
        credentials: {
          shopName: name,
          shopCode: code,
          managerName,
          loginPath,
          username,
          password: tempPassword,
        },
      },
    };
  }

  try {
    const { data: result, error: rpcErr } = await (supabase as any).rpc('rpc_admin_create_shop_with_manager', {
      p_name: name,
      p_code: code,
      p_manager_name: managerName,
      p_username: username,
      p_password: tempPassword,
      p_address: address || null,
      p_phone: phone || null,
      p_manager_phone: managerPhone || null,
      p_brand_id: caller.brandId,
    });

    if (rpcErr || !result?.success) {
      return {
        success: false,
        error: result?.error || rpcErr?.message || 'Failed to create shop and manager account',
      };
    }

    return {
      success: true,
      data: {
        shop: result.shop,
        credentials: {
          shopName: result.credentials?.shopName || name,
          shopCode: result.credentials?.shopCode || code,
          managerName: result.credentials?.managerName || managerName,
          loginPath: result.credentials?.loginPath || loginPath,
          username: result.credentials?.username || username,
          password: result.credentials?.password || tempPassword,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create shop and manager' };
  }
}

export async function createManagerUserAction(formData: {
  shopId: string;
  fullName: string;
  phone?: string;
  username: string;
  temporaryPassword?: string;
  email?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { shopId } = formData;
  const fullName = formData.fullName.trim();
  const phone = formData.phone?.trim() || '';
  const username = slugifyUsername(formData.username || '');
  const tempPassword = (formData.temporaryPassword || '').trim() || generateReadablePassword();

  if (!shopId) return { success: false, error: 'Shop assignment is required.' };
  if (!fullName) return { success: false, error: 'Full name is required.' };
  if (!username || !isValidUsername(username)) {
    return {
      success: false,
      error: 'Username must be 3-30 characters using only lowercase letters, numbers, hyphens or underscores.',
    };
  }

  const brandSlug = await getBrandSlug(caller.brandId);
  const loginPath = `/login/${brandSlug}`;

  if (!isSupabaseConfigured()) {
    const dummyShop = DEMO_ADMIN_SHOPS.find((s) => s.id === shopId) || DEMO_ADMIN_SHOPS[0];
    return {
      success: true,
      data: {
        user: {
          id: `usr-${Date.now()}`,
          full_name: fullName,
          username,
          phone,
          role: 'manager',
          shop_id: shopId,
          is_active: true,
        },
        credentials: {
          shopName: dummyShop?.name || 'Assigned Outlet',
          shopCode: dummyShop?.code || 'SHOP',
          managerName: fullName,
          loginPath,
          username,
          password: tempPassword,
        },
      },
    };
  }

  try {
    const { data: result, error: rpcErr } = await (supabase as any).rpc('rpc_admin_create_manager_user', {
      p_shop_id: shopId,
      p_full_name: fullName,
      p_username: username,
      p_password: tempPassword,
      p_phone: phone || null,
      p_email: formData.email?.trim() || null,
    });

    if (rpcErr || !result?.success) {
      return {
        success: false,
        error: result?.error || rpcErr?.message || 'Failed to create manager user',
      };
    }

    return {
      success: true,
      data: {
        user: result.user,
        credentials: {
          shopName: result.credentials?.shopName || 'Outlet',
          shopCode: result.credentials?.shopCode || 'SHOP',
          managerName: result.credentials?.managerName || fullName,
          loginPath: result.credentials?.loginPath || loginPath,
          username: result.credentials?.username || username,
          password: result.credentials?.password || tempPassword,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create manager user' };
  }
}

export async function toggleUserStatusAction(userId: string, isActive: boolean): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!userId) return { success: false, error: 'User ID is required.' };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'profiles',
      record_id: userId,
      new_data: { is_active: isActive },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reassignUserShopAction(userId: string, newShopId: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!userId || !newShopId) return { success: false, error: 'User ID and Shop ID are required.' };

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ shop_id: newShopId, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };

    await (supabase as any).from('audit_log').insert({
      user_id: caller.id,
      action: 'UPDATE',
      table_name: 'profiles',
      record_id: userId,
      new_data: { shop_id: newShopId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetManagerPasswordAction(
  userId: string,
  temporaryPassword?: string
): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!userId) return { success: false, error: 'User ID is required.' };
  const tempPassword = (temporaryPassword || '').trim() || generateReadablePassword();

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      data: {
        credentials: {
          shopName: 'Assigned Shop',
          shopCode: 'SHOP',
          managerName: 'Manager User',
          loginPath: '/login/snaxia',
          username: 'manager',
          password: tempPassword,
        },
      },
    };
  }

  try {
    const { data: result, error: rpcErr } = await (supabase as any).rpc('rpc_admin_reset_manager_password', {
      p_user_id: userId,
      p_password: tempPassword,
    });

    if (rpcErr || !result?.success) {
      return {
        success: false,
        error: result?.error || rpcErr?.message || 'Failed to reset password',
      };
    }

    return {
      success: true,
      data: {
        credentials: result.credentials,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reset manager password' };
  }
}

// -----------------------------------------------------------------------------
// 3. ITEMS & PAYMENT MODES ACTIONS
// -----------------------------------------------------------------------------

export async function saveItemAction(formData: {
  id?: string;
  name: string;
  type?: 'sale' | 'expense';
  kind?: 'income' | 'expense';
  defaultRate?: number | null;
  category?: string;
  unit?: string;
  shopId?: string | null;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const name = formData.name.trim();
  if (!name) return { success: false, error: 'Item name is required.' };

  const itemType = formData.kind === 'income' ? 'sale' : (formData.kind === 'expense' ? 'expense' : formData.type || 'sale');

  const payload: any = {
    brand_id: caller.brandId,
    name,
    type: itemType,
    default_rate: formData.defaultRate || null,
    category: formData.category?.trim() || null,
    unit: formData.unit?.trim() || 'pcs',
    shop_id: formData.shopId || null,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return { success: true, data: { id: formData.id || `item-${Date.now()}`, ...payload, is_active: true } };
  }

  try {
    if (formData.id) {
      const { data, error } = await (supabase as any)
        .from('items')
        .update(payload)
        .eq('id', formData.id)
        .eq('brand_id', caller.brandId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } else {
      payload.is_active = true;
      const { data, error } = await (supabase as any)
        .from('items')
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleItemStatusAction(itemId: string, isActive: boolean): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!itemId) return { success: false, error: 'Item ID required.' };
  if (!isSupabaseConfigured()) return { success: true };

  try {
    const { error } = await (supabase as any)
      .from('items')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function promoteItemBrandWideAction(itemId: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!itemId) return { success: false, error: 'Item ID required.' };
  if (!isSupabaseConfigured()) return { success: true };

  try {
    const { data, error } = await (supabase as any).rpc('rpc_admin_promote_item_brand_wide', {
      p_item_id: itemId,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePaymentModeAction(formData: { id?: string; name: string }): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const name = formData.name.trim().toUpperCase();
  if (!name) return { success: false, error: 'Payment mode name is required.' };

  if (!isSupabaseConfigured()) {
    return { success: true, data: { id: formData.id || `mode-${Date.now()}`, name, is_active: true } };
  }

  try {
    if (formData.id) {
      const { data, error } = await (supabase as any)
        .from('payment_modes')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', formData.id)
        .eq('brand_id', caller.brandId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } else {
      const { data, error } = await (supabase as any)
        .from('payment_modes')
        .insert({
          brand_id: caller.brandId,
          name,
          is_active: true,
        })
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function togglePaymentModeStatusAction(modeId: string, isActive: boolean): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!modeId) return { success: false, error: 'Mode ID required.' };
  if (!isSupabaseConfigured()) return { success: true };

  try {
    const { error } = await (supabase as any)
      .from('payment_modes')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', modeId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 4. EMPLOYEES ACTIONS
// -----------------------------------------------------------------------------

export async function saveEmployeeAction(formData: {
  id?: string;
  name: string;
  role?: string;
  roleTitle?: string;
  phone?: string;
  baseSalary?: number;
  ratePerDay?: number;
  isActive?: boolean;
  shopId: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const name = formData.name.trim();
  const role = (formData.roleTitle || formData.role || 'Staff').trim();
  const phone = formData.phone?.trim() || '';
  const baseSalary = formData.ratePerDay ?? formData.baseSalary ?? 0;
  const { shopId } = formData;

  if (!name || !role || !shopId) {
    return { success: false, error: 'Employee name, role, and shop assignment are required.' };
  }

  const payload: any = {
    brand_id: caller.brandId,
    shop_id: shopId,
    name,
    role,
    phone,
    base_salary: baseSalary,
    updated_at: new Date().toISOString(),
  };
  if (formData.isActive !== undefined) {
    payload.is_active = formData.isActive;
  }

  if (!isSupabaseConfigured()) {
    return { success: true, data: { id: formData.id || `emp-${Date.now()}`, ...payload, is_active: true } };
  }

  try {
    if (formData.id) {
      const { data, error } = await (supabase as any)
        .from('employees')
        .update(payload)
        .eq('id', formData.id)
        .eq('brand_id', caller.brandId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } else {
      payload.is_active = true;
      const { data, error } = await (supabase as any)
        .from('employees')
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleEmployeeStatusAction(employeeId: string, isActive: boolean): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!employeeId) return { success: false, error: 'Employee ID required.' };
  if (!isSupabaseConfigured()) return { success: true };

  try {
    const { error } = await (supabase as any)
      .from('employees')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', employeeId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 5. ASSETS & SERVICE ACTIONS
// -----------------------------------------------------------------------------

export async function saveAssetAction(formData: {
  id?: string;
  name: string;
  serialNumber?: string;
  modelNumber?: string;
  serviceCycleDays?: number;
  nextServiceDue?: string;
  shopId: string;
  category?: string;
  model?: string;
  serialNo?: string;
  purchaseDate?: string;
  cost?: number;
  vendor?: string;
  status?: string;
  serviceIntervalDays?: number;
  notes?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const name = formData.name.trim();
  const serialNumber = (formData.serialNo || formData.serialNumber)?.trim() || null;
  const modelNumber = (formData.model || formData.modelNumber)?.trim() || null;
  const serviceCycleDays = formData.serviceIntervalDays || formData.serviceCycleDays || 90;
  const nextServiceDue = formData.nextServiceDue || null;
  const { shopId } = formData;

  if (!name || !shopId) return { success: false, error: 'Asset name and assigned shop are required.' };

  const payload: any = {
    brand_id: caller.brandId,
    shop_id: shopId,
    name,
    category: formData.category || 'other',
    model: modelNumber,
    serial_no: serialNumber,
    serial_number: serialNumber,
    model_number: modelNumber,
    purchase_date: formData.purchaseDate || null,
    cost: formData.cost || null,
    vendor: formData.vendor || null,
    status: formData.status || 'working',
    service_cycle_days: serviceCycleDays,
    service_interval_days: serviceCycleDays,
    next_service_due: nextServiceDue,
    notes: formData.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return { success: true, data: { id: formData.id || `asset-${Date.now()}`, ...payload, status: 'operational' } };
  }

  try {
    if (formData.id) {
      const { data, error } = await (supabase as any)
        .from('assets')
        .update(payload)
        .eq('id', formData.id)
        .eq('brand_id', caller.brandId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } else {
      payload.status = 'operational';
      const { data, error } = await (supabase as any)
        .from('assets')
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAssetAction(assetId: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!assetId) return { success: false, error: 'Asset ID required.' };
  if (!isSupabaseConfigured()) return { success: true };

  try {
    const { error } = await (supabase as any)
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('brand_id', caller.brandId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function logAdminAssetServiceAction(formData: {
  assetId: string;
  shopId: string;
  serviceDate: string;
  cost?: number;
  technicianName?: string;
  notes?: string;
  nextServiceDays?: number;
  vendor?: string;
  nextDue?: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!formData.assetId || !formData.shopId || !formData.serviceDate) {
    return { success: false, error: 'Equipment, shop, and service date are required.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data, error } = await (supabase as any).rpc('rpc_shop_log_asset_service', {
      p_equipment_id: formData.assetId,
      p_service_date: formData.serviceDate,
      p_cost: formData.cost || 0,
      p_notes: formData.notes || '',
      p_service_type: 'maintenance',
      p_vendor_name: formData.vendor || formData.technicianName || '',
      p_record_expense: (formData.cost || 0) > 0,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 6. PERIOD SETTINGS ACTIONS (ATOMIC RPCS)
// -----------------------------------------------------------------------------

export async function updateBrandSettingsAction(_formData: any): Promise<ActionResult> {
  return {
    success: false,
    error: 'Notice: Platform Master modifies brand appearance. Brand Administrators customize outlet configurations directly.',
  };
}

export async function closeMonthAction(shopId: string, month: string): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  if (!shopId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return { success: false, error: 'Valid shop and month (YYYY-MM) are required.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data, error } = await (supabase as any).rpc('rpc_admin_close_month', {
      p_shop_id: shopId,
      p_month: month,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function overrideMonthOpeningAction(formData: {
  shopId: string;
  month: string;
  openingBalance: number;
  note: string;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { shopId, month, openingBalance, note } = formData;
  if (!shopId || !month || !note?.trim()) {
    return { success: false, error: 'Shop, month, opening balance, and an audit note are required for manual overrides.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data, error } = await (supabase as any).rpc('rpc_admin_override_month_opening', {
      p_shop_id: shopId,
      p_month: month,
      p_opening_balance: openingBalance,
      p_note: note.trim(),
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// 7. ATOMIC EXCEL IMPORTER RPC
// -----------------------------------------------------------------------------

export async function importExcelTransactionsAction(data: {
  shopId: string;
  month: string;
  openingBalance: number;
  rows: Array<{
    date: string;
    description: string;
    mop: string;
    income: number;
    expense: number;
    isSalaryAdvance?: boolean;
    employeeName?: string;
  }>;
}): Promise<ActionResult> {
  const caller = await getCallerProfile();
  if (!caller || !['admin', 'brand_admin', 'master', 'platform_admin'].includes(caller.role) || !caller.brandId) {
    return { success: false, error: 'Unauthorized.' };
  }

  const { shopId, month, openingBalance, rows } = data;
  if (!shopId || !month || !rows || rows.length === 0) {
    return { success: false, error: 'Shop, month, and transaction rows are required.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      data: {
        importedCount: rows.length,
        skippedCount: 0,
        duplicates: [],
      },
    };
  }

  try {
    // 1. Create or register import_batch entry
    let importBatchId: string | null = null;
    try {
      const { data: batch } = await (supabase as any)
        .from('import_batches')
        .insert({
          created_by: caller.id,
          file_names: [`monthly-statement-${month}.xlsx`],
          mode: 'legacy',
          status: 'completed',
          metadata: { shop_id: shopId, month, opening_balance: openingBalance },
        })
        .select('id')
        .maybeSingle();
      if (batch?.id) importBatchId = batch.id;
    } catch {}

    // 2. Call atomic chunk importer RPC
    const chunkSize = 100;
    let totalImported = 0;
    let totalSkipped = 0;
    const allDuplicates: any[] = [];

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const isFirstChunk = i === 0;

      const { data: res, error } = await (supabase as any).rpc('rpc_admin_import_excel_chunk', {
        p_shop_id: shopId,
        p_month: month,
        p_opening_balance: isFirstChunk ? openingBalance : null,
        p_import_batch_id: importBatchId,
        p_rows: chunk,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (res) {
        totalImported += res.imported_count || 0;
        totalSkipped += res.skipped_count || 0;
        if (Array.isArray(res.duplicates)) {
          allDuplicates.push(...res.duplicates);
        }
      }
    }

    return {
      success: true,
      data: {
        importedCount: totalImported,
        skippedCount: totalSkipped,
        duplicates: allDuplicates,
        batchId: importBatchId,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to import Excel transactions' };
  }
}
