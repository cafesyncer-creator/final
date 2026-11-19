import { UserRole } from './supabase/types';
import { generateBrandSvgDataUri } from './theme/brand-svg';

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  brand?: {
    id: string;
    name: string;
    slug?: string;
    registration_no: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    gstin: string;
  };
  shop?: {
    id: string;
    name: string;
    code: string;
  };
}

export const DEMO_BRAND = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Snaxia Artisanal Cafes',
  slug: 'snaxia',
  registration_no: 'REG-SNAXIA-2024',
  logo_url: generateBrandSvgDataUri('Snaxia Artisanal Cafes', '#ea580c', '#9a3412', 'logo'),
  primary_color: '#ea580c',
  secondary_color: '#9a3412',
  gstin: '29AAAAA1234A1Z5',
};

export const DEMO_BRAND_ROAST = {
  id: '11111111-1111-1111-1111-222222222222',
  name: 'Roast & Brew Specialty Co.',
  slug: 'roast-and-brew',
  registration_no: 'REG-ROAST-2025',
  logo_url: generateBrandSvgDataUri('Roast & Brew Specialty Co.', '#0284c7', '#0369a1', 'logo'),
  primary_color: '#0284c7',
  secondary_color: '#0369a1',
  gstin: '27AABCR5678B1Z2',
};

export const DEMO_BRAND_CHAI = {
  id: '11111111-1111-1111-1111-333333333333',
  name: 'Chai Craft Express',
  slug: 'chai-craft',
  registration_no: 'REG-CHAICRAFT-2025',
  logo_url: generateBrandSvgDataUri('Chai Craft Express', '#16a34a', '#15803d', 'logo'),
  primary_color: '#16a34a',
  secondary_color: '#15803d',
  gstin: '07AAACC9988C1Z4',
};

export const DEMO_BRANDS = [DEMO_BRAND, DEMO_BRAND_ROAST, DEMO_BRAND_CHAI];

export const DEMO_USERS: Record<string, DemoUser> = {
  'master@cafeledger.io': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'master@cafeledger.io',
    fullName: 'Super Master Admin',
    role: 'master',
    phone: '+91 99999 00000',
  },
  'admin@snaxia.in': {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'admin@snaxia.in',
    fullName: 'Vikram Malhotra',
    role: 'admin',
    phone: '+91 98888 11111',
    brand: DEMO_BRAND,
  },
  'manager.indiranagar@snaxia.in': {
    id: '60000000-0000-0000-0000-000000000001',
    email: 'manager.indiranagar@snaxia.in',
    fullName: 'Rahul Sharma',
    role: 'manager',
    phone: '+91 98450 11001',
    brand: DEMO_BRAND,
    shop: {
      id: '50000000-0000-0000-0000-000000000001',
      name: 'Snaxia Indiranagar',
      code: 'SNX-BLR-01',
    },
  },
  'manager.koramangala@snaxia.in': {
    id: '60000000-0000-0000-0000-000000000002',
    email: 'manager.koramangala@snaxia.in',
    fullName: 'Sneha Patel',
    role: 'manager',
    phone: '+91 98450 11002',
    brand: DEMO_BRAND,
    shop: {
      id: '50000000-0000-0000-0000-000000000002',
      name: 'Snaxia Koramangala',
      code: 'SNX-BLR-02',
    },
  },
  'admin@roastbrew.co': {
    id: '22222222-2222-2222-2222-333333333333',
    email: 'admin@roastbrew.co',
    fullName: 'Ayesha Kapoor',
    role: 'admin',
    phone: '+91 98222 33333',
    brand: DEMO_BRAND_ROAST,
  },
  'manager.bkc@roastbrew.co': {
    id: '60000000-0000-0000-0000-000000000003',
    email: 'manager.bkc@roastbrew.co',
    fullName: 'Rohan Desai',
    role: 'manager',
    phone: '+91 98222 33301',
    brand: DEMO_BRAND_ROAST,
    shop: {
      id: '50000000-0000-0000-0000-000000000003',
      name: 'Roast & Brew BKC Flagship',
      code: 'RBS-MUM-01',
    },
  },
  'admin@chaicraft.in': {
    id: '22222222-2222-2222-2222-444444444444',
    email: 'admin@chaicraft.in',
    fullName: 'Sanjay Gupta',
    role: 'admin',
    phone: '+91 98111 44444',
    brand: DEMO_BRAND_CHAI,
  },
  'manager.cp@chaicraft.in': {
    id: '60000000-0000-0000-0000-000000000004',
    email: 'manager.cp@chaicraft.in',
    fullName: 'Meera Nair',
    role: 'manager',
    phone: '+91 98111 44401',
    brand: DEMO_BRAND_CHAI,
    shop: {
      id: '50000000-0000-0000-0000-000000000004',
      name: 'Chai Craft Connaught Place',
      code: 'CCE-DEL-01',
    },
  },
};

