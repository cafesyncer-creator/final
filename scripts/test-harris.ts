import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: audit, error: auditErr } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(5);
  console.log('Recent audit logs:', JSON.stringify(audit, null, 2), auditErr);
}

main().catch(console.error);
