'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { IncomeEntry } from '@/lib/types';

const CATEGORIES = ['Fee Collection', 'Transport', 'Admission', 'Exam', 'Canteen', 'Uniform/Books', 'Donation', 'Government Grant', 'Rental', 'Other'];

export default function IncomePage() {
    const [entries, setEntries] = useState<IncomeEntry[]>([]);
    const [summary, setSummary] = useState<{ total_amount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'Fee Collection', amount: '', payment_mode: 'cash', received_from: '', description: '', receipt_number: '' });

    const load = useCallback(async () => {
        try {
            const json = await api.getIncomeEntries();
            setEntries(json.data as IncomeEntry[] || []);
            setSummary(json.summary ?? null);
        }
        catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load';
            setError(message);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.createIncomeEntry({ ...form, amount: parseFloat(form.amount) });
            setShowForm(false);
            setForm({ date: new Date().toISOString().split('T')[0], category: 'Fee Collection', amount: '', payment_mode: 'cash', received_from: '', description: '', receipt_number: '' });
            load();
        }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to submit'); }
    };

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Revenue Ledger</h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">Tracking all institutional income and transactions</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        Download Statement
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2 ${showForm ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-rose-600/5' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] shadow-[#6c5ce7]/20 font-bold'
                            }`}
                    >
                        {showForm ? '✕ Close Form' : '➕ Record Income'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs text-rose-600">✕</span>
                {error}
            </div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-3xl text-white shadow-xl shadow-emerald-600/10">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Total Revenue</p>
                    <p className="text-4xl font-extrabold mt-2 tracking-tighter">₹{(summary?.total_amount || 0).toLocaleString('en-IN')}</p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <span className="text-emerald-300">↑ 14.2%</span>
                        <span className="opacity-60">vs last month</span>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Transactions</p>
                    <p className="text-3xl font-extrabold mt-2 text-gray-900">{entries.length}</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">Current billing cycle</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Main Source</p>
                    <p className="text-3xl font-extrabold mt-2 text-gray-900">Fees</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">82% of total volume</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Bank Credits</p>
                    <p className="text-3xl font-extrabold mt-2 text-gray-900">70%</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">Digital vs Cash</p>
                </div>
            </div>

            {showForm && (
                <div className="bg-white p-8 rounded-3xl border border-[#f1f0ff] shadow-xl shadow-[#6c5ce7]/5 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center text-sm">💰</span>
                        New Income Entry
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Date of Entry</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Income Category</label>
                                <select className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Transaction Amount</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" type="number" step="0.01" placeholder="₹ 0.00" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Payment Mode</label>
                                <select className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
                                    <option value="cash">Cash Payment</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="online">Online Gateway</option>
                                    <option value="upi">UPI / QR Scan</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Received From / Entity</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" placeholder="Name of student or organization..." value={form.received_from} onChange={e => setForm({ ...form, received_from: e.target.value })} />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Receipt Number / Reference</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" placeholder="Voucher or Receipt No..." value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Transaction Remarks</label>
                            <textarea className="w-full bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-5 resize-none" rows={2} placeholder="Optional notes for this transaction..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">Discard</button>
                            <button type="submit" className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Submit Entry</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Settle Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Source Category</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Entity Details</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Credit Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center">
                                <div className="inline-block w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin"></div>
                            </td></tr>
                                : entries.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No income records available</td></tr>
                                    : entries.map(e => (
                                        <tr key={e.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-[#6c5ce7] transition-colors">{e.category}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-700">{e.received_from || 'Direct Payment'}</span>
                                                    <span className="text-[11px] text-gray-400 font-medium truncate max-w-[200px]">{e.description || 'No description provided'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-extrabold text-emerald-600 tracking-tight">₹{(e.amount || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide">
                                                    {e.payment_mode?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono font-bold text-gray-400">{e.receipt_number || 'TRX-DEFAULT'}</span>
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
