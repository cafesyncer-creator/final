'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { updateDaysWorkedAction, recordSalaryTransactionAction } from '@/app/shop/actions';
import { formatINR } from '@/lib/calculations/currency';
import { toast } from 'sonner';
import { Users, DollarSign, Wallet, Calendar, Loader2, ArrowRight, Check, AlertCircle, Search } from 'lucide-react';
import { TxnType } from '@/lib/supabase/types';

export interface EmployeeSalaryItem {
  id: string; // employee_id
  name: string;
  phone?: string | null;
  role_title?: string | null;
  rate_per_day: number;
  days_worked: number;
  overtime_pay?: number;
  gross: number;
  advances_total: number;
  paid_total: number;
  balance: number;
}

interface StaffSalaryManagerProps {
  employees: EmployeeSalaryItem[];
  selectedMonth: string;
  paymentModes: Array<{ id: string; name: string }>;
  isMonthClosed?: boolean;
}

export function StaffSalaryManager({
  employees,
  selectedMonth,
  paymentModes,
  isMonthClosed = false,
}: StaffSalaryManagerProps) {
  // Days worked editing state
  const [daysState, setDaysState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    employees.forEach((e) => {
      init[e.id] = String(e.days_worked || 0);
    });
    return init;
  });

  // Overtime pay editing state
  const [overtimeState, setOvertimeState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    employees.forEach((e) => {
      init[e.id] = String(e.overtime_pay || 0);
    });
    return init;
  });

  const [savingEmpId, setSavingEmpId] = useState<string | null>(null);
  const [savingOtEmpId, setSavingOtEmpId] = useState<string | null>(null);

  // Dialog State for Advance or Payment
  const [activeModalType, setActiveModalType] = useState<TxnType | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSalaryItem | null>(null);
  const [modalAmount, setModalAmount] = useState<string>('');
  const [modalModeId, setModalModeId] = useState<string>(paymentModes[0]?.id || '');
  const [modalNote, setModalNote] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'pending' | 'settled'>('all');

  const [isPending, startTransition] = useTransition();

  const handleDaysSave = (empId: string) => {
    const days = parseFloat(daysState[empId] || '0');
    if (isNaN(days) || days < 0 || days > 31) {
      toast.error('Days worked must be between 0 and 31.');
      return;
    }

    const ot = parseFloat(overtimeState[empId] || '0');
    setSavingEmpId(empId);
    const formData = new FormData();
    formData.append('employee_id', empId);
    formData.append('days_worked', String(days));
    formData.append('overtime_pay', String(isNaN(ot) ? 0 : ot));
    formData.append('month', selectedMonth);

    startTransition(async () => {
      const res = await updateDaysWorkedAction(formData);
      setSavingEmpId(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || 'Attendance saved!');
      }
    });
  };

  const handleOvertimeSave = (empId: string) => {
    const ot = parseFloat(overtimeState[empId] || '0');
    if (isNaN(ot) || ot < 0) {
      toast.error('Overtime pay cannot be negative.');
      return;
    }

    const days = parseFloat(daysState[empId] || '0');
    setSavingOtEmpId(empId);
    const formData = new FormData();
    formData.append('employee_id', empId);
    formData.append('days_worked', String(isNaN(days) ? 0 : days));
    formData.append('overtime_pay', String(ot));
    formData.append('month', selectedMonth);

    startTransition(async () => {
      const res = await updateDaysWorkedAction(formData);
      setSavingOtEmpId(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || 'Overtime pay saved!');
      }
    });
  };

  const handleSalaryTxnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    const parsedAmount = parseFloat(modalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter an amount greater than ₹0.');
      return;
    }

    const formData = new FormData();
    formData.append('employee_id', selectedEmp.id);
    formData.append('amount', modalAmount);
    formData.append('mode_id', modalModeId);
    formData.append('txn_type', activeModalType || 'salary_advance');
    formData.append('note', modalNote);

    startTransition(async () => {
      const res = await recordSalaryTransactionAction(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message);
        setActiveModalType(null);
        setSelectedEmp(null);
        setModalAmount('');
        setModalNote('');
      }
    });
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      (emp.role_title || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (balanceFilter === 'pending') return emp.balance > 0;
    if (balanceFilter === 'settled') return emp.balance <= 0;
    return true;
  });

  // Totals
  const totalGross = filteredEmployees.reduce((acc, e) => acc + e.gross, 0);
  const totalAdvances = filteredEmployees.reduce((acc, e) => acc + e.advances_total, 0);
  const totalPaid = filteredEmployees.reduce((acc, e) => acc + e.paid_total, 0);
  const totalBalance = filteredEmployees.reduce((acc, e) => acc + e.balance, 0);

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Summary Cards for Payroll */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs uppercase font-medium text-slate-500">Gross Payroll</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatINR(totalGross)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sum(Days × Rate/Day)</p>
        </div>

        <div className="p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-xs">
          <p className="text-xs uppercase font-medium text-red-700">Total Advances (SA-*)</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-red-700 mt-1">
            {formatINR(totalAdvances)}
          </p>
          <p className="text-[11px] text-red-500 mt-0.5">Deducted from salary</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <p className="text-xs uppercase font-medium text-slate-500">Total Settled / Paid</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatINR(totalPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Bank/Cash payments</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 shadow-xs">
          <p className="text-xs uppercase font-medium text-amber-900">Pending Salary Balance</p>
          <p className="text-xl sm:text-2xl font-bold font-mono text-amber-900 mt-1">
            {formatINR(totalBalance)}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Gross - Advances - Paid</p>
        </div>
      </div>

      {/* Staff Salary Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Staff Working Days &amp; Monthly Salary Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Admin defines the daily rate; manager enters days worked and issues salary advances.
              </p>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Month: <strong>{selectedMonth}</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or role..."
                className="w-full min-h-[40px] pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#ea580c)]"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'All Staff' },
                  { id: 'pending', label: 'Pending Balance' },
                  { id: 'settled', label: 'Settled' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBalanceFilter(f.id)}
                  className={`min-h-[32px] px-2.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    balanceFilter === f.id
                      ? 'bg-[var(--brand-primary,#ea580c)] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4 text-center">Sal / Day</th>
                <th className="py-3 px-4 text-center">Days Worked</th>
                <th className="py-3 px-4 text-center">Overtime (₹)</th>
                <th className="py-3 px-4 text-right">Gross Salary</th>
                <th className="py-3 px-4 text-right">Advances (SA)</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Balance</th>
                <th className="py-3 px-4 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 px-4 text-center text-slate-400">
                    No staff members match your search or filter.
                  </td>
                </tr>
              ) : (
              filteredEmployees.map((emp) => {
                const isSaving = savingEmpId === emp.id;
                const isSavingOt = savingOtEmpId === emp.id;
                const empOt = parseFloat(overtimeState[emp.id] ?? String(emp.overtime_pay || 0)) || 0;
                const empDays = parseFloat(daysState[emp.id] ?? String(emp.days_worked || 0)) || 0;
                const currentGross = Math.round(((empDays * emp.rate_per_day) + empOt) * 100) / 100;
                const currentBalance = Math.round((currentGross - emp.advances_total - emp.paid_total) * 100) / 100;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                      <div className="text-[11px] text-slate-400">{emp.role_title || 'Staff'}</div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      {formatINR(emp.rate_per_day)}
                    </td>

                    {/* Days Worked Editable Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="31"
                          disabled={isMonthClosed || isSaving}
                          value={daysState[emp.id] ?? ''}
                          onChange={(e) =>
                            setDaysState({ ...daysState, [emp.id]: e.target.value })
                          }
                          onBlur={() => handleDaysSave(emp.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleDaysSave(emp.id)}
                          className="w-16 h-8 text-center font-bold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleDaysSave(emp.id)}
                          disabled={isMonthClosed || isSaving}
                          title="Save Days"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Overtime Pay Editable Input */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          step="50"
                          min="0"
                          disabled={isMonthClosed || isSavingOt}
                          value={overtimeState[emp.id] ?? ''}
                          onChange={(e) =>
                            setOvertimeState({ ...overtimeState, [emp.id]: e.target.value })
                          }
                          onBlur={() => handleOvertimeSave(emp.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleOvertimeSave(emp.id)}
                          placeholder="0"
                          className="w-20 h-8 text-center font-bold text-xs text-blue-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleOvertimeSave(emp.id)}
                          disabled={isMonthClosed || isSavingOt}
                          title="Save Overtime"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          {isSavingOt ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatINR(currentGross)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-red-700">
                      {formatINR(emp.advances_total)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {formatINR(emp.paid_total)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[var(--brand-primary,#ea580c)]">
                      {formatINR(currentBalance)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMonthClosed}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setActiveModalType('salary_advance');
                            setModalAmount('');
                          }}
                          className="h-7 text-[11px] px-2 text-purple-700 bg-purple-50/50 hover:bg-purple-100 border-purple-200"
                        >
                          + Advance
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMonthClosed}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setActiveModalType('salary_payment');
                            setModalAmount(String(emp.balance > 0 ? emp.balance : ''));
                          }}
                          className="h-7 text-[11px] px-2 text-blue-700 bg-blue-50/50 hover:bg-blue-100 border-blue-200"
                        >
                          + Pay
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td className="py-3 px-4 text-slate-900">TOTAL</td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-center">-</td>
                <td className="py-3 px-4 text-right font-mono text-slate-900">{formatINR(totalGross)}</td>
                <td className="py-3 px-4 text-right font-mono text-red-700">{formatINR(totalAdvances)}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">{formatINR(totalPaid)}</td>
                <td className="py-3 px-4 text-right font-mono text-[var(--brand-primary,#ea580c)]">{formatINR(totalBalance)}</td>
                <td className="py-3 px-4 text-center">-</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No staff members match your search or filter.
            </div>
          ) : (
          filteredEmployees.map((emp) => {
            const isSaving = savingEmpId === emp.id;

            return (
              <div key={emp.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{emp.name}</h4>
                    <p className="text-xs text-slate-400">{emp.role_title || 'Staff'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Rate / Day: </span>
                    <span className="font-bold font-mono text-slate-900 text-xs">
                      {formatINR(emp.rate_per_day)}
                    </span>
                  </div>
                </div>

                {/* Days Worked Row */}
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-slate-700">Days Working:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="31"
                      disabled={isMonthClosed || isSaving}
                      value={daysState[emp.id] ?? ''}
                      onChange={(e) =>
                        setDaysState({ ...daysState, [emp.id]: e.target.value })
                      }
                      onBlur={() => handleDaysSave(emp.id)}
                      className="w-16 h-8 text-center font-bold text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] px-3 text-xs"
                      onClick={() => handleDaysSave(emp.id)}
                      disabled={isMonthClosed || isSaving}
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Overtime Pay Row */}
                <div className="flex items-center justify-between bg-blue-50/40 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-blue-900">Overtime (OT ₹):</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="50"
                      min="0"
                      disabled={isMonthClosed || savingOtEmpId === emp.id}
                      value={overtimeState[emp.id] ?? ''}
                      onChange={(e) =>
                        setOvertimeState({ ...overtimeState, [emp.id]: e.target.value })
                      }
                      onBlur={() => handleOvertimeSave(emp.id)}
                      placeholder="0"
                      className="w-20 h-8 text-center font-bold text-xs text-blue-700"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] px-3 text-xs text-blue-700 border-blue-200"
                      onClick={() => handleOvertimeSave(emp.id)}
                      disabled={isMonthClosed || savingOtEmpId === emp.id}
                    >
                      {savingOtEmpId === emp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Calculations Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400 uppercase">Gross</div>
                    <div className="font-bold font-mono text-slate-900">{formatINR(emp.gross)}</div>
                  </div>
                  <div className="bg-red-50/50 p-1.5 rounded">
                    <div className="text-[10px] text-red-500 uppercase">Advances</div>
                    <div className="font-bold font-mono text-red-700">{formatINR(emp.advances_total)}</div>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded">
                    <div className="text-[10px] text-slate-400 uppercase">Paid</div>
                    <div className="font-bold font-mono text-slate-700">{formatINR(emp.paid_total)}</div>
                  </div>
                  <div className="bg-orange-50 p-1.5 rounded">
                    <div className="text-[10px] text-orange-600 uppercase font-bold">Balance</div>
                    <div className="font-bold font-mono text-[var(--brand-primary,#ea580c)]">{formatINR(emp.balance)}</div>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMonthClosed}
                    onClick={() => {
                      setSelectedEmp(emp);
                      setActiveModalType('salary_advance');
                      setModalAmount('');
                    }}
                    className="flex-1 min-h-[44px] text-xs font-semibold text-purple-700 bg-purple-50/50 border-purple-200"
                  >
                    + Salary Advance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMonthClosed}
                    onClick={() => {
                      setSelectedEmp(emp);
                      setActiveModalType('salary_payment');
                      setModalAmount(String(emp.balance > 0 ? emp.balance : ''));
                    }}
                    className="flex-1 min-h-[44px] text-xs font-semibold text-blue-700 bg-blue-50/50 border-blue-200"
                  >
                    + Pay Salary
                  </Button>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Salary Advance / Payment Action Dialog */}
      {selectedEmp && activeModalType && (
        <Dialog
          open={!!activeModalType}
          onOpenChange={(open) => !open && setActiveModalType(null)}
        >
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign
                  className={`h-5 w-5 ${
                    activeModalType === 'salary_advance' ? 'text-purple-600' : 'text-blue-600'
                  }`}
                />
                <span>
                  {activeModalType === 'salary_advance'
                    ? `Issue Salary Advance: ${selectedEmp.name}`
                    : `Settle Salary: ${selectedEmp.name}`}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {activeModalType === 'salary_advance'
                  ? 'Advances automatically show in today’s daily expenses as "SA-<NAME>" and deduct from monthly salary balance.'
                  : `Current pending salary balance: ${formatINR(selectedEmp.balance)}`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSalaryTxnSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="sal-amount" className="text-xs font-semibold text-slate-700">
                  Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <Input
                    id="sal-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1500"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    disabled={isPending}
                    className="pl-8 font-bold text-slate-900 min-h-[44px] text-base"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Payment Mode</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {paymentModes.map((m) => {
                    const isSelected = modalModeId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModalModeId(m.id)}
                        className={`py-1.5 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--brand-primary,#ea580c)] bg-orange-50 text-[var(--brand-primary,#ea580c)] font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sal-note" className="text-xs font-semibold text-slate-700">
                  Note / Reason (Optional)
                </Label>
                <Input
                  id="sal-note"
                  type="text"
                  placeholder={
                    activeModalType === 'salary_advance'
                      ? 'e.g. Festival advance, emergency'
                      : 'e.g. Full month settlement'
                  }
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  disabled={isPending}
                  className="h-10 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModalType(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className={`font-semibold ${
                    activeModalType === 'salary_advance'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isPending ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin" /> Recording...
                    </span>
                  ) : activeModalType === 'salary_advance' ? (
                    'Record Salary Advance'
                  ) : (
                    'Record Salary Payment'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

