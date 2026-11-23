/**
 * Validates whether real Supabase credentials have been provided
 * in environment variables, preventing hanging HTTP requests to placeholder domains.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pebfoqrkotfhqqzccqja.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1DD9sjFiSSVQj5g4Q-Rzg_XzZfO4di';

  if (!url || !anonKey) return false;
  if (url.includes('placeholder') || url.includes('your-project') || url.includes('example.com')) {
    return false;
  }
  if (anonKey.includes('placeholder') || anonKey.includes('your-anon-key')) {
    return false;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  return true;
}

