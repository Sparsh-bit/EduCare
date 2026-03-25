'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Student } from '@/lib/types';
import { UserX, Search } from 'lucide-react';

export default function WithdrawalLogsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getStudents({ status: 'inactive', limit: 200 }) as { data?: Student[] };
            setStudents(res.data ?? []);
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = students.filter(s =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.admission_no ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Withdrawal Logs</h1>
                    <p className="text-sm text-slate-500 mt-1">Students who have been withdrawn, deactivated, or issued TC</p>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search by name or admission no..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-64 pl-9 pr-3 h-9 border border-slate-200 rounded-xl text-sm focus:border-[#6c5ce7] outline-none bg-white" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserX size={15} className="text-rose-500" />
                        <span className="text-sm font-bold text-slate-800">Withdrawn Students</span>
                    </div>
                    <span className="text-xs text-slate-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <UserX size={32} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">No withdrawal records found</p>
                        <p className="text-xs text-slate-400 mt-1">Deactivated or TC-issued students will appear here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['Admission No', 'Student Name', 'Father\'s Name', 'Class', 'Phone', 'Status', 'Updated'].map(h => (
                                        <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{s.admission_no}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900">{s.name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{s.father_name || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {[s.class_name, s.section_name].filter(Boolean).join(' - ') || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{s.phone || s.father_phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                                                s.status === 'tc_issued'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                                {s.status === 'tc_issued' ? 'TC Issued' : 'Withdrawn'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {s.updated_at
                                                ? new Date(s.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
