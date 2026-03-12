'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { PostalRecord } from '@/lib/types';

export default function PostalPage() {
    const [records, setRecords] = useState<PostalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'received' | 'dispatched'>('received');
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ type: 'received', party_name: '', date: new Date().toISOString().split('T')[0], postal_type: 'letter', reference_number: '', addressed_to: '', mode: '', description: '' });

    const load = useCallback(async () => {
        try { const json = await api.getPostalRecords({ type: tab }); setRecords(json.data || []); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); setRecords([]); }
        setLoading(false);
    }, [tab]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try { await api.createPostalRecord({ ...form, type: tab }); setShowForm(false); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">Postal Records</h1><p className="text-sm text-gray-500 mt-1">Track incoming and outgoing postal items</p></div>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6] text-sm font-medium shadow-sm">{showForm ? '✕ Cancel' : '+ Add Record'}</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            <div className="flex gap-2">
                <button onClick={() => setTab('received')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'received' ? 'bg-[#6c5ce7] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📥 Received</button>
                <button onClick={() => setTab('dispatched')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'dispatched' ? 'bg-[#6c5ce7] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📤 Dispatched</button>
            </div>
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] outline-none" placeholder={tab === 'received' ? 'From *' : 'To *'} required value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" value={form.postal_type} onChange={e => setForm({ ...form, postal_type: e.target.value })}>
                            <option value="letter">Letter</option><option value="courier">Courier</option><option value="parcel">Parcel</option>
                            <option value="document">Document</option><option value="legal">Legal</option><option value="government">Government</option>
                        </select>
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] outline-none" placeholder="Reference / Tracking #" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] outline-none" placeholder="Addressed To" value={form.addressed_to} onChange={e => setForm({ ...form, addressed_to: e.target.value })} />
                        {tab === 'dispatched' && (
                            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                                <option value="">Dispatch Mode</option><option value="speed_post">Speed Post</option><option value="registered">Registered</option>
                                <option value="courier">Courier</option><option value="hand_delivery">Hand Delivery</option>
                            </select>
                        )}
                    </div>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm hover:bg-[#5b4dd6]">Save</button>
                    </div>
                </form>
            )}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase"><tr>
                            <th className="px-4 py-3 text-left">Ref #</th>
                            <th className="px-4 py-3 text-left">{tab === 'received' ? 'From' : 'To'}</th>
                            <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Addressed To</th><th className="px-4 py-3 text-left">Status</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                                : records.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No records</td></tr>
                                    : records.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{r.reference_number || '—'}</td>
                                            <td className="px-4 py-3 font-medium">{r.party_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3 text-gray-600 capitalize">{r.postal_type}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.addressed_to || '—'}</td>
                                            <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">{r.status?.replace('_', ' ')}</span></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
