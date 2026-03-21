/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { Class } from '@/lib/types';
import { X, ArrowLeft } from 'lucide-react';

interface ClassWithStructure extends Class {
    structure: Record<string, any> | null;
}

export default function ClassWiseFeesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassWithStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassWithStructure | null>(null);
    const [form, setForm] = useState({
        total_amount: '',
        installments_count: 4,
        description: '',
        installment_dates: ['', '', '', ''],
    });

    const loadClasses = async () => {
        setLoading(true);
        try {
            const res = await api.getClasses();
            const classesWithInfo = await Promise.all(res.map(async (c) => {
                try {
                    const s = await api.getFeeStructure(c.id);
                    return { ...c, structure: s as unknown as Record<string, any> };
                } catch {
                    return { ...c, structure: null };
                }
            }));
            setClasses(classesWithInfo);
        } catch {
            toast.error('Failed to load classes');
        }
        setLoading(false);
    };

    useEffect(() => { loadClasses(); }, []);

    const openSetup = (cls: ClassWithStructure) => {
        setSelectedClass(cls);
        if (cls.structure) {
            setForm({
                total_amount: String(cls.structure.total_amount),
                installments_count: cls.structure.installments_count as number,
                description: (cls.structure.description as string) || '',
                installment_dates: (cls.structure.installments as Array<{ due_date: string }>).map(i => new Date(i.due_date).toISOString().split('T')[0]),
            });
        } else {
            setForm({ total_amount: '', installments_count: 4, description: '', installment_dates: ['', '', '', ''] });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.createFeeStructure({
                class_id: selectedClass!.id,
                total_amount: parseFloat(form.total_amount),
                installments_count: form.installments_count,
                installment_dates: form.installment_dates.slice(0, form.installments_count),
                description: form.description,
            } as Parameters<typeof api.createFeeStructure>[0]);
            toast.success('Fee structure saved successfully');
            setShowModal(false);
            await loadClasses();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        }
        setLoading(false);
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Class-wise Fees</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure annual fees and installment schedules for each class</p>
                </div>
                <button onClick={() => router.back()} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                    <ArrowLeft size={14} />
                    Back to Setup
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)
                ) : classes.map(cls => (
                    <div key={cls.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-slate-900">
                                {String(cls.name || '').toLowerCase().startsWith('class') ? cls.name : `Class ${cls.name}`}
                            </h3>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${cls.structure ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {cls.structure ? 'Configured' : 'Not set'}
                            </span>
                        </div>

                        {cls.structure ? (
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Annual Fee</span>
                                    <span className="font-semibold text-slate-900">₹{((cls.structure.total_amount as number) || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Installments</span>
                                    <span className="font-semibold text-slate-900">{String(cls.structure.installments_count)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-16 flex items-center justify-center border border-dashed border-slate-200 rounded-lg mb-4">
                                <p className="text-xs text-slate-400">No fee structure defined</p>
                            </div>
                        )}

                        <button
                            onClick={() => openSetup(cls)}
                            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${cls.structure ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5]'}`}
                        >
                            {cls.structure ? 'Edit Structure' : 'Set Up Fees'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Fee Structure — {String(selectedClass?.name || '').toLowerCase().startsWith('class') ? selectedClass?.name : `Class ${selectedClass?.name}`}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Set annual amount and installment due dates</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">Total Annual Fee (₹) *</label>
                                    <input type="number" required className={inputCls} placeholder="e.g. 25000" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">Number of Installments</label>
                                    <select className={inputCls} value={form.installments_count} onChange={e => {
                                        const count = parseInt(e.target.value);
                                        setForm({ ...form, installments_count: count, installment_dates: Array(count).fill('') });
                                    }}>
                                        {[1, 2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'installment' : 'installments'}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Installment Due Dates</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Array(form.installments_count).fill(0).map((_, i) => (
                                        <div key={i} className="space-y-1">
                                            <span className="text-xs text-slate-400">Installment #{i + 1}</span>
                                            <input type="date" required className={inputCls} value={form.installment_dates[i] || ''}
                                                onChange={e => {
                                                    const dates = [...form.installment_dates];
                                                    dates[i] = e.target.value;
                                                    setForm({ ...form, installment_dates: dates });
                                                }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Notes (optional)</label>
                                <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Optional description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#6c5ce7] text-white rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : 'Save Fee Structure'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
