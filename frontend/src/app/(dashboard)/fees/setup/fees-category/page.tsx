'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Tag, Trash2, ArrowLeft } from 'lucide-react';

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

    useEffect(() => { load(); }, []);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
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
        try {
            await api.deleteMasterData('fee_categories', id);
            toast.success('Category deleted');
            load();
        } catch {
            toast.error('Failed to delete category');
        }
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fee Categories</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Define types of fees — e.g. Tuition, Lab, Library, Activity</p>
                </div>
                <button onClick={() => router.push('/fees/setup')} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                    <ArrowLeft size={14} />
                    Back to Setup
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Add Form */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5 sticky top-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f1f0ff] rounded-lg flex items-center justify-center">
                            <Tag size={16} className="text-[#6c5ce7]" />
                        </div>
                        <h3 className="font-semibold text-slate-900">Add Category</h3>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Category Name *</label>
                            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Activity Fee" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Short Code</label>
                            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="e.g. ACT-F" />
                        </div>
                        <div className="flex gap-3">
                            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                <input type="checkbox" checked={form.is_one_time} onChange={e => setForm({ ...form, is_one_time: e.target.checked })} className="w-4 h-4 accent-[#6c5ce7]" />
                                <span className="text-sm text-slate-600">One time</span>
                            </label>
                            <label className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                <input type="checkbox" checked={form.is_refundable} onChange={e => setForm({ ...form, is_refundable: e.target.checked })} className="w-4 h-4 accent-[#6c5ce7]" />
                                <span className="text-sm text-slate-600">Refundable</span>
                            </label>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Description</label>
                            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} placeholder="Optional notes..." />
                        </div>
                        <button type="submit" disabled={saving} className="w-full bg-[#6c5ce7] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors">
                            {saving ? 'Saving...' : 'Add Category'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm">All Categories</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{categories.length} categories defined</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Category</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Flags</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={3} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                                ))
                            ) : categories.length === 0 ? (
                                <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-sm">No categories added yet</td></tr>
                            ) : categories.map((cat, idx) => (
                                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-md bg-[#f1f0ff] text-[#6c5ce7] text-xs font-semibold flex items-center justify-center">{idx + 1}</span>
                                            <div>
                                                <p className="font-medium text-slate-900">{cat.name}</p>
                                                <p className="text-xs text-slate-400">{cat.code || 'No code'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex gap-2">
                                            {cat.is_one_time && <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium">One-time</span>}
                                            {cat.is_refundable && <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium">Refundable</span>}
                                            {!cat.is_one_time && !cat.is_refundable && <span className="text-xs text-slate-400">Regular</span>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
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
