import React from 'react';
import { BrandDetailClient } from './brand-detail-client';

export function generateStaticParams() {
  return [
    { id: '11111111-1111-1111-1111-111111111111' },
    { id: '11111111-1111-1111-1111-222222222222' },
    { id: '11111111-1111-1111-1111-333333333333' },
    { id: '_placeholder' },
  ];
}

export default function MasterBrandDetailPage() {
  return <BrandDetailClient />;
}
