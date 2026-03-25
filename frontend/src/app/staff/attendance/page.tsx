'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CalendarCheck, Users, CheckCircle2, XCircle, Minus } from 'lucide-react';

interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; }
interface Student { id: number; name: string; admission_no: string; }
type Status = 'P' | 'A' | 'L' | 'HD';

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
    P:  { label: 'Present', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
    A:  { label: 'Absent',  color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-300' },
    L:  { label: 'Leave',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-300' },
    HD: { label: 'Half',    color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-300' },
};

export default function StaffAttendancePage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [attendance, setAttendance] = useState<Record<number, Status>>({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getClasses().then(data => setClasses(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedClass) { setSections([]); setStudents([]); return; }
        api.getSections(Number(selectedClass)).then(data => setSections(Array.isArray(data) ? data : [])).catch(() => {});
        setSelectedSection('');
        setStudents([]);
    }, [selectedClass]);

    useEffect(() => {
        if (!selectedClass || !selectedSection) { setStudents([]); return; }
        setLoading(true);
        api.getStudents({ classId: Number(selectedClass), sectionId: Number(selectedSection), status: 'active' })
            .then(data => {
                const list = Array.isArray(data) ? data : (data as { data?: Student[] }).data || [];
                setStudents(list);
                const init: Record<number, Status> = {};
                list.forEach((s: Student) => { init[s.id] = 'P'; });
                setAttendance(init);
            })
            .catch(() => setStudents([]))
            .finally(() => setLoading(false));
    }, [selectedClass, selectedSection]);

    const setStatus = (studentId: number, status: Status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const markAll = (status: Status) => {
        const all: Record<number, Status> = {};
        students.forEach(s => { all[s.id] = status; });
        setAttendance(all);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const records = students.map(s => ({ student_id: s.id, status: attendance[s.id] || 'P' }));
            await api.markAttendance({ class_id: Number(selectedClass), section_id: Number(selectedSection), date, records });
            toast.success('Attendance saved successfully!');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
        } finally { setSaving(false); }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'P').length;
    const absentCount = Object.values(attendance).filter(s => s === 'A').length;

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-900">Mark Attendance</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                    <CalendarCheck size={14} className="text-sky-500 shrink-0" />
                    <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Date</label>
                    <input type="date" value={date} max={new Date().toISOString().split('T')[0]}
                        onChange={e => { setDate(e.target.value); setAttendance({}); }}
                        className="text-sm font-semibold text-slate-800 outline-none bg-transparent cursor-pointer" />
                </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Class</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 outline-none">
                        <option value="">Select class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Section</label>
                    <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                        disabled={!selectedClass}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 outline-none disabled:opacity-50">
                        <option value="">Select section</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary + bulk actions */}
            {students.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={13} /> {presentCount} Present
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-xl text-xs font-semibold text-rose-700">
                        <XCircle size={13} /> {absentCount} Absent
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600">
                        <Users size={13} /> {students.length} Total
                    </div>
                    <div className="ml-auto flex gap-2">
                        <button onClick={() => markAll('P')} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">All Present</button>
                        <button onClick={() => markAll('A')} className="text-xs px-3 py-1.5 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 transition-colors">All Absent</button>
                    </div>
                </div>
            )}

            {/* Student list */}
            {loading ? (
                <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-slate-100" />)}
                </div>
            ) : students.length > 0 ? (
                <div className="space-y-2">
                    {students.map((student, idx) => (
                        <motion.div key={student.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                            className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{student.name}</p>
                                <p className="text-xs text-slate-400">{student.admission_no}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {(Object.keys(STATUS_CONFIG) as Status[]).map(s => (
                                    <button key={s} onClick={() => setStatus(student.id, s)}
                                        className={`w-10 h-8 rounded-lg text-xs font-bold border-2 transition-all ${attendance[student.id] === s ? STATUS_CONFIG[s].bg + ' ' + STATUS_CONFIG[s].color : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ))}

                    <div className="pt-3">
                        <button onClick={handleSave} disabled={saving}
                            className="w-full h-11 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CalendarCheck size={15} /> Save Attendance</>}
                        </button>
                    </div>
                </div>
            ) : selectedSection ? (
                <div className="text-center py-12 text-slate-400">
                    <Minus size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No students found in this class/section</p>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select a class and section to begin</p>
                </div>
            )}
        </div>
    );
}
