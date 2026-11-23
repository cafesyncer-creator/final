import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DEMO_USERS } from '@/lib/demo-data';

export interface LoginResult {
  success: boolean;
  error?: string;
  mustChangePassword?: boolean;
}

export async function loginWithCredentials(
  identifierRaw: string,
  passwordRaw: string
): Promise<LoginResult> {
  const identifier = identifierRaw.trim().toLowerCase();
  const password = passwordRaw;

  if (!identifier || !password) {
    return { success: false, error: 'Please enter both username/email and password.' };
  }

  const configured = isSupabaseConfigured();

  // Demo Mode Handler
  if (!configured) {
    const demoUsersList = Object.values(DEMO_USERS) as any[];
    const demoMaster =
      demoUsersList.find(
        (u) =>
          u.email?.toLowerCase() === identifier ||
          (u.phone && u.phone === identifier) ||
          (u.role === 'master' && (identifier === 'master' || identifier === 'admin'))
      ) ||
      demoUsersList.find((u) => u.role === 'master') ||
      demoUsersList[0];

    if (demoMaster && (password === 'password123' || password === 'admin123' || password.length >= 6)) {
      if (demoMaster.role !== 'master' && demoMaster.role !== 'platform_admin') {
        return {
          success: false,
          error: 'This portal is for the Platform Master only. Brand Admins and Shop Managers should sign in to their respective portals.',
        };
      }

      localStorage.setItem(
        'cafesync_demo_user',
        JSON.stringify({
          id: demoMaster.id,
          email: demoMaster.email,
          role: demoMaster.role,
          fullName: demoMaster.fullName,
        })
      );

      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. For offline testing, use master@cafeledger.io with password123.',
    };
  }

  try {
    // 1. Resolve email if user entered a username
    let emailToAuth = identifier;
    if (!identifier.includes('@')) {
      const { data: resolvedEmail } = await (supabase as any).rpc(
        'get_login_email_for_username',
        {
          p_username: identifier,
          p_brand_id: null,
        }
      );

      if (resolvedEmail) {
        emailToAuth = resolvedEmail;
      } else if (identifier === 'master') {
        emailToAuth = 'cafesync@gmail.com';
      } else {
        emailToAuth = `${identifier}@master.cafesync.app`;
      }
    }

    // 2. Sign in with password
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (authError && (identifier === 'master' || identifier === 'cafesync@gmail.com')) {
      const fallback = await supabase.auth.signInWithPassword({
        email: 'master@cafeledger.io',
        password,
      });
      if (fallback.data?.user) {
        authData = fallback.data;
        authError = null;
      }
    }

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Invalid username/email or password.' };
    }

    // 3. Verify role
    const { data: profile, error: profError } = await (supabase as any)
      .from('profiles')
      .select('id, role, is_active, must_change_password')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profError || !profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'User profile not found.' };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return { success: false, error: 'This account has been deactivated. Please contact support.' };
    }

    if (profile.role !== 'master' && (profile.role as string) !== 'platform_admin') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This portal is for Platform Master only. Brand Admins and Shop Managers should sign in to their respective portals.',
      };
    }

    return {
      success: true,
      mustChangePassword: Boolean(profile.must_change_password),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during login.' };
  }
}

export async function changeMasterPasswordAction(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { error: authErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (authErr) return { success: false, error: authErr.message };

    await (supabase as any).from('audit_log').insert({
      user_id: authUser.user.id,
      action: 'CHANGE_MASTER_PASSWORD',
      table_name: 'profiles',
      record_id: authUser.user.id,
      new_data: { timestamp: new Date().toISOString() },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeFirstLoginPasswordChangeAction(payload: {
  newPassword: string;
  confirmPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { newPassword, confirmPassword } = payload;
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }
  if (confirmPassword && newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const { error: authErr } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (authErr) return { success: false, error: authErr.message };

    const { error: profErr } = await (supabase as any)
      .from('profiles')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id);

    if (profErr) return { success: false, error: profErr.message };

    await (supabase as any).from('audit_log').insert({
      user_id: authUser.user.id,
      action: 'FIRST_LOGIN_PASSWORD_CHANGE',
      table_name: 'profiles',
      record_id: authUser.user.id,
      new_data: { completed: true },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

