'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Exam, ExamResultsResponse } from '@/lib/types';
import toast from 'react-hot-toast';
import { TrendingUp, Loader2, ChevronRight, Users, Award, AlertCircle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface ClassItem { id: number; name: string }

export default function ExamAnalyticsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [examId, setExamId] = useState('');
    const [classId, setClassId] = useState('');
    const [results, setResults] = useState<ExamResultsResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            api.getExams().then(setExams).catch(() => {}),
            api.getClasses().then(c => setClasses(c as ClassItem[])).catch(() => {}),
        ]);
    }, []);

    const fetchAnalytics = useCallback(async () => {
        if (!examId || !classId) { toast.error('Select exam and class'); return; }
        setLoading(true);
        try { setResults(await api.getExamResults(Number(examId), Number(classId))); }
        catch { toast.error('Failed to load analytics'); }
        setLoading(false);
    }, [examId, classId]);

    // Grade distribution
    const gradeMap = results?.results.reduce((acc, r) => {
        acc[r.grade] = (acc[r.grade] || 0) + 1;
        return acc;
    }, {} as Record<string, number>) ?? {};
    const gradeEntries = Object.entries(gradeMap).sort((a, b) => b[1] - a[1]);

    const total = results?.results.length ?? 0;
    const passed = results?.results.filter(r => r.status === 'Pass').length ?? 0;
    const avg = total > 0 ? Math.round(results!.results.reduce((s, r) => s + r.percentage, 0) / total) : 0;
    const highest = total > 0 ? Math.max(...results!.results.map(r => r.percentage)) : 0;
    const lowest = total > 0 ? Math.min(...results!.results.map(r => r.percentage)) : 0;

    // Subjects performance
    const subjectPerf: Record<string, { total: number; count: number; name: string }> = {};
    results?.results.forEach(r => {
        r.subjects?.forEach(s => {
            if (!subjectPerf[s.subject_id]) subjectPerf[s.subject_id] = { total: 0, count: 0, name: s.subject_name || '' };
            subjectPerf[s.subject_id].total += (s.obtained_marks / s.max_marks) * 100;
            subjectPerf[s.subject_id].count++;
        });
    });
    const subjectAvgs = Object.entries(subjectPerf)
        .map(([, v]) => ({ name: v.name, avg: Math.round(v.total / v.count) }))
        .sort((a, b) => b.avg - a.avg);

    const selectCls = 'px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]';

    return (
        <div className="space-y-6 pb-10">
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-600">Analytics</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Analytics</h1>
                <p className="text-sm text-slate-500 mt-0.5">Performance trends, grade distribution, and subject-wise analysis</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Exam</label>
                    <select value={examId} onChange={e => { setExamId(e.target.value); setResults(null); }} className={selectCls}>
                        <option value="">Select Exam</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                    <select value={classId} onChange={e => { setClassId(e.target.value); setResults(null); }} className={selectCls}>
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>Class {c.name}</option>)}
                    </select>
                </div>
                <button
                    onClick={fetchAnalytics}
                    disabled={loading || !examId || !classId}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5a4bd1] disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                    Analyse
                </button>
            </div>

            {results && total > 0 && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Students', value: total, icon: Users, cls: 'bg-white border-slate-100', vCls: 'text-slate-900' },
                            { label: 'Pass %', value: `${Math.round((passed / total) * 100)}%`, icon: Award, cls: 'bg-emerald-50 border-emerald-100', vCls: 'text-emerald-700' },
                            { label: 'Class Avg', value: `${avg}%`, icon: BarChart3, cls: 'bg-blue-50 border-blue-100', vCls: 'text-blue-700' },
                            { label: 'Highest', value: `${highest}%`, icon: TrendingUp, cls: 'bg-amber-50 border-amber-100', vCls: 'text-amber-700' },
                            { label: 'Lowest', value: `${lowest}%`, icon: AlertCircle, cls: 'bg-rose-50 border-rose-100', vCls: 'text-rose-700' },
                        ].map(({ label, value, icon: Icon, cls, vCls }) => (
                            <div key={label} className={`rounded-2xl border shadow-sm p-5 ${cls}`}>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                                <p className={`text-3xl font-black ${vCls}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Grade Distribution */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="font-bold text-slate-900 mb-4">Grade Distribution</h3>
                            <div className="space-y-3">
                                {gradeEntries.map(([grade, count]) => (
                                    <div key={grade} className="flex items-center gap-3">
                                        <span className="w-10 text-xs font-bold text-slate-600">{grade}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="h-full bg-[#6c5ce7] rounded-full transition-all"
                                                style={{ width: `${Math.round((count / total) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-12 text-right">{count} ({Math.round((count / total) * 100)}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Subject-wise Average */}
                        {subjectAvgs.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h3 className="font-bold text-slate-900 mb-4">Subject-wise Average</h3>
                                <div className="space-y-3">
                                    {subjectAvgs.map(({ name, avg: subAvg }) => (
                                        <div key={name} className="flex items-center gap-3">
                                            <span className="w-28 text-xs font-medium text-slate-600 truncate">{name}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${subAvg >= 75 ? 'bg-emerald-500' : subAvg >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${subAvg}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 w-10 text-right">{subAvg}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top 5 Students */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50">
                            <h3 className="font-bold text-slate-900">Top Performers</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rank</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Marks</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">%</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {results.results
                                    .slice().sort((a, b) => b.percentage - a.percentage)
                                    .slice(0, 10)
                                    .map((r, i) => (
                                        <tr key={r.student_id} className={i < 3 ? 'bg-amber-50/30' : ''}>
                                            <td className="px-5 py-3 font-mono font-bold text-slate-400">#{i + 1}</td>
                                            <td className="px-5 py-3 font-medium text-slate-900">{r.student_name}</td>
                                            <td className="px-5 py-3 text-center font-mono text-slate-600">{r.total_obtained}/{r.total_max}</td>
                                            <td className="px-5 py-3 text-center font-bold text-slate-700">{r.percentage}%</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className="px-2 py-1 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-bold rounded-lg">{r.grade}</span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {!results && !loading && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
                    <TrendingUp size={40} className="text-slate-200 mb-3" />
                    <p className="text-slate-500 font-medium">Select an exam and class to view analytics</p>
                </div>
            )}
        </div>
    );
}
