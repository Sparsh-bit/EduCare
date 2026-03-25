'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Student, Class, Section } from '@/lib/types';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { TrendingUp, ChevronRight, Search } from 'lucide-react';

interface AcademicYear { id: number; year: string; is_current: boolean; }

export default function PromotionPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterClass, setFilterClass] = useState('');
    const [search, setSearch] = useState('');

    // Selected student for promotion
    const [selected, setSelected] = useState<Student | null>(null);
    const [form, setForm] = useState({ new_class_id: '', new_section_id: '', new_roll_no: '', new_academic_year_id: '' });
    const [formSections, setFormSections] = useState<Section[]>([]);
    const [promoting, setPromoting] = useState(false);

    const loadBase = useCallback(async () => {
        const [cls, yrs] = await Promise.all([
            api.getClasses().catch(() => [] as Class[]),
            api.getAcademicYears().catch(() => [] as AcademicYear[]),
        ]);
        setClasses(cls as Class[]);
        setYears(yrs as AcademicYear[]);
        const currentYear = (yrs as AcademicYear[]).find(y => y.is_current);
        if (currentYear) setForm(f => ({ ...f, new_academic_year_id: String(currentYear.id) }));
    }, []);

    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { status: 'active', limit: 200 };
            if (filterClass) params.class_id = filterClass;
            const res = await api.getStudents(params) as { data?: Student[] };
            setStudents(res.data ?? []);
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [filterClass]);

    useEffect(() => { loadBase(); }, [loadBase]);
    useEffect(() => { loadStudents(); }, [loadStudents]);

    useEffect(() => {
        if (!filterClass) { setSections([]); return; }
        api.getSections(Number(filterClass)).then(s => setSections(s as Section[])).catch(() => setSections([]));
    }, [filterClass]);

    useEffect(() => {
        if (!form.new_class_id) { setFormSections([]); return; }
        api.getSections(Number(form.new_class_id)).then(s => setFormSections(s as Section[])).catch(() => setFormSections([]));
    }, [form.new_class_id]);

    const filtered = students.filter(s =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.admission_no ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const openPromotion = (s: Student) => {
        setSelected(s);
        setForm(f => ({ ...f, new_class_id: '', new_section_id: '', new_roll_no: '' }));
    };

    const handlePromote = async () => {
        if (!selected || !form.new_class_id || !form.new_academic_year_id) {
            toast.error('Select target class and academic year');
            return;
        }
        setPromoting(true);
        try {
            await api.promoteStudent(selected.id, {
                new_class_id: Number(form.new_class_id),
                new_section_id: form.new_section_id ? Number(form.new_section_id) : undefined,
                new_roll_no: form.new_roll_no || undefined,
                new_academic_year_id: Number(form.new_academic_year_id),
            });
            toast.success(`${selected.name} promoted successfully`);
            setSelected(null);
            loadStudents();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Promotion failed');
        } finally {
            setPromoting(false);
        }
    };

    const inputCls = 'w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/20 outline-none';

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Promotion</h1>
                <p className="text-sm text-slate-500 mt-1">Move students to the next class / academic year</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search student..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 h-9 border border-slate-200 rounded-lg text-sm focus:border-[#6c5ce7] outline-none" />
                </div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={`${inputCls} w-44`}>
                    <option value="">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={15} className="text-[#6c5ce7]" />
                        <span className="text-sm font-bold text-slate-800">Active Students</span>
                    </div>
                    <span className="text-xs text-slate-400">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <TrendingUp size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">No active students found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['Adm. No', 'Student', 'Current Class', 'Roll No', 'Action'].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{s.admission_no}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {[s.class_name, s.section_name].filter(Boolean).join(' - ') || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{s.current_roll_no || '—'}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => openPromotion(s)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-[#6c5ce7] text-white text-xs font-semibold rounded-lg hover:bg-[#5b4bd5] transition-colors">
                                                Promote <ChevronRight size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Promotion Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Promote Student</h2>
                            <p className="text-sm text-slate-500 mt-0.5">{selected.name} — {[selected.class_name, selected.section_name].filter(Boolean).join(' ')}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Academic Year *</label>
                                <select value={form.new_academic_year_id}
                                    onChange={e => setForm(f => ({ ...f, new_academic_year_id: e.target.value }))}
                                    className={inputCls}>
                                    <option value="">Select year</option>
                                    {years.map(y => <option key={y.id} value={y.id}>{y.year}{y.is_current ? ' (Current)' : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Class *</label>
                                <select value={form.new_class_id}
                                    onChange={e => setForm(f => ({ ...f, new_class_id: e.target.value, new_section_id: '' }))}
                                    className={inputCls}>
                                    <option value="">Select class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            {formSections.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Section</label>
                                    <select value={form.new_section_id}
                                        onChange={e => setForm(f => ({ ...f, new_section_id: e.target.value }))}
                                        className={inputCls}>
                                        <option value="">No section</option>
                                        {formSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Roll No</label>
                                <input type="text" placeholder="Optional" value={form.new_roll_no}
                                    onChange={e => setForm(f => ({ ...f, new_roll_no: e.target.value }))}
                                    className={inputCls} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setSelected(null)}
                                className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                                Cancel
                            </button>
                            <button onClick={handlePromote} disabled={promoting}
                                className="px-5 py-2 bg-[#6c5ce7] text-white text-sm font-bold rounded-lg hover:bg-[#5b4bd5] disabled:opacity-60 flex items-center gap-2 transition-all">
                                {promoting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Promoting...</> : <>Confirm Promotion <ChevronRight size={14} /></>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
