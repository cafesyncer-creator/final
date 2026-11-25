import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const harrisId = 'b8da447d-0ef4-4b08-91f2-5d2afcceb152';
  
  // 1. Check profile
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', harrisId)
    .single();
  console.log('Harris profile in public.profiles:', profile, pErr);

  // 2. Try updateUserById
  console.log('Attempting updateUserById...');
  const { data: updateData, error: uErr } = await supabase.auth.admin.updateUserById(harrisId, {
    email_confirm: true,
    password: 'AdminPassword123!',
    user_metadata: { full_name: 'Harris' }
  });
  console.log('updateUserById result:', updateData, uErr);
}

run().catch(console.error);
