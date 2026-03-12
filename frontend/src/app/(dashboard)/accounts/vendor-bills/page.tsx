'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Vendor, VendorBill } from '@/lib/types';

export default function VendorBillsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [bills, setBills] = useState<VendorBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showVendorForm, setShowVendorForm] = useState(false);
    const [error, setError] = useState('');
    const [vendorForm, setVendorForm] = useState({ name: '', phone: '', email: '', address: '', gst_number: '' });
    const [billForm, setBillForm] = useState({ vendor_id: '', bill_number: '', bill_date: new Date().toISOString().split('T')[0], due_date: '', category: '', sub_total: '', tax_amount: '0', total_amount: '' });

    const loadBills = useCallback(async () => {
        try { const json = await api.getVendorBills(); setBills(json.data || []); }
        catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to load';
            setError(message);
            setBills([]);
        }
        setLoading(false);
    }, []);

    const loadVendors = useCallback(async () => {
        try { setVendors(await api.getVendors()); } catch { setVendors([]); }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadBills();
            await loadVendors();
        })();
    }, [loadBills, loadVendors]);

    const addVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try { await api.createVendor(vendorForm); setShowVendorForm(false); setVendorForm({ name: '', phone: '', email: '', address: '', gst_number: '' }); loadVendors(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const addBill = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try { await api.createVendorBill({ ...billForm, vendor_id: parseInt(billForm.vendor_id), sub_total: parseFloat(billForm.sub_total), tax_amount: parseFloat(billForm.tax_amount || '0'), total_amount: parseFloat(billForm.total_amount) }); setShowForm(false); loadBills(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const payBill = async (id: number) => {
        const amount = prompt('Payment amount (₹):');
        if (!amount || isNaN(parseFloat(amount))) return;
        try { await api.payVendorBill(id, parseFloat(amount)); loadBills(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const statusColors: Record<string, string> = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-200 text-red-800' };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1><p className="text-sm text-gray-500 mt-1">Manage vendor bills and payments</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowVendorForm(!showVendorForm)} className="px-4 py-2 border border-[#6c5ce7] text-[#6c5ce7] rounded-lg text-sm font-medium hover:bg-[#6c5ce7]/5">+ Add Vendor</button>
                    <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6] text-sm font-medium shadow-sm">+ New Bill</button>
                </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {showVendorForm && (
                <form onSubmit={addVendor} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <h3 className="font-semibold">Add Vendor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Vendor Name *" required value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Phone" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="GST Number" value={vendorForm.gst_number} onChange={e => setVendorForm({ ...vendorForm, gst_number: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowVendorForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm hover:bg-[#5b4dd6]">Save Vendor</button>
                    </div>
                </form>
            )}
            {showForm && (
                <form onSubmit={addBill} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <h3 className="font-semibold">New Vendor Bill</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required value={billForm.vendor_id} onChange={e => setBillForm({ ...billForm, vendor_id: e.target.value })}>
                            <option value="">Select Vendor *</option>
                            {vendors.map(v => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                        </select>
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Bill Number *" required value={billForm.bill_number} onChange={e => setBillForm({ ...billForm, bill_number: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" type="date" required value={billForm.bill_date} onChange={e => setBillForm({ ...billForm, bill_date: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" type="date" required value={billForm.due_date} onChange={e => setBillForm({ ...billForm, due_date: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" type="number" step="0.01" placeholder="Total Amount (₹) *" required value={billForm.total_amount} onChange={e => setBillForm({ ...billForm, total_amount: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm hover:bg-[#5b4dd6]">Save Bill</button>
                    </div>
                </form>
            )}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase"><tr>
                            <th className="px-4 py-3 text-left">Bill #</th><th className="px-4 py-3 text-left">Vendor</th>
                            <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Due</th>
                            <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                                : bills.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No bills</td></tr>
                                    : bills.map(b => (
                                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{b.bill_number}</td>
                                            <td className="px-4 py-3 font-medium">{b.vendor_name}</td>
                                            <td className="px-4 py-3 text-xs">{new Date(b.bill_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3 text-xs">{new Date(b.due_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right">₹{(b.total_amount || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right text-green-600">₹{(b.amount_paid || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3 text-right text-red-600">₹{(b.balance_due || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100'}`}>{b.status}</span></td>
                                            <td className="px-4 py-3">{b.status !== 'paid' && <button onClick={() => payBill(b.id)} className="text-xs text-green-600 hover:underline font-medium">Record Payment</button>}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
