/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AccountsDashboardPage() {
    const [data, setData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try { setData(await api.getAccountsDashboard() as Record<string, any>); }
            catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); }
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full"></div></div>;
    if (error) return <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div></div>;
    if (!data) return <div className="p-6 text-gray-500">Unable to load dashboard</div>;

    const fmt = (n: unknown) => `₹${((n as number) || 0).toLocaleString('en-IN')}`;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h1>
            <div className={`p-6 rounded-xl text-white shadow-lg ${((data.net_position as number) || 0) >= 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}>
                <p className="text-sm opacity-80">Net Position</p>
                <p className="text-3xl font-bold mt-1">{fmt(data.net_position)}</p>
                <p className="text-xs mt-2 opacity-70">Income: {fmt(data.total_income)} | Expense: {fmt(data.total_expense)}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Today Income</p><p className="text-xl font-bold text-emerald-600 mt-1">{fmt(data.today_income)}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Today Expense</p><p className="text-xl font-bold text-red-600 mt-1">{fmt(data.today_expense)}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Month Income</p><p className="text-xl font-bold text-emerald-600 mt-1">{fmt(data.month_income)}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Month Expense</p><p className="text-xl font-bold text-red-600 mt-1">{fmt(data.month_expense)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase mb-1">Vendor Outstanding</p><p className="text-xl font-bold text-orange-600">{fmt(data.vendor_outstanding)}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase mb-1">Fee Collection</p><p className="text-xl font-bold text-blue-600">{fmt(data.fee_collected)}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Income by Category</h3>
                    <div className="space-y-2">
                        {(!data.income_by_category || (data.income_by_category as unknown[]).length === 0) && <p className="text-gray-400 text-sm">No data yet</p>}
                        {(data.income_by_category as Array<Record<string, any>>)?.map((c) => (
                            <div key={String(c.category)} className="flex justify-between items-center"><span className="text-sm text-gray-600">{String(c.category)}</span><span className="text-sm font-medium text-emerald-600">{fmt(parseFloat(String(c.total)))}</span></div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Expense by Category</h3>
                    <div className="space-y-2">
                        {(!data.expense_by_category || (data.expense_by_category as unknown[]).length === 0) && <p className="text-gray-400 text-sm">No data yet</p>}
                        {(data.expense_by_category as Array<Record<string, any>>)?.map((c) => (
                            <div key={String(c.category)} className="flex justify-between items-center"><span className="text-sm text-gray-600">{String(c.category)}</span><span className="text-sm font-medium text-red-600">{fmt(parseFloat(String(c.total)))}</span></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
