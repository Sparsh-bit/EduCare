'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MessageLog } from '@/lib/types';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    sent: 'bg-blue-50 text-blue-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-rose-50 text-rose-600',
    rejected: 'bg-slate-100 text-slate-600',
};

const CHANNEL_BADGE: Record<string, string> = {
    sms: 'bg-[#f1f0ff] text-[#6c5ce7]',
    whatsapp: 'bg-emerald-50 text-emerald-600',
    email: 'bg-amber-50 text-amber-600',
};

export default function DeliveryReportPage() {
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [summary, setSummary] = useState<Array<{ status: string; count: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('');
    const [status, setStatus] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (channel) params.channel = channel;
            if (status) params.status = status;
            const json = await api.getDeliveryReport(params);
            setLogs(json.data || []);
            setSummary(json.summary || []);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load delivery report');
            setLogs([]);
        }
        setLoading(false);
    }, [channel, status]);

    useEffect(() => { load(); }, [load]);

    const statuses = ['pending', 'sent', 'delivered', 'failed', 'rejected'];

    const selectCls = 'px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Message Delivery Report</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track SMS, WhatsApp, and email delivery status</p>
                </div>
                <div className="flex gap-2">
                    <select value={channel} onChange={e => setChannel(e.target.value)} className={selectCls}>
                        <option value="">All Channels</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                        <option value="">All Statuses</option>
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {statuses.map(stat => {
                    const data = summary.find(s => s.status === stat) || { status: stat, count: 0 };
                    return (
                        <div key={stat} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                            <p className="text-xs font-medium text-slate-500 capitalize">{stat}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{data.count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Channel</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Recipient</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Template</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Sent At</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No messages found for this filter</td></tr>
                        ) : logs.map(l => (
                            <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${CHANNEL_BADGE[l.channel] || 'bg-slate-100 text-slate-600'}`}>
                                        {l.channel}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-slate-700 font-mono text-xs">{l.recipient}</td>
                                <td className="px-5 py-3 font-medium text-slate-900">{l.recipient_name || '—'}</td>
                                <td className="px-5 py-3 text-slate-400 text-xs">{l.template_name || 'Custom message'}</td>
                                <td className="px-5 py-3 text-slate-400 text-xs">
                                    {l.sent_at ? new Date(l.sent_at).toLocaleString('en-IN') : '—'}
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[l.status] || 'bg-slate-100 text-slate-600'}`}>
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
