'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SalaryRecord } from '@/lib/types';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { DollarSign, Play, CheckCircle2, Clock, Download, ChevronRight } from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_CLS: Record<string, string> = {
    processed: 'bg-amber-50 text-amber-700 border-amber-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function PayrollPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [workingDays, setWorkingDays] = useState(26);
    const [records, setRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [payingId, setPayingId] = useState<number | null>(null);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getPayrollRecords({ month: String(month), year: String(year) }) as { data?: SalaryRecord[] };
            setRecords(res.data ?? []);
        } catch {
            toast.error('Failed to load payroll records');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => { loadRecords(); }, [loadRecords]);

    const handleProcess = async () => {
        if (!confirm(`Process payroll for ${MONTHS[month - 1]} ${year} with ${workingDays} working days?`)) return;
        setProcessing(true);
        try {
            await api.processPayroll({ month, year, working_days: workingDays });
            toast.success('Payroll processed successfully');
            loadRecords();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to process payroll');
        } finally {
            setProcessing(false);
        }
    };

    const handleMarkPaid = async (id: number) => {
        if (!confirm('Mark this record as paid?')) return;
        setPayingId(id);
        try {
            await api.markPayrollPaid(id, { status: 'paid', payment_date: new Date().toISOString().slice(0, 10) });
            toast.success('Marked as paid');
            loadRecords();
        } catch {
            toast.error('Failed to update status');
        } finally {
            setPayingId(null);
        }
    };

    const handlePayslip = async (id: number, name: string) => {
        try {
            const slip = await api.getPayslip(id) as Record<string, unknown>;
            // Build a simple printable payslip
            const html = buildPayslipHtml(slip, name);
            const w = window.open('', '_blank');
            if (w) { w.document.write(html); w.document.close(); w.print(); }
        } catch {
            toast.error('Failed to fetch payslip');
        }
    };

    const totalGross = records.reduce((s, r) => s + Number(r.gross_earned || 0), 0);
    const totalNet = records.reduce((s, r) => s + Number(r.net_salary || 0), 0);
    const totalDeductions = records.reduce((s, r) => s + Number(r.total_deductions || 0), 0);
    const processedCount = records.filter(r => r.status === 'processed').length;
    const paidCount = records.filter(r => r.status === 'paid').length;

    const inputCls = 'h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/20 outline-none';

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Process Payroll</h1>
                    <p className="text-sm text-slate-500 mt-1">Generate and manage monthly salary disbursements</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Month</label>
                        <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inputCls}>
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Year</label>
                        <select value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls}>
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Working Days</label>
                        <input type="number" min={1} max={31} value={workingDays}
                            onChange={e => setWorkingDays(Number(e.target.value))} className={`${inputCls} w-24`} />
                    </div>
                    <button onClick={handleProcess} disabled={processing}
                        className="h-9 px-5 bg-[#6c5ce7] text-white text-sm font-bold rounded-lg hover:bg-[#5b4bd5] disabled:opacity-60 flex items-center gap-2 transition-all">
                        {processing
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                            : <><Play size={14} /> Run Payroll</>}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {records.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Gross', value: fmt(totalGross), icon: DollarSign, color: 'text-[#6c5ce7] bg-[#f1f0ff]' },
                        { label: 'Total Deductions', value: fmt(totalDeductions), icon: ChevronRight, color: 'text-rose-600 bg-rose-50' },
                        { label: 'Net Payable', value: fmt(totalNet), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                        { label: 'Paid / Pending', value: `${paidCount} / ${processedCount}`, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                    ].map(c => (
                        <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                                <c.icon size={16} />
                            </div>
                            <p className="text-lg font-black text-slate-900">{c.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Records Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-800">
                        {MONTHS[month - 1]} {year} — Payroll Records
                    </h2>
                    <span className="text-xs text-slate-400">{records.length} staff</span>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16">
                        <DollarSign size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">No payroll records for this period</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Run Payroll" to generate salary for all active staff</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-max">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['Staff', 'Designation', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {records.map(r => {
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-slate-900">{r.staff_name}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{r.designation || '—'}</td>
                                            <td className="px-4 py-3 font-medium text-slate-700">{fmt(r.gross_earned)}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{fmt(r.pf_employee ?? 0)}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{fmt(r.esi_employee ?? 0)}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{fmt(r.professional_tax ?? 0)}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{fmt(r.tds ?? 0)}</td>
                                            <td className="px-4 py-3 text-rose-600 font-medium">{fmt(r.total_deductions)}</td>
                                            <td className="px-4 py-3 font-bold text-emerald-700">{fmt(r.net_salary)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${STATUS_CLS[r.status] ?? STATUS_CLS.processed}`}>
                                                    {r.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                    {r.status === 'paid' ? 'Paid' : 'Processed'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {r.status === 'processed' && (
                                                        <button onClick={() => handleMarkPaid(r.id)}
                                                            disabled={payingId === r.id}
                                                            className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                                            {payingId === r.id ? '...' : 'Mark Paid'}
                                                        </button>
                                                    )}
                                                    <button onClick={() => handlePayslip(r.id, r.staff_name ?? '')}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Download Payslip">
                                                        <Download size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function buildPayslipHtml(slip: Record<string, unknown>, name: string): string {
    const s = slip as Record<string, number | string>;
    const fmt2 = (v: unknown) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
    const month = MONTHS[(Number(s.month) || 1) - 1];
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip — ${name}</title>
<style>body{font-family:Arial,sans-serif;margin:32px;color:#1e293b;font-size:13px}
h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}
th{background:#f8fafc;font-weight:600}.total td{font-weight:700;background:#f1f5f9}</style>
</head><body>
<h2>EduCare ERP — Salary Slip</h2>
<p style="color:#64748b;margin:0">${month} ${s.year}</p>
<table style="margin-top:16px;margin-bottom:0;border:none">
<tr><td style="border:none;padding:4px 0"><strong>Employee:</strong> ${s.name || name}</td>
<td style="border:none;padding:4px 0"><strong>Designation:</strong> ${s.designation || '—'}</td></tr>
<tr><td style="border:none;padding:4px 0"><strong>Emp ID:</strong> ${s.employee_id || '—'}</td>
<td style="border:none;padding:4px 0"><strong>Bank A/C:</strong> ${s.bank_account_number || '—'} ${s.bank_ifsc ? `(${s.bank_ifsc})` : ''}</td></tr>
</table>
<table>
<thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Basic</td><td>${fmt2(s.basic_earned)}</td><td>PF (Employee)</td><td>${fmt2(s.pf_employee)}</td></tr>
<tr><td>HRA</td><td>${fmt2(s.hra_earned)}</td><td>ESI (Employee)</td><td>${fmt2(s.esi_employee)}</td></tr>
<tr><td>DA</td><td>${fmt2(s.da_earned)}</td><td>Professional Tax</td><td>${fmt2(s.pt)}</td></tr>
<tr><td>TA</td><td>${fmt2(s.ta_earned)}</td><td>TDS</td><td>${fmt2(s.tds)}</td></tr>
<tr><td>Medical Allowance</td><td>${fmt2(s.medical_earned)}</td><td></td><td></td></tr>
<tr><td>Special Allowance</td><td>${fmt2(s.special_earned)}</td><td></td><td></td></tr>
<tr><td>Other Allowance</td><td>${fmt2(s.other_earned)}</td><td></td><td></td></tr>
<tr class="total"><td>Gross Earned</td><td>${fmt2(s.gross_earned)}</td><td>Total Deductions</td><td>${fmt2(s.total_deductions)}</td></tr>
</tbody>
</table>
<p style="margin-top:16px;font-size:16px;font-weight:700">Net Salary: ${fmt2(s.net_salary)}</p>
<p style="color:#64748b;font-size:11px;margin-top:24px">This is a computer-generated payslip. No signature required.</p>
</body></html>`;
}
