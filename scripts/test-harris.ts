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

async function main() {
  const harrisId = 'b8da447d-0ef4-4b08-91f2-5d2afcceb152';
  console.log('Testing getUserById for Harris...');
  const { data: harrisUser, error: harrisErr } = await supabaseAdmin.auth.admin.getUserById(harrisId);
  if (harrisErr) {
    console.error('Harris getUserById error:', harrisErr);
  } else {
    console.log('Harris user loaded successfully:', JSON.stringify(harrisUser, null, 2));
  }

  console.log('Testing signInWithPassword for Harris...');
  const { data: signData, error: signErr } = await supabaseClient.auth.signInWithPassword({
    email: 'harris@cleanuplaundry.in',
    password: 'AdminPassword123!', // or whatever was set
  });
  if (signErr) {
    console.error('Harris signIn error:', signErr);
  } else {
    console.log('Harris signIn success! user id:', signData.user?.id);
  }
}

main().catch(console.error);
