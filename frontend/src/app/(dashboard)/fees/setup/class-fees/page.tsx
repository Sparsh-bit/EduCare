/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { Class } from '@/lib/types';

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

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.getClasses();
                // For each class, check if structure exists
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
        load();
    }, []);

    const openSetup = (cls: ClassWithStructure) => {
        setSelectedClass(cls);
        if (cls.structure) {
            setForm({
                total_amount: String(cls.structure.total_amount),
                installments_count: cls.structure.installments_count as number,
                description: (cls.structure.description as string) || '',
                installment_dates: (cls.structure.installments as Array<{ due_date: string }>).map((i) => new Date(i.due_date).toISOString().split('T')[0]),
            });
        } else {
            setForm({
                total_amount: '',
                installments_count: 4,
                description: '',
                installment_dates: ['', '', '', ''],
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
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
            // Refresh list
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
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save');
        }
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Class Wise Fees Setup</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure annual fees and installments for each class</p>
                </div>
                <button onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                    Back to Setup
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm" />
                    ))
                ) : (
                    classes.map((cls) => (
                        <div key={cls.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                            <div className={`h-2 w-full ${cls.structure ? 'bg-[#f1f0ff]0' : 'bg-gray-200'}`} />
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">{String(cls.name || '').toLowerCase().startsWith('class') ? cls.name : 'Class ' + cls.name}</h3>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls.structure ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {cls.structure ? '✓ Confirmed' : '⚠ Pending'}
                                    </span>
                                </div>

                                {cls.structure ? (
                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Total Annual Fee</span>
                                            <span className="font-bold text-gray-900">₹{((cls.structure.total_amount as number) || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Installments</span>
                                            <span className="font-bold text-gray-900">{String(cls.structure.installments_count)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[68px] flex items-center justify-center border border-dashed rounded-2xl mb-6 bg-gray-50/50">
                                        <p className="text-xs text-gray-400">No fee structure defined</p>
                                    </div>
                                )}

                                <button
                                    onClick={() => openSetup(cls)}
                                    className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${cls.structure ? 'bg-gray-50 text-[#6c5ce7] border border-[#f1f0ff] hover:bg-[#f1f0ff]' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] shadow-md hover:shadow-[#6c5ce7]/15'}`}
                                >
                                    {cls.structure ? 'Edit Structure' : 'Set Up Fees'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Setup Fees: {String(selectedClass?.name || '').toLowerCase().startsWith('class') ? selectedClass?.name : 'Class ' + selectedClass?.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">Define total annual amount and installment schedule</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors text-xl">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Total Annual Fee (₹)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#6c5ce7] outline-none transition-all font-bold text-gray-900"
                                        placeholder="e.g. 25000"
                                        value={form.total_amount}
                                        onChange={e => setForm({ ...form, total_amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">No. of Installments</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#6c5ce7] outline-none transition-all bg-white"
                                        value={form.installments_count}
                                        onChange={e => {
                                            const count = parseInt(e.target.value);
                                            setForm({ ...form, installments_count: count, installment_dates: Array(count).fill('') });
                                        }}
                                    >
                                        {[1, 2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Installment' : 'Installments'}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Due Dates for Installments</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {Array(form.installments_count).fill(0).map((_, i) => (
                                        <div key={i} className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-2xl border border-transparent group-focus-within:border-[#f1f0ff] transition-all">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Installment #{i + 1}</span>
                                            <input
                                                type="date"
                                                required
                                                className="bg-transparent border-0 p-0 text-sm font-semibold text-gray-900 outline-none w-full"
                                                value={form.installment_dates[i] || ''}
                                                onChange={e => {
                                                    const dates = [...form.installment_dates];
                                                    dates[i] = e.target.value;
                                                    setForm({ ...form, installment_dates: dates });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Additional Notes</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#6c5ce7] outline-none transition-all resize-none"
                                    rows={2}
                                    placeholder="Optional description/remarks..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-[#5b4bd5] shadow-xl shadow-[#6c5ce7]/10 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Save Fee Structure'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
