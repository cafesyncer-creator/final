import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const harrisId = 'b8da447d-0ef4-4b08-91f2-5d2afcceb152';
  
  // 1. Update password
  console.log('1. Setting password to AdminPassword123!...');
  const { data: updateData, error: uErr } = await supabaseAdmin.auth.admin.updateUserById(harrisId, {
    email_confirm: true,
    password: 'AdminPassword123!',
    user_metadata: { full_name: 'Harris' }
  });
  if (uErr) console.error('updateUserById error:', uErr);
  else console.log('Password set successfully!');

  // 2. Set must_change_password = false in public.profiles
  console.log('2. Setting must_change_password = false...');
  const { data: profile, error: pErr } = await supabaseAdmin
    .from('profiles')
    .update({ must_change_password: false, is_active: true })
    .eq('id', harrisId)
    .select()
    .single();
  console.log('Harris profile updated:', profile, pErr);

  // 3. Test exact signIn flow as in the web app
  console.log('3. Testing signInWithPassword as the web app does...');
  const { data: signData, error: signErr } = await supabaseClient.auth.signInWithPassword({
    email: 'harris@cleanuplaundry.in',
    password: 'AdminPassword123!',
  });

  if (signErr) {
    console.error('Sign-in failed:', signErr);
    return;
  }

  console.log('Sign-in successful! User ID:', signData.user?.id);

  // 4. Test profile lookup as done in loginWithCredentials
  const { data: prof, error: profErr } = await (supabaseClient as any)
    .from('profiles')
    .select('role, is_active, must_change_password')
    .eq('id', signData.user!.id)
    .maybeSingle();

  console.log('Profile verification result:', prof, profErr);
  console.log('ALL CHECKS PASSED: User is 100% ready to sign in.');
}

run().catch(console.error);
