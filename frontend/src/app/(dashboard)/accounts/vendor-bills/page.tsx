'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Vendor, VendorBill } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { Plus, X, IndianRupee, AlertCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
    unpaid: 'bg-rose-50 text-rose-700 border-rose-100',
    partial: 'bg-amber-50 text-amber-700 border-amber-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    overdue: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
    unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid', overdue: 'Overdue',
};

interface PaymentModalProps {
    bill: VendorBill;
    onClose: () => void;
    onPaid: () => void;
}

function PaymentModal({ bill, onClose, onPaid }: PaymentModalProps) {
    const [amount, setAmount] = useState(String(bill.balance_due || ''));
    const [mode, setMode] = useState('bank_transfer');
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const handlePay = async () => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
        setSaving(true);
        try {
            await (api as any).payVendorBill(bill.id, amt);
            toast.success('Payment recorded');
            onPaid();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to record payment');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div ref={ref} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-slate-900">Record Payment</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={14} /></button>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-5 text-sm">
                    <p className="font-medium text-slate-700">{bill.vendor_name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Bill #{bill.bill_number}</p>
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Balance due</span>
                        <span className="font-semibold text-rose-600">₹{(bill.balance_due || 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="space-y-3 mb-5">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Amount (₹) *</label>
                        <div className="relative">
                            <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="number" step="0.01" min="0.01"
                                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Payment Mode</label>
                        <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm"
                            value={mode} onChange={e => setMode(e.target.value)}
                        >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="upi">UPI</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handlePay} disabled={saving}
                        className="flex-1 py-2.5 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Confirm Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VendorBillsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showVendorForm, setShowVendorForm] = useState(false);
    const [payingBill, setPayingBill] = useState<VendorBill | null>(null);

    const [vendorForm, setVendorForm] = useState({ name: '', phone: '', email: '', address: '', gst_number: '' });
    const [billForm, setBillForm] = useState({
        vendor_id: '',
        bill_number: '',
        bill_date: new Date().toISOString().split('T')[0],
        due_date: '',
        category: '',
        sub_total: '',
        tax_amount: '0',
        total_amount: '',
    });

    const loadBills = useCallback(async () => {
        try {
            const json = await (api as any).getVendorBills();
            setBills(json.data || []);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load bills');
            setBills([]);
        }
        setLoading(false);
    }, []);

    const loadVendors = useCallback(async () => {
        try { setVendors(await (api as any).getVendors()); } catch { setVendors([]); }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([loadBills(), loadVendors()]);
    }, [loadBills, loadVendors]);

    const addVendor = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await (api as any).createVendor(vendorForm);
            toast.success('Vendor added');
            setShowVendorForm(false);
            setVendorForm({ name: '', phone: '', email: '', address: '', gst_number: '' });
            loadVendors();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to add vendor');
        }
    };

    const addBill = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await (api as any).createVendorBill({
                ...billForm,
                vendor_id: parseInt(billForm.vendor_id),
                sub_total: parseFloat(billForm.sub_total || billForm.total_amount),
                tax_amount: parseFloat(billForm.tax_amount || '0'),
                total_amount: parseFloat(billForm.total_amount),
            });
            setShowForm(false);
            setBillForm({ vendor_id: '', bill_number: '', bill_date: new Date().toISOString().split('T')[0], due_date: '', category: '', sub_total: '', tax_amount: '0', total_amount: '' });
            loadBills();
            toast.success('Bill saved');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save bill');
        }
    };

    const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm transition-colors';

    const overdueCount = bills.filter(b => b.status === 'overdue' || (b.status === 'unpaid' && new Date(b.due_date) < new Date())).length;
    const totalDue = bills.reduce((s, b) => s + (b.balance_due || 0), 0);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendor Bills</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track bills from suppliers and service providers</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowVendorForm(!showVendorForm)}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-[#6c5ce7]/30 text-[#6c5ce7] hover:bg-[#f1f0ff] transition-colors"
                    >
                        + Add Vendor
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] transition-colors"
                    >
                        <Plus size={14} /> New Bill
                    </button>
                </div>
            </div>

            {/* Summary chips */}
            {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">
                    <AlertCircle size={14} />
                    <span><strong>{overdueCount}</strong> bill{overdueCount > 1 ? 's' : ''} overdue — Total outstanding: <strong>₹{totalDue.toLocaleString('en-IN')}</strong></span>
                </div>
            )}

            {/* Add Vendor Form */}
            {showVendorForm && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 mb-4">Add Vendor</h3>
                    <form onSubmit={addVendor} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Name *</label>
                                <input required className={inputCls} placeholder="Company or person name"
                                    value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Phone</label>
                                <input className={inputCls} placeholder="Contact number"
                                    value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">GST Number</label>
                                <input className={inputCls} placeholder="GSTIN"
                                    value={vendorForm.gst_number} onChange={e => setVendorForm({ ...vendorForm, gst_number: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowVendorForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                            <button type="submit" className="px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#5b4bd5] transition-colors">Save Vendor</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Bill Form */}
            {showForm && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 mb-4">New Bill</h3>
                    <form onSubmit={addBill} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Vendor *</label>
                                <select required className={inputCls} value={billForm.vendor_id} onChange={e => setBillForm({ ...billForm, vendor_id: e.target.value })}>
                                    <option value="">Select vendor</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Bill Number *</label>
                                <input required className={inputCls} placeholder="Invoice number"
                                    value={billForm.bill_number} onChange={e => setBillForm({ ...billForm, bill_number: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Category</label>
                                <input className={inputCls} placeholder="e.g. Stationery, Maintenance"
                                    value={billForm.category} onChange={e => setBillForm({ ...billForm, category: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Bill Date *</label>
                                <input type="date" required className={inputCls}
                                    value={billForm.bill_date} onChange={e => setBillForm({ ...billForm, bill_date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Due Date *</label>
                                <input type="date" required className={inputCls}
                                    value={billForm.due_date} onChange={e => setBillForm({ ...billForm, due_date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-600">Tax Amount (₹)</label>
                                <input type="number" step="0.01" className={inputCls} placeholder="0.00"
                                    value={billForm.tax_amount} onChange={e => setBillForm({ ...billForm, tax_amount: e.target.value })} />
                            </div>
                            <div className="space-y-1 md:col-span-3">
                                <label className="text-xs font-medium text-slate-600">Total Amount (₹) *</label>
                                <input type="number" step="0.01" required className={`${inputCls} md:w-1/3`} placeholder="0.00"
                                    value={billForm.total_amount} onChange={e => setBillForm({ ...billForm, total_amount: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                            <button type="submit" className="px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#5b4bd5] transition-colors">Save Bill</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bills Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Bill No.</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Vendor</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Due</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Total</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Paid</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Balance</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Status</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-12 text-center">
                                        <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">
                                        No bills found.
                                    </td>
                                </tr>
                            ) : bills.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{b.bill_number}</td>
                                    <td className="px-5 py-3.5 font-medium text-slate-900">{b.vendor_name}</td>
                                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(b.bill_date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-5 py-3.5 text-xs">
                                        <span className={new Date(b.due_date) < new Date() && b.status !== 'paid' ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                                            {new Date(b.due_date).toLocaleDateString('en-IN')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">₹{(b.total_amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">₹{(b.amount_paid || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3.5 text-right text-rose-600 font-medium">₹{(b.balance_due || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[b.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {STATUS_LABELS[b.status] || b.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {b.status !== 'paid' && (
                                            <button
                                                onClick={() => setPayingBill(b)}
                                                className="text-xs text-[#6c5ce7] hover:underline font-medium"
                                            >
                                                Pay
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {payingBill && (
                <PaymentModal
                    bill={payingBill}
                    onClose={() => setPayingBill(null)}
                    onPaid={() => { setPayingBill(null); loadBills(); }}
                />
            )}
        </div>
    );
}
