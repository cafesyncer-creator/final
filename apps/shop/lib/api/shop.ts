import { supabase } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getTodayKolkata } from '@/lib/calculations/dates';
import { TxnType, ItemKind } from '@/lib/supabase/types';
import { normalizeItemUnit } from '@/lib/constants/units';

export interface ApiResult<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  id?: string;
  data?: T;
  item?: any;
}

/**
 * Screen 1: Add Daily Transaction via atomic Postgres RPC
 */
export async function addDailyTransaction(formData: FormData): Promise<ApiResult> {
  const kind = formData.get('kind') as ItemKind;
  const amountStr = formData.get('amount') as string;
  const itemId = (formData.get('item_id') as string) || null;
  const modeId = (formData.get('mode_id') as string) || null;
  const employeeId = (formData.get('employee_id') as string) || null;
  const customNote = (formData.get('note') as string)?.trim() || '';
  const txnType = (formData.get('txn_type') as TxnType) || 'normal';
  const txnDate = (formData.get('txn_date') as string) || getTodayKolkata();
  const qtyStr = (formData.get('quantity') as string) || '';
  const rawUnit = (formData.get('unit_snapshot') as string)?.trim() || '';

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Validation Error: Amount must be greater than ₹0.' };
  }

  const parsedQty = qtyStr.trim() !== '' ? parseFloat(qtyStr) : null;
  if (parsedQty !== null && (Number.isNaN(parsedQty) || parsedQty <= 0)) {
    return { error: 'Validation Error: Quantity must be greater than 0 (or leave blank).' };
  }

  const today = getTodayKolkata();
  if (txnDate > today) {
    return { error: 'Validation Error: Transaction date cannot be in the future.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      id: `demo-txn-${Date.now()}`,
      message: `${kind === 'income' ? 'Income' : 'Expense'} entry of ₹${amount.toLocaleString('en-IN')} added!`,
    };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_add_daily_transaction', {
      p_kind: kind,
      p_amount: amount,
      p_item_id: itemId,
      p_mode_id: modeId,
      p_employee_id: employeeId,
      p_note: customNote,
      p_txn_type: txnType,
      p_txn_date: txnDate,
      p_quantity: parsedQty,
      p_unit_snapshot: rawUnit || null,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true, message: 'Transaction recorded.' };
  } catch (err: any) {
    return { error: err?.message || 'Failed to record entry.' };
  }
}

/**
 * Screen 1: Edit Daily Transaction via atomic Postgres RPC
 */
export async function updateDailyTransaction(formData: FormData): Promise<ApiResult> {
  const txnId = formData.get('transaction_id') as string;
  const amountStr = formData.get('amount') as string;
  const note = (formData.get('note') as string)?.trim() || '';
  const modeId = (formData.get('mode_id') as string) || null;
  const qtyField = formData.get('quantity');
  const rawUnit = (formData.get('unit_snapshot') as string)?.trim() || '';

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Validation Error: Amount must be greater than ₹0.' };
  }

  let parsedQty: number | null = null;
  if (qtyField !== null && String(qtyField).trim() !== '') {
    const qNum = parseFloat(String(qtyField).trim());
    if (Number.isNaN(qNum) || qNum <= 0) {
      return { error: 'Validation Error: Quantity must be greater than 0 (or leave blank).' };
    }
    parsedQty = qNum;
  }

  if (!isSupabaseConfigured()) {
    return { success: true, message: 'Entry updated and closing balance recalculated.' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_update_daily_transaction', {
      p_txn_id: txnId,
      p_amount: amount,
      p_mode_id: modeId,
      p_note: note,
      p_quantity: parsedQty,
      p_unit_snapshot: rawUnit || null,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true, message: 'Entry updated.' };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update transaction.' };
  }
}

/**
 * Screen 1: Delete Daily Transaction via atomic Postgres RPC
 */
export async function deleteDailyTransaction(txnId: string): Promise<ApiResult> {
  if (!isSupabaseConfigured()) {
    return { success: true, message: 'Entry removed.' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_delete_daily_transaction', {
      p_txn_id: txnId,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true, message: 'Entry removed.' };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete transaction.' };
  }
}

/**
 * Screen 1: Restore Daily Transaction via atomic Postgres RPC
 */
export async function restoreDailyTransaction(txnId: string): Promise<ApiResult> {
  if (!isSupabaseConfigured()) {
    return { success: true, message: 'Entry restored!' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_restore_daily_transaction', {
      p_txn_id: txnId,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true, message: 'Entry restored!' };
  } catch (err: any) {
    return { error: err?.message || 'Failed to restore transaction.' };
  }
}

/**
 * Screen: Save Shop Item (Create or Edit) via atomic Postgres RPC
 */
export async function saveShopItem(formData: {
  id?: string;
  name: string;
  kind: 'income' | 'expense';
  category?: string;
  unit?: string;
  defaultRate?: number | null;
}): Promise<ApiResult> {
  const trimmedName = (formData.name || '').trim();
  const kind = formData.kind === 'income' ? 'income' : 'expense';
  const category = (formData.category || '').trim() || (kind === 'income' ? 'Sales' : 'General');
  const unit = normalizeItemUnit(formData.unit);
  const defaultRate =
    formData.defaultRate !== undefined &&
    formData.defaultRate !== null &&
    !Number.isNaN(Number(formData.defaultRate)) &&
    Number(formData.defaultRate) > 0
      ? Math.round(Number(formData.defaultRate) * 100) / 100
      : null;

  if (trimmedName.length < 2) {
    return { error: 'Please enter an item name (minimum 2 characters).' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      item: {
        id: formData.id || `shop-item-${Date.now()}`,
        name: trimmedName,
        kind,
        category,
        unit,
        default_rate: defaultRate,
        is_active: true,
      },
      message: formData.id
        ? `Updated "${trimmedName}"`
        : `Added "${trimmedName}" (${unit}) to your shop!`,
    };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_save_item', {
      p_id: formData.id || null,
      p_name: trimmedName,
      p_kind: kind,
      p_category: category,
      p_unit: unit,
      p_default_rate: defaultRate,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to save shop item.' };
  }
}

/**
 * Screen: Toggle Shop Item active/inactive
 */
export async function toggleShopItemStatus(itemId: string, isActive: boolean): Promise<ApiResult> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('items')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    if (error) return { error: error.message };

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update item status.' };
  }
}

/**
 * Screen 2: Update Employee Attendance & Days Worked (with optional Overtime) via atomic Postgres RPC
 */
export async function updateDaysWorked(formData: FormData): Promise<ApiResult> {
  const employeeId = formData.get('employee_id') as string;
  const daysWorked = parseFloat(formData.get('days_worked') as string);
  const overtimePayRaw = formData.get('overtime_pay');
  const overtimePay = overtimePayRaw !== null ? parseFloat(overtimePayRaw as string) : undefined;
  const month = (formData.get('month') as string) || getTodayKolkata().substring(0, 7);

  if (!employeeId || isNaN(daysWorked) || daysWorked < 0 || daysWorked > 31) {
    return { error: 'Please enter valid days worked between 0 and 31.' };
  }

  if (overtimePay !== undefined && (isNaN(overtimePay) || overtimePay < 0)) {
    return { error: 'Overtime pay cannot be negative.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: true, message: `Updated attendance & overtime: ${daysWorked} days, ₹${overtimePay || 0} OT` };
  }

  try {
    const rpcParams: Record<string, any> = {
      p_employee_id: employeeId,
      p_days_worked: daysWorked,
      p_month: month,
    };
    if (overtimePay !== undefined) {
      rpcParams.p_overtime_pay = overtimePay;
    }

    const { data, error } = await supabase.rpc('rpc_shop_update_days_worked', rpcParams);

    if (error) {
      // Fallback if DB function only takes 3 parameters
      if (overtimePay !== undefined && (error.message.includes('parameters') || error.code === 'PGRST202')) {
        const fallback = await supabase.rpc('rpc_shop_update_days_worked', {
          p_employee_id: employeeId,
          p_days_worked: daysWorked,
          p_month: month,
        });
        if (fallback.error) return { error: fallback.error.message };

        // Also update overtime_pay directly if table column exists
        await (supabase as any)
          .from('salary_records')
          .update({ overtime_pay: overtimePay })
          .eq('employee_id', employeeId)
          .eq('month', month);

        return { success: true, message: 'Saved attendance & overtime.' };
      }
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update attendance.' };
  }
}

/**
 * Screen 2: Record Salary Advance or Payment via atomic Postgres RPC
 */
export async function recordSalaryTransaction(formData: FormData): Promise<ApiResult> {
  const employeeId = formData.get('employee_id') as string;
  const amountStr = formData.get('amount') as string;
  const modeId = (formData.get('mode_id') as string) || null;
  const txnType = (formData.get('txn_type') as TxnType) || 'salary_advance';
  const customNote = (formData.get('note') as string)?.trim() || '';
  const txnDate = (formData.get('txn_date') as string) || getTodayKolkata();

  const amount = parseFloat(amountStr);
  if (!employeeId || isNaN(amount) || amount <= 0) {
    return { error: 'Please select an employee and enter an amount greater than ₹0.' };
  }

  const today = getTodayKolkata();
  if (txnDate > today) {
    return { error: 'Transaction date cannot be in the future.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      message: `${txnType === 'salary_advance' ? 'Salary Advance' : 'Salary Payment'} of ₹${amount.toLocaleString('en-IN')} recorded!`,
    };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_record_salary_transaction', {
      p_employee_id: employeeId,
      p_amount: amount,
      p_mode_id: modeId,
      p_txn_type: txnType,
      p_note: customNote,
      p_txn_date: txnDate,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to record salary transaction.' };
  }
}

/**
 * Screen 4: Log Asset Service via atomic Postgres RPC
 */
export async function logAssetService(formData: FormData): Promise<ApiResult> {
  const assetId = formData.get('asset_id') as string;
  const serviceDate = (formData.get('service_date') as string) || getTodayKolkata();
  const vendor = (formData.get('vendor') as string)?.trim() || 'Internal Technician';
  const costStr = formData.get('cost') as string;
  const notes = (formData.get('notes') as string)?.trim() || '';
  const nextDueDate = formData.get('next_due') as string;

  const cost = parseFloat(costStr) || 0;

  if (!assetId || !serviceDate || !nextDueDate) {
    return { error: 'Please enter service date, vendor, and next service due date.' };
  }

  const today = getTodayKolkata();
  if (serviceDate > today) {
    return { error: 'Service date cannot be in the future.' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      message: `Service logged successfully! Asset status set to working, next due on ${nextDueDate}.`,
    };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_shop_log_asset_service', {
      p_asset_id: assetId,
      p_service_date: serviceDate,
      p_vendor: vendor,
      p_cost: cost,
      p_notes: notes,
      p_next_due: nextDueDate,
    });

    if (error) {
      return { error: error.message };
    }

    return (data as ApiResult) || { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to log asset service.' };
  }
}

