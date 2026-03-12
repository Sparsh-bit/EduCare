/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Class, Section } from '@/lib/types';
import { toast } from 'react-hot-toast';

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
        }
        catch {
            toast.error('Failed to load assignments');
            setAssignments([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, [load]);

    // Load classes and staff list on mount
    useEffect(() => {
        api.getClasses().then(setClasses).catch(() => setClasses([]));
        api.getStaffList({ limit: 1000 }).then(res => setStaffList(res.data || [])).catch(() => setStaffList([]));
    }, []);

    // Load sections when class changes
    useEffect(() => {
        if (!form.class_id) {
            Promise.resolve().then(() => { setSections([]); setForm(f => ({ ...f, section_id: '' })); });
            return;
        }
        const cid = parseInt(form.class_id);
        api.getSections(cid).then(setSections).catch(() => setSections([]));
    }, [form.class_id]);

    const matchedTeacher = form.emp_id.trim() 
        ? staffList.find(s => s.employee_id?.toLowerCase() === form.emp_id.trim().toLowerCase())
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!matchedTeacher) return toast.error('Invalid Employee ID. No teacher found.');
        if (!matchedTeacher.user_id) return toast.error('This staff member does not have an active user account.');

        try {
            await api.assignClassTeacher(parseInt(form.section_id), {
                teacher_id: matchedTeacher.user_id,
            });
            setShowForm(false);
            setForm({ emp_id: '', class_id: '', section_id: '' });
            load();
            toast.success('Class Teacher assigned successfully');
        }
        catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to assign class teacher');
        }
    };

    const removeAssignment = async (sectionId: number) => {
        if (!confirm('Are you sure you want to revoke this class teacher assignment?')) return;
        try {
            await api.assignClassTeacher(sectionId, { teacher_id: null });
            load();
            toast.success('Class Teacher revoked');
        }
        catch {
            toast.error('Failed to revoke assignment');
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">👨‍🏫</span>
                        Class Teacher Assignments
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Assign primary class teachers mapped by Employee ID</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold hover:bg-[#6c5ce7] transition-all shadow-xl shadow-[#6c5ce7]/15"
                >
                    {showForm ? '✕ Close Form' : '＋ Assign Teacher'}
                </button>
            </div>

            {/* Quick Stats */}
            {!showForm && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mapped Sections</p>
                        <p className="text-3xl font-black text-[#6c5ce7] mt-2">{assignments.filter(a => a.teacher_name).length}</p>
                    </div>
                </div>
            )}

            {/* Assignment Form */}
            {showForm && (
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#6c5ce7]" />
                    <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center text-sm">📝</span>
                        New Class Teacher Allocation
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee ID *</label>
                                <input 
                                    required 
                                    className={`w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 ${form.emp_id && matchedTeacher ? 'bg-emerald-50 text-emerald-700 focus:ring-emerald-500/20' : ''}`}
                                    placeholder="e.g. EMP0001" 
                                    value={form.emp_id} 
                                    onChange={e => setForm({ ...form, emp_id: e.target.value })} 
                                />
                                {form.emp_id && (
                                    <p className={`text-xs font-bold pl-1 mt-1 ${matchedTeacher ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {matchedTeacher ? `✓ Auto-Detected: ${matchedTeacher.name}` : '✕ No active staff found with this ID'}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Class *</label>
                                <select required className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value, section_id: '' })}>
                                    <option value="">Select Class</option>
                                    {classes.map((c) => <option key={c.id} value={c.id}>{String(c.name || '').toLowerCase().startsWith('class') ? c.name : 'Class ' + c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Section *</label>
                                <select required className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })} disabled={!form.class_id}>
                                    <option value="">{form.class_id ? 'Select Section' : 'Select class first'}</option>
                                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 border-t border-gray-50 pt-8">
                            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" disabled={!matchedTeacher} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${matchedTeacher ? 'bg-[#6c5ce7] text-white shadow-xl shadow-[#f1f0ff] hover:bg-[#6c5ce7]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>Assign Teacher</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        Class Teacher Mappings
                        <span className="px-2 py-0.5 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] text-[10px] font-black uppercase tracking-widest">Master List</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Class & Section</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Class Teacher</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={3} className="px-8 py-10 animate-pulse bg-gray-50/20" /></tr>)
                            ) : assignments.length === 0 ? (
                                <tr><td colSpan={3} className="p-24 text-center text-gray-400 italic font-medium">No classes/sections found</td></tr>
                            ) : assignments.map(a => (
                                <tr key={a.section_id} className="hover:bg-gray-50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600">{String(a.class_name || '').toLowerCase().startsWith('class') ? a.class_name : 'Class ' + a.class_name}</span>
                                            <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Sec {a.section_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {a.teacher_name ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#f1f0ff] flex items-center justify-center text-sm font-black text-[#6c5ce7] transition-all">
                                                    {a.teacher_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{a.teacher_name}</p>
                                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Assigned Class Teacher</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 italic text-sm">Not Assigned</div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {a.teacher_name && (
                                            <button
                                                onClick={() => removeAssignment(a.section_id)}
                                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                            >
                                                Revoke
                                            </button>
                                        )}
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
