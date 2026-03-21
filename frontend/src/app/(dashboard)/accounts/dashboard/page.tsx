'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion, type Variants } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Clock, Activity, BarChart3, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

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

    const fmt = (n: unknown) => `₹${((n as number) || 0).toLocaleString('en-IN')}`;
    const netPositive = ((data?.net_position as number) || 0) >= 0;

    if (loading) return (
        <div className="p-32 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-[3px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Synchronizing Fiscal Data…</p>
        </div>
    );

    if (error) return (
        <div className="p-8">
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-8 py-5 rounded-[24px] text-xs font-black uppercase tracking-widest flex items-center gap-3">
                <ShieldCheck size={18} />
                Protocol Error: {error}
            </div>
        </div>
    );

    if (!data) return (
        <div className="p-32 text-center">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Null Data Vector Detected</p>
        </div>
    );

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-3">
                        <Activity size={12} />
                        Fiscal Intelligence
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
                        Accounts Overview
                    </h1>
                    <p className="text-base text-gray-500 mt-4 font-medium max-w-xl">
                        Real-time institutional liquidity monitoring and automated transaction diagnostics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-6 py-4 bg-white border border-gray-100 rounded-[24px] shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Net Growth</p>
                            <p className="text-lg font-black text-gray-900 mt-1">+14.2%</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Net Position Terminal */}
            <motion.div 
                variants={itemVariants} 
                className={`rounded-[40px] p-10 shadow-sm border relative overflow-hidden group ${netPositive ? 'bg-indigo-50/50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}
            >
                <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-125 transition-transform duration-1000 ${netPositive ? 'bg-indigo-600/10' : 'bg-rose-600/10'}`} />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${netPositive ? 'text-indigo-400' : 'text-rose-400'}`}>Consolidated Liquidity</p>
                        <p className={`text-6xl font-black mt-4 tracking-tighter ${netPositive ? 'text-indigo-900' : 'text-rose-900'}`}>{fmt(data.net_position)}</p>
                        <div className="flex items-center gap-8 mt-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Aggregate Income</span>
                                <span className="text-lg font-black text-emerald-600">{fmt(data.total_income)}</span>
                            </div>
                            <div className="w-px h-10 bg-gray-200" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Aggregate Expenses</span>
                                <span className="text-lg font-black text-rose-600">{fmt(data.total_expense)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-auto grid grid-cols-2 gap-4">
                        <div className="bg-white/80 backdrop-blur-md px-8 py-6 rounded-[32px] border border-gray-100 text-center shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Pending Vendor Bills</p>
                            <p className="text-2xl font-black text-orange-500">{fmt(data.vendor_outstanding)}</p>
                        </div>
                        <div className="bg-white/80 backdrop-blur-md px-8 py-6 rounded-[32px] border border-gray-100 text-center shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Fee Collections</p>
                            <p className="text-2xl font-black text-blue-500">{fmt(data.fee_collected)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Daily/Monthly Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Today's Inflow", value: data.today_income, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: "Today's Outflow", value: data.today_expense, icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: "Monthly Inflow", value: data.month_income, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: "Monthly Outflow", value: data.month_expense, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        variants={itemVariants}
                        className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 group hover:border-indigo-100 transition-all"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">{stat.label}</p>
                            <p className={`text-2xl font-black mt-1.5 ${stat.color} tracking-tighter`}>{fmt(stat.value)}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Category Breakdown Terminals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div variants={itemVariants} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                                <TrendingUp size={24} />
                            </div>
                            Inflow Vectors
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {(!data.income_by_category || (data.income_by_category as unknown[]).length === 0) ? (
                            <div className="py-10 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No Active Vectors Detected</p>
                            </div>
                        ) : (
                            (data.income_by_category as Array<Record<string, any>>).map((c, i) => (
                                <div key={i} className="flex justify-between items-center p-5 rounded-[24px] bg-gray-50/50 hover:bg-emerald-50/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-150 transition-transform" />
                                        <span className="text-sm font-black text-gray-700 tracking-tight uppercase">{String(c.category)}</span>
                                    </div>
                                    <span className="text-lg font-black text-emerald-600 tracking-tighter">{fmt(parseFloat(String(c.total)))}</span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
                                <TrendingDown size={24} />
                            </div>
                            Outflow Vectors
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {(!data.expense_by_category || (data.expense_by_category as unknown[]).length === 0) ? (
                            <div className="py-10 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No Active Vectors Detected</p>
                            </div>
                        ) : (
                            (data.expense_by_category as Array<Record<string, any>>).map((c, i) => (
                                <div key={i} className="flex justify-between items-center p-5 rounded-[24px] bg-gray-50/50 hover:bg-rose-50/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-rose-400 group-hover:scale-150 transition-transform" />
                                        <span className="text-sm font-black text-gray-700 tracking-tight uppercase">{String(c.category)}</span>
                                    </div>
                                    <span className="text-lg font-black text-rose-600 tracking-tighter">{fmt(parseFloat(String(c.total)))}</span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
