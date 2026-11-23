import React, { Suspense } from 'react';
import { ShopDetailClient } from './shop-detail-client';

export function generateStaticParams() {
  return [
    { id: '50000000-0000-0000-0000-000000000001' },
    { id: '50000000-0000-0000-0000-000000000002' },
    { id: '50000000-0000-0000-0000-000000000003' },
    { id: '50000000-0000-0000-0000-000000000004' },
    { id: '_placeholder' },
  ];
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
