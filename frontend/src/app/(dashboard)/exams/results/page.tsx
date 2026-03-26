'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Exam, ExamResultsResponse } from '@/lib/types';
import toast from 'react-hot-toast';
import { BarChart3, Loader2, ChevronRight, Download, Trophy, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ClassItem { id: number; name: string }
interface SectionItem { id: number; name: string; class_id: number }

const GRADE_COLOR: Record<string, string> = {
    'A1': 'bg-emerald-50 text-emerald-700', 'A2': 'bg-emerald-50 text-emerald-600',
    'B1': 'bg-blue-50 text-blue-700', 'B2': 'bg-blue-50 text-blue-600',
    'C1': 'bg-amber-50 text-amber-700', 'C2': 'bg-amber-50 text-amber-600',
    'D': 'bg-orange-50 text-orange-700', 'E': 'bg-rose-50 text-rose-700',
};

function ResultsContent() {
    const searchParams = useSearchParams();
    const [exams, setExams] = useState<Exam[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [results, setResults] = useState<ExamResultsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [examId, setExamId] = useState(searchParams.get('examId') || '');
    const [classId, setClassId] = useState(searchParams.get('classId') || '');
    const [sectionId, setSectionId] = useState('');

    useEffect(() => {
        Promise.all([
            api.getExams().then(setExams).catch(() => {}),
            api.getClasses().then(c => setClasses(c as ClassItem[])).catch(() => {}),
        ]);
    }, []);

    useEffect(() => {
        if (!classId) { setSections([]); return; }
        api.getSections(Number(classId)).then(s => setSections(s as SectionItem[])).catch(() => {});
    }, [classId]);

    const fetchResults = useCallback(async () => {
        if (!examId || !classId) { toast.error('Select exam and class first'); return; }
        setLoading(true);
        try {
            const data = await api.getExamResults(Number(examId), Number(classId), sectionId ? Number(sectionId) : undefined);
            setResults(data);
            if (data.results.length === 0) toast('No results found for this selection', { icon: 'ℹ️' });
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load results');
            setResults(null);
        }
        setLoading(false);
    }, [examId, classId, sectionId]);

    const selectedExam = exams.find(e => String(e.id) === examId);
    const selectedClass = classes.find(c => String(c.id) === classId);

    const passCount = results?.results.filter(r => r.status === 'Pass').length ?? 0;
    const failCount = results?.results.filter(r => r.status === 'Fail').length ?? 0;
    const avgPct = results?.results.length
        ? Math.round(results.results.reduce((s, r) => s + r.percentage, 0) / results.results.length)
        : 0;
    const topper = results?.results.length
        ? results.results.reduce((best, r) => r.percentage > best.percentage ? r : best, results.results[0])
        : null;

    const selectCls = 'px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]';

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-600">View Results</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Results</h1>
                <p className="text-sm text-slate-500 mt-0.5">Select an exam and class to view student results</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Exam</label>
                        <select value={examId} onChange={e => { setExamId(e.target.value); setResults(null); }} className={selectCls}>
                            <option value="">Select Exam</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                        <select value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setResults(null); }} className={selectCls}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                        </select>
                    </div>
                    {sections.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Section</label>
                            <select value={sectionId} onChange={e => { setSectionId(e.target.value); setResults(null); }} className={selectCls}>
                                <option value="">All Sections</option>
                                {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={fetchResults}
                        disabled={loading || !examId || !classId}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] disabled:opacity-50 transition-colors"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                        View Results
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {results && results.results.length > 0 && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Students</p>
                            <p className="text-3xl font-black text-slate-900">{results.results.length}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Passed</p>
                            <p className="text-3xl font-black text-emerald-700">{passCount}</p>
                            <p className="text-xs text-emerald-600 mt-1">{results.results.length > 0 ? Math.round((passCount / results.results.length) * 100) : 0}% pass rate</p>
                        </div>
                        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
                            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Failed</p>
                            <p className="text-3xl font-black text-rose-700">{failCount}</p>
                        </div>
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Class Average</p>
                            <p className="text-3xl font-black text-blue-700">{avgPct}%</p>
                        </div>
                    </div>

                    {topper && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <Trophy size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Class Topper</p>
                                <p className="font-bold text-slate-900">{topper.student_name} — {topper.percentage}% ({topper.grade})</p>
                            </div>
                        </div>
                    )}

                    {/* Exam + Header */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                            <div>
                                <p className="font-semibold text-slate-900">{selectedExam?.name}</p>
                                <p className="text-sm text-slate-400">Class {selectedClass?.name}</p>
                            </div>
                            <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                                <Download size={13} /> Export
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student Name</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Marks</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Percentage</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {results.results
                                        .slice()
                                        .sort((a, b) => b.percentage - a.percentage)
                                        .map((r, idx) => (
                                            <tr key={r.student_id} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3.5 text-slate-400 text-xs font-mono">{idx + 1}</td>
                                                <td className="px-5 py-3.5 font-medium text-slate-900">{r.student_name}</td>
                                                <td className="px-5 py-3.5 text-center text-slate-700 font-mono text-sm">
                                                    {r.total_obtained} / {r.total_max}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <TrendingUp size={12} className={r.percentage >= 60 ? 'text-emerald-500' : 'text-rose-400'} />
                                                        <span className="font-semibold text-slate-700">{r.percentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${GRADE_COLOR[r.grade] || 'bg-slate-50 text-slate-600'}`}>
                                                        {r.grade}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${r.status === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {results && results.results.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <BarChart3 size={40} className="text-slate-200 mb-3" />
                    <p className="text-slate-500 font-medium">No results found</p>
                    <p className="text-sm text-slate-400 mt-1">Marks may not have been entered yet for this exam and class.</p>
                    <Link href="/exams/entries" className="mt-4 text-sm text-[#6c5ce7] font-semibold hover:underline">Go to Marks Entry →</Link>
                </div>
            )}
        </div>
    );
}

export default function ExamResultsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>}>
            <ResultsContent />
        </Suspense>
    );
}
