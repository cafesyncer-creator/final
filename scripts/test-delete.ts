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
  
  // Try deleteUser
  console.log('Testing deleteUser...');
  const { data, error } = await supabase.auth.admin.deleteUser(harrisId);
  console.log('deleteUser result:', data, error);
}

run().catch(console.error);
