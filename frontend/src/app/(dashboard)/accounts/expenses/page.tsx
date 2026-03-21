'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ExpenseEntry } from '@/lib/types';
import { toast } from 'react-hot-toast';

const CATEGORIES = ['Salary', 'Electricity', 'Water', 'Maintenance', 'Furniture', 'Stationery', 'Printing', 'Sports', 'Lab Equipment', 'Books', 'Transport', 'Security', 'Internet/IT', 'Event', 'Miscellaneous'];

export default function ExpensesPage() {
    const [entries, setEntries] = useState<ExpenseEntry[]>([]);
    const [summary, setSummary] = useState<{ total_amount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Stationery',
        amount: '',
        paid_to: '',
        payment_mode: 'cash',
        description: '',
        transaction_number: '',
        is_recurring: false,
        recurring_frequency: 'monthly',
    });

    const load = useCallback(async () => {
        try {
            const json = await api.getExpenseEntries();
            setEntries(json.data as ExpenseEntry[] || []);
            setSummary(json.summary ?? null);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load expense records';
            toast.error(message);
            setEntries([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, [load]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.createExpenseEntry({ ...form, amount: parseFloat(form.amount) });
            setShowForm(false);
            setForm({ date: new Date().toISOString().split('T')[0], category: 'Stationery', amount: '', paid_to: '', payment_mode: 'cash', description: '', transaction_number: '', is_recurring: false, recurring_frequency: 'monthly' });
            load();
            toast.success('Expense recorded successfully');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save expense');
        }
    };

    const paymentModeLabel = (mode: string) => {
        const map: Record<string, string> = {
            cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
            upi: 'UPI', credit_card: 'Credit Card',
        };
        return map[mode] || mode;
    };

    return (
        <div className="space-y-6 p-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
                    <p className="text-slate-500 text-sm mt-1">All payments made by the school</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] shadow-sm'}`}
                >
                    {showForm ? 'Cancel' : '+ Add Expense'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Expenses</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                        ₹{(summary?.total_amount || 0).toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Number of Entries</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{entries.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Largest Category</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">Salaries</p>
                </div>
            </div>

            {/* Add Expense Form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Record New Expense</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Date</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    type="date" required
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Category</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Amount (₹)</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    type="number" step="0.01" placeholder="0.00" required
                                    value={form.amount}
                                    onChange={e => setForm({ ...form, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Payment Method</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    value={form.payment_mode}
                                    onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="upi">UPI</option>
                                    <option value="credit_card">Credit Card</option>
                                </select>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Paid To</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    placeholder="Vendor, employee, or contractor name" required
                                    value={form.paid_to}
                                    onChange={e => setForm({ ...form, paid_to: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Transaction / Cheque Number</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    placeholder="Reference or cheque number"
                                    value={form.transaction_number}
                                    onChange={e => setForm({ ...form, transaction_number: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                            <input
                                type="checkbox" id="is_recurring"
                                checked={form.is_recurring}
                                onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 accent-[#6c5ce7]"
                            />
                            <label htmlFor="is_recurring" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Recurring expense
                            </label>
                            {form.is_recurring && (
                                <select
                                    className="ml-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                    value={form.recurring_frequency}
                                    onChange={e => setForm({ ...form, recurring_frequency: e.target.value })}
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Purpose / Notes (optional)</label>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7] resize-none"
                                rows={2} placeholder="What was this expense for?"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                            <button type="submit" className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors">Save Expense</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Expenses Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Category</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Paid To</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Amount</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Method</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center">
                                        <div className="inline-block w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        No expense entries found.
                                    </td>
                                </tr>
                            ) : entries.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5 text-sm text-slate-600">
                                        {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{e.category}</td>
                                    <td className="px-5 py-3.5">
                                        <p className="text-sm text-slate-800">{e.paid_to}</p>
                                        {e.description && <p className="text-xs text-slate-400 truncate max-w-[180px]">{e.description}</p>}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <span className="text-sm font-semibold text-rose-600">
                                            ₹{(e.amount || 0).toLocaleString('en-IN')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                                            {paymentModeLabel(e.payment_mode || '')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                                        {e.transaction_number || '—'}
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
