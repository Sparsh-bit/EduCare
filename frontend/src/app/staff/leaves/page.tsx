'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CalendarOff, Plus, X, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import type { Leave } from '@/lib/types';

interface LeaveBalance { leave_type_name: string; code: string; allocated: number; used: number; remaining: number; }

const LEAVE_TYPES = [
    { value: 'casual', label: 'Casual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'earned', label: 'Earned Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
];

const STATUS_CONFIG = {
    pending:  { icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-100',   label: 'Pending' },
    approved: { icon: CheckCircle2,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Approved' },
    rejected: { icon: XCircle,       cls: 'bg-rose-50 text-rose-700 border-rose-100',      label: 'Rejected' },
};

function daysBetween(from: string, to: string) {
    return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
}

export default function StaffLeavesPage() {
    const { user } = useAuth();
    const [balances, setBalances] = useState<LeaveBalance[]>([]);
    const [history, setHistory] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ leave_type: '', from_date: '', to_date: '', reason: '' });
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([
            api.getMyLeaveBalances().catch(() => []),
            api.getLeaves().catch(() => []),
        ]).then(([bal, hist]) => {
            setBalances(Array.isArray(bal) ? (bal as LeaveBalance[]) : []);
            setHistory(Array.isArray(hist) ? (hist as Leave[]) : []);
        }).finally(() => setLoading(false));
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleApply = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await api.applyLeave({
                leave_type: form.leave_type,
                from_date: form.from_date,
                to_date: form.to_date,
                reason: form.reason,
            });
            toast.success('Leave application submitted!');
            setShowForm(false);
            setForm({ leave_type: '', from_date: '', to_date: '', reason: '' });
            loadData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to apply for leave');
        } finally { setSaving(false); }
    };

    const inputCls = "w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/20 outline-none shadow-sm transition-all";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Leaves</h1>
                    <p className="text-sm text-slate-500 mt-1">View balances, apply for leave, and track requests</p>
                </div>
                <button onClick={() => setShowForm(v => !v)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${
                        showForm
                        ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5]'
                    }`}>
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'Apply Leave'}
                </button>
            </div>

            {/* Apply form */}
            {showForm && (
                <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleApply}
                    className="bg-white rounded-2xl border border-slate-100 p-6 shadow-md shadow-slate-200/50 space-y-5">
                    <h2 className="text-sm font-bold text-slate-800">Leave Application</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Leave Type *</label>
                            <select required value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))} className={inputCls}>
                                <option value="">Select type</option>
                                {LEAVE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                            </select>
                        </div>
                        <div />
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">From Date *</label>
                            <input type="date" required value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">To Date *</label>
                            <input type="date" required value={form.to_date} min={form.from_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} className={inputCls} />
                        </div>
                    </div>
                    {form.from_date && form.to_date && (
                        <p className="text-xs text-[#6c5ce7] font-semibold">
                            Duration: {daysBetween(form.from_date, form.to_date)} day(s)
                        </p>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Reason *</label>
                        <textarea required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Reason for leave..."
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/20 outline-none shadow-sm transition-all resize-none" />
                    </div>
                    <div className="flex justify-end pt-1">
                        <button type="submit" disabled={saving}
                            className="h-11 px-8 bg-[#6c5ce7] text-white text-sm font-bold rounded-xl hover:bg-[#5b4bd5] hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2">
                            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : <>Submit Application <ChevronRight size={15} /></>}
                        </button>
                    </div>
                </motion.form>
            )}

            {/* Leave balances */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <CalendarOff size={18} className="text-[#6c5ce7]" /> Leave Balances
                </h2>
                {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                ) : balances.length === 0 ? (
                    <div className="text-center py-8 rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                        <CalendarOff size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">No leave balances configured yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {balances.map(lb => (
                            <div key={lb.code || lb.leave_type_name} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-[#6c5ce7]/20 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#6c5ce7]/10 text-[#6c5ce7] uppercase tracking-wider">{lb.code}</span>
                                    <span className="text-xs text-slate-400">{lb.allocated} total</span>
                                </div>
                                <p className="text-2xl font-black text-[#6c5ce7] mb-0.5">{lb.remaining}</p>
                                <p className="text-[11px] text-slate-500 capitalize">{lb.leave_type_name}</p>
                                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[#6c5ce7] transition-all"
                                        style={{ width: `${lb.allocated > 0 ? Math.round((lb.remaining / lb.allocated) * 100) : 0}%` }} />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">{lb.used} used · {lb.remaining} remaining</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Leave history */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-800 mb-5">My Leave Applications</h2>
                {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                        <p className="text-sm text-slate-400">No leave applications yet</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {history.map(l => {
                            const cfg = STATUS_CONFIG[l.status] || STATUS_CONFIG.pending;
                            const Icon = cfg.icon;
                            return (
                                <div key={l.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-slate-900 capitalize">{l.leave_type} Leave</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${cfg.cls}`}>
                                                <Icon size={11} />
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {new Date(l.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            {' — '}
                                            {new Date(l.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <span className="ml-1 font-semibold text-slate-600">({daysBetween(l.from_date, l.to_date)} day{daysBetween(l.from_date, l.to_date) !== 1 ? 's' : ''})</span>
                                        </p>
                                        {l.reason && <p className="text-xs text-slate-400 mt-1 truncate">{l.reason}</p>}
                                        {l.status === 'rejected' && l.rejection_reason && (
                                            <p className="text-xs text-rose-600 mt-1 font-medium">Reason: {l.rejection_reason}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 shrink-0">
                                        {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
