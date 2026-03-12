'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    IndianRupee,
    School,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { api, reportApiError } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DashboardStats, Exam } from '@/lib/types';

type RecentActivityItem = {
    id?: number;
    type?: string;
    description?: string;
    created_at: string;
    user_name?: string;
};

type StatTile = {
    title: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: 'cyan' | 'emerald' | 'amber' | 'rose';
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

function formatAmount(amount: number): string {
    if (!Number.isFinite(amount)) return '0';
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(dateString?: string): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(dateString: string): string {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Unknown time';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function toneClasses(tone: StatTile['tone']): string {
    switch (tone) {
        case 'emerald':
            return 'text-emerald-700 bg-emerald-100 border-emerald-200';
        case 'amber':
            return 'text-amber-700 bg-amber-100 border-amber-200';
        case 'rose':
            return 'text-rose-700 bg-rose-100 border-rose-200';
        default:
            return 'text-cyan-700 bg-cyan-100 border-cyan-200';
    }
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        Promise.all([api.getDashboardStats(), api.getUpcomingExams(), api.getRecentActivity()])
            .then(([statsData, examsData, activityData]) => {
                if (!isMounted) return;
                setStats(statsData);
                setUpcomingExams(Array.isArray(examsData) ? examsData : []);
                setRecentActivity(Array.isArray(activityData?.data) ? activityData.data : []);
            })
            .catch(reportApiError)
            .finally(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const statTiles = useMemo<StatTile[]>(() => {
        const attendance = stats?.attendance?.percentage ?? 0;
        const feeCollected = stats?.fees?.total_collected ?? 0;
        const pendingDues = stats?.pending_dues_count ?? 0;
        const totalStaff = stats?.staff?.total ?? 0;
        const totalStudents = stats?.students?.total ?? 0;

        return [
            {
                title: 'Students',
                value: totalStudents.toLocaleString('en-IN'),
                helper: 'Enrolled this academic year',
                icon: Users,
                tone: 'cyan',
            },
            {
                title: 'Staff',
                value: totalStaff.toLocaleString('en-IN'),
                helper: 'Teaching and non-teaching',
                icon: School,
                tone: 'emerald',
            },
            {
                title: 'Attendance Today',
                value: `${attendance.toFixed(1)}%`,
                helper: `${stats?.attendance?.present ?? 0} present`,
                icon: Activity,
                tone: 'amber',
            },
            {
                title: 'Fee Collection',
                value: formatAmount(feeCollected),
                helper: `${pendingDues.toLocaleString('en-IN')} pending dues`,
                icon: IndianRupee,
                tone: 'rose',
            },
        ];
    }, [stats]);

    const classDistribution = stats?.students?.by_class ?? [];
    const totalClassCount = classDistribution.reduce((sum, item) => sum + item.count, 0);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-24 rounded-3xl bg-slate-100" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="h-32 rounded-3xl bg-slate-100" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="h-80 rounded-3xl bg-slate-100 xl:col-span-2" />
                    <div className="h-80 rounded-3xl bg-slate-100" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <motion.section variants={itemVariants} className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">School Operations</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'Team'}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                    {stats?.academic_year ? `Academic Year ${stats.academic_year}` : 'Live dashboard from ERP backend'}
                </p>
            </motion.section>

            <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <article key={tile.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{tile.title}</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{tile.value}</p>
                                    <p className="mt-2 text-xs font-semibold text-slate-500">{tile.helper}</p>
                                </div>
                                <span className={`rounded-2xl border p-2.5 ${toneClasses(tile.tone)}`}>
                                    <Icon className="h-5 w-5" />
                                </span>
                            </div>
                        </article>
                    );
                })}
            </motion.section>

            <motion.section variants={itemVariants} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-black tracking-tight text-slate-900">Upcoming Exams</h3>
                        <CalendarDays className="h-5 w-5 text-cyan-700" />
                    </div>
                    {upcomingExams.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                            No upcoming exams scheduled.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingExams.slice(0, 6).map((exam) => (
                                <div key={exam.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{exam.name}</p>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            {exam.class_name || 'All Classes'} · Term {exam.term}
                                        </p>
                                    </div>
                                    <span className="rounded-xl bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
                                        {formatDate(exam.start_date)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-black tracking-tight text-slate-900">Class Mix</h3>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student distribution</p>
                    {classDistribution.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                            Class-wise data unavailable.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {classDistribution.slice(0, 7).map((item) => {
                                const percentage = totalClassCount > 0 ? Math.round((item.count / totalClassCount) * 100) : 0;
                                return (
                                    <div key={item.class_name} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                            <span>{item.class_name}</span>
                                            <span>{item.count}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100">
                                            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-600 to-emerald-500" style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.section>

            <motion.section variants={itemVariants} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-black tracking-tight text-slate-900">Recent Activity</h3>
                </div>
                {recentActivity.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
                        No recent activity available.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {recentActivity.slice(0, 8).map((entry, index) => (
                            <div key={`${entry.id || index}-${entry.created_at}`} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{entry.description || 'Activity recorded'}</p>
                                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                                        {entry.type || 'system'} {entry.user_name ? `· ${entry.user_name}` : ''}
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{formatRelative(entry.created_at)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.section>
        </motion.div>
    );
}
