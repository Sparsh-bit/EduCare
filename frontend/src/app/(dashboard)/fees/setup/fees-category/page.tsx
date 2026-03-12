'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function FeesCategoryPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<{ id: number; name: string; code?: string; is_one_time?: boolean; is_refundable?: boolean; description?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', code: '', is_one_time: false, is_refundable: false, description: '' });

    const load = async () => {
        try {
            const data = await api.getMasterData('fee_categories');
            setCategories(data);
        } catch {
            toast.error('Failed to load categories');
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createMasterData('fee_categories', form);
            setForm({ name: '', code: '', is_one_time: false, is_refundable: false, description: '' });
            toast.success('Category added successfully');
            load();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.deleteMasterData('fee_categories', id);
            toast.success('Deleted successfully');
            load();
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-xl shadow-sm">🏷️</span>
                        Fees Categories
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Define types of fees collected by your institution (e.g. Tuition, Lab, Library)</p>
                </div>
                <button
                    onClick={() => router.push('/fees/setup')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 hover:text-[#6c5ce7] hover:border-[#f1f0ff] transition-all shadow-sm"
                >
                    ⬅ Back to Setup
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6 sticky top-8">
                    <div>
                        <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-1">Add Category</h3>
                        <p className="text-[11px] text-gray-400 font-bold">Standard fee category for ledger tracking</p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">Category Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3.5 px-4" placeholder="e.g. Activity Fee" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">Short Code</label>
                                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3.5 px-4" placeholder="ACT-F" />
                            </div>

                            <div className="flex gap-4">
                                <label className="flex-1 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input type="checkbox" checked={form.is_one_time} onChange={e => setForm({ ...form, is_one_time: e.target.checked })} className="w-4 h-4 rounded text-[#6c5ce7] focus:ring-[#6c5ce7]" />
                                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">One Time</span>
                                </label>
                                <label className="flex-1 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input type="checkbox" checked={form.is_refundable} onChange={e => setForm({ ...form, is_refundable: e.target.checked })} className="w-4 h-4 rounded text-[#6c5ce7] focus:ring-[#6c5ce7]" />
                                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Refundable</span>
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">Description</label>
                                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3.5 px-4 resize-none" placeholder="Internal remarks..." />
                            </div>
                        </div>

                        <button type="submit" disabled={saving} className="w-full bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold py-4 shadow-xl shadow-[#6c5ce7]/10 hover:bg-[#5b4bd5] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            {saving ? 'Processing...' : 'Create Category'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 tracking-tight">Fee Categories Ledger</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Total {categories.length} active categories found</p>
                        </div>
                    </div>

                    <div className="p-2 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Flags</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={3} className="p-12 text-center text-gray-300">Loading...</td></tr>
                                ) : categories.length === 0 ? (
                                    <tr><td colSpan={3} className="p-12 text-center text-gray-400 italic font-medium">No categories created yet</td></tr>
                                ) : categories.map((cat, idx) => (
                                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 rounded-xl bg-gray-50 text-[10px] text-gray-400 font-black flex items-center justify-center border border-transparent group-hover:bg-white group-hover:border-[#f1f0ff] group-hover:text-[#6c5ce7] transition-all">{idx + 1}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#6c5ce7] transition-colors">{cat.name}</p>
                                                    <p className="text-[10px] font-black text-gray-400 tracking-widest">{cat.code || 'NO-CODE'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-2">
                                                {cat.is_one_time && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase">One Time</span>}
                                                {cat.is_refundable && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">Refundable</span>}
                                                {!cat.is_one_time && !cat.is_refundable && <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tight italic">— Regular</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button onClick={() => handleDelete(cat.id)} className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-tight rounded-xl hover:bg-rose-100 opacity-60 hover:opacity-100 transition-all border border-rose-100">Remove</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
