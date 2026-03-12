/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Class } from '@/lib/types';

export default function FeesReportsPage() {
    const [dues, setDues] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<Class[]>([]);
    const [filterClass, setFilterClass] = useState('');

    const loadDues = async () => {
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
        (async () => {
            api.getClasses().then(setClasses).catch(reportApiError);
            setLoading(true);
            await loadDues();
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Defaulters Report</h1>
                    <p className="text-sm text-gray-500">Track pending fee payments by student</p>
                </div>
                <div className="flex gap-3">
                    <select
                        className="px-4 py-2 border rounded-lg text-sm bg-white shadow-sm"
                        value={filterClass} onChange={e => { setFilterClass(e.target.value); loadDues(); }}
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={handlePrint} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium shadow-sm">
                        🖨️ Print Report
                    </button>
                    <button onClick={loadDues} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6]">
                        Refresh Data
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-4 print:border-0 print:shadow-none">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#f8f9fb] text-gray-700 font-semibold border-b print:bg-transparent">
                        <tr>
                            <th className="px-4 py-3 uppercase tracking-wider text-xs">Admn No</th>
                            <th className="px-4 py-3 uppercase tracking-wider text-xs">Student Name</th>
                            <th className="px-4 py-3 uppercase tracking-wider text-xs">Class</th>
                            <th className="px-4 py-3 text-right uppercase tracking-wider text-xs">Total Dues (₹)</th>
                            <th className="px-4 py-3 uppercase tracking-wider text-xs">Father&apos;s Phone</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading Report...</td></tr>
                        ) : dues.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No pending dues found!</td></tr>
                        ) : (
                            dues.map(d => (
                                <tr key={String(d.student_id)} className="hover:bg-gray-50 print:border-b-2 print:border-gray-300">
                                    <td className="px-4 py-3 font-mono text-gray-500">{String(d.admission_no)}</td>
                                    <td className="px-4 py-3 font-bold text-gray-900">{String(d.student_name)}</td>
                                    <td className="px-4 py-3">{String(d.class_name)} {String(d.section_name)}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">₹{String(d.pending_amount)}</td>
                                    <td className="px-4 py-3 text-gray-600">{(d.phone as string) || 'N/A'}</td>
                                </tr>
                            ))
                        )}
                        {dues.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-900 print:bg-white">
                                <td colSpan={3} className="px-4 py-3 font-bold text-gray-900 text-right uppercase tracking-widest">Total Pending:</td>
                                <td className="px-4 py-3 text-right font-black text-red-600 text-lg">
                                    ₹{dues.reduce((acc, curr) => acc + Number(curr.pending_amount), 0).toLocaleString()}
                                </td>
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; size: a4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
