import 'server-only';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { DEMO_MASTER_BRANDS } from '@/lib/demo-master-data';
import { hexToRgb, normalizeHex, pickReadableTextColor } from './colors';
import { generateBrandSvgDataUri } from './brand-svg';
import { buildDefaultBrandSettings, slugifyBrandName } from './presets';
import type { BrandSettings, BrandThemeBundle } from './types';

const THEME_STORE_FILE = path.join(os.tmpdir(), 'cafeledger-brand-themes-v1.json');
const AUDIT_STORE_FILE = path.join(os.tmpdir(), 'cafeledger-theme-audits-v1.json');
const ASSET_STORE_DIR = path.join(os.tmpdir(), 'cafeledger-brand-assets');

interface DemoThemeFileData {
  bundles: Record<string, BrandThemeBundle>;
}

export interface DemoThemeAuditRecord {
  id: string;
  user_id: string;
  user_name: string;
  brand_id: string;
  brand_name: string;
  action: string;
  table_name: string;
  details: string;
  at: string;
}

function createInitialBundles(): Record<string, BrandThemeBundle> {
  const bundles: Record<string, BrandThemeBundle> = {};

  for (const b of DEMO_MASTER_BRANDS) {
    const slug = b.slug || slugifyBrandName(b.name);
    const base = buildDefaultBrandSettings({
      id: b.id,
      name: b.name,
      logo_url: b.logo_url,
      primary_color: b.primary_color,
      secondary_color: b.secondary_color,
    });

    if (b.id === '11111111-1111-1111-1111-111111111111') {
      base.tagline = 'Warm Craft Coffee & Daily Outlets Ledger';
      base.welcome_message = 'Welcome back to Snaxia';
      base.font_family = 'Poppins';
      base.radius = 'rounded';
      base.sidebar_style = 'light';
      base.density = 'comfortable';
      base.default_mode = 'light';
      base.allow_user_mode_switch = true;
      base.login_layout = 'split';
      base.login_logo_size = 'md';
      base.login_bg_color = '#fff7ed';
      base.icon_url = generateBrandSvgDataUri('Snaxia Artisanal Cafes', '#ea580c', '#9a3412', 'icon');
      base.pdf_header_style = 'left';
      base.pdf_footer_text = 'Snaxia Hospitality Pvt. Ltd. • Internal Daily Ledger';
    } else if (b.id === '11111111-1111-1111-1111-222222222222') {
      base.tagline = 'Single-Origin Micro-Roastery & Espresso Bars';
      base.welcome_message = 'Brew precision accounts at Roast & Brew';
      base.primary_color = '#0284c7';
      base.secondary_color = '#0369a1';
      base.accent_color = '#38bdf8';
      base.font_family = 'Playfair Display';
      base.radius = 'sharp';
      base.sidebar_style = 'dark';
      base.density = 'compact';
      base.default_mode = 'light';
      base.allow_user_mode_switch = true;
      base.login_layout = 'centered';
      base.login_logo_size = 'lg';
      base.login_bg_color = '#eff6ff';
      base.icon_url = generateBrandSvgDataUri('Roast & Brew Specialty Co.', '#0284c7', '#0369a1', 'icon');
      base.pdf_header_style = 'centered';
      base.pdf_footer_text = 'Roast & Brew Specialty Co. • Audited Financial Statement';
      base.pdf_signature_line = true;
    } else if (b.id === '11111111-1111-1111-1111-333333333333') {
      base.tagline = 'Authentic Masala Chai & Quick-Serve Kiosks';
      base.welcome_message = 'Namaste! Open today’s Chai Craft register';
      base.primary_color = '#16a34a';
      base.secondary_color = '#14532d';
      base.accent_color = '#84cc16';
      base.font_family = 'Nunito';
      base.radius = 'pill';
      base.sidebar_style = 'brand';
      base.density = 'comfortable';
      base.default_mode = 'light';
      base.allow_user_mode_switch = false;
      base.login_layout = 'split';
      base.login_logo_size = 'md';
      base.login_bg_color = '#f0fdf4';
      base.icon_url = generateBrandSvgDataUri('Chai Craft Express', '#16a34a', '#15803d', 'icon');
      base.pdf_header_style = 'left';
      base.pdf_footer_text = 'Chai Craft Express Franchise Operations';
    }

    bundles[b.id] = {
      brand: {
        id: b.id,
        name: b.name,
        slug,
        registration_no: b.registration_no,
        address: b.address,
        phone: b.phone,
        email: b.email,
        gstin: b.gstin,
        status: b.status,
      },
      settings: base,
    };
  }

  return bundles;
}

export function readDemoThemeStore(): Record<string, BrandThemeBundle> {
  const defaults = createInitialBundles();
  try {
    if (!fs.existsSync(THEME_STORE_FILE)) {
      return defaults;
    }
    const raw = fs.readFileSync(THEME_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as DemoThemeFileData;
    if (!parsed || typeof parsed !== 'object' || !parsed.bundles) {
      return defaults;
    }
    const merged: Record<string, BrandThemeBundle> = { ...defaults };
    for (const [id, bundle] of Object.entries(parsed.bundles)) {
      if (bundle?.brand && bundle?.settings) {
        merged[id] = bundle;
      }
    }
    return merged;
  } catch {
    return defaults;
  }
}

export function writeDemoThemeStore(bundles: Record<string, BrandThemeBundle>): void {
  try {
    fs.writeFileSync(
      THEME_STORE_FILE,
      JSON.stringify({ bundles } satisfies DemoThemeFileData, null, 2),
      'utf8'
    );
  } catch (err) {
    console.warn('Could not persist demo theme file:', err);
  }
}

export function listDemoThemeBundles(): BrandThemeBundle[] {
  return Object.values(readDemoThemeStore());
}

export function findDemoThemeById(brandId: string): BrandThemeBundle | null {
  const store = readDemoThemeStore();
  return store[brandId] || null;
}

export function findDemoThemeBySlug(slug: string): BrandThemeBundle | null {
  const cleanSlug = (slug || '').trim().toLowerCase();
  if (!cleanSlug) return null;
  const store = readDemoThemeStore();
  return Object.values(store).find((b) => b.brand.slug.toLowerCase() === cleanSlug) || null;
}

export function upsertDemoBrandBundle(bundle: BrandThemeBundle): BrandThemeBundle {
  const store = readDemoThemeStore();
  store[bundle.brand.id] = bundle;
  writeDemoThemeStore(store);
  return bundle;
}

export function saveDemoThemeSettings(
  brandId: string,
  slug: string | undefined,
  patch: Partial<BrandSettings>
): BrandThemeBundle | null {
  const store = readDemoThemeStore();
  const existing = store[brandId];
  if (!existing) return null;

  const cleanSlug = slug ? slugifyBrandName(slug) : existing.brand.slug;
  const updated: BrandThemeBundle = {
    brand: {
      ...existing.brand,
      slug: cleanSlug,
    },
    settings: {
      ...existing.settings,
      ...patch,
      brand_id: brandId,
      updated_at: new Date().toISOString(),
    },
  };

  store[brandId] = updated;
  writeDemoThemeStore(store);
  return updated;
}

export function appendDemoThemeAudit(entry: DemoThemeAuditRecord): void {
  try {
    const current = readDemoThemeAudits();
    const next = [entry, ...current].slice(0, 100);
    fs.writeFileSync(AUDIT_STORE_FILE, JSON.stringify(next, null, 2), 'utf8');
  } catch {
    // ignore fs error
  }
}

export function readDemoThemeAudits(): DemoThemeAuditRecord[] {
  try {
    if (!fs.existsSync(AUDIT_STORE_FILE)) return [];
    const raw = fs.readFileSync(AUDIT_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sanitizeAssetFilename(filename: string): string {
  const base = path.basename(filename || 'asset.png').replace(/[^a-zA-Z0-9._-]/g, '-');
  return base || `asset-${Date.now()}.png`;
}

export function saveLocalBrandAsset(
  brandId: string,
  filename: string,
  buffer: Buffer
): string {
  const safeBrand = brandId.replace(/[^a-zA-Z0-9-]/g, '');
  const safeFile = sanitizeAssetFilename(filename);
  const dir = path.join(ASSET_STORE_DIR, safeBrand);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safeFile), buffer);
  return `/api/brand-assets/${safeBrand}/${safeFile}?v=${Date.now()}`;
}

export function readLocalBrandAsset(
  brandId: string,
  filename: string
): Buffer | null {
  try {
    const safeBrand = brandId.replace(/[^a-zA-Z0-9-]/g, '');
    const safeFile = sanitizeAssetFilename(filename);
    const fullPath = path.join(ASSET_STORE_DIR, safeBrand, safeFile);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Pure-Node Minimal PNG Generator for Default Monogram Logos & PDF Fallback
// -----------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function generateBrandBadgePng(
  primaryHex: string,
  secondaryHex: string,
  size = 96
): Buffer {
  const p = hexToRgb(normalizeHex(primaryHex, '#ea580c'));
  const s = hexToRgb(normalizeHex(secondaryHex, '#9a3412'));
  const fg = hexToRgb(pickReadableTextColor(primaryHex, '#ffffff', '#0f172a'));

  const rowStride = 1 + size * 4;
  const raw = Buffer.alloc(size * rowStride);
  const center = size / 2;
  const outerRadius = size * 0.48;
  const innerRing = size * 0.28;

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowStride;
    raw[rowStart] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const t = (x + y) / (2 * size);
      let r = Math.round(p.r * (1 - t) + s.r * t);
      let g = Math.round(p.g * (1 - t) + s.g * t);
      let b = Math.round(p.b * (1 - t) + s.b * t);
      let a = 255;

      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > outerRadius) {
        a = 0;
      } else if (Math.abs(dist - innerRing) < size * 0.035) {
        r = fg.r;
        g = fg.g;
        b = fg.b;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

