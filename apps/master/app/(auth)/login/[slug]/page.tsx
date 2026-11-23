import React from 'react';
import { MasterSlugLoginClient } from './slug-redirect-client';

export function generateStaticParams() {
  return [
    { slug: 'snaxia' },
    { slug: 'roast-and-brew' },
    { slug: 'chai-craft' },
    { slug: '_placeholder' },
  ];
}

export default function MasterSlugLoginPage() {
  return <MasterSlugLoginClient />;
}
