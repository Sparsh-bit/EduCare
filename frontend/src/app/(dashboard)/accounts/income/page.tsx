'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { IncomeEntry } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { TrendingUp, Plus, X } from 'lucide-react';

const CATEGORIES = [
    'Fee Collection', 'Transport', 'Admission', 'Exam', 'Canteen',
    'Uniform/Books', 'Donation', 'Government Grant', 'Rental', 'Other',
];

const PAYMENT_MODES = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online' },
    { value: 'upi', label: 'UPI' },
];

const EMPTY_FORM = {
    date: new Date().toISOString().split('T')[0],
    category: 'Fee Collection',
    amount: '',
    payment_mode: 'cash',
    received_from: '',
    description: '',
    receipt_number: '',
};

export default function IncomePage() {
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [summary, setSummary] = useState<{ total_amount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Filters
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMode, setFilterMode] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const json = await api.getIncomeEntries();
            setEntries((json.data as IncomeEntry[]) || []);
            setSummary(json.summary ?? null);
        } catch (err) {
            reportApiError(err);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.createIncomeEntry({ ...form, amount: parseFloat(form.amount) });
            toast.success('Income recorded');
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save entry');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 outline-none rounded-lg text-sm transition-all';

    const filtered = entries.filter(e =>
        (!filterCategory || e.category === filterCategory) &&
        (!filterMode || e.payment_mode === filterMode)
    );

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Income</h1>
                    <p className="text-sm text-slate-500 mt-0.5">All revenue received by the school</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showForm
                            ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5]'
                    }`}
                >
                    {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Income</>}
                </button>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Income</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                        ₹{(summary?.total_amount || 0).toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Entries</p>
                    <p className="text-2xl font-bold text-slate-900">{entries.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">This View</p>
                    <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
                </div>
            </div>

            {/* Add Form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 mb-4">Record Income Entry</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Date *</label>
                                <input
                                    type="date" required className={inputCls}
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Category *</label>
                                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Amount (₹) *</label>
                                <input
                                    type="number" step="0.01" placeholder="0.00" required className={inputCls}
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Payment Mode</label>
                                <select className={inputCls} value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
                                    {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Received From</label>
                                <input
                                    className={inputCls} placeholder="Student name, organisation, etc."
                                    value={form.received_from}
                                    onChange={e => setForm({ ...form, received_from: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Receipt Number</label>
                                <input
                                    className={inputCls} placeholder="Receipt or voucher number"
                                    value={form.receipt_number}
                                    onChange={e => setForm({ ...form, receipt_number: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Notes</label>
                            <textarea
                                className={`${inputCls} resize-none`} rows={2}
                                placeholder="Optional description"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                            <button
                                type="submit" disabled={submitting}
                                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {submitting ? 'Saving...' : 'Save Entry'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-[#6c5ce7]"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    value={filterMode}
                    onChange={e => setFilterMode(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-[#6c5ce7]"
                >
                    <option value="">All Modes</option>
                    {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {(filterCategory || filterMode) && (
                    <button
                        onClick={() => { setFilterCategory(''); setFilterMode(''); }}
                        className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                        <X size={12} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Category</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Received From</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Amount</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Mode</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Receipt No.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center">
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        No income entries found.
                                    </td>
                                </tr>
                            ) : filtered.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5 text-slate-600 text-xs">
                                        {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3.5 font-medium text-slate-900">{e.category}</td>
                                    <td className="px-5 py-3.5">
                                        <p className="text-slate-800">{e.received_from || '—'}</p>
                                        {e.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{e.description}</p>}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">
                                        ₹{(e.amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium capitalize">
                                            {PAYMENT_MODES.find(m => m.value === e.payment_mode)?.label || e.payment_mode}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                                        {e.receipt_number || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
