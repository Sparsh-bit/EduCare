/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Class } from '@/lib/types';
import { Printer, RefreshCw } from 'lucide-react';

export default function FeesReportsPage() {
    const [dues, setDues] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<Class[]>([]);
    const [filterClass, setFilterClass] = useState('');

    const loadDues = async () => {
        setLoading(true);
        try {
            const data = await api.getFeeDues(filterClass ? { class_id: filterClass } : {});
            setDues((data.data as unknown as Record<string, any>[]) || []);
        } catch (error) {
            reportApiError(error);
            setDues([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
        loadDues();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const totalPending = dues.reduce((acc, curr) => acc + Number(curr.due_amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pending Fees Report</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Students with outstanding fee dues</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:border-[#a29bfe] outline-none transition-colors"
                        value={filterClass}
                        onChange={e => { setFilterClass(e.target.value); loadDues(); }}
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={loadDues}
                        disabled={loading}
                        className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-black text-sm transition-colors"
                    >
                        <Printer size={14} />
                        Print
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 print:bg-transparent">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Admn No</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Student Name</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Class</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Pending Amount</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Parent Phone</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={5} className="px-5 py-4">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : dues.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">
                                    No pending dues found
                                </td>
                            </tr>
                        ) : dues.map(d => (
                            <tr key={String(d.id)} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-mono text-slate-400 text-xs">{String(d.admission_no)}</td>
                                <td className="px-5 py-3 font-medium text-slate-900">{String(d.name)}</td>
                                <td className="px-5 py-3 text-slate-500">{String(d.class_name)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-rose-600">₹{Number(d.due_amount).toLocaleString('en-IN')}</td>
                                <td className="px-5 py-3 text-slate-500">{(d.father_phone as string) || '—'}</td>
                            </tr>
                        ))}
                        {dues.length > 0 && (
                            <tr className="bg-slate-50 border-t border-slate-200">
                                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-slate-700 text-right">Total Pending:</td>
                                <td className="px-5 py-3 text-right font-bold text-rose-600 text-base">
                                    ₹{totalPending.toLocaleString('en-IN')}
                                </td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                @media print {
                    @page { margin: 1cm; size: a4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
