'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Leave } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, Search, X } from 'lucide-react';

type TabId = 'pending' | 'all' | 'balances';

const LEAVE_STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
};

const TABS: { id: TabId; label: string }[] = [
    { id: 'pending', label: 'Pending Requests' },
    { id: 'all', label: 'All Requests' },
    { id: 'balances', label: 'Leave Balances' },
];

function daysBetween(from: string, to: string) {
    const d1 = new Date(from);
    const d2 = new Date(to);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

// ─── Reject Modal ────────────────────────────────────────────────────────────

function RejectModal({
    leaveId,
    onClose,
    onReject,
}: {
    leaveId: number;
    onClose: () => void;
    onReject: (id: number, reason: string) => Promise<void>;
}) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;
        setSaving(true);
        await onReject(leaveId, reason);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Reject Leave Request</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Reason for rejection *</label>
                        <textarea
                            required
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Enter rejection reason…"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:border-[#a29bfe]"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !reason.trim()}
                            className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Rejecting…' : 'Reject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Pending Requests Tab ─────────────────────────────────────────────────────

function PendingTab({ onRefresh }: { onRefresh: () => void }) {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getLeaves({ status: 'pending' });
            setLeaves((data as Leave[]) || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const approve = async (id: number) => {
        try {
            await api.updateLeave(id, 'approved');
            toast.success('Leave approved');
            load();
            onRefresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to approve');
        }
    };

    const reject = async (id: number, reason: string) => {
        try {
            await api.updateLeave(id, 'rejected', reason);
            toast.success('Leave rejected');
            load();
            onRefresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to reject');
        }
    };

    const approveAll = async () => {
        if (!leaves.length) return;
        if (!confirm(`Approve all ${leaves.length} pending leave requests?`)) return;
        try {
            await Promise.all(leaves.map(l => api.updateLeave(l.id, 'approved')));
            toast.success('All leave requests approved');
            load();
            onRefresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to approve all');
        }
    };

    return (
        <div className="space-y-4">
            {leaves.length > 1 && (
                <div className="flex justify-end">
                    <button
                        onClick={approveAll}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                        <CheckCircle2 size={15} />
                        Approve All ({leaves.length})
                    </button>
                </div>
            )}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Employee</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Type</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Dates</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Days</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Reason</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Applied On</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 w-28">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : leaves.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                                    No pending leave requests
                                </td>
                            </tr>
                        ) : leaves.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-900">{l.staff_name || `#${l.staff_id}`}</td>
                                <td className="px-5 py-3">
                                    <span className="px-2 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] rounded text-xs font-medium">{l.leave_type}</span>
                                </td>
                                <td className="px-5 py-3 text-slate-600 text-xs">
                                    {new Date(l.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    {' – '}
                                    {new Date(l.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3 text-center font-semibold text-slate-700">
                                    {daysBetween(l.from_date, l.to_date)}
                                </td>
                                <td className="px-5 py-3 text-slate-500 max-w-[180px] truncate">{l.reason || '—'}</td>
                                <td className="px-5 py-3 text-slate-400 text-xs">
                                    {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => approve(l.id)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                        >
                                            <CheckCircle2 size={12} />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setRejectingId(l.id)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                                        >
                                            <XCircle size={12} />
                                            Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {rejectingId !== null && (
                <RejectModal
                    leaveId={rejectingId}
                    onClose={() => setRejectingId(null)}
                    onReject={reject}
                />
            )}
        </div>
    );
}

// ─── All Requests Tab ─────────────────────────────────────────────────────────

function AllRequestsTab() {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getLeaves();
            setLeaves((data as Leave[]) || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const leaveTypes = [...new Set(leaves.map(l => l.leave_type))];

    const filtered = leaves.filter(l => {
        const matchSearch = !search || (l.staff_name ?? '').toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || l.leave_type === filterType;
        const matchStatus = !filterStatus || l.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const selectCls = 'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search employee…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] w-44 transition-colors"
                    />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls}>
                    <option value="">All Types</option>
                    {leaveTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Employee</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Type</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Dates</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Days</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Reason</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Applied</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                                    No leave requests found
                                </td>
                            </tr>
                        ) : filtered.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-medium text-slate-900">{l.staff_name || `#${l.staff_id}`}</td>
                                <td className="px-5 py-3">
                                    <span className="px-2 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] rounded text-xs font-medium">{l.leave_type}</span>
                                </td>
                                <td className="px-5 py-3 text-slate-600 text-xs">
                                    {new Date(l.from_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    {' – '}
                                    {new Date(l.to_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3 text-center font-semibold text-slate-700">
                                    {daysBetween(l.from_date, l.to_date)}
                                </td>
                                <td className="px-5 py-3 text-slate-500 max-w-[160px] truncate">{l.reason || '—'}</td>
                                <td className="px-5 py-3 text-slate-400 text-xs">
                                    {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${LEAVE_STATUS_BADGE[l.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {l.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Leave Balances Tab ───────────────────────────────────────────────────────

interface StaffBalanceRow {
    staff_id: number; staff_name: string; designation: string; department: string;
    balances: Array<{ leave_type_name: string; code: string; allocated: number; used: number; remaining: number }>;
}

function LeaveBalancesTab() {
    const [rows, setRows] = useState<StaffBalanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        api.getAllLeaveBalances()
            .then(data => setRows((data as StaffBalanceRow[]) || []))
            .catch(() => reportApiError)
            .finally(() => setLoading(false));
    }, []);

    const departments = [...new Set(rows.map(r => r.department).filter(Boolean))];

    // Collect all unique leave type codes across all staff
    const allCodes = [...new Set(rows.flatMap(r => r.balances.map(b => b.code)).filter(Boolean))];

    const filtered = rows.filter(r => {
        const q = search.toLowerCase();
        return (!search || r.staff_name.toLowerCase().includes(q)) && (!filterDept || r.department === filterDept);
    });

    const getBalance = (row: StaffBalanceRow, code: string) =>
        row.balances.find(b => b.code === code);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search employee…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] w-44 transition-colors"
                    />
                </div>
                {departments.length > 0 && (
                    <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors">
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d!}>{d}</option>)}
                    </select>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Employee</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Designation</th>
                            {allCodes.map(code => (
                                <th key={code} className="px-4 py-3 text-xs font-medium text-slate-500 text-center whitespace-nowrap">{code} <span className="text-slate-400 font-normal">(used/alloc)</span></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={3 + allCodes.length} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={3 + allCodes.length} className="px-5 py-12 text-center text-slate-400 text-sm">
                                    {rows.length === 0 ? 'No leave balances configured yet' : 'No staff found'}
                                </td>
                            </tr>
                        ) : filtered.map(row => (
                            <tr key={row.staff_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center font-bold text-sm shrink-0">
                                            {row.staff_name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-slate-900">{row.staff_name}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{row.designation || '—'}</td>
                                {allCodes.map(code => {
                                    const bal = getBalance(row, code);
                                    if (!bal) return <td key={code} className="px-4 py-3 text-center text-slate-300">—</td>;
                                    return (
                                        <td key={code} className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={`text-sm font-bold ${bal.remaining < 3 ? 'text-rose-600' : 'text-slate-700'}`}>
                                                    {bal.used}/{bal.allocated}
                                                </span>
                                                <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#6c5ce7] rounded-full"
                                                        style={{ width: `${bal.allocated > 0 ? Math.round((bal.remaining / bal.allocated) * 100) : 0}%` }} />
                                                </div>
                                                <span className="text-[10px] text-slate-400">{bal.remaining} left</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HrLeavesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('pending');
    const [pendingCount, setPendingCount] = useState(0);

    const refreshPendingCount = useCallback(async () => {
        try {
            const data = await api.getLeaves({ status: 'pending' });
            setPendingCount(((data as Leave[]) || []).length);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

    return (
        <div className="space-y-6 pb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage staff leave requests and balances</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'border-[#6c5ce7] text-[#6c5ce7]'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label}
                        {tab.id === 'pending' && pendingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'pending' && <PendingTab onRefresh={refreshPendingCount} />}
            {activeTab === 'all' && <AllRequestsTab />}
            {activeTab === 'balances' && <LeaveBalancesTab />}
        </div>
    );
}
