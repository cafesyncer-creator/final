import type { GroupedItemDetailsGroup, ItemSummaryRow } from './item-wise';

export type ReportKindOption = 'daily_summary' | 'item_wise' | 'salary' | 'full';

export interface ReportBrandInfo {
  name: string;
  registrationNo: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  tagline?: string | null;
  pdfHeaderStyle?: 'left' | 'centered';
  pdfFooterText?: string | null;
  pdfShowAddress?: boolean;
  pdfShowGstin?: boolean;
  pdfShowRegistrationNo?: boolean;
  pdfSignatureLine?: boolean;
}

export interface ReportShopInfo {
  name: string;
  code: string;
  address?: string | null;
}

export interface ReportDailySummaryRow {
  date: string; // DD-MM-YYYY
  opening: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
}

export interface ReportTransactionRow {
  date: string; // DD-MM-YYYY
  description: string;
  mop: string;
  income: number;
  expense: number;
}

export interface ReportSalaryRow {
  shopName?: string;
  employee: string;
  role?: string;
  days: number;
  rate: number;
  gross: number;
  advances: number;
  paid: number;
  balance: number;
}

export interface ReportExpenseCategoryRow {
  category: string;
  amount: number;
  percentage: number;
}

export interface ReportGstInfo {
  type: 'percentage' | 'amount';
  value: number;
  ratePct?: number;
  gstAmount: number;
  subtotal: number;
  grandTotal: number;
}

export interface ReportData {
  reportType?: ReportKindOption;
  includeItemDetails?: boolean;
  brand: ReportBrandInfo;
  shop: ReportShopInfo;
  period: {
    startDate: string; // DD-MM-YYYY
    endDate: string;   // DD-MM-YYYY
  };
  generatedAt: string;
  summary: {
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    profitLoss: number;
    closingBalance: number;
  };
  dailySummaries: ReportDailySummaryRow[];
  transactions?: ReportTransactionRow[];
  salaryRecords?: ReportSalaryRow[];
  expenseCategories?: ReportExpenseCategoryRow[];
  itemSummaryRows?: ItemSummaryRow[];
  groupedItemDetails?: GroupedItemDetailsGroup[];
  gst?: ReportGstInfo | null;
}
