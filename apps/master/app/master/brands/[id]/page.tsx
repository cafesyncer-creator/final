import React from 'react';
import { BrandDetailClient } from './brand-detail-client';
import { createClient } from '@supabase/supabase-js';

export async function generateStaticParams() {
  const fallback = [
    { id: '11111111-1111-1111-1111-111111111111' },
    { id: '11111111-1111-1111-1111-222222222222' },
    { id: '11111111-1111-1111-1111-333333333333' },
    { id: '1fa4f924-c64c-41e8-a3df-9d319852be35' },
    { id: '_placeholder' },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: brands } = await supabase.from('brands').select('id');
      if (brands && brands.length > 0) {
        const allIds = new Set([...fallback.map((f) => f.id), ...brands.map((b) => b.id)]);
        return Array.from(allIds).map((id) => ({ id }));
      }
    } catch (err) {
      console.warn('generateStaticParams could not fetch live brands:', err);
    }
  }

  return fallback;
}

export default function MasterBrandDetailPage() {
  return <BrandDetailClient />;
}
