'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, StudentFeeStatus } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Search, Wallet, CreditCard, Receipt, FileText, Info, CheckCircle2, Zap, Clock } from 'lucide-react';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export default function FeePaymentPage() {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [feeStatus, setFeeStatus] = useState<StudentFeeStatus | null>(null);
    const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);
    const [paymentForm, setPaymentForm] = useState(() => ({
        amount_paid: 0,
        payment_mode: 'cash',
        notes: '',
        fine: 0,
        receipt_no: `RCPT-${Date.now().toString().slice(-6)}`
    }));

    const handleSearch = useCallback(async (val: string) => {
        if (val.length < 3) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await api.getStudents({ search: val });
            setSearchResults(res.data || []);
        } catch (err: unknown) {
            reportApiError(err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => handleSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search, handleSearch]);

    const selectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setSearch('');
        try {
            const status = await api.getStudentFees(student.id);
            setFeeStatus(status);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to fetch fee status');
        }
    };

    const toggleInstallment = (id: number) => {
        setSelectedInstallments(prev => {
            const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            // Auto update amount in form (just for convenience)
            const total = feeStatus?.installments
                .filter((inst) => next.includes(inst.id))
                .reduce((sum: number, inst) => sum + Number(inst.amount), 0) ?? 0;
            setPaymentForm(f => ({ ...f, amount_paid: total }));
            return next;
        });
    };

    const handlePay = async () => {
        if (selectedInstallments.length === 0) {
            toast.error('Select at least one installment');
            return;
        }
        if (paymentForm.payment_mode === 'online') {
            toast.error('Online payments must be made through the parent portal');
            return;
        }
        setLoading(true);
        try {
            const perInstallmentAmount = paymentForm.amount_paid / selectedInstallments.length;
            for (const instId of selectedInstallments) {
                await api.payCash({
                    student_id: selectedStudent!.id,
                    installment_id: instId,
                    amount_paid: perInstallmentAmount,
                    notes: paymentForm.notes,
                    payment_mode: paymentForm.payment_mode as 'cash' | 'cheque' | 'bank' | 'dd',
                });
            }
            toast.success('Payment recorded successfully');
            const status = await api.getStudentFees(selectedStudent!.id);
            setFeeStatus(status);
            setSelectedInstallments([]);
            setPaymentForm(f => ({ ...f, amount_paid: 0, notes: '', receipt_no: `RCPT-${Date.now().toString().slice(-6)}` }));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Payment failed');
        }
        setLoading(false);
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-3">
                        <Wallet size={12} />
                        Financial Intelligence
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
                        Payment Terminal
                    </h1>
                    <p className="text-base text-gray-500 mt-4 font-medium max-w-xl">
                        A high-precision environment for institutional financial processing and encrypted receipt management.
                    </p>
                </div>
                <div className="relative w-full md:w-96 group">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search student or admission-ID…"
                        className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl text-sm font-bold transition-all outline-none shadow-sm placeholder:text-gray-300"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <AnimatePresence>
                        {loading && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                                <div className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {searchResults.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[24px] border border-gray-100 shadow-2xl z-50 overflow-hidden"
                            >
                                {searchResults.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => selectStudent(s)}
                                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b last:border-0 group/item"
                                    >
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs group-hover/item:scale-110 transition-transform">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">{s.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.admission_no} • {s.class_name}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Panel: Profile & Installments */}
                <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
                    {selectedStudent ? (
                        <>
                            {/* Student Info Card */}
                            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000 blur-3xl opacity-60" />
                                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                                    <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 group-hover:rotate-3 transition-transform duration-500">
                                        {selectedStudent.name.charAt(0)}
                                    </div>
                                    <div className="text-center md:text-left flex-1">
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">{selectedStudent.name}</h2>
                                        <p className="text-indigo-600 font-black text-[10px] mt-1 uppercase tracking-[0.2em]">{selectedStudent.class_name} • Sector {selectedStudent.section_name}</p>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 mt-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Admission ID</span>
                                                <span className="text-xs font-black text-gray-900 font-mono bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">{selectedStudent.admission_no}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Guardian Vector</span>
                                                <span className="text-xs font-black text-gray-700">{selectedStudent.mother_name || selectedStudent.father_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                                        <div className="bg-emerald-50/80 backdrop-blur-xl px-8 py-5 rounded-[32px] text-center border border-emerald-100 shadow-sm group-hover:translate-y--1 transition-transform">
                                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-1.5">Processed</p>
                                            <p className="text-2xl font-black text-emerald-700 tracking-tighter">₹{feeStatus?.total_paid || 0}</p>
                                        </div>
                                        <div className="bg-rose-50/80 backdrop-blur-xl px-8 py-5 rounded-[32px] text-center border border-rose-100 shadow-sm group-hover:translate-y--1 transition-transform delay-75">
                                            <p className="text-[10px] text-rose-600 font-black uppercase tracking-[0.2em] mb-1.5">Outstanding</p>
                                            <p className="text-2xl font-black text-rose-700 tracking-tighter">₹{feeStatus?.total_due || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Installments Selection */}
                            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                        <Receipt size={24} />
                                    </div>
                                    Financial Cycles
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {feeStatus?.installments?.map((inst) => (
                                        <button
                                            key={inst.id}
                                            disabled={inst.paid}
                                            onClick={() => toggleInstallment(inst.id)}
                                            className={`
                                                relative p-6 rounded-[32px] border transition-all text-left flex items-center justify-between group overflow-hidden
                                                ${inst.paid
                                                    ? 'bg-gray-50/50 border-gray-100 cursor-not-allowed opacity-60'
                                                    : selectedInstallments.includes(inst.id)
                                                        ? 'bg-indigo-50/30 border-indigo-200 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-200'
                                                        : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10'}
                                            `}
                                        >
                                            <div className="relative z-10 flex-1">
                                                <div className="flex items-center gap-4">
                                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black ${inst.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all'}`}>
                                                        {inst.installment_no.toString().padStart(2, '0')}
                                                    </span>
                                                    <span className="text-sm font-black text-gray-900 tracking-tight">Cycle Phase #{inst.installment_no}</span>
                                                </div>
                                                <div className="mt-6 space-y-1.5 ml-1">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Net Value</p>
                                                    <p className="text-2xl font-black text-indigo-600 tracking-tighter">₹{(inst.amount || 0).toLocaleString('en-IN')}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Clock size={12} className="text-gray-300" />
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Due {new Date(inst.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative z-10 flex items-center gap-2 ml-4">
                                                {inst.paid ? (
                                                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 ring-4 ring-emerald-50">
                                                        <CheckCircle2 size={18} />
                                                    </div>
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${selectedInstallments.includes(inst.id) ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 rotate-0' : 'bg-white border-gray-200 group-hover:border-indigo-300 -rotate-12'}`}>
                                                        {selectedInstallments.includes(inst.id) && <div className="w-3 h-1.5 border-l-3 border-b-3 border-white -rotate-45 mb-1" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200 p-24 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-3xl mb-6 shadow-sm grayscale opacity-30">
                                <Wallet size={40} className="text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Terminal Standby</h3>
                            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto font-medium">Search for a student using the central registry to initiate financial processing.</p>
                        </div>
                    )}
                </motion.div>

                {/* Right Panel: Payment Form */}
                <motion.div variants={itemVariants} className="lg:col-span-4 sticky top-8">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden group/form">
                        <div className="bg-slate-900 p-8 text-white relative h-28 flex flex-col justify-center overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#6c5ce7] rounded-full blur-[40px] -mr-16 -mt-16 group-hover/form:scale-125 transition-transform duration-1000 opacity-70" />
                            <div className="relative z-10">
                                <h3 className="text-xl font-black tracking-tight text-white">Commit Funds</h3>
                                <p className="text-[#a29bfe] text-[10px] mt-1 font-black uppercase tracking-[0.2em]">Security Protocol V2.0</p>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center pb-6 border-b border-gray-50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Selected Units</span>
                                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-xl uppercase tracking-widest">{selectedInstallments.length} Phases</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Aggregate Total Value</span>
                                    <p className="text-5xl font-black text-gray-900 tracking-tighter group-hover/form:text-indigo-600 transition-colors duration-500">₹{paymentForm.amount_paid.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-6 pt-8 border-t border-gray-50">
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">
                                        <CreditCard size={12} className="text-indigo-600" />
                                        Payment Vector
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['cash', 'cheque', 'bank', 'dd'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setPaymentForm({ ...paymentForm, payment_mode: mode })}
                                                className={`py-3.5 px-3 rounded-[20px] border text-[10px] font-black uppercase tracking-widest transition-all duration-300
                                                    ${paymentForm.payment_mode === mode ? 'bg-[#6c5ce7] text-white border-[#6c5ce7] shadow-xl shadow-[#6c5ce7]/20 scale-105' : 'bg-slate-50 text-slate-400 border-transparent hover:border-[#6c5ce7]/30 hover:text-[#6c5ce7] hover:bg-white'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 ml-1">
                                        <FileText size={12} />
                                        Registry Receipt
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-6 py-5 bg-gray-50 border border-transparent rounded-[24px] text-sm font-black font-mono text-gray-900 outline-none ring-1 ring-gray-100 focus:ring-rose-100 transition-all"
                                        value={paymentForm.receipt_no}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">
                                        <Info size={12} className="text-indigo-600" />
                                        Protocol Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-6 py-5 bg-gray-50 border border-transparent rounded-[24px] text-sm text-gray-900 focus:bg-white focus:ring-1 focus:ring-indigo-100 transition-all outline-none resize-none font-medium placeholder:text-gray-300"
                                        placeholder="Add encrypted remarks…"
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={selectedInstallments.length === 0 || loading || !selectedStudent}
                                onClick={handlePay}
                                className={`
                                    w-full py-6 rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95
                                    ${selectedInstallments.length > 0 && selectedStudent
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Authorize Payment ₹{paymentForm.amount_paid.toLocaleString()}</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                <Zap size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Protocol Insight</h4>
                                <p className="text-[10px] text-indigo-700 mt-1.5 leading-relaxed font-medium">
                                    Payments committed here are irreversible in real-time. Verify selected cycles and amount before processing.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

            </div>
        </motion.div>
    );
}
