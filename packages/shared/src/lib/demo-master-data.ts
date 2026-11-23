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

export const DEMO_MASTER_BRANDS: DemoMasterBrand[] = [];

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

export const DEMO_GLOBAL_AUDIT_LOGS: DemoGlobalAuditLog[] = [];


