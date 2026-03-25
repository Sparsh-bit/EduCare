'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    CalendarCheck, PenLine, CalendarOff, BellRing,
    Clock, CheckCircle2, AlertCircle, BookOpen,
    ChevronRight, TrendingUp,
} from 'lucide-react';

interface LeaveBalance { leave_type_name: string; code: string; allocated: number; used: number; remaining: number; }
interface Notice { id: number; title: string; content: string; created_at: string; }

const QUICK_LINKS = [
    { href: '/staff/attendance', label: 'Mark Attendance', icon: CalendarCheck, color: 'bg-[#f1f0ff] text-[#6c5ce7] border-[#e5e0ff]' },
    { href: '/staff/marks', label: 'Enter Marks', icon: PenLine, color: 'bg-violet-50 text-violet-600 border-violet-100' },
    { href: '/staff/leaves', label: 'Apply for Leave', icon: CalendarOff, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { href: '/staff/notices', label: 'View Notices', icon: BellRing, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

const card = 'bg-white rounded-2xl border border-slate-100 p-5 shadow-sm';

export default function StaffDashboardPage() {
    const { user } = useAuth();
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(true);
    const [loadingNotices, setLoadingNotices] = useState(true);

    useEffect(() => {
        if (!user) return;
        api.getMyLeaveBalances()
            .then(data => setLeaveBalances(Array.isArray(data) ? (data as LeaveBalance[]) : []))
            .catch(() => setLeaveBalances([]))
            .finally(() => setLoadingLeaves(false));

        api.getNotices()
            .then(data => {
                const list = Array.isArray(data) ? data : (data as { data?: Notice[] }).data || [];
                setNotices(list.slice(0, 5));
            })
            .catch(() => setNotices([]))
            .finally(() => setLoadingNotices(false));
    }, []);

    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">{todayStr}</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#f1f0ff] rounded-xl border border-[#e5e0ff]">
                        <Clock size={16} className="text-[#6c5ce7]" />
                        <span className="text-sm font-bold text-[#6c5ce7] tracking-wide uppercase">{user?.role}</span>
                    </div>
                </div>
            </motion.div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_LINKS.map(({ href, label, icon: Icon, color }, i) => (
                    <motion.div key={href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <Link href={href} className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border text-center transition-all hover:-translate-y-0.5 hover:shadow-sm ${color}`}>
                            <Icon size={20} />
                            <span className="text-xs font-semibold leading-tight">{label}</span>
                        </Link>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Leave balances */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#f1f0ff] rounded-xl flex items-center justify-center">
                                <CalendarOff size={15} className="text-[#6c5ce7]" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">Leave Balance</h2>
                        </div>
                        <Link href="/staff/leaves" className="text-xs text-[#6c5ce7] font-semibold hover:underline flex items-center gap-1">
                            Apply <ChevronRight size={12} />
                        </Link>
                    </div>
                    {loadingLeaves ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : leaveBalances.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No leave data available</p>
                    ) : (
                        <div className="space-y-2.5">
                            {leaveBalances.map(lb => (
                                <div key={lb.leave_type_name} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <p className="text-xs font-bold text-slate-800 truncate capitalize">{lb.leave_type_name}</p>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[#6c5ce7]/10 text-[#6c5ce7] uppercase tracking-wider">{lb.code}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[#6c5ce7] transition-all"
                                                style={{ width: `${lb.allocated > 0 ? Math.round((lb.remaining / lb.allocated) * 100) : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-base font-black text-[#6c5ce7]">{lb.remaining}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">of {lb.allocated}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Recent notices */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={card}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <BellRing size={15} className="text-emerald-600" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-900">Recent Notices</h2>
                        </div>
                        <Link href="/staff/notices" className="text-xs text-[#6c5ce7] font-semibold hover:underline flex items-center gap-1">
                            View all <ChevronRight size={12} />
                        </Link>
                    </div>
                    {loadingNotices ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : notices.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No recent notices</p>
                    ) : (
                        <div className="space-y-2">
                            {notices.map(n => (
                                <div key={n.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-emerald-50/60 transition-colors">
                                    <BellRing size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 leading-snug truncate">{n.title}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { icon: CalendarCheck, label: 'Attendance', desc: 'Mark class attendance for today', href: '/staff/attendance', color: 'sky' },
                    { icon: BookOpen, label: 'Exam Marks', desc: 'Enter marks for assigned subjects', href: '/staff/marks', color: 'violet' },
                    { icon: TrendingUp, label: 'Performance', desc: 'View class results and analytics', href: '/staff/marks', color: 'emerald' },
                ].map(({ icon: Icon, label, desc, href, color }, i) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                        <Link href={href} className={`flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-${color}-200 hover:bg-${color}-50/30 transition-all group shadow-sm`}>
                            <div className={`w-9 h-9 bg-${color}-50 rounded-xl flex items-center justify-center shrink-0`}>
                                <Icon size={16} className={`text-${color}-600`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                            </div>
                            <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-500 mt-1 shrink-0 transition-colors" />
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    Staff portal — read-only access to student data
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <AlertCircle size={13} className="text-amber-500" />
                    Contact admin for any data corrections
                </div>
            </div>
        </div>
    );
}
