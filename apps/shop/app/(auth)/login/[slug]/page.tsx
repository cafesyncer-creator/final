import BrandSlugLoginClient from './brand-slug-login-client';

export function generateStaticParams() {
  return [
    { slug: 'snaxia' },
    { slug: 'roast-and-brew' },
    { slug: 'chai-craft' },
    { slug: '_placeholder' },
  ];
}

export default function BrandSlugLoginPage() {
  return <BrandSlugLoginClient />;
}
