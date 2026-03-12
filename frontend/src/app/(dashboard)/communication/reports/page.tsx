'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { MessageLog } from '@/lib/types';

export default function DeliveryReportPage() {
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [summary, setSummary] = useState<Array<{ status: string; count: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const params: Record<string, string> = {};
            if (channel) params.channel = channel;
            if (status) params.status = status;
            const json = await api.getDeliveryReport(params);
            setLogs(json.data || []);
            setSummary(json.summary || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            setLogs([]);
        }
        setLoading(false);
    }, [channel, status]);

    useEffect(() => {
        let active = true;
        (async () => {
            if (active) setLoading(true);
            await load();
        })();
        return () => { active = false; };
    }, [load]);

    const statusConfig: Record<string, { color: string; icon: string }> = {
        pending: { color: 'bg-amber-50 text-amber-600 border-amber-100', icon: '⏳' },
        sent: { color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '📤' },
        delivered: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: '✅' },
        failed: { color: 'bg-rose-50 text-rose-600 border-rose-100', icon: '❌' },
        rejected: { color: 'bg-gray-50 text-gray-600 border-gray-100', icon: '🚫' }
    };

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Delivery Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">Tracking broadcast success rates and channel performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <select className="bg-white border-none rounded-xl text-[11px] font-bold uppercase tracking-tight text-gray-500 py-2 pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-[#6c5ce7]/20 cursor-pointer" value={channel} onChange={e => setChannel(e.target.value)}>
                        <option value="">All Channels</option>
                        <option value="sms">SMS Gateway</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email Service</option>
                    </select>
                    <select className="bg-white border-none rounded-xl text-[11px] font-bold uppercase tracking-tight text-gray-500 py-2 pl-4 pr-10 shadow-sm focus:ring-2 focus:ring-[#6c5ce7]/20 cursor-pointer" value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="sent">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="failed">Failed</option>
                        <option value="pending">In Queue</option>
                    </select>
                </div>
            </div>

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs text-rose-600">✕</span>
                {error}
            </div>}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {['pending', 'sent', 'delivered', 'failed', 'rejected'].map(stat => {
                    const data = summary.find(s => s.status === stat) || { status: stat, count: 0 };
                    const config = statusConfig[stat];
                    return (
                        <div key={stat} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{stat}</span>
                                <span className="text-lg opacity-50 grayscale group-hover:grayscale-0 transition-all">{config.icon}</span>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.count}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Total Logged</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Carrier / Channel</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Recipient Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Display Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Template Mode</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Dispatch Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Live Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                <div className="inline-block w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin"></div>
                            </td></tr>
                                : logs.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No communication logs recorded for this filter</td></tr>
                                    : logs.map(l => (
                                        <tr key={l.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${l.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        l.channel === 'sms' ? 'bg-[#f1f0ff] text-[#6c5ce7] border-[#f1f0ff]' :
                                                            'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                    {l.channel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-700">{l.recipient}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-900">{l.recipient_name || 'Individual'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-semibold text-gray-400">{l.template_name || 'Custom Broadcast'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-gray-400 uppercase">{l.sent_at ? new Date(l.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${statusConfig[l.status]?.color || 'bg-gray-100'}`}>
                                                    <span className="mr-1.5">{statusConfig[l.status]?.icon}</span>
                                                    {l.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
