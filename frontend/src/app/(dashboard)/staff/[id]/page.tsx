'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';
import type { StaffMember, Leave } from '@/lib/types';
import {
    ArrowLeft, Mail, Phone, Briefcase, Building2,
    CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type TabId = 'overview' | 'leave';

const LEAVE_BALANCE_CONFIG: Record<string, { label: string; total: number; color: string }> = {
    CL: { label: 'Casual Leave', total: 12, color: '#6c5ce7' },
    SL: { label: 'Sick Leave', total: 10, color: '#00b894' },
    EL: { label: 'Earned Leave', total: 15, color: '#fdcb6e' },
};

const LEAVE_STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
};

function balanceColor(used: number, total: number) {
    const pct = total > 0 ? ((total - used) / total) * 100 : 100;
    if (pct > 50) return { bar: 'bg-emerald-400', text: 'text-emerald-700' };
    if (pct > 25) return { bar: 'bg-amber-400', text: 'text-amber-700' };
    return { bar: 'bg-rose-400', text: 'text-rose-600' };
}

export default function StaffProfilePage() {
    const params = useParams();
    const router = useRouter();
    const staffId = parseInt(params.id as string);

    const [staff, setStaff] = useState<StaffMember | null>(null);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [balances, setBalances] = useState<Array<{ leave_type: string; total_days: number; used_days: number; balance_days: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [s, l, b] = await Promise.all([
                    api.getStaff(staffId),
                    api.getLeaves({ staff_id: staffId }),
                    api.getLeaveBalances(staffId),
                ]);
                setStaff(s);
                setLeaves((l as Leave[]) || []);
                setBalances((b as any) || []);
            } catch (err) {
                reportApiError(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [staffId]);

    const leaveAction = async (id: number, status: 'approved' | 'rejected') => {
        try {
            await api.updateLeave(id, status);
            toast.success(`Leave request ${status}`);
            const updated = await api.getLeaves({ staff_id: staffId });
            setLeaves((updated as Leave[]) || []);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update leave');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="py-20 text-center">
                <p className="text-slate-500">Staff member not found.</p>
                <button onClick={() => router.back()} className="mt-3 text-sm text-[#6c5ce7] hover:underline">Go back</button>
            </div>
        );
    }

    const TABS: { id: TabId; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'leave', label: `Leave (${leaves.length})` },
    ];

    return (
        <div className="space-y-6 pb-8">
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
                <ArrowLeft size={15} />
                Back to Staff
            </button>

            {/* Header card */}
            <div className="bg-gradient-to-r from-[#2d3a2e] to-[#3d4f3e] rounded-2xl p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl font-bold shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{staff.name}</h1>
                        <p className="text-white/70 mt-0.5">{staff.designation || 'Staff Member'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {staff.employee_id && (
                                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs font-mono">
                                    {staff.employee_id}
                                </span>
                            )}
                            {staff.department && (
                                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs">
                                    {staff.department}
                                </span>
                            )}
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                                staff.status === 'active' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                            }`}>
                                {staff.status || 'Active'}
                            </span>
                            {staff.is_teacher && (
                                <span className="px-2.5 py-1 bg-[#a29bfe]/20 text-[#a29bfe] rounded-lg text-xs">
                                    Teacher
                                </span>
                            )}
                        </div>
                    </div>
                    {staff.salary && (
                        <div className="text-right">
                            <p className="text-white/50 text-xs uppercase tracking-wide">Monthly Salary</p>
                            <p className="text-2xl font-bold mt-1">₹{Number(staff.salary).toLocaleString('en-IN')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'border-[#6c5ce7] text-[#6c5ce7]'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { icon: Mail, label: 'Email', value: staff.email || '—' },
                        { icon: Phone, label: 'Phone', value: staff.phone || '—' },
                        { icon: Briefcase, label: 'Designation', value: staff.designation || '—' },
                        { icon: Building2, label: 'Department', value: staff.department || '—' },
                    ].map(item => (
                        <div key={item.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#f1f0ff] flex items-center justify-center shrink-0">
                                <item.icon size={18} className="text-[#6c5ce7]" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">{item.label}</p>
                                <p className="font-medium text-slate-900 mt-0.5 text-sm">{item.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Leave Tab */}
            {activeTab === 'leave' && (
                <div className="space-y-5">
                    {/* Balance cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {balances.length > 0 ? balances.map(b => {
                            const cfg = LEAVE_BALANCE_CONFIG[b.leave_type] ?? {
                                label: b.leave_type,
                                total: b.total_days,
                                color: '#6c5ce7',
                            };
                            const colors = balanceColor(b.used_days, b.total_days);
                            const pct = b.total_days > 0 ? (b.used_days / b.total_days) * 100 : 0;
                            return (
                                <div key={b.leave_type} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{b.leave_type}</span>
                                        <span className={`text-xs font-semibold ${colors.text}`}>{b.balance_days} left</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">{cfg.label}</p>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-2 rounded-full transition-all ${colors.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-xs text-slate-400">{b.used_days} used</span>
                                        <span className="text-xs text-slate-400">{b.total_days} total</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            // Fallback: show default leave types
                            Object.entries(LEAVE_BALANCE_CONFIG).map(([type, cfg]) => (
                                <div key={type} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{type}</span>
                                        <span className="text-xs font-semibold text-emerald-700">{cfg.total} left</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">{cfg.label}</p>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-2 bg-emerald-400 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-xs text-slate-400">0 used</span>
                                        <span className="text-xs text-slate-400">{cfg.total} total</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Leave history */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Leave History</h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Type</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">From</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">To</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Reason</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500 w-28" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leaves.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                                            No leave requests found
                                        </td>
                                    </tr>
                                ) : leaves.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <span className="px-2 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] rounded text-xs font-medium">
                                                {l.leave_type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">
                                            {new Date(l.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">
                                            {new Date(l.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate">
                                            {l.reason || '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${LEAVE_STATUS_BADGE[l.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {l.status === 'pending' && (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => leaveAction(l.id, 'approved')}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => leaveAction(l.id, 'rejected')}
                                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
