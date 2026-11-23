import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';
import { isSupabaseConfigured } from './config';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pebfoqrkotfhqqzccqja.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U1DD9sjFiSSVQj5g4Q-Rzg_XzZfO4di';

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (input, init) => {
        if (!isSupabaseConfigured()) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                message: 'Supabase unconfigured',
                error: 'unconfigured',
                code: 'UNCONFIGURED',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const upstreamSignal = init?.signal;
        if (upstreamSignal) {
          if (upstreamSignal.aborted) {
            controller.abort();
          } else {
            upstreamSignal.addEventListener('abort', () => controller.abort(), { once: true });
          }
        }
        const combinedSignal =
          upstreamSignal && typeof (AbortSignal as any).any === 'function'
            ? (AbortSignal as any).any([upstreamSignal, controller.signal])
            : controller.signal;

        return fetch(input, {
          ...init,
          signal: combinedSignal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  });

  return client;
}

export const supabase = createClient();

