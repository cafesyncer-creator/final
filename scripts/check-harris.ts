import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const masterId = '1adc3545-e151-4532-8366-52a6269b71e1';
  const { data: u2 } = await supabaseAdmin.auth.admin.getUserById(masterId);
  console.log('Master full user object:', JSON.stringify(u2?.user, null, 2));
}

main().catch(console.error);
