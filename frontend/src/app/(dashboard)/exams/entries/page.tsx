'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Exam, Student, Class } from '@/lib/types';
import toast from 'react-hot-toast';
import { BookOpen, Save } from 'lucide-react';

interface ExamSubject {
    id: number;
    subject_id: number;
    subject_name: string;
    max_marks: number;
    passing_marks: number;
}

interface MarksRow {
    student_id: number;
    student_name: string;
    admission_no: string;
    theory: string;
    practical: string;
    internal: string;
    is_absent: boolean;
}

function gradeFromPct(pct: number): string {
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D';
    return 'E';
}

export default function ExamEntriesPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [rows, setRows] = useState<MarksRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

    useEffect(() => {
        Promise.all([api.getExams(), api.getClasses()])
            .then(([e, c]) => { setExams(e); setClasses(c); })
            .catch(reportApiError);
    }, []);

    const loadExamSubjects = useCallback(async (examId: string) => {
        if (!examId) { setExamSubjects([]); setSelectedExam(null); return; }
        try {
            const exam = await api.getExam(parseInt(examId));
            setSelectedExam(exam);
            setExamSubjects((exam as unknown as { subjects: ExamSubject[] }).subjects || []);
            setSelectedSubjectId('');
            setRows([]);
        } catch (err) { reportApiError(err); }
    }, []);

    useEffect(() => { loadExamSubjects(selectedExamId); }, [selectedExamId, loadExamSubjects]);

    const loadStudents = useCallback(async () => {
        if (!selectedExam || !selectedSubjectId) { setRows([]); return; }
        setLoading(true);
        try {
            const res = await api.getStudents({ class_id: selectedExam.class_id, limit: 200 });
            setRows((res.data || []).map((s: Student) => ({
                student_id: s.id,
                student_name: s.name,
                admission_no: s.admission_no || '',
                theory: '',
                practical: '',
                internal: '',
                is_absent: false,
            })));
        } catch (err) { reportApiError(err); } finally { setLoading(false); }
    }, [selectedExam, selectedSubjectId]);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const updateRow = (idx: number, field: keyof MarksRow, value: string | boolean) => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    const getTotal = (row: MarksRow): number => {
        if (row.is_absent) return 0;
        return (parseFloat(row.theory) || 0) + (parseFloat(row.practical) || 0) + (parseFloat(row.internal) || 0);
    };

    const selectedSubject = examSubjects.find(s => s.id === parseInt(selectedSubjectId));
    const maxTheory = selectedSubject ? Math.max(selectedSubject.max_marks - 20, selectedSubject.max_marks) : 100;

    const handleSave = async () => {
        if (!selectedExamId || !selectedSubjectId) { toast.error('Select an exam and subject first'); return; }
        const subject = examSubjects.find(s => s.id === parseInt(selectedSubjectId));
        if (!subject) return;

        const marksPayload = rows.map(r => ({
            student_id: r.student_id,
            marks_obtained: r.is_absent ? undefined : getTotal(r),
            is_absent: r.is_absent,
        }));

        setSaving(true);
        try {
            const res = await api.enterMarks(parseInt(selectedExamId), {
                exam_subject_id: subject.id,
                marks: marksPayload,
            });
            toast.success((res as { message?: string }).message || 'Marks saved');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save marks');
        } finally { setSaving(false); }
    };

    const className = selectedExam
        ? classes.find(c => c.id === selectedExam.class_id)?.name || `Class ${selectedExam.class_id}`
        : '';

    const presentCount = rows.filter(r => !r.is_absent).length;
    const enteredCount = rows.filter(r => !r.is_absent && (r.theory || r.practical || r.internal)).length;

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Marks Entry</h1>
                <p className="text-sm text-slate-500 mt-0.5">Enter marks for students by exam and subject</p>
            </div>

            {/* Selectors */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Exam</label>
                        <select
                            value={selectedExamId}
                            onChange={e => setSelectedExamId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm"
                        >
                            <option value="">Select exam</option>
                            {exams.map(ex => (
                                <option key={ex.id} value={ex.id}>
                                    {ex.name} — {ex.class_name || `Class ${ex.class_id}`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</label>
                        <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            disabled={!selectedExamId || examSubjects.length === 0}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm disabled:opacity-40"
                        >
                            <option value="">
                                {!selectedExamId ? 'Select an exam first' : examSubjects.length === 0 ? 'No subjects' : 'Select subject'}
                            </option>
                            {examSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.subject_name} (Max: {s.max_marks}, Pass: {s.passing_marks})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedSubject && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span><BookOpen size={11} className="inline mr-1" /><strong>{selectedSubject.subject_name}</strong></span>
                        <span>Class: <strong>{className}</strong></span>
                        <span>Max: <strong>{selectedSubject.max_marks}</strong></span>
                        <span>Pass: <strong>{selectedSubject.passing_marks}</strong></span>
                    </div>
                )}
            </div>

            {/* Marks Table */}
            {selectedSubjectId && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Table header bar */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                {loading ? 'Loading…' : `${rows.length} Students`}
                            </h3>
                            {!loading && rows.length > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {enteredCount}/{presentCount} marks entered &bull; {rows.length - presentCount} absent
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading || rows.length === 0}
                            className="flex items-center gap-2 bg-[#6c5ce7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                        >
                            {saving
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                                : <><Save size={14} />Save Marks</>
                            }
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-400">No students found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 w-8">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500">Student</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-28">
                                            Theory <span className="text-slate-400 font-normal">/{maxTheory}</span>
                                        </th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-24">
                                            Practical <span className="text-slate-400 font-normal">/20</span>
                                        </th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-24">
                                            Internal <span className="text-slate-400 font-normal">/20</span>
                                        </th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-20">Total</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-16">Grade</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center w-16">Absent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rows.map((row, idx) => {
                                        const total = getTotal(row);
                                        const pct = selectedSubject && selectedSubject.max_marks > 0 ? (total / selectedSubject.max_marks) * 100 : 0;
                                        const grade = row.is_absent ? '—' : gradeFromPct(pct);
                                        const inputCls = 'w-full text-center px-2 py-1.5 bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] outline-none rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed';
                                        return (
                                            <tr key={row.student_id} className={`transition-colors ${row.is_absent ? 'bg-slate-50/70 opacity-60' : 'hover:bg-slate-50/40'}`}>
                                                <td className="px-4 py-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-900">{row.student_name}</p>
                                                    <p className="text-xs text-slate-400">{row.admission_no}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number" min={0} max={maxTheory}
                                                        disabled={row.is_absent}
                                                        value={row.theory}
                                                        onChange={e => updateRow(idx, 'theory', e.target.value)}
                                                        tabIndex={idx * 3 + 1}
                                                        placeholder="—"
                                                        className={inputCls}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number" min={0} max={20}
                                                        disabled={row.is_absent}
                                                        value={row.practical}
                                                        onChange={e => updateRow(idx, 'practical', e.target.value)}
                                                        tabIndex={idx * 3 + 2}
                                                        placeholder="—"
                                                        className={inputCls}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number" min={0} max={20}
                                                        disabled={row.is_absent}
                                                        value={row.internal}
                                                        onChange={e => updateRow(idx, 'internal', e.target.value)}
                                                        tabIndex={idx * 3 + 3}
                                                        placeholder="—"
                                                        className={inputCls}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700">
                                                    {row.is_absent ? '—' : total > 0 ? total : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                        row.is_absent ? 'text-slate-400' :
                                                        grade === 'E' ? 'bg-rose-50 text-rose-600' :
                                                        grade === 'D' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-[#f1f0ff] text-[#6c5ce7]'
                                                    }`}>{grade}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.is_absent}
                                                        onChange={e => updateRow(idx, 'is_absent', e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 accent-rose-500 cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {rows.length > 0 && !loading && (
                        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                            >
                                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><Save size={14} />Save Marks</>}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!selectedExamId && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
                    <BookOpen size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Select an exam and subject to start entering marks</p>
                </div>
            )}
        </div>
    );
}
