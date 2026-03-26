'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Exam } from '@/lib/types';
import toast from 'react-hot-toast';
import { Plus, Trophy, Calendar, Loader2, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ClassItem { id: number; name: string; numeric_level?: number }
interface Subject { id: number; name: string; class_id: number; is_optional: boolean }
interface SubjectEntry { subject_id: number; name: string; max_marks: number; passing_marks: number; exam_date: string }

const TERMS = [
    { value: '1', label: 'Term 1' },
    { value: '2', label: 'Term 2' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
    upcoming: { label: 'Upcoming', icon: Clock, cls: 'bg-amber-50 text-amber-600 border-amber-100' },
    ongoing: { label: 'Ongoing', icon: AlertCircle, cls: 'bg-blue-50 text-blue-600 border-blue-100' },
    completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

export default function ExamsManagePage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        name: '', term: '1', class_id: '', start_date: '', end_date: '',
    });
    const [subjectEntries, setSubjectEntries] = useState<SubjectEntry[]>([]);

    const loadExams = useCallback(async () => {
        try { setExams(await api.getExams()); }
        catch { toast.error('Failed to load exams'); }
    }, []);

    const loadClasses = useCallback(async () => {
        try { setClasses(await api.getClasses() as ClassItem[]); }
        catch { /* ignore */ }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([loadExams(), loadClasses()]).finally(() => setLoading(false));
    }, [loadExams, loadClasses]);

    const handleClassChange = async (classId: string) => {
        setForm(f => ({ ...f, class_id: classId }));
        setSubjectEntries([]);
        if (!classId) { setSubjects([]); return; }
        try {
            const subs = await api.getSubjects(Number(classId));
            setSubjects(subs);
            setSubjectEntries(subs.map(s => ({
                subject_id: s.id, name: s.name,
                max_marks: 100, passing_marks: 33, exam_date: '',
            })));
        } catch { toast.error('Failed to load subjects for this class'); }
    };

    const updateSubjectEntry = (subjectId: number, field: keyof SubjectEntry, value: string | number) => {
        setSubjectEntries(prev => prev.map(s => s.subject_id === subjectId ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) { toast.error('Enter exam name'); return; }
        if (!form.class_id) { toast.error('Select a class'); return; }
        if (!form.start_date) { toast.error('Select start date'); return; }
        if (subjectEntries.length === 0) { toast.error('No subjects found for this class'); return; }
        if (subjectEntries.some(s => s.passing_marks > s.max_marks)) {
            toast.error('Passing marks cannot exceed maximum marks for any subject'); return;
        }
        setSaving(true);
        try {
            await api.createExam({
                name: form.name.trim(),
                term: form.term,
                class_id: Number(form.class_id),
                start_date: form.start_date,
                end_date: form.end_date || undefined,
                subjects: subjectEntries.map(s => ({
                    subject_id: s.subject_id,
                    max_marks: s.max_marks,
                    passing_marks: s.passing_marks,
                })),
            });
            toast.success('Exam created successfully');
            setShowForm(false);
            setForm({ name: '', term: '1', class_id: '', start_date: '', end_date: '' });
            setSubjectEntries([]);
            loadExams();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create exam');
        }
        setSaving(false);
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]';

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                        <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                        <ChevronRight size={14} />
                        <span className="text-slate-600">Manage Exams</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Manage Exams</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Create and view all examinations</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] transition-colors"
                >
                    <Plus size={16} />
                    Create Exam
                </button>
            </div>

            {/* Create Exam Form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900">Create New Exam</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Exam Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Mid Term Examination"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Class *</label>
                            <select value={form.class_id} onChange={e => handleClassChange(e.target.value)} className={inputCls}>
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Term *</label>
                            <select value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className={inputCls}>
                                {TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date *</label>
                            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                            <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} />
                        </div>
                    </div>

                    {/* Subject marks configuration */}
                    {subjectEntries.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Subject Marks Configuration</h3>
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Max Marks</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Passing Marks</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Exam Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {subjectEntries.map(s => (
                                            <tr key={s.subject_id}>
                                                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={s.max_marks}
                                                        onChange={e => updateSubjectEntry(s.subject_id, 'max_marks', Number(e.target.value))}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={s.passing_marks}
                                                        onChange={e => updateSubjectEntry(s.subject_id, 'passing_marks', Number(e.target.value))}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="date"
                                                        value={s.exam_date}
                                                        onChange={e => updateSubjectEntry(s.subject_id, 'exam_date', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {form.class_id && subjectEntries.length === 0 && subjects.length === 0 && (
                        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
                            No subjects found for this class. Please add subjects first from the student management section.
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] disabled:opacity-60 transition-colors"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            {saving ? 'Creating…' : 'Create Exam'}
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setSubjectEntries([]); }}
                            className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Exams List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-300" />
                </div>
            ) : exams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                        <Trophy size={28} className="text-amber-500" />
                    </div>
                    <p className="text-slate-900 font-semibold mb-1">No exams created yet</p>
                    <p className="text-sm text-slate-400">Click &quot;Create Exam&quot; to add your first examination</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {exams.map(exam => {
                        const statusCfg = STATUS_CONFIG[exam.status] || STATUS_CONFIG.upcoming;
                        const StatusIcon = statusCfg.icon;
                        return (
                            <div key={exam.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusCfg.cls}`}>
                                        <StatusIcon size={11} />
                                        {statusCfg.label}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">Term {exam.term}</span>
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">{exam.name}</h3>
                                <p className="text-sm text-slate-500 mb-3">Class {exam.class_name || exam.class_id}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Calendar size={12} />
                                    <span>{exam.start_date}{exam.end_date ? ` — ${exam.end_date}` : ''}</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                    <Link
                                        href={`/exams/entries?examId=${exam.id}`}
                                        className="flex-1 text-center py-2 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-semibold rounded-lg hover:bg-[#ebe8ff] transition-colors"
                                    >
                                        Enter Marks
                                    </Link>
                                    <Link
                                        href={`/exams/results?examId=${exam.id}&classId=${exam.class_id}`}
                                        className="flex-1 text-center py-2 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        View Results
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
