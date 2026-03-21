'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Users, UserCheck, AlertCircle, BarChart2, RefreshCw } from 'lucide-react';

export default function StudentDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDashboardStats()
            .then(setStats)
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    const totalStudents = stats?.students?.total ?? 0;
    const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Reports</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {stats?.academic_year ? `Academic year ${stats.academic_year}` : 'Current academic year overview'}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setLoading(true);
                        api.getDashboardStats().then(setStats).catch(reportApiError).finally(() => setLoading(false));
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#6c5ce7] rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-[#6c5ce7]/20">Total Students</span>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold">{loading ? '—' : totalStudents}</p>
                    <p className="text-xs text-[#6c5ce7]/20 mt-1">Enrolled this year</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500">Present Today</span>
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <UserCheck size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{loading ? '—' : `${stats?.attendance?.percentage ?? 0}%`}</p>
                    <p className="text-xs text-slate-400 mt-1">{stats?.attendance?.present ?? 0} students present</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500">Pending Fees</span>
                        <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                            <AlertCircle size={16} className="text-rose-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{loading ? '—' : (stats?.pending_dues_count ?? 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Students with outstanding dues</p>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Class-wise distribution */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-[#f1f0ff] rounded-lg flex items-center justify-center">
                            <BarChart2 size={16} className="text-[#6c5ce7]" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Students by Class</h2>
                            <p className="text-xs text-slate-400">Enrollment distribution</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : stats?.students?.by_class?.length ? (
                        <div className="space-y-4">
                            {stats.students.by_class.map((c, idx) => {
                                const pct = totalStudents > 0 ? Math.round((Number(c.count) / totalStudents) * 100) : 0;
                                const color = colors[idx % colors.length];
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="font-medium text-slate-700">{c.class_name}</span>
                                            <span className="text-slate-400">{c.count} students</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-400 text-sm">No class data available</div>
                    )}
                </div>

                {/* Attendance today */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-5">Today&apos;s Attendance</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {[
                            { label: 'Present', value: stats?.attendance?.present ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Absent', value: stats?.attendance?.absent ?? 0, color: 'text-rose-600', bg: 'bg-rose-50' },
                            { label: 'Pending Dues', value: stats?.pending_dues_count ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Total Staff', value: stats?.staff?.total ?? 0, color: 'text-[#6c5ce7]', bg: 'bg-[#f1f0ff]' },
                        ].map((item, i) => (
                            <div key={i} className={`${item.bg} rounded-xl p-4`}>
                                <p className="text-2xl font-bold text-slate-900">{loading ? '—' : item.value}</p>
                                <p className={`text-xs font-medium mt-1 ${item.color}`}>{item.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-4">
                        <button
                            onClick={() => router.push('/students/new')}
                            className="w-full bg-[#6c5ce7] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] transition-colors"
                        >
                            Add New Student
                        </button>
                        <button
                            onClick={() => router.push('/students/certificates')}
                            className="w-full border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            Transfer Certificates
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
