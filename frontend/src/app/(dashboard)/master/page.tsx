'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MasterDataItem } from '@/lib/types';
import toast from 'react-hot-toast';
import { Plus, Trash2, SlidersHorizontal, Loader2, AlertTriangle } from 'lucide-react';

const TABLES = [
    { key: 'grade_mappings', label: 'Grade Mappings', desc: 'Define grade thresholds (e.g. A1 = 91–100)', fields: ['name', 'code'] },
    { key: 'subject_groups', label: 'Subject Groups', desc: 'Group subjects by type (Languages, Sciences, etc.)', fields: ['name', 'code'] },
    { key: 'exam_areas', label: 'Exam Areas', desc: 'Assessment areas for co-scholastic evaluation', fields: ['name', 'code'] },
    { key: 'fee_categories', label: 'Fee Categories', desc: 'Custom fee categories (Tuition, Transport, etc.)', fields: ['name', 'code'] },
    { key: 'fee_groups', label: 'Fee Groups', desc: 'Group fee structures (e.g. Monthly, Annual)', fields: ['name', 'code'] },
    { key: 'discount_policies', label: 'Discount Policies', desc: 'Sibling discount, merit discount configurations', fields: ['name', 'code'] },
    { key: 'remarks_bank', label: 'Remarks Bank', desc: 'Pre-written report card remarks for teachers', fields: ['name', 'code'] },
] as const;

type TableKey = typeof TABLES[number]['key'];

export default function MasterDataPage() {
    const [activeTable, setActiveTable] = useState<TableKey>('grade_mappings');
    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', code: '', description: '' });
    const [showForm, setShowForm] = useState(false);

    const activeConfig = TABLES.find(t => t.key === activeTable)!;

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await api.getMasterData(activeTable)); }
        catch { toast.error(`Failed to load ${activeConfig.label}`); setItems([]); }
        setLoading(false);
    }, [activeTable, activeConfig.label]);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        try {
            await api.createMasterData(activeTable, { name: form.name.trim(), code: form.code.trim() || undefined, description: form.description.trim() || undefined });
            toast.success('Record created');
            setForm({ name: '', code: '', description: '' });
            setShowForm(false);
            load();
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to create record'); }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        setDeleteConfirm(null);
        try {
            await api.deleteMasterData(activeTable, id);
            toast.success('Record deleted');
            load();
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to delete'); }
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]';

    return (
        <div className="space-y-6 pb-10">
            {/* Delete Confirm Modal */}
            {deleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <AlertTriangle size={26} className="text-rose-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 text-center mb-2">Delete Record?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure grade mappings, leave types, and other lookup data</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] transition-colors"
                >
                    <Plus size={16} />
                    Add Record
                </button>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-60 flex-shrink-0 space-y-1">
                    {TABLES.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setActiveTable(t.key); setShowForm(false); }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTable === t.key ? 'bg-[#6c5ce7] text-white shadow-lg shadow-[#6c5ce7]/20' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <p>{t.label}</p>
                            <p className={`text-xs mt-0.5 font-normal leading-snug ${activeTable === t.key ? 'text-white/70' : 'text-slate-400'}`}>{t.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 bg-[#f1f0ff] rounded-xl flex items-center justify-center">
                                <SlidersHorizontal size={16} className="text-[#6c5ce7]" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-900">{activeConfig.label}</h2>
                                <p className="text-xs text-slate-400">{activeConfig.desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Add Form */}
                    {showForm && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                            <h3 className="font-semibold text-slate-900 text-sm">Add New {activeConfig.label.slice(0, -1)}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
                                    <input type="text" placeholder="e.g. A1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Code / Short Name</label>
                                    <input type="text" placeholder="Optional" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                                    <input type="text" placeholder="Optional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] disabled:opacity-60 transition-colors">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    {saving ? 'Saving…' : 'Save'}
                                </button>
                                <button onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={28} className="animate-spin text-slate-300" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <SlidersHorizontal size={36} className="text-slate-200 mb-3" />
                                <p className="text-slate-500 font-medium">No records found</p>
                                <p className="text-sm text-slate-400 mt-1">Click &quot;Add Record&quot; to create your first entry</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 group">
                                            <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                                            <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{item.code || '—'}</td>
                                            <td className="px-5 py-3.5 text-slate-400 text-sm">{item.description || '—'}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={() => setDeleteConfirm(item.id)}
                                                    className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
