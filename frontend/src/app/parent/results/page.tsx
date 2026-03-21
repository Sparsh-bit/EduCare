'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';
import { Award, TrendingUp, CheckCircle2, XCircle, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

function getGradeColor(grade: string): string {
    if (['A1', 'A+', 'O'].includes(grade)) return 'bg-emerald-100 text-emerald-700';
    if (['A2', 'A', 'A-'].includes(grade)) return 'bg-teal-100 text-teal-700';
    if (['B1', 'B+'].includes(grade)) return 'bg-blue-100 text-blue-700';
    if (['B2', 'B'].includes(grade)) return 'bg-indigo-100 text-indigo-700';
    if (['C1', 'C2', 'C'].includes(grade)) return 'bg-amber-100 text-amber-700';
    if (['D', 'E', 'F', 'Fail'].includes(grade)) return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
}

function ResultsContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [results, setResults] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedExam, setExpandedExam] = useState<number | null>(null);

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildResults(parseInt(studentId));
                if (active) {
                    const data = result as Record<string, any>[];
                    setResults(data);
                    if (data.length > 0) setExpandedExam(data[0].exam_id as number);
                }
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [studentId]);

    if (!studentId) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Award size={24} className="text-slate-400" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700">No student selected</p>
                    <p className="text-sm text-slate-400 mt-1">Please select a child from the dashboard</p>
                </div>
                <Link href="/parent" className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline mt-2">
                    <ArrowLeft size={14} /> Back to Dashboard
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {Array(2).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-xl" />)}
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} className="text-slate-400" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700">No results available</p>
                    <p className="text-sm text-slate-400 mt-1">Results will appear here once exams are graded</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Exam Results</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Subject-wise marks and performance</p>
                </div>
                <Link href="/parent" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft size={14} /> Dashboard
                </Link>
            </div>

            {/* Exam Tabs */}
            {results.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {results.map((exam) => (
                        <button
                            key={exam.exam_id}
                            onClick={() => setExpandedExam(exam.exam_id as number)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                expandedExam === exam.exam_id
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {exam.exam_name}
                        </button>
                    ))}
                </div>
            )}

            {results
                .filter((exam) => results.length === 1 || expandedExam === exam.exam_id)
                .map((exam) => {
                    const pct = Number(exam.percentage ?? 0);
                    const passed = Number(exam.percentage ?? 0) >= 33;
                    const subjects = (exam.subjects as Array<Record<string, any>>) ?? [];

                    return (
                        <div key={exam.exam_id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">

                            {/* Exam Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-lg">{exam.exam_name}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Term {exam.term} · {exam.total_obtained}/{exam.total_max} marks
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-indigo-600">{pct.toFixed(1)}%</p>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium mt-1 ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                            {passed ? 'Pass' : 'Fail'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="px-6 pt-4 pb-2">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? 'bg-emerald-500' : pct >= 33 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Subject Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Subject</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Max</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Obtained</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Grade</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {subjects.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-slate-900">{s.subject}</td>
                                                <td className="px-5 py-3 text-center text-slate-500">{s.max_marks}</td>
                                                <td className={`px-5 py-3 text-center font-semibold ${s.passed ? 'text-slate-800' : 'text-rose-600'}`}>
                                                    {s.obtained}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {s.grade ? (
                                                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${getGradeColor(s.grade)}`}>
                                                            {s.grade}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    {s.passed
                                                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 size={12} /> Pass</span>
                                                        : <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium"><XCircle size={12} /> Fail</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-100">
                                        <tr>
                                            <td className="px-5 py-3 font-semibold text-slate-700">Total</td>
                                            <td className="px-5 py-3 text-center font-semibold text-slate-700">{exam.total_max}</td>
                                            <td className="px-5 py-3 text-center font-semibold text-indigo-600">{exam.total_obtained}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium">
                                                    <TrendingUp size={12} /> {pct.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {exam.grade ?? (passed ? 'Pass' : 'Fail')}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}

export default function ParentResultsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        }>
            <ResultsContent />
        </Suspense>
    );
}
