'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';
import type { StudentAttendanceSummary, AttendanceRecord } from '@/lib/types';
import { CalendarDays, CheckCircle2, XCircle, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    P: { label: 'P', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    A: { label: 'A', bg: 'bg-rose-100', text: 'text-rose-700' },
    L: { label: 'L', bg: 'bg-amber-100', text: 'text-amber-700' },
    H: { label: 'H', bg: 'bg-sky-100', text: 'text-sky-700' },
};

function AttendanceContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [data, setData] = useState<StudentAttendanceSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildAttendance(parseInt(studentId));
                if (active) setData(result as StudentAttendanceSummary);
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
                    <CalendarDays size={24} className="text-slate-400" />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="h-48 bg-slate-100 rounded-xl" />
            </div>
        );
    }

    if (!data) return <div className="py-16 text-center text-slate-400 text-sm">No attendance data available</div>;

    const pct = data.percentage ?? 0;
    const eligible = data.eligible_for_exam;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Your child&apos;s attendance this academic year</p>
                </div>
                <Link href="/parent" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft size={14} /> Dashboard
                </Link>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Days', value: data.total_days, icon: CalendarDays, color: 'text-slate-600', bg: 'bg-slate-100' },
                    { label: 'Present', value: data.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Absent', value: data.absent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Late / Leave', value: data.late, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-500">{label}</span>
                            <div className={`w-8 h-8 ${bg} ${color} rounded-lg flex items-center justify-center`}>
                                <Icon size={16} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{value}</p>
                    </div>
                ))}
            </div>

            {/* Progress + Eligibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-5">Attendance Rate</h3>
                    <div className="flex items-center gap-8">
                        <div className="relative w-28 h-28 shrink-0">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                                <circle
                                    cx="50" cy="50" r="40"
                                    stroke={pct >= 75 ? '#10b981' : '#f43f5e'}
                                    strokeWidth="10" fill="none"
                                    strokeDasharray={`${pct * 2.51} 251`}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-slate-900">{pct.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="space-y-3 flex-1">
                            {[
                                { label: 'Present', days: data.present, color: 'bg-emerald-500' },
                                { label: 'Absent', days: data.absent, color: 'bg-rose-400' },
                                ...(data.late > 0 ? [{ label: 'Late / Leave', days: data.late, color: 'bg-amber-400' }] : []),
                            ].map(({ label, days, color }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-medium text-slate-700">{days} days</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${color} rounded-full`} style={{ width: `${(days / (data.total_days || 1)) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col items-center justify-center text-center gap-3 ${eligible ? 'border-emerald-100' : 'border-rose-100'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${eligible ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        <ShieldCheck size={28} className={eligible ? 'text-emerald-600' : 'text-rose-500'} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Exam Eligibility</p>
                        <p className={`text-xl font-bold mt-1 ${eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {eligible ? 'Eligible' : 'Not Eligible'}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Min 75% attendance required</p>
                </div>
            </div>

            {/* Recent Records */}
            {(data.recent_records?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 mb-4">Recent Records</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {(data.recent_records as AttendanceRecord[]).map((r, i) => {
                            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.P;
                            return (
                                <div key={i} className={`p-2 rounded-lg text-center ${cfg.bg}`}>
                                    <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-50 text-xs text-slate-500">
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <span key={key} className="flex items-center gap-1.5">
                                <span className={`w-4 h-4 rounded ${cfg.bg} ${cfg.text} text-[9px] font-bold flex items-center justify-center`}>{key}</span>
                                {key === 'P' ? 'Present' : key === 'A' ? 'Absent' : key === 'L' ? 'Late/Leave' : 'Holiday'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ParentAttendancePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        }>
            <AttendanceContent />
        </Suspense>
    );
}
