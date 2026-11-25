import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('Testing direct auth.users query via PostgREST schema...');
  const { data: users, error: uErr } = await supabaseAdmin
    .schema('auth')
    .from('users')
    .select('id, email, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous, confirmed_at, phone')
    .limit(10);
  
  if (uErr) {
    console.log('schema("auth") error:', uErr);
  } else {
    console.log('Got auth users:', users);
  }

  const { data: identities, error: iErr } = await supabaseAdmin
    .schema('auth')
    .from('identities')
    .select('*')
    .limit(10);
  if (iErr) {
    console.log('schema("auth") identities error:', iErr);
  } else {
    console.log('Got identities:', identities);
  }
}

run().catch(console.error);
