'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Class, Section } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Users, UserPlus, X, Check, Search, Trash2, GraduationCap } from 'lucide-react';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function AssignTeachersPage() {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ emp_id: '', class_id: '', section_id: '' });
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    const load = useCallback(async () => {
        try {
            const data = await api.getClassTeachers();
            setAssignments(data || []);
        } catch {
            toast.error('Failed to load teacher assignments');
            setAssignments([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        api.getClasses().then(setClasses).catch(() => setClasses([]));
        api.getStaffList({ limit: 1000 }).then(res => setStaffList(res.data || [])).catch(() => setStaffList([]));
    }, []);

    useEffect(() => {
        if (!form.class_id) {
            setSections([]);
            setForm(f => ({ ...f, section_id: '' }));
            return;
        }
        api.getSections(parseInt(form.class_id)).then(setSections).catch(() => setSections([]));
    }, [form.class_id]);

    const matchedTeacher = form.emp_id.trim()
        ? staffList.find(s => s.employee_id?.toLowerCase() === form.emp_id.trim().toLowerCase())
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matchedTeacher) return toast.error('Employee ID not found');
        if (!matchedTeacher.user_id) return toast.error('This staff member does not have an active user account');
        try {
            await api.assignClassTeacher(parseInt(form.section_id), { teacher_id: matchedTeacher.user_id });
            setShowForm(false);
            setForm({ emp_id: '', class_id: '', section_id: '' });
            load();
            toast.success('Teacher assigned successfully');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign teacher');
        }
    };

    const removeAssignment = async (sectionId: number) => {
        if (!confirm('Remove this teacher from the class?')) return;
        try {
            await api.assignClassTeacher(sectionId, { teacher_id: null });
            load();
            toast.success('Teacher removed from class');
        } catch {
            toast.error('Failed to remove assignment');
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Assign Teachers</h1>
                    <p className="text-slate-500 text-sm mt-1">Assign a class teacher to each class section</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${showForm ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5]'}`}
                >
                    {showForm ? <X size={16} /> : <UserPlus size={16} />}
                    {showForm ? 'Cancel' : 'Assign Teacher'}
                </button>
            </div>

            {/* Assignment Form */}
            <AnimatePresence mode="wait">
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -12 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -12 }}
                        className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm overflow-hidden"
                    >
                        <h3 className="text-base font-semibold text-slate-900 mb-4">Assign a Class Teacher</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Employee ID */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Employee ID *</label>
                                    <div className="relative">
                                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            required
                                            className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${matchedTeacher ? 'border-emerald-300 ring-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 focus:ring-[#6c5ce7]'}`}
                                            placeholder="EMP-XXXX"
                                            value={form.emp_id}
                                            onChange={e => setForm({ ...form, emp_id: e.target.value })}
                                        />
                                    </div>
                                    {form.emp_id && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={`flex items-center gap-1.5 text-xs font-medium ${matchedTeacher ? 'text-emerald-600' : 'text-rose-500'}`}
                                        >
                                            {matchedTeacher
                                                ? <><Check size={12} strokeWidth={3} /> {matchedTeacher.name}</>
                                                : <><X size={12} strokeWidth={3} /> No staff found with this ID</>
                                            }
                                        </motion.div>
                                    )}
                                </div>

                                {/* Class */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Class *</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]"
                                        value={form.class_id}
                                        onChange={e => setForm({ ...form, class_id: e.target.value, section_id: '' })}
                                    >
                                        <option value="">Select class</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Section */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-600">Section *</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6c5ce7] disabled:opacity-50"
                                        value={form.section_id}
                                        onChange={e => setForm({ ...form, section_id: e.target.value })}
                                        disabled={!form.class_id}
                                    >
                                        <option value="">{form.class_id ? 'Select section' : 'Choose class first'}</option>
                                        {sections.map(s => (
                                            <option key={s.id} value={s.id}>{s.name || 'Main'}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-slate-50">
                                <button
                                    type="submit"
                                    disabled={!matchedTeacher || !form.section_id}
                                    className="px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                >
                                    Assign Teacher
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Assignments Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Current Assignments</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Class teachers for each section</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                        <Users size={14} className="text-[#6c5ce7]" />
                        <span className="text-xs font-semibold text-slate-700">{assignments.length} sections</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Class &amp; Section</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Class Teacher</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={3} className="px-5 py-4">
                                            <div className="h-8 bg-slate-50 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-5 py-12 text-center">
                                        <GraduationCap size={32} className="text-slate-200 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">No assignments found.</p>
                                    </td>
                                </tr>
                            ) : assignments.map((a, idx) => (
                                <motion.tr
                                    variants={itemVariants}
                                    key={a.section_id || idx}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <span className="text-sm font-semibold text-slate-900">{a.class_name}</span>
                                                <span className="text-slate-400 mx-1.5">·</span>
                                                <span className="text-sm text-slate-500">Section {a.section_name || 'Main'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {a.teacher_name ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                                                    {a.teacher_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{a.teacher_name}</p>
                                                    <p className="text-xs text-emerald-600 font-medium mt-0.5">Class Teacher</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400 italic">Not assigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        {a.teacher_name ? (
                                            <button
                                                onClick={() => removeAssignment(a.section_id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Remove assignment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setShowForm(true);
                                                    setForm(f => ({ ...f, class_id: String(a.class_id), section_id: String(a.section_id) }));
                                                }}
                                                className="px-3 py-1.5 rounded-lg border border-[#6c5ce7]/20 text-xs font-semibold text-[#6c5ce7] hover:bg-[#f1f0ff] transition-colors"
                                            >
                                                Assign
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
