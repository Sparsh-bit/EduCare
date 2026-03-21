'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { DashboardStats, Class } from '@/lib/types';
import toast from 'react-hot-toast';
import { Users, TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';

export default function AttendanceDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dashData, classData] = await Promise.all([
                api.getDashboardStats(),
                api.getClasses(),
            ]);
            setStats(dashData);
            setClasses(classData);
        } catch (err) {
            reportApiError(err);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const present = stats?.attendance?.present ?? 0;
    const absent = stats?.attendance?.absent ?? 0;
    const totalMarked = stats?.attendance?.total_marked ?? 0;
    const presentPct = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;
    const absentPct = totalMarked > 0 ? Math.round((absent / totalMarked) * 100) : 0;
    const latePct = totalMarked > 0 ? Math.max(0, 100 - presentPct - absentPct) : 0;
    const byClass = stats?.students?.by_class ?? [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendance Reports</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Today&apos;s overview — {stats?.attendance?.today_date
                            ? new Date(stats.attendance.today_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
                            : new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500 font-medium">Present today</span>
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <TrendingUp size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{presentPct}%</p>
                    <p className="text-xs text-slate-400 mt-1">{present} of {totalMarked} students</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${presentPct}%` }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500 font-medium">Absent today</span>
                        <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                            <TrendingDown size={16} className="text-rose-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{absentPct}%</p>
                    <p className="text-xs text-slate-400 mt-1">{absent} of {totalMarked} students</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${absentPct}%` }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-500 font-medium">Late arrivals</span>
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Clock size={16} className="text-amber-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{latePct}%</p>
                    <p className="text-xs text-slate-400 mt-1">Marked late this session</p>
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${latePct}%` }} />
                    </div>
                </div>
            </div>

            {/* Class-wise breakdown */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 bg-[#f1f0ff] rounded-lg flex items-center justify-center">
                        <Users size={16} className="text-[#6c5ce7]" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Students by class</h2>
                        <p className="text-xs text-slate-400">Total enrolment breakdown</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : byClass.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">No class data available</div>
                ) : (
                    <div className="space-y-4">
                        {byClass.map((row) => {
                            const total = stats?.students?.total ?? 1;
                            const pct = Math.round((row.count / total) * 100);
                            return (
                                <div key={row.class_name}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="font-medium text-slate-700">{row.class_name}</span>
                                        <span className="text-slate-400">{row.count} students</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#6c5ce7] rounded-full transition-all duration-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Class list reference */}
            {classes.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">All classes</h2>
                    <div className="flex flex-wrap gap-2">
                        {classes.map((c) => (
                            <span key={c.id} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-100">
                                {c.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
