/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function FeesDashboardPage() {
    const [stats, setStats] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        try {
            const data = await api.getFeeCollectionSummary();
            setStats(data as unknown as Record<string, any>);
        } catch {
            toast.error('Failed to load collections summary');
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadStats();
        })();
    }, []);

    const collectionRate = (stats?.total_expected as number) > 0
        ? Math.round(((stats!.total_collected as number) / (stats!.total_expected as number)) * 100)
        : 0;

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">📊</span>
                        Fees Analytics
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Real-time revenue monitoring and collection tracking</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadStats} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#6c5ce7] hover:border-[#f1f0ff] transition-all shadow-sm">
                        🔄
                    </button>
                    <button className="px-6 py-3 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold hover:bg-[#5b4bd5] transition-all shadow-xl shadow-[#6c5ce7]/15">
                        Download Report
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {([
                    { label: 'Total Expected', val: (stats?.total_expected as number) || 0, color: 'indigo', icon: '💰' },
                    { label: 'Collected', val: (stats?.total_collected as number) || 0, color: 'emerald', icon: '📈' },
                    { label: 'Outstanding', val: (stats?.pending_amount as number) || 0, color: 'rose', icon: '📉' },
                    { label: 'Collection Rate', val: collectionRate, color: 'amber', icon: '🎯', isRate: true }
                ] as Array<{ label: string; val: number; color: string; icon: string; isRate?: boolean }>).map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform`} />
                        <div className="relative z-10 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className={`w-10 h-10 rounded-xl bg-${item.color}-50 flex items-center justify-center text-lg`}>{item.icon}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest text-${item.color}-600 bg-${item.color}-50 px-2 py-0.5 rounded-lg`}>
                                    {item.label}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-gray-900 tracking-tight">
                                {!item.isRate && '₹'}{item.isRate ? `${item.val}%` : item.val.toLocaleString('en-IN')}
                            </p>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                <div className={`h-full bg-${item.color}-500 rounded-full transition-all duration-1000`} style={{ width: item.isRate ? `${item.val}%` : `${(item.val / ((stats?.total_expected as number) || 1)) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts / Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Collections */}
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="font-extrabold text-gray-900 tracking-tight">Recent Transactions</h3>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">Live Feed • Last 5 entries</p>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-[#6c5ce7] hover:text-[#6c5ce7]">View All →</button>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Student</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Receipt</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={4} className="px-8 py-6 h-16 animate-pulse bg-gray-50/10" /></tr>)
                                ) : !(stats?.recent_payments as unknown[])?.length ? (
                                    <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">No transactions recorded yet</td></tr>
                                ) : (stats!.recent_payments as Array<Record<string, any>>).map((p) => (
                                    <tr key={String(p.id)} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center font-bold text-xs">
                                                    {(p.student_name as string)?.charAt(0)}
                                                </div>
                                                <p className="font-bold text-gray-900 text-sm group-hover:text-[#6c5ce7] transition-colors">{String(p.student_name)}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[11px] font-black text-gray-400 tracking-tighter bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 group-hover:border-[#f1f0ff] group-hover:text-[#a29bfe] transition-all">
                                                {String(p.receipt_no)}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                                                ₹{((p.amount_paid as number) || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{new Date(String(p.payment_date)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Collection Breakdown Card */}
                <div className="bg-gradient-to-br from-[#5b4bd5] to-[#3d2e9e] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-between min-h-[500px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#f1f0ff]0/10 rounded-full blur-2xl -ml-24 -mb-24" />

                    <div className="w-full text-center relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-60">Status Overview</h3>
                        <p className="text-xs font-bold mt-2 opacity-40">Cumulative Annual Progress</p>
                    </div>

                    <div className="relative flex items-center justify-center w-64 h-64 z-10 shrink-0">
                        {/* Circular Progress SVG */}
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={`${collectionRate * 2.82} 282`} strokeLinecap="round" className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black">{collectionRate}%</span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-1">Achieved</span>
                        </div>
                    </div>

                    <div className="w-full space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-[24px] border border-white/5">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">In Bank</p>
                                <p className="text-lg font-black">₹{(((stats?.total_collected as number) || 0) / 100000).toFixed(1)}L</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-[24px] border border-white/5">
                                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Deficit</p>
                                <p className="text-lg font-black">₹{(((stats?.pending_amount as number) || 0) / 100000).toFixed(1)}L</p>
                            </div>
                        </div>
                        <button className="w-full py-4 bg-white text-[#6c5ce7] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl">
                            Run Collection Drive
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
