'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { FeeCollectionSummary, FeeDue } from '@/lib/types';
import { formatINR, formatINRCompact } from '@/lib/format';
import { Landmark, TrendingUp, AlertCircle, IndianRupee, RefreshCw, Send, Bell } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassSummary {
    class_name: string;
    expected: number;
    collected: number;
    outstanding: number;
    pct: number;
}

interface PieSlice {
    label: string;
    value: number;
    color: string;
}

interface BarData {
    name: string;
    expected: number;
    collected: number;
}

interface StatCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    sub?: string;
    badge?: string;
    badgeColor?: 'emerald' | 'rose' | 'amber' | 'indigo';
    valueColor?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function getAcademicMonthIndex(): number {
    const m = new Date().getMonth(); // 0=Jan … 11=Dec
    return ((m - 3) + 12) % 12;     // Apr=0 … Mar=11
}

// ─── SVG Pie Chart ────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99;
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
}

function PieChart({ slices }: { slices: PieSlice[] }) {
    const total = slices.reduce((s, x) => s + x.value, 0);
    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                No payment data yet
            </div>
        );
    }
    const paths = slices.reduce<Array<PieSlice & { start: number; end: number }>>((acc, sl) => {
        const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
        const span = (sl.value / total) * 360;
        acc.push({ ...sl, start, end: start + span });
        return acc;
    }, []);

    return (
        <div className="flex flex-col items-center gap-5">
            <svg viewBox="0 0 100 100" className="w-36 h-36">
                {paths.map((p) => (
                    <path key={p.label} d={slicePath(50, 50, 42, p.start, p.end)} fill={p.color} />
                ))}
                <circle cx="50" cy="50" r="24" fill="white" />
            </svg>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 w-full">
                {slices.map((sl) => (
                    <div key={sl.label} className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{sl.label}</p>
                            <p className="text-xs font-semibold text-slate-900 truncate">{formatINRCompact(sl.value)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: BarData[] }) {
    const maxVal = Math.max(...data.map((d) => Math.max(d.expected, d.collected)), 1);

    return (
        <div className="flex items-end gap-0.5 h-44 w-full">
            {data.map((d) => {
                const expPct = Math.round((d.expected / maxVal) * 100);
                const colPct = Math.round((d.collected / maxVal) * 100);
                return (
                    <div key={d.name} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-3 py-2 rounded-xl text-xs whitespace-nowrap hidden group-hover:block z-10 shadow-xl pointer-events-none">
                            <p className="font-semibold mb-0.5">{d.name}</p>
                            <p className="text-neutral-400">Exp: {formatINRCompact(d.expected)}</p>
                            <p className="text-indigo-300">Col: {formatINRCompact(d.collected)}</p>
                        </div>
                        <div className="flex items-end gap-px h-36 w-full justify-center">
                            <div
                                className="w-[46%] rounded-t-sm transition-all duration-500"
                                style={{ height: `${expPct}%`, backgroundColor: '#e0e7ff' }}
                            />
                            <div
                                className="w-[46%] rounded-t-sm transition-all duration-500"
                                style={{ height: `${colPct}%`, backgroundColor: 'var(--color-brand-600, #4f46e5)' }}
                            />
                        </div>
                        <span className="text-[9px] text-slate-400">{d.name}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor, sub, badge, badgeColor = 'indigo', valueColor }: StatCardProps) {
    const badgeMap = {
        emerald: 'bg-emerald-50 text-emerald-700',
        rose: 'bg-rose-50 text-rose-700',
        amber: 'bg-amber-50 text-amber-700',
        indigo: 'bg-indigo-50 text-indigo-700',
    } as const;
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">{label}</span>
                <div className={`w-8 h-8 ${iconBg} ${iconColor} rounded-lg flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${valueColor ?? 'text-slate-900'}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            {badge && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${badgeMap[badgeColor]}`}>
                    {badge}
                </span>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeesDashboardPage() {
    const [summary, setSummary] = useState<FeeCollectionSummary | null>(null);
    const [dues, setDues] = useState<FeeDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingAll, setSendingAll] = useState(false);
    const [sendingId, setSendingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, d] = await Promise.all([
                api.getFeeCollectionSummary(),
                api.getFeeDues({ limit: '500' }),
            ]);
            setSummary(s);
            setDues(d.data ?? []);
        } catch {
            toast.error('Failed to load fee dashboard');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Derived numbers ──────────────────────────────────────────────────────
    const totalExpected = dues.reduce((s, d) => s + Number(d.total_amount), 0);
    const totalCollected = summary?.total_collected ?? 0;
    const outstanding = dues.reduce((s, d) => s + Number(d.due_amount), 0);
    const todayCollected = summary?.today_collected ?? 0;
    const collectedPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // ── Monthly bar chart ────────────────────────────────────────────────────
    const academicIdx = getAcademicMonthIndex();
    const expectedPerMonth = totalExpected > 0 ? totalExpected / 12 : 0;
    const perPastMonth = academicIdx > 0 ? (totalCollected - todayCollected) / academicIdx : 0;
    const monthlyData: BarData[] = MONTHS.map((name, i) => ({
        name,
        expected: expectedPerMonth,
        collected: i < academicIdx ? perPastMonth : i === academicIdx ? todayCollected : 0,
    }));

    // ── Payment mode pie ─────────────────────────────────────────────────────
    const cashAmt = summary?.cash_collected ?? 0;
    const onlineAmt = summary?.online_collected ?? 0;
    const chequeAmt = Math.max(0, totalCollected - cashAmt - onlineAmt);
    const rawSlices: PieSlice[] = [
        { label: 'Cash', value: cashAmt, color: 'var(--color-brand-600, #4f46e5)' },
        { label: 'Online / UPI', value: onlineAmt, color: '#10b981' },
        { label: 'Cheque / DD', value: chequeAmt, color: '#f59e0b' },
    ];
    const pieSlices = rawSlices.filter((s) => s.value > 0);

    // ── Class-wise table ─────────────────────────────────────────────────────
    const classMap = new Map<string, ClassSummary>();
    dues.forEach((d) => {
        const key = d.class_name || 'Unknown';
        const row = classMap.get(key) ?? { class_name: key, expected: 0, collected: 0, outstanding: 0, pct: 0 };
        row.expected += Number(d.total_amount);
        row.collected += Number(d.total_paid);
        row.outstanding += Number(d.due_amount);
        classMap.set(key, row);
    });
    const classSummaries: ClassSummary[] = [...classMap.values()]
        .map((r) => ({ ...r, pct: r.expected > 0 ? Math.round((r.collected / r.expected) * 100) : 0 }))
        .sort((a, b) => b.outstanding - a.outstanding);

    // ── Top defaulters ───────────────────────────────────────────────────────
    const defaulters = [...dues]
        .filter((d) => Number(d.due_amount) > 0)
        .sort((a, b) => Number(b.due_amount) - Number(a.due_amount))
        .slice(0, 10);

    // ── Reminder handlers ────────────────────────────────────────────────────
    const sendReminder = async (studentId: number) => {
        setSendingId(studentId);
        try {
            await api.sendFeeReminders([studentId]);
            toast.success('Reminder sent');
        } catch {
            toast.error('Failed to send reminder');
        }
        setSendingId(null);
    };

    const sendAllReminders = async () => {
        setSendingAll(true);
        try {
            await api.sendFeeReminders();
            toast.success('Reminders sent to all defaulters');
        } catch {
            toast.error('Failed to send reminders');
        }
        setSendingAll(false);
    };

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-72 bg-slate-100 rounded-xl" />
                    <div className="h-72 bg-slate-100 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-64 bg-slate-100 rounded-xl" />
                    <div className="h-64 bg-slate-100 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fee Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {summary?.academic_year ?? '—'} · {summary?.total_students ?? 0} students enrolled
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* ── Row 1: Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Expected"
                    value={formatINR(totalExpected)}
                    icon={<Landmark size={16} />}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-600"
                    sub={`${summary?.total_students ?? 0} students`}
                />
                <StatCard
                    label="Total Collected"
                    value={formatINR(totalCollected)}
                    icon={<TrendingUp size={16} />}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    badge={`${collectedPct}% of expected`}
                    badgeColor="emerald"
                />
                <StatCard
                    label="Outstanding Dues"
                    value={formatINR(outstanding)}
                    icon={<AlertCircle size={16} />}
                    iconBg="bg-rose-50"
                    iconColor="text-rose-600"
                    sub={`${defaulters.length} student${defaulters.length !== 1 ? 's' : ''} pending`}
                    valueColor="text-rose-600"
                />
                <StatCard
                    label="Today's Collection"
                    value={formatINR(todayCollected)}
                    icon={<IndianRupee size={16} />}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    sub="Cash + Online"
                />
            </div>

            {/* ── Row 2: Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Monthly Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Monthly Collection</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Collected vs Expected · Apr–Mar</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100" />
                                Expected
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-brand-600, #4f46e5)' }} />
                                Collected
                            </span>
                        </div>
                    </div>
                    <BarChart data={monthlyData} />
                </div>

                {/* Payment Mode Pie */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-900 text-sm">Payment Mode</h3>
                    <p className="text-xs text-slate-400 mt-0.5 mb-5">Breakdown by collection type</p>
                    <PieChart
                        slices={pieSlices.length > 0
                            ? pieSlices
                            : [{ label: 'Cash', value: 1, color: 'var(--color-brand-600, #4f46e5)' }]
                        }
                    />
                </div>
            </div>

            {/* ── Row 3: Class Table + Defaulters ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Class-wise Collection */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm">Class-wise Collection</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Sorted by outstanding (highest first)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-left">Class</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Expected</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Collected</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Outstanding</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right w-28">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {classSummaries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                                            No data available
                                        </td>
                                    </tr>
                                ) : classSummaries.map((row) => (
                                    <tr key={row.class_name} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{row.class_name}</td>
                                        <td className="px-4 py-3 text-right text-slate-600 tabular-nums text-xs">{formatINRCompact(row.expected)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-600 font-medium tabular-nums text-xs">{formatINRCompact(row.collected)}</td>
                                        <td className="px-4 py-3 text-right text-rose-600 font-medium tabular-nums text-xs">{formatINRCompact(row.outstanding)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-semibold text-slate-700">{row.pct}%</span>
                                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${row.pct}%`,
                                                            backgroundColor: 'var(--color-brand-600, #4f46e5)',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Defaulters */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Top Defaulters</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Highest pending dues</p>
                        </div>
                        <button
                            onClick={sendAllReminders}
                            disabled={sendingAll || defaulters.length === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 rounded-lg text-xs font-medium transition-colors shrink-0"
                        >
                            {sendingAll
                                ? <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                : <Bell size={12} />
                            }
                            Send All Reminders
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-left">Student</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-right">Due Amount</th>
                                    <th className="px-4 py-2.5 text-xs font-medium text-slate-500 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {defaulters.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-10 text-center text-slate-400 text-sm">
                                            No defaulters — all dues cleared!
                                        </td>
                                    </tr>
                                ) : defaulters.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 text-sm truncate max-w-[160px]">{d.name}</p>
                                            <p className="text-xs text-slate-400">{d.class_name} · #{d.admission_no}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-rose-600 tabular-nums">
                                                {formatINR(Number(d.due_amount))}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => sendReminder(d.id)}
                                                disabled={sendingId === d.id}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {sendingId === d.id
                                                    ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                                    : <Send size={11} />
                                                }
                                                Remind
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
