'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';
import type { StudentFeeStatus, FeeInstallment, FeePayment } from '@/lib/types';
import { formatINR } from '@/lib/format';
import { IndianRupee, CheckCircle2, Clock, AlertCircle, ArrowLeft, Receipt } from 'lucide-react';
import Link from 'next/link';

type FullInstallment = FeeInstallment & {
    paid: boolean;
    payment: FeePayment | null;
    is_overdue: boolean;
    late_fee_estimate: number;
};

function FeesContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [data, setData] = useState<StudentFeeStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildFeesDetails(parseInt(studentId));
                if (active) setData(result as StudentFeeStatus);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [studentId]);

    if (!studentId) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <IndianRupee size={24} className="text-slate-400" />
                </div>
                <div>
                    <p className="font-semibold text-slate-700">No student selected</p>
                    <p className="text-sm text-slate-400 mt-1">Please select a child from the dashboard</p>
                </div>
                <Link href="/parent" className="flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline mt-2">
                    <ArrowLeft size={14} /> Back to Dashboard
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-3 gap-4">
                    {Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
        );
    }

    if (!data) return <div className="py-16 text-center text-slate-400 text-sm">No fee data available</div>;

    const paidCount = data.installments?.filter((i) => (i as FullInstallment).paid).length ?? 0;
    const totalCount = data.installments?.length ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fee Status</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Your child&apos;s fee details and payment history</p>
                </div>
                <Link href="/parent" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ArrowLeft size={14} /> Dashboard
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500">Total Fee</span>
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <IndianRupee size={16} className="text-slate-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatINR(data.total_fee ?? 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">{totalCount} installments total</p>
                </div>
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500">Paid</span>
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{formatINR(data.total_paid ?? 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">{paidCount} of {totalCount} installments paid</p>
                </div>
                <div className={`bg-white rounded-xl border shadow-sm p-5 ${(data.total_due ?? 0) > 0 ? 'border-rose-100' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500">Outstanding Due</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(data.total_due ?? 0) > 0 ? 'bg-rose-50' : 'bg-slate-100'}`}>
                            <AlertCircle size={16} className={(data.total_due ?? 0) > 0 ? 'text-rose-600' : 'text-slate-400'} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold ${(data.total_due ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatINR(data.total_due ?? 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {(data.total_due ?? 0) === 0 ? 'All dues cleared!' : `${totalCount - paidCount} installments remaining`}
                    </p>
                </div>
            </div>

            {/* Payment progress bar */}
            {(data.total_fee ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600 font-medium">Payment Progress</span>
                        <span className="text-slate-500">{Math.round(((data.total_paid ?? 0) / (data.total_fee ?? 1)) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${((data.total_paid ?? 0) / (data.total_fee ?? 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                        <span>Paid: {formatINR(data.total_paid ?? 0)}</span>
                        <span>Remaining: {formatINR(data.total_due ?? 0)}</span>
                    </div>
                </div>
            )}

            {/* Installments Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm">Installment Schedule</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">#</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Amount</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Due Date</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!data.installments || data.installments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No installments found</td>
                                </tr>
                            ) : (data.installments as FullInstallment[]).map((inst) => (
                                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3 text-slate-500">#{inst.installment_no}</td>
                                    <td className="px-5 py-3 font-semibold text-slate-900">{formatINR(Number(inst.amount))}</td>
                                    <td className="px-5 py-3 text-slate-500">
                                        <span className={inst.is_overdue && !inst.paid ? 'text-rose-600 font-medium' : ''}>
                                            {new Date(inst.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {inst.paid ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                                                <CheckCircle2 size={12} /> Paid
                                            </span>
                                        ) : inst.is_overdue ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium">
                                                <AlertCircle size={12} /> Overdue
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                                                <Clock size={12} /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        {inst.payment?.receipt_no ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                                                <Receipt size={12} />
                                                {inst.payment.receipt_no}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
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

export default function ParentFeesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        }>
            <FeesContent />
        </Suspense>
    );
}
