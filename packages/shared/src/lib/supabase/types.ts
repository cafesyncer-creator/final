export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'master' | 'admin' | 'manager';
export type BrandStatus = 'active' | 'suspended';
export type ShopStatus = 'active' | 'inactive';
export type ItemKind = 'income' | 'expense';
export type ItemUnit = 'L' | 'kg' | 'g' | 'ml' | 'pcs' | 'packet' | 'dozen' | 'box' | 'other';
export type TxnType = 'normal' | 'salary_advance' | 'salary_payment';
export type AssetCategory = 'freezer' | 'fryer' | 'lights' | 'chiller' | 'grinder' | 'other';
export type AssetStatus = 'working' | 'needs_repair' | 'out_of_service';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type ThemeMode = 'light' | 'dark';
export type ThemeRadius = 'sharp' | 'rounded' | 'pill';
export type SidebarStyle = 'light' | 'dark' | 'brand';
export type ThemeDensity = 'comfortable' | 'compact';
export type LoginLayout = 'split' | 'centered';
export type LoginLogoSize = 'sm' | 'md' | 'lg';
export type PdfHeaderStyle = 'left' | 'centered';

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          registration_no: string;
          logo_url: string | null;
          primary_color: string;
          secondary_color: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          gstin: string | null;
          status: BrandStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          registration_no: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gstin?: string | null;
          status?: BrandStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          registration_no?: string;
          logo_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          gstin?: string | null;
          status?: BrandStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      brand_settings: {
        Row: {
          brand_id: string;
          logo_url: string | null;
          logo_dark_url: string | null;
          icon_url: string | null;
          login_bg_url: string | null;
          login_bg_color: string | null;
          display_name: string;
          tagline: string | null;
          welcome_message: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          font_family: string;
          radius: ThemeRadius;
          sidebar_style: SidebarStyle;
          density: ThemeDensity;
          default_mode: ThemeMode;
          allow_user_mode_switch: boolean;
          login_layout: LoginLayout;
          login_logo_size: LoginLogoSize;
          pdf_header_style: PdfHeaderStyle;
          pdf_footer_text: string | null;
          pdf_show_address: boolean;
          pdf_show_gstin: boolean;
          pdf_show_registration_no: boolean;
          pdf_signature_line: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          icon_url?: string | null;
          login_bg_url?: string | null;
          login_bg_color?: string | null;
          display_name: string;
          tagline?: string | null;
          welcome_message?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          font_family?: string;
          radius?: ThemeRadius;
          sidebar_style?: SidebarStyle;
          density?: ThemeDensity;
          default_mode?: ThemeMode;
          allow_user_mode_switch?: boolean;
          login_layout?: LoginLayout;
          login_logo_size?: LoginLogoSize;
          pdf_header_style?: PdfHeaderStyle;
          pdf_footer_text?: string | null;
          pdf_show_address?: boolean;
          pdf_show_gstin?: boolean;
          pdf_show_registration_no?: boolean;
          pdf_signature_line?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          brand_id?: string;
          logo_url?: string | null;
          logo_dark_url?: string | null;
          icon_url?: string | null;
          login_bg_url?: string | null;
          login_bg_color?: string | null;
          display_name?: string;
          tagline?: string | null;
          welcome_message?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          font_family?: string;
          radius?: ThemeRadius;
          sidebar_style?: SidebarStyle;
          density?: ThemeDensity;
          default_mode?: ThemeMode;
          allow_user_mode_switch?: boolean;
          login_layout?: LoginLayout;
          login_logo_size?: LoginLogoSize;
          pdf_header_style?: PdfHeaderStyle;
          pdf_footer_text?: string | null;
          pdf_show_address?: boolean;
          pdf_show_gstin?: boolean;
          pdf_show_registration_no?: boolean;
          pdf_signature_line?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          brand_id: string | null;
          shop_id: string | null;
          full_name: string;
          username: string | null;
          phone: string | null;
          is_active: boolean;
          must_change_password: boolean;
          theme_mode: ThemeMode;
          activity_read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          brand_id?: string | null;
          shop_id?: string | null;
          full_name: string;
          username?: string | null;
          phone?: string | null;
          is_active?: boolean;
          must_change_password?: boolean;
          theme_mode?: ThemeMode;
          activity_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          brand_id?: string | null;
          shop_id?: string | null;
          full_name?: string;
          username?: string | null;
          phone?: string | null;
          is_active?: boolean;
          must_change_password?: boolean;
          theme_mode?: ThemeMode;
          activity_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shops: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          code: string;
          address: string | null;
          phone: string | null;
          status: ShopStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          code: string;
          address?: string | null;
          phone?: string | null;
          status?: ShopStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          phone?: string | null;
          status?: ShopStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          brand_id: string;
          shop_id: string | null;
          created_by: string | null;
          name: string;
          kind: ItemKind;
          category: string;
          unit: ItemUnit;
          default_rate: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          shop_id?: string | null;
          created_by?: string | null;
          name: string;
          kind: ItemKind;
          category: string;
          unit?: ItemUnit;
          default_rate?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          shop_id?: string | null;
          created_by?: string | null;
          name?: string;
          kind?: ItemKind;
          category?: string;
          unit?: ItemUnit;
          default_rate?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_modes: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          brand_id: string;
          shop_id: string;
          name: string;
          phone: string | null;
          role_title: string | null;
          rate_per_day: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          shop_id: string;
          name: string;
          phone?: string | null;
          role_title?: string | null;
          rate_per_day?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          shop_id?: string;
          name?: string;
          phone?: string | null;
          role_title?: string | null;
          rate_per_day?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          brand_id: string;
          shop_id: string;
          txn_date: string;
          kind: ItemKind;
          item_id: string | null;
          item_name_snapshot: string;
          mode_id: string | null;
          mode_name_snapshot: string;
          amount: number;
          quantity: number | null;
          unit_snapshot: string | null;
          rate: number | null;
          note: string | null;
          employee_id: string | null;
          txn_type: TxnType;
          created_by: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          shop_id: string;
          txn_date: string;
          kind: ItemKind;
          item_id?: string | null;
          item_name_snapshot: string;
          mode_id?: string | null;
          mode_name_snapshot: string;
          amount: number;
          quantity?: number | null;
          unit_snapshot?: string | null;
          rate?: number | null;
          note?: string | null;
          employee_id?: string | null;
          txn_type?: TxnType;
          created_by?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          shop_id?: string;
          txn_date?: string;
          kind?: ItemKind;
          item_id?: string | null;
          item_name_snapshot?: string;
          mode_id?: string | null;
          mode_name_snapshot?: string;
          amount?: number;
          quantity?: number | null;
          unit_snapshot?: string | null;
          rate?: number | null;
          note?: string | null;
          employee_id?: string | null;
          txn_type?: TxnType;
          created_by?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      month_openings: {
        Row: {
          id: string;
          shop_id: string;
          month: string;
          opening_balance: number;
          is_manual: boolean;
          note: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          month: string;
          opening_balance?: number;
          is_manual?: boolean;
          note?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          month?: string;
          opening_balance?: number;
          is_manual?: boolean;
          note?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_summary: {
        Row: {
          id: string;
          shop_id: string;
          summary_date: string;
          opening: number;
          income: number;
          expense: number;
          closing: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          summary_date: string;
          opening?: number;
          income?: number;
          expense?: number;
          closing?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          summary_date?: string;
          opening?: number;
          income?: number;
          expense?: number;
          closing?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      salary_records: {
        Row: {
          id: string;
          shop_id: string;
          employee_id: string;
          month: string;
          days_worked: number;
          rate_snapshot: number;
          overtime_pay: number;
          gross: number;
          advances_total: number;
          paid_total: number;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          employee_id: string;
          month: string;
          days_worked?: number;
          rate_snapshot?: number;
          overtime_pay?: number;
          gross?: number;
          advances_total?: number;
          paid_total?: number;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          employee_id?: string;
          month?: string;
          days_worked?: number;
          rate_snapshot?: number;
          overtime_pay?: number;
          gross?: number;
          advances_total?: number;
          paid_total?: number;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          brand_id: string;
          shop_id: string;
          name: string;
          category: AssetCategory;
          model: string | null;
          serial_no: string | null;
          purchase_date: string | null;
          cost: number | null;
          vendor: string | null;
          status: AssetStatus;
          last_service_date: string | null;
          service_interval_days: number | null;
          next_service_due: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          shop_id: string;
          name: string;
          category: AssetCategory;
          model?: string | null;
          serial_no?: string | null;
          purchase_date?: string | null;
          cost?: number | null;
          vendor?: string | null;
          status?: AssetStatus;
          last_service_date?: string | null;
          service_interval_days?: number | null;
          next_service_due?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          shop_id?: string;
          name?: string;
          category?: AssetCategory;
          model?: string | null;
          serial_no?: string | null;
          purchase_date?: string | null;
          cost?: number | null;
          vendor?: string | null;
          status?: AssetStatus;
          last_service_date?: string | null;
          service_interval_days?: number | null;
          next_service_due?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      asset_service_logs: {
        Row: {
          id: string;
          asset_id: string;
          service_date: string;
          vendor: string | null;
          cost: number;
          notes: string | null;
          next_due: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          service_date: string;
          vendor?: string | null;
          cost?: number;
          notes?: string | null;
          next_due?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          service_date?: string;
          vendor?: string | null;
          cost?: number;
          notes?: string | null;
          next_due?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      item_requests: {
        Row: {
          id: string;
          shop_id: string;
          requested_by: string | null;
          name: string;
          kind: ItemKind;
          status: RequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          requested_by?: string | null;
          name: string;
          kind: ItemKind;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          requested_by?: string | null;
          name?: string;
          kind?: ItemKind;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string;
          old_data: Json | null;
          new_data: Json | null;
          at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id: string;
          old_data?: Json | null;
          new_data?: Json | null;
          at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_brand_login: {
        Args: {
          p_slug: string;
        };
        Returns: Array<{
          brand_id: string;
          brand_name: string;
          slug: string;
          status: string;
          display_name: string;
          tagline: string | null;
          welcome_message: string | null;
          logo_url: string | null;
          logo_dark_url: string | null;
          icon_url: string | null;
          login_bg_url: string | null;
          login_bg_color: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          font_family: string;
          radius: string;
          default_mode: string;
          login_layout: string;
          login_logo_size: string;
        }>;
      };
      get_item_wise_summary: {
        Args: {
          p_brand_id: string;
          p_shop_id?: string | null;
          p_start?: string | null;
          p_end?: string | null;
          p_kind?: string;
          p_category?: string | null;
          p_search?: string | null;
        };
        Returns: Array<{
          item_key: string;
          item_id: string | null;
          item_name: string;
          kind: string;
          category: string;
          unit: string;
          total_quantity: number | null;
          quantified_amount: number;
          total_amount: number;
          purchase_count: number;
          qty_entry_count: number;
          avg_rate: number | null;
        }>;
      };
      get_daily_progress_series: {
        Args: {
          p_brand_id: string;
          p_shop_id?: string | null;
          p_start?: string | null;
          p_end?: string | null;
        };
        Returns: Array<{
          summary_date: string;
          total_income: number;
          total_expense: number;
          net_profit: number;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
