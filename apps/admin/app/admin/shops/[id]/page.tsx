import React, { Suspense } from 'react';
import { ShopDetailClient } from './shop-detail-client';
import { createClient } from '@supabase/supabase-js';

export async function generateStaticParams() {
  const fallback = [
    { id: '50000000-0000-0000-0000-000000000001' },
    { id: '50000000-0000-0000-0000-000000000002' },
    { id: '50000000-0000-0000-0000-000000000003' },
    { id: '50000000-0000-0000-0000-000000000004' },
    { id: '_placeholder' },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: shops } = await supabase.from('shops').select('id');
      if (shops && shops.length > 0) {
        const allIds = new Set([...fallback.map((f) => f.id), ...shops.map((s) => s.id)]);
        return Array.from(allIds).map((id) => ({ id }));
      }
    } catch (err) {
      console.warn('generateStaticParams could not fetch live shops:', err);
    }
  }

  return fallback;
}

export default function AdminShopDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center text-slate-500 text-sm">
          Loading outlet data...
        </div>
      }
    >
      <ShopDetailClient />
    </Suspense>
  );
}
