/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';

export default function AlertsPage() {
    const [feeAlerts, setFeeAlerts] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getFeeDelayAlerts().then((d) => setFeeAlerts(d as unknown as Record<string, any>)).catch(reportApiError).finally(() => setLoading(false)); }, []);

    if (loading) return <div className="text-gray-400 text-center py-8">Loading alerts...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI-Powered Alerts</h1>
            <p className="text-gray-500 text-sm">Rule-based academic monitoring system</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card p-5"><p className="text-xs text-gray-400 uppercase">Critical</p><p className="text-3xl font-bold text-red-600 mt-1">{(feeAlerts?.critical as number) || 0}</p><p className="text-xs text-gray-400 mt-1">60+ days overdue</p></div>
                <div className="stat-card p-5"><p className="text-xs text-gray-400 uppercase">High</p><p className="text-3xl font-bold text-amber-600 mt-1">{(feeAlerts?.high as number) || 0}</p><p className="text-xs text-gray-400 mt-1">30-60 days overdue</p></div>
                <div className="stat-card p-5"><p className="text-xs text-gray-400 uppercase">Medium</p><p className="text-3xl font-bold text-[#6c5ce7] mt-1">{(feeAlerts?.medium as number) || 0}</p><p className="text-xs text-gray-400 mt-1">Under 30 days</p></div>
            </div>

            <div className="card-glass p-6">
                <h3 className="font-semibold text-gray-900 mb-4">💰 Fee Delay Alerts ({(feeAlerts?.total_alerts as number) || 0})</h3>
                {(feeAlerts?.alerts as unknown[])?.length === 0 ? <p className="text-gray-400 text-sm">No overdue fees 🎉</p> : (
                    <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Student</th><th>Class</th><th># Inst</th><th>Amount</th><th>Due</th><th>Days</th><th>Severity</th></tr></thead><tbody>
                        {(feeAlerts?.alerts as Array<Record<string, any>>)?.slice(0, 30).map((a, i) => (
                            <tr key={i}><td className="text-gray-900 font-medium">{String(a.student_name)}</td><td>{String(a.class_name)}</td><td>{String(a.installment_no)}</td><td>₹{parseFloat(String(a.amount)).toLocaleString('en-IN')}</td><td>{new Date(String(a.due_date)).toLocaleDateString('en-IN')}</td><td className="font-bold">{String(a.days_overdue)}</td><td><span className={`badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'high' ? 'badge-yellow' : 'badge-blue'}`}>{String(a.severity)}</span></td></tr>
                        ))}
                    </tbody></table></div>
                )}
            </div>
        </div>
    );
}
