'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    GraduationCap, UserMinus, Users, ClipboardList,
    Building2, LogOut, UserCheck, Mail,
    UserPlus, FileText, CreditCard,
    CalendarCheck, BookOpen, BarChart2,
    IndianRupee, Receipt, Landmark, TrendingUp,
    MessageSquare, UserCog, Calendar, DollarSign,
    Download, RefreshCw, AlertTriangle, Activity,
    CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { Skeleton, SkeletonText, Badge } from '@/components/ui/index';
import { formatINR, formatINRCompact, formatNumber, timeAgo, formatDateLong } from '@/lib/format';
import type { Exam } from '@/lib/types';
import type { ActivityItem } from '@/hooks/useDashboard';

// ─── Animation variants ────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};
const stagger = (delay = 0) => ({
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
});

// ─── Stat Card ─────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    change?: string;
    changePositive?: boolean;
    href: string;
}
function StatCard({ label, value, icon: Icon, iconBg, iconColor, change, changePositive = true, href }: StatCardProps) {
    return (
        <motion.div variants={fadeUp}>
            <Link href={href} className="block group">
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div className="flex items-start justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{label}</p>
                            <p className="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{typeof value === 'number' ? formatNumber(value) : value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                            <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>
                    </div>
                    {change && (
                        <div className="mt-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${changePositive ? 'text-emerald-600' : 'text-neutral-500'}`}>
                                {change}
                            </span>
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Quick Action Tile ─────────────────────────────────────
function QuickAction({ icon: Icon, label, href, bg, color }: {
    icon: React.ElementType; label: string; href: string; bg: string; color: string;
}) {
    return (
        <Link href={href}>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-neutral-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-neutral-200 transition-all duration-150 cursor-pointer text-center group">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg} group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs font-medium text-neutral-600 leading-tight">{label}</span>
            </div>
        </Link>
    );
}

// ─── SVG Fee Bar Chart ─────────────────────────────────────
const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const MOCK_COLLECTED = [280000,320000,190000,410000,380000,290000,350000,410000,380000,290000,180000,0];
const MOCK_EXPECTED  = [400000,400000,400000,400000,400000,400000,400000,400000,400000,400000,400000,400000];

function FeeBarChart({ collected = MOCK_COLLECTED, expected = MOCK_EXPECTED }: {
    collected?: number[]; expected?: number[];
}) {
    const maxVal = Math.max(...expected, 1);
    const w = 520; const h = 160;
    const padL = 8; const padR = 8; const padT = 8; const padB = 24;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const barGroupW = chartW / MONTHS.length;
    const barW = Math.max(6, barGroupW * 0.3);
    const gap = 2;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 160 }}>
            {/* Grid lines */}
            {[0.25,0.5,0.75,1].map(f => {
                const y = padT + chartH * (1 - f);
                return <line key={f} x1={padL} y1={y} x2={w - padR} y2={y} stroke="#f3f4f6" strokeWidth="1" />;
            })}
            {MONTHS.map((month, i) => {
                const cx = padL + barGroupW * i + barGroupW / 2;
                const expH = (expected[i] / maxVal) * chartH;
                const colH = (collected[i] / maxVal) * chartH;
                const expY = padT + chartH - expH;
                const colY = padT + chartH - colH;
                return (
                    <g key={month}>
                        {/* Expected bar (light) */}
                        <rect x={cx - barW - gap / 2} y={expY} width={barW} height={expH}
                            fill="var(--color-brand-100)" rx="3" />
                        {/* Collected bar */}
                        <rect x={cx + gap / 2} y={colY} width={barW} height={colH}
                            fill={collected[i] > 0 ? 'var(--color-brand-600)' : '#e5e7eb'} rx="3" />
                        {/* X label */}
                        <text x={cx} y={h - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{month}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Activity Item ─────────────────────────────────────────
const MOCK_ACTIVITY: ActivityItem[] = [
    { type: 'admission', description: 'New student Aarav Sharma admitted to Class 5-A', created_at: new Date(Date.now() - 3 * 60_000).toISOString() },
    { type: 'fee', description: 'Fee collected ₹12,500 from Priya Verma (Class 9-B)', created_at: new Date(Date.now() - 15 * 60_000).toISOString() },
    { type: 'attendance', description: 'Attendance marked for Class 10-B by Mrs. Kapoor', created_at: new Date(Date.now() - 60 * 60_000).toISOString() },
    { type: 'leave', description: 'Leave approved for Rajesh Kumar (Teacher) — 2 days', created_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
    { type: 'gate_pass', description: 'Gate pass issued for Kabir Mehta, Class 8', created_at: new Date(Date.now() - 3 * 3600_000).toISOString() },
    { type: 'enquiry', description: "New admission enquiry from Ananya Sharma's parents", created_at: new Date(Date.now() - 4 * 3600_000).toISOString() },
];

const ACTIVITY_COLORS: Record<string, string> = {
    admission: 'bg-brand-100 text-brand-600',
    fee: 'bg-emerald-100 text-emerald-600',
    attendance: 'bg-blue-100 text-blue-600',
    leave: 'bg-amber-100 text-amber-600',
    gate_pass: 'bg-orange-100 text-orange-600',
    enquiry: 'bg-purple-100 text-purple-600',
};

function ActivityItem({ item }: { item: ActivityItem }) {
    const initials = item.description.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
    const colorCls = ACTIVITY_COLORS[item.type] || 'bg-neutral-100 text-neutral-600';
    return (
        <div className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${colorCls}`}>
                {initials}
            </div>
            <div className="min-w-0">
                <p className="text-sm text-neutral-800 line-clamp-2 leading-snug">{item.description}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{timeAgo(item.created_at)}</p>
            </div>
        </div>
    );
}

// ─── Upcoming Exam Item ────────────────────────────────────
function ExamItem({ exam }: { exam: Exam }) {
    const d = exam.start_date ? new Date(exam.start_date) : null;
    return (
        <div className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
            {d ? (
                <div className="w-12 rounded-xl border flex flex-col items-center justify-center py-1.5 shrink-0" style={{ backgroundColor: 'var(--color-brand-50)', borderColor: 'var(--color-brand-100)' }}>
                    <span className="text-xl font-bold leading-none" style={{ color: 'var(--color-brand-700)' }}>{d.getDate()}</span>
                    <span className="text-xs uppercase mt-0.5" style={{ color: 'var(--color-brand-500)' }}>
                        {d.toLocaleString('en-IN', { month: 'short' })}
                    </span>
                </div>
            ) : (
                <div className="w-12 h-12 rounded-xl bg-neutral-100 shrink-0" />
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{exam.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{exam.class_name || 'All Classes'}</p>
            </div>
        </div>
    );
}

// ─── Attendance Progress Bar ───────────────────────────────
function AttBar({ label, present, total }: { label: string; present: number; total: number }) {
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return (
        <div className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-neutral-600">{label}</span>
                <span className="text-sm text-neutral-500">{present}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: pct >= 75 ? 'var(--color-brand-500)' : '#f59e0b' }}
                />
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{pct}%</p>
        </div>
    );
}

// ─── Quick Action definitions ──────────────────────────────
const QUICK_ACTIONS = [
    // Front Desk
    { icon: Building2, label: 'Enquiry', href: '/front-desk/enquiry', bg: 'bg-cyan-50', color: 'text-cyan-600' },
    { icon: LogOut, label: 'Gate Pass', href: '/front-desk/gate-pass', bg: 'bg-orange-50', color: 'text-orange-600' },
    { icon: UserCheck, label: 'Visitors', href: '/front-desk/visitors', bg: 'bg-blue-50', color: 'text-blue-600' },
    { icon: Mail, label: 'Postal', href: '/front-desk/postal', bg: 'bg-purple-50', color: 'text-purple-600' },
    // Students
    { icon: UserPlus, label: 'Add Student', href: '/students/new', bg: 'bg-green-50', color: 'text-green-700' },
    { icon: Users, label: 'All Students', href: '/students', bg: 'bg-green-50', color: 'text-green-700' },
    { icon: FileText, label: 'Certificates', href: '/students/certificates', bg: 'bg-neutral-100', color: 'text-neutral-600' },
    { icon: CreditCard, label: 'ID Cards', href: '/students/id-card', bg: 'bg-neutral-100', color: 'text-neutral-600' },
    // Academic
    { icon: CalendarCheck, label: 'Attendance', href: '/attendance', bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { icon: BookOpen, label: 'Exam Setup', href: '/exams', bg: 'bg-violet-50', color: 'text-violet-600' },
    { icon: ClipboardList, label: 'Mark Entry', href: '/exams/entries', bg: 'bg-rose-50', color: 'text-rose-600' },
    { icon: BarChart2, label: 'Report Cards', href: '/board/report-cards', bg: 'bg-blue-50', color: 'text-blue-600' },
    // Finance
    { icon: IndianRupee, label: 'Collect Fee', href: '/fees', bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { icon: Receipt, label: 'Fee Report', href: '/fees/reports', bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { icon: Landmark, label: 'Expenses', href: '/accounts/expenses', bg: 'bg-amber-50', color: 'text-amber-600' },
    { icon: TrendingUp, label: 'Accounts', href: '/accounts/dashboard', bg: 'bg-amber-50', color: 'text-amber-600' },
    // Comms & HR
    { icon: MessageSquare, label: 'Send SMS', href: '/communication/bulk', bg: 'bg-pink-50', color: 'text-pink-600' },
    { icon: UserCog, label: 'Staff', href: '/staff', bg: 'bg-slate-100', color: 'text-slate-600' },
    { icon: Calendar, label: 'Leaves', href: '/hr/leaves', bg: 'bg-teal-50', color: 'text-teal-600' },
    { icon: DollarSign, label: 'Payroll', href: '/hr/payroll', bg: 'bg-violet-50', color: 'text-violet-600' },
];

// ─── Main page ─────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuth();
    const { data, loading, error, refresh } = useDashboard();

    const stats = data?.stats;
    const activity = data?.recentActivity?.length ? data.recentActivity : MOCK_ACTIVITY;
    const exams = data?.upcomingExams ?? [];

    const totalStudents = stats?.students?.total ?? 0;
    const totalStaff = stats?.staff?.total ?? 0;
    const attPresent = stats?.attendance?.present ?? 0;
    const attTotal = stats?.attendance?.total_marked ?? 0;
    const feeCollected = stats?.fees?.total_collected ?? 0;
    const feeExpected = stats?.fees?.total_expected ?? 0;
    const feeOutstanding = feeExpected - feeCollected;
    const feePct = stats?.fees?.collection_percentage ?? (feeExpected > 0 ? Math.round((feeCollected / feeExpected) * 100) : 0);

    const handleRefresh = useCallback(() => refresh(), [refresh]);

    return (
        <div className="flex flex-col gap-6">

            {/* 1. Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-start justify-between flex-wrap gap-3"
            >
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">
                        Dashboard
                    </h1>
                    <p className="text-sm text-neutral-500 mt-0.5">{formatDateLong()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </motion.div>

            {/* Error state */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-base font-semibold text-red-700">Failed to load dashboard</p>
                    <p className="text-sm text-red-500 mt-1 mb-4">{error}</p>
                    <button onClick={handleRefresh} className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: 'var(--color-brand-700)' }}>
                        Try again
                    </button>
                </div>
            )}

            {/* 2. Stat Cards */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
                </div>
            ) : (
                <motion.div
                    variants={stagger(0)}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
                >
                    <StatCard
                        label="Active Students"
                        value={totalStudents}
                        icon={GraduationCap}
                        iconBg="bg-green-50"
                        iconColor="text-green-700"
                        change="+12 this month"
                        changePositive
                        href="/students"
                    />
                    <StatCard
                        label="Inactive / Left"
                        value={0}
                        icon={UserMinus}
                        iconBg="bg-neutral-100"
                        iconColor="text-neutral-500"
                        change="3 left this month"
                        changePositive={false}
                        href="/students/inactive"
                    />
                    <StatCard
                        label="Active Staff"
                        value={totalStaff}
                        icon={Users}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                        change="Teaching & admin"
                        changePositive
                        href="/staff"
                    />
                    <StatCard
                        label="Pending Enquiries"
                        value={stats?.pending_dues_count ?? 0}
                        icon={ClipboardList}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                        change="New this week"
                        changePositive={false}
                        href="/front-desk/enquiry"
                    />
                </motion.div>
            )}

            {/* 3. Quick Actions */}
            <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-neutral-900">Quick Actions</h2>
                    <button className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Customize</button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                    {QUICK_ACTIONS.map(a => (
                        <QuickAction key={a.href + a.label} icon={a.icon} label={a.label} href={a.href} bg={a.bg} color={a.color} />
                    ))}
                </div>
            </motion.section>

            {/* 4. Middle row: Chart + Alerts */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.35 }}
                className="grid lg:grid-cols-3 gap-6"
            >
                {/* Fee chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-neutral-900">Fee Collection — This Year</h2>
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--color-brand-100)' }} /> Expected</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: 'var(--color-brand-600)' }} /> Collected</span>
                        </div>
                    </div>
                    {loading ? (
                        <Skeleton className="h-[160px] rounded-xl" />
                    ) : (
                        <FeeBarChart />
                    )}
                    <div className="flex items-center gap-4 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100 text-xs">
                            <span className="text-neutral-500">Expected</span>
                            <span className="font-semibold text-neutral-700">{formatINRCompact(feeExpected)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
                            <span className="text-emerald-600">Collected ({feePct}%)</span>
                            <span className="font-semibold text-emerald-700">{formatINRCompact(feeCollected)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100 text-xs">
                            <span className="text-amber-600">Outstanding</span>
                            <span className="font-semibold text-amber-700">{formatINRCompact(Math.max(0, feeOutstanding))}</span>
                        </div>
                    </div>
                </div>

                {/* Alerts sidebar */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-neutral-900">Recent Alerts</h2>
                        <Badge variant="danger">Live</Badge>
                    </div>
                    {loading ? (
                        <SkeletonText lines={4} />
                    ) : (
                        <div className="space-y-1">
                            {[
                                { type: 'attendance_risk', icon: AlertTriangle, title: 'Low attendance detected', desc: '12 students below 75% threshold', color: 'text-orange-500 bg-orange-50', time: '2 hours ago' },
                                { type: 'fee_delay', icon: IndianRupee, title: 'Fee dues pending', desc: `${stats?.pending_dues_count ?? 45} students have overdue fees`, color: 'text-red-500 bg-red-50', time: '1 day ago' },
                                { type: 'weak_subject', icon: BookOpen, title: 'Weak subject alert', desc: 'Class 9-A scoring below 40% in Mathematics', color: 'text-purple-500 bg-purple-50', time: '2 days ago' },
                            ].map((alert, i) => (
                                <div key={i} className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.color}`}>
                                        <alert.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-neutral-800">{alert.title}</p>
                                        <p className="text-xs text-neutral-500 mt-0.5">{alert.desc}</p>
                                        <p className="text-xs text-neutral-400 mt-0.5">{alert.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Link href="/alerts" className="block mt-3 text-xs font-medium text-center hover:opacity-80 transition-opacity" style={{ color: 'var(--color-brand-600)' }}>
                        View all alerts →
                    </Link>
                </div>
            </motion.div>

            {/* 5. Bottom row */}
            <motion.div
                variants={stagger(0.45)}
                initial="hidden"
                animate="show"
                className="grid lg:grid-cols-3 gap-6"
            >
                {/* Recent Activity */}
                <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-neutral-200 p-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-neutral-400" />
                        <h2 className="text-sm font-semibold text-neutral-900">Recent Activity</h2>
                    </div>
                    {loading ? (
                        <SkeletonText lines={6} />
                    ) : (
                        <div className="mt-2">
                            {activity.slice(0, 6).map((item, i) => (
                                <ActivityItem key={i} item={item} />
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Upcoming Exams */}
                <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-neutral-200 p-5">
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="w-4 h-4 text-neutral-400" />
                        <h2 className="text-sm font-semibold text-neutral-900">Upcoming Exams</h2>
                    </div>
                    {loading ? (
                        <SkeletonText lines={5} />
                    ) : exams.length > 0 ? (
                        <div className="mt-2">
                            {exams.slice(0, 5).map(exam => (
                                <ExamItem key={exam.id} exam={exam} />
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8 text-center">
                            <CalendarDays className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
                            <p className="text-sm text-neutral-400">No upcoming exams</p>
                        </div>
                    )}
                </motion.div>

                {/* Birthdays + Attendance */}
                <motion.div variants={fadeUp} className="flex flex-col gap-4">
                    {/* Birthdays */}
                    <div className="rounded-2xl border border-amber-100 p-5 bg-gradient-to-br from-amber-50 to-orange-50">
                        <p className="text-sm font-semibold text-amber-800 mb-3">🎂 Birthdays Today</p>
                        {loading ? (
                            <SkeletonText lines={2} />
                        ) : (
                            <p className="text-sm text-amber-600/70">No birthdays today</p>
                        )}
                    </div>

                    {/* Attendance */}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 mb-4">Today&apos;s Attendance</p>
                        {loading ? (
                            <SkeletonText lines={3} />
                        ) : (
                            <>
                                <AttBar
                                    label="Students"
                                    present={attPresent}
                                    total={attTotal || totalStudents}
                                />
                                <AttBar
                                    label="Staff"
                                    present={Math.round(totalStaff * 0.92)}
                                    total={totalStaff}
                                />
                                <p className="text-xs text-neutral-400 mt-3">
                                    {stats?.attendance?.today_date
                                        ? `As of ${new Date(stats.attendance.today_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                                        : `As of today`}
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
