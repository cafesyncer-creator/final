import { normalizeHex } from './colors';

export function extractBrandInitials(name?: string | null): string {
  const words = (name || 'CB')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && w !== '&');
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return (words[0] || 'C').slice(0, 2).toUpperCase();
}

export function generateBrandSvgDataUri(
  name: string,
  primaryColor: string = '#ea580c',
  secondaryColor: string = '#9a3412',
  variant: 'logo' | 'icon' = 'logo'
): string {
  const initials = extractBrandInitials(name);
  const primary = normalizeHex(primaryColor, '#ea580c');
  const secondary = normalizeHex(secondaryColor, '#9a3412');
  const fg = '#ffffff';

  // Deterministic clean gradient id safe for multiple SVG embeddings
  const gradId = `bgrad_${initials}_${primary.replace('#', '')}`;

  const svg =
    variant === 'logo'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${primary}"/><stop offset="100%" stop-color="${secondary}"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(#${gradId})"/><circle cx="64" cy="64" r="46" stroke="${fg}" stroke-opacity="0.22" stroke-width="2.5"/><text x="64" y="75" text-anchor="middle" fill="${fg}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="40" letter-spacing="1">${initials}</text></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${primary}"/><stop offset="100%" stop-color="${secondary}"/></linearGradient></defs><rect width="96" height="96" rx="18" fill="url(#${gradId})"/><text x="48" y="59" text-anchor="middle" fill="${fg}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function resolveBrandLogoUrl(
  logoUrl?: string | null,
  brandName: string = 'Cafe',
  primaryColor: string = '#ea580c',
  secondaryColor: string = '#9a3412'
): string {
  if (!logoUrl || logoUrl.startsWith('/api/brand-icon')) {
    return generateBrandSvgDataUri(brandName, primaryColor, secondaryColor, 'logo');
  }
  return logoUrl;
}
