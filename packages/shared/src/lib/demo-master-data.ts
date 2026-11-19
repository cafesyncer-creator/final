import { DEMO_BRAND, DEMO_BRAND_ROAST, DEMO_BRAND_CHAI } from './demo-data';

export interface DemoMasterBrand {
  id: string;
  name: string;
  slug?: string;
  registration_no: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
  email: string;
  gstin: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  shops_count: number;
  admins_count: number;
  monthly_volume: number;
  admins: Array<{ id: string; full_name: string; email: string; phone: string; is_active: boolean }>;
}

export const DEMO_MASTER_BRANDS: DemoMasterBrand[] = [
  {
    id: DEMO_BRAND.id,
    name: 'Snaxia Artisanal Cafes',
    slug: 'snaxia',
    registration_no: 'REG-SNAXIA-2024',
    logo_url: DEMO_BRAND.logo_url,
    primary_color: '#ea580c',
    secondary_color: '#9a3412',
    address: 'Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
    phone: '+91 98888 11111',
    email: 'corporate@snaxia.in',
    gstin: '29AAAAA1234A1Z5',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    shops_count: 10,
    admins_count: 1,
    monthly_volume: 6420000,
    admins: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        full_name: 'Vikram Malhotra',
        email: 'admin@snaxia.in',
        phone: '+91 98888 11111',
        is_active: true,
      },
    ],
  },
  {
    id: '11111111-1111-1111-1111-222222222222',
    name: 'Roast & Brew Specialty Co.',
    slug: 'roast-and-brew',
    registration_no: 'REG-ROAST-2025',
    logo_url: DEMO_BRAND_ROAST.logo_url,
    primary_color: '#0284c7', // cool sky blue
    secondary_color: '#0369a1',
    address: 'Bandra Kurla Complex, Mumbai, Maharashtra 400051',
    phone: '+91 98222 33333',
    email: 'accounts@roastbrew.co',
    gstin: '27AABCR5678B1Z2',
    status: 'active',
    created_at: '2025-06-15T00:00:00Z',
    shops_count: 4,
    admins_count: 1,
    monthly_volume: 2480000,
    admins: [
      {
        id: '22222222-2222-2222-2222-333333333333',
        full_name: 'Ayesha Kapoor',
        email: 'admin@roastbrew.co',
        phone: '+91 98222 33333',
        is_active: true,
      },
    ],
  },
  {
    id: '11111111-1111-1111-1111-333333333333',
    name: 'Chai Craft Express',
    slug: 'chai-craft',
    registration_no: 'REG-CHAICRAFT-2025',
    logo_url: DEMO_BRAND_CHAI.logo_url,
    primary_color: '#16a34a', // emerald green
    secondary_color: '#15803d',
    address: 'Connaught Place Outer Circle, New Delhi 110001',
    phone: '+91 98111 44444',
    email: 'admin@chaicraft.in',
    gstin: '07AAACC9988C1Z4',
    status: 'active',
    created_at: '2025-09-01T00:00:00Z',
    shops_count: 6,
    admins_count: 1,
    monthly_volume: 3150000,
    admins: [
      {
        id: '22222222-2222-2222-2222-444444444444',
        full_name: 'Sanjay Gupta',
        email: 'admin@chaicraft.in',
        phone: '+91 98111 44444',
        is_active: true,
      },
    ],
  },
];

export interface DemoGlobalAuditLog {
  id: string;
  brand_name: string;
  user_name: string;
  user_role: string;
  action: string;
  table_name: string;
  record_id: string;
  details: string;
  timestamp: string;
}

export const DEMO_GLOBAL_AUDIT_LOGS: DemoGlobalAuditLog[] = [
  {
    id: 'ga-001',
    brand_name: 'Snaxia Artisanal Cafes',
    user_name: 'Rahul Sharma',
    user_role: 'manager',
    action: 'CREATE',
    table_name: 'transactions',
    record_id: 'txn-789',
    details: 'Daily Income ₹14,500 (Counter Billing, CASH)',
    timestamp: '8 mins ago',
  },
  {
    id: 'ga-002',
    brand_name: 'Snaxia Artisanal Cafes',
    user_name: 'Vikram Malhotra',
    user_role: 'admin',
    action: 'CREATE',
    table_name: 'shops',
    record_id: 'shp-101',
    details: 'Registered new outlet "Snaxia Whitefield" (SNX-BLR-03)',
    timestamp: '42 mins ago',
  },
  {
    id: 'ga-003',
    brand_name: 'Roast & Brew Specialty Co.',
    user_name: 'Ayesha Kapoor',
    user_role: 'admin',
    action: 'UPDATE',
    table_name: 'brands',
    record_id: 'brand-002',
    details: 'Updated primary theme color to #0284c7',
    timestamp: '2 hours ago',
  },
  {
    id: 'ga-004',
    brand_name: 'Chai Craft Express',
    user_name: 'Sanjay Gupta',
    user_role: 'admin',
    action: 'APPROVE',
    table_name: 'item_requests',
    record_id: 'req-554',
    details: 'Approved manager request: "Organic Saffron Chai"',
    timestamp: '5 hours ago',
  },
  {
    id: 'ga-005',
    brand_name: 'Platform Master',
    user_name: 'Super Master Admin',
    user_role: 'master',
    action: 'CREATE',
    table_name: 'brands',
    record_id: 'brand-003',
    details: 'Provisioned new brand "Chai Craft Express" with REG-CHAICRAFT-2025',
    timestamp: '1 day ago',
  },
];

