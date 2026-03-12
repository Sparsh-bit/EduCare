'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { LostFoundItem } from '@/lib/types';

export default function LostFoundPage() {
    const [items, setItems] = useState<LostFoundItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ item_type: 'other', description: '', color: '', location_found: 'classroom', found_date: new Date().toISOString().split('T')[0], reported_by: '' });

    const load = useCallback(async () => {
        try { const json = await api.getLostFoundItems(); setItems(json.data || []); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); setItems([]); }
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
        try { await api.createLostFoundItem(form); setShowForm(false); setForm({ item_type: 'other', description: '', color: '', location_found: 'classroom', found_date: new Date().toISOString().split('T')[0], reported_by: '' }); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const claim = async (id: number) => {
        const name = prompt('Claimed by (name):');
        if (!name) return;
        try { await api.claimLostFoundItem(id, name); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const statusColors: Record<string, string> = { found_unclaimed: 'bg-yellow-100 text-yellow-700', claimed: 'bg-green-100 text-green-700', lost_searching: 'bg-red-100 text-red-700', disposed: 'bg-gray-100 text-gray-600' };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">Lost & Found</h1><p className="text-sm text-gray-500 mt-1">Report and track lost or found items</p></div>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6] text-sm font-medium shadow-sm">{showForm ? '✕ Cancel' : '+ Report Item'}</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })}>
                            <option value="water_bottle">Water Bottle</option><option value="tiffin">Tiffin Box</option><option value="bag">Bag</option>
                            <option value="jacket">Jacket/Sweater</option><option value="stationery">Stationery</option><option value="book">Book</option>
                            <option value="id_card">ID Card</option><option value="electronic">Electronic</option><option value="jewelry">Jewelry</option><option value="other">Other</option>
                        </select>
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" value={form.location_found} onChange={e => setForm({ ...form, location_found: e.target.value })}>
                            <option value="playground">Playground</option><option value="classroom">Classroom</option><option value="library">Library</option>
                            <option value="cafeteria">Cafeteria</option><option value="bus">Bus</option><option value="corridor">Corridor</option><option value="other">Other</option>
                        </select>
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" type="date" required value={form.found_date} onChange={e => setForm({ ...form, found_date: e.target.value })} />
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Reported By" value={form.reported_by} onChange={e => setForm({ ...form, reported_by: e.target.value })} />
                    </div>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={2} placeholder="Description *" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
                            <th className="px-4 py-3 text-left">Item #</th><th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Location</th>
                            <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                                : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No items reported</td></tr>
                                    : items.map(i => (
                                        <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{i.item_number}</td>
                                            <td className="px-4 py-3 capitalize">{i.item_type?.replace('_', ' ')}</td>
                                            <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{i.description}</td>
                                            <td className="px-4 py-3 text-gray-600 capitalize">{i.location_found}</td>
                                            <td className="px-4 py-3 text-xs">{new Date(i.found_date).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[i.status] || 'bg-gray-100'}`}>{i.status?.replace('_', ' ')}</span></td>
                                            <td className="px-4 py-3">{i.status === 'found_unclaimed' && <button onClick={() => claim(i.id)} className="text-xs text-green-600 hover:underline font-medium">Mark Claimed</button>}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
