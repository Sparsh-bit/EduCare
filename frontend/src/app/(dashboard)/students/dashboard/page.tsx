'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import { motion } from 'framer-motion';
import { Users, UserX, UserCheck, TrendingUp, AlertCircle, GraduationCap, BarChart2, ArrowUpRight } from 'lucide-react';

export default function StudentDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDashboardStats()
            .then(setStats)
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-200 rounded-xl w-64" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200" />)}
                </div>
                <div className="h-80 bg-white rounded-2xl border border-slate-200" />
            </div>
        );
    }

    const cards = [
        {
            title: 'Total Students',
            value: stats?.students?.total || 0,
            icon: Users,
            color: '#6c5ce7',
            light: 'rgba(108,92,231,0.1)',
            sub: 'Active enrollments',
            isHighlight: true,
        },
        {
            title: 'Avg. Attendance',
            value: `${stats?.attendance?.percentage || 0}%`,
            icon: UserCheck,
            color: '#10b981',
            light: 'rgba(16,185,129,0.1)',
            sub: `${stats?.attendance?.present || 0} present today`,
        },
        {
            title: 'Fee Defaulters',
            value: stats?.pending_dues_count || 0,
            icon: AlertCircle,
            color: '#ef4444',
            light: 'rgba(239,68,68,0.1)',
            sub: 'Students with dues',
            isWarning: true,
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 28 } }
    };

    const total = Math.max(stats?.students?.total || 1, 1);
    const colors = ['#6c5ce7','#a29bfe','#4f46e5','#7c3aed','#8b5cf6','#0ea5e9','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];

    return (
        <div className="space-y-6 animate-fade-in">

            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#5b4bd5] flex items-center justify-center shadow-md shadow-[#6c5ce7]/30">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Intelligence</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">Comprehensive overview of student metrics & cohort distribution</p>
                </div>
                <a href="/students"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white self-start sm:self-auto"
                    style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', boxShadow: '0 4px 14px rgba(108,92,231,0.3)' }}>
                    View All Students <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
            </div>

            {/* ─── KPI Cards ─── */}
            <motion.div variants={containerVariants} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {cards.map((card, i) => (
                    <motion.div key={i} variants={itemVariants}
                        className={`relative p-5 rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${
                            card.isHighlight
                                ? 'bg-gradient-to-br from-[#6c5ce7] to-[#5b4bd5] border-transparent'
                                : 'bg-white border-slate-200'
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: card.isHighlight ? 'rgba(255,255,255,0.15)' : card.light }}>
                                <card.icon className="w-5 h-5" style={{ color: card.isHighlight ? 'white' : card.color }} strokeWidth={2.5} />
                            </div>
                            {card.isWarning && card.value > 0 && (
                                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">Attention</span>
                            )}
                        </div>
                        <div className={`text-3xl font-extrabold tracking-tight mb-0.5 ${card.isHighlight ? 'text-white' : card.isWarning ? 'text-red-600' : 'text-slate-900'}`}>
                            {card.value}
                        </div>
                        <div className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${card.isHighlight ? 'text-[#a29bfe/70]' : 'text-slate-400'}`}>
                            {card.title}
                        </div>
                        <div className={`text-xs font-medium ${card.isHighlight ? 'text-[#a29bfe]/80' : 'text-slate-500'}`}>{card.sub}</div>
                    </motion.div>
                ))}
            </motion.div>

            {/* ─── Class-wise Distribution (Chart) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring' as const, stiffness: 300, damping: 28 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#f1f0ff] flex items-center justify-center">
                            <BarChart2 className="w-4.5 h-4.5 text-[#6c5ce7]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base leading-tight">Class-wise Distribution</h3>
                            <p className="text-xs text-slate-400 font-medium">Students per standard</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <Users className="w-3.5 h-3.5" />
                        {stats?.students?.total || 0} total
                    </div>
                </div>

                {/* Bar chart */}
                {stats?.students?.by_class?.length ? (
                    <div className="space-y-3">
                        {stats.students.by_class.map((c, idx) => {
                            const pct = Math.min(100, (Number(c.count) / total) * 100 * 4);
                            const color = colors[idx % colors.length];
                            const percentage = Math.round((Number(c.count) / total) * 100);
                            return (
                                <div key={idx} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-slate-600">
                                            {String(c.class_name || '').toLowerCase().startsWith('class') ? c.class_name : 'Class ' + c.class_name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-700">{c.count}</span>
                                            <span className="text-[10px] font-semibold text-slate-400 w-8 text-right">{percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ delay: 0.4 + idx * 0.04, duration: 0.7, ease: 'easeOut' }}
                                            className="h-full rounded-full group-hover:brightness-110 transition-all"
                                            style={{ background: `linear-gradient(90deg, ${color}bb, ${color})` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-14 flex flex-col items-center justify-center text-slate-300">
                        <Users className="w-14 h-14 mb-3 opacity-30" />
                        <p className="font-semibold text-slate-400 text-sm">No distribution data available</p>
                        <p className="text-slate-300 text-xs mt-1">Admit students to class to see distribution</p>
                    </div>
                )}
            </motion.div>

            {/* ─── Gender & Category breakdown ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-[#6c5ce7]" />
                        <h4 className="font-bold text-slate-800 text-sm">School Summary</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Present Today', value: stats?.attendance?.present || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Absent Today', value: stats?.attendance?.absent || 0, color: 'text-red-600', bg: 'bg-red-50' },
                            { label: 'Active Students', value: stats?.students?.total || 0, color: 'text-[#6c5ce7]', bg: 'bg-[#f1f0ff]' },
                            { label: 'Pending Dues', value: stats?.pending_dues_count || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map(item => (
                            <div key={item.label} className={`${item.bg} rounded-xl p-3`}>
                                <div className={`text-xl font-extrabold ${item.color}`}>{item.value}</div>
                                <div className="text-xs text-slate-500 font-semibold mt-0.5">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-gradient-to-br from-[#6c5ce7] to-[#8e44ad] rounded-2xl p-5 text-white shadow-lg shadow-[#6c5ce7]/20">
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="w-4 h-4 text-[#a29bfe/70]" />
                        <h4 className="font-bold text-[#f1f0ff] text-sm">Quick Navigate</h4>
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: 'Add New Student', href: '/students/new' },
                            { label: 'View Active Students', href: '/students' },
                            { label: 'Generate Certificates', href: '/students/certificates' },
                            { label: 'Student ID Cards', href: '/students/id-card' },
                        ].map(link => (
                            <a key={link.href} href={link.href}
                                className="flex items-center justify-between text-sm font-semibold text-[#f1f0ff] hover:text-white transition-colors group">
                                {link.label}
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#a29bfe] group-hover:text-white" />
                            </a>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
