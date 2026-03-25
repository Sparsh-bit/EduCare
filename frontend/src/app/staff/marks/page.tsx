'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PenLine, Save } from 'lucide-react';

interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; }
interface ExamItem { id: number; name: string; term: string; }
interface SubjectItem { id: number; subject_name: string; exam_subject_id?: number; max_marks?: number; }
interface StudentMark { student_id: number; student_name: string; admission_no: string; marks_obtained: string; is_absent: boolean; }

export default function StaffMarksPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [marks, setMarks] = useState<StudentMark[]>([]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getClasses().then(d => setClasses(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedClass) { setSections([]); setExams([]); return; }
        api.getSections(Number(selectedClass)).then(d => setSections(Array.isArray(d) ? d : [])).catch(() => {});
        api.getExams({ classId: Number(selectedClass) }).then(d => setExams(Array.isArray(d) ? d : (d as { data?: ExamItem[] }).data || [])).catch(() => {});
        setSelectedSection(''); setSelectedExam(''); setSelectedSubject(''); setSubjects([]); setMarks([]);
    }, [selectedClass]);

    useEffect(() => {
        if (!selectedExam || !selectedClass) { setSubjects([]); return; }
        api.getExam(Number(selectedExam))
            .then(d => setSubjects((d as { subjects?: SubjectItem[] }).subjects || []))
            .catch(() => {});
        setSelectedSubject(''); setMarks([]);
    }, [selectedExam, selectedClass]);

    useEffect(() => {
        if (!selectedExam || !selectedSubject || !selectedClass || !selectedSection) { setMarks([]); return; }
        setLoading(true);
        api.getStudents({ classId: Number(selectedClass), sectionId: Number(selectedSection), status: 'active' })
            .then(data => {
                const list = Array.isArray(data) ? data : (data as { data?: { id: number; name: string; admission_no: string }[] }).data || [];
                setMarks(list.map(s => ({ student_id: s.id, student_name: s.name, admission_no: s.admission_no, marks_obtained: '', is_absent: false })));
            })
            .catch(() => setMarks([]))
            .finally(() => setLoading(false));
    }, [selectedExam, selectedSubject, selectedClass, selectedSection]);

    const updateMark = (studentId: number, field: 'marks_obtained' | 'is_absent', value: string | boolean) => {
        setMarks(prev => prev.map(m => m.student_id === studentId ? { ...m, [field]: value } : m));
    };

    const handleSave = async () => {
        const sub = subjects.find(s => String(s.id) === selectedSubject);
        if (!sub) return;
        setSaving(true);
        try {
            await api.enterMarks(Number(selectedExam), {
                exam_subject_id: sub.exam_subject_id ?? sub.id,
                marks: marks.map(m => ({
                    student_id: m.student_id,
                    marks_obtained: m.is_absent ? undefined : (parseFloat(m.marks_obtained) || 0),
                    is_absent: m.is_absent,
                })),
            });
            toast.success('Marks saved!');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save marks');
        } finally { setSaving(false); }
    };

    const selectedSubjectObj = subjects.find(s => String(s.id) === selectedSubject);
    const maxMarks = selectedSubjectObj?.max_marks ?? 100;

    const selectCls = "w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 outline-none disabled:opacity-50";

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-slate-900">Enter Marks</h1>
                <p className="text-sm text-slate-500 mt-0.5">Record exam marks for your assigned subjects</p>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Class</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={selectCls}>
                        <option value="">Select</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Section</label>
                    <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass} className={selectCls}>
                        <option value="">Select</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Exam</label>
                    <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} disabled={!selectedClass} className={selectCls}>
                        <option value="">Select</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Subject</label>
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedExam} className={selectCls}>
                        <option value="">Select</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                    </select>
                </div>
            </div>

            {/* Marks entry */}
            {loading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-white rounded-xl animate-pulse border border-slate-100" />)}</div>
            ) : marks.length > 0 && selectedSubject ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">Max marks: <span className="text-slate-800">{maxMarks}</span></p>
                        <p className="text-xs text-slate-400">{marks.length} students</p>
                    </div>
                    <div className="space-y-2">
                        {marks.map((m, idx) => (
                            <motion.div key={m.student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${m.is_absent ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{m.student_name}</p>
                                    <p className="text-xs text-slate-400">{m.admission_no}</p>
                                </div>
                                <input
                                    type="number"
                                    min={0} max={maxMarks}
                                    value={m.marks_obtained}
                                    disabled={m.is_absent}
                                    onChange={e => updateMark(m.student_id, 'marks_obtained', e.target.value)}
                                    placeholder="—"
                                    className="w-20 h-8 text-center rounded-lg border border-slate-200 text-sm font-semibold focus:border-sky-400 outline-none disabled:opacity-30 bg-white"
                                />
                                <label className="flex items-center gap-1.5 text-xs text-rose-600 font-medium cursor-pointer shrink-0">
                                    <input type="checkbox" checked={m.is_absent} onChange={e => updateMark(m.student_id, 'is_absent', e.target.checked)} className="w-3.5 h-3.5 accent-rose-500" />
                                    Absent
                                </label>
                            </motion.div>
                        ))}
                    </div>
                    <button onClick={handleSave} disabled={saving}
                        className="w-full h-11 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Save size={15} /> Save Marks</>}
                    </button>
                </div>
            ) : selectedSection ? (
                <div className="text-center py-12 text-slate-400">
                    <PenLine size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select exam and subject to enter marks</p>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <PenLine size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Select class, section, exam, and subject</p>
                </div>
            )}
        </div>
    );
}
