/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';

export default function ParentFees() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [data, setData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildFees(parseInt(studentId));
                if (active) setData(result);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [studentId]);

    if (!studentId) return <div className="text-gray-400 text-center py-8">Select a child from the dashboard</div>;
    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">💰 Fee Status</h1>
            {data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="stat-card p-5"><p className="text-xs text-gray-400">Total Fee</p><p className="text-2xl font-bold text-gray-900 mt-1">₹{data.total_fee?.toLocaleString('en-IN')}</p></div>
                        <div className="stat-card p-5"><p className="text-xs text-gray-400">Paid</p><p className="text-2xl font-bold text-emerald-600 mt-1">₹{data.total_paid?.toLocaleString('en-IN')}</p></div>
                        <div className="stat-card p-5"><p className="text-xs text-gray-400">Due</p><p className="text-2xl font-bold text-red-600 mt-1">₹{data.total_due?.toLocaleString('en-IN')}</p></div>
                    </div>
                    <div className="card-glass overflow-hidden">
                        <table className="data-table"><thead><tr><th>Installment</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Receipt</th></tr></thead><tbody>
                            {(data.installments as Array<Record<string, any>>)?.map((i) => <tr key={String(i.installment_no)}><td>#{i.installment_no}</td><td>₹{parseFloat(i.amount).toLocaleString('en-IN')}</td><td>{new Date(i.due_date).toLocaleDateString('en-IN')}</td><td><span className={`badge ${i.paid ? 'badge-green' : 'badge-red'}`}>{i.paid ? 'Paid' : 'Pending'}</span></td><td>{i.receipt_no || '-'}</td></tr>)}
                        </tbody></table>
                    </div>
                </>
            )}
        </div>
    );
}
