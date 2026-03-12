'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, StudentFeeStatus } from '@/lib/types';
import { toast } from 'react-hot-toast';

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
        setLoading(true);
        try {
            for (const instId of selectedInstallments) {
                await api.payCash({
                    student_id: selectedStudent!.id,
                    installment_id: instId,
                    amount_paid: paymentForm.amount_paid / selectedInstallments.length, // Split for simplicity
                    notes: paymentForm.notes
                });
            }
            toast.success('Payment recorded successfully');
            // Refresh
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Payment Terminal</h1>
                    <p className="text-sm text-gray-500 mt-1">Search student and process payments instantly</p>
                </div>
                <div className="relative w-full sm:w-80">
                    <input
                        type="text"
                        placeholder="Search student name or admission no..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] outline-none transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    {loading && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#6c5ce7]/20 border-t-[#6c5ce7] rounded-full animate-spin" />
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {searchResults.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => selectStudent(s)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b last:border-0"
                                >
                                    <div className="w-9 h-9 bg-[#f1f0ff] rounded-full flex items-center justify-center text-[#6c5ce7] font-bold text-xs">
                                        {s.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.admission_no} • {s.class_name} {s.section_name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Panel: Profile & Installments */}
                <div className="lg:col-span-8 space-y-6">
                    {selectedStudent ? (
                        <>
                            {/* Student Info Card */}
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#f1f0ff] rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                <div className="flex flex-col sm:flex-row gap-6 items-center relative z-10">
                                    <div className="w-24 h-24 bg-gradient-to-br from-[#6c5ce7] to-[#8e44ad] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                        {selectedStudent.name.charAt(0)}
                                    </div>
                                    <div className="text-center sm:text-left flex-1">
                                        <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                                        <p className="text-[#6c5ce7] font-medium text-sm mt-1">{selectedStudent.class_name} • Section {selectedStudent.section_name}</p>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3">
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pb-0.5 border-b border-gray-100 flex items-center gap-1">
                                                <span>ADM:</span>
                                                <span className="text-gray-900 font-mono">{selectedStudent.admission_no}</span>
                                            </div>
                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pb-0.5 border-b border-gray-100 flex items-center gap-1">
                                                <span>FATHER:</span>
                                                <span className="text-gray-900">{selectedStudent.father_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                                        <div className="bg-green-50 px-4 py-3 rounded-2xl text-center">
                                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Paid</p>
                                            <p className="text-lg font-bold text-green-700">₹{feeStatus?.total_paid || 0}</p>
                                        </div>
                                        <div className="bg-red-50 px-4 py-3 rounded-2xl text-center">
                                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Due</p>
                                            <p className="text-lg font-bold text-red-700">₹{feeStatus?.total_due || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Installments Selection */}
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#f1f0ff]0" />
                                    Fee Installments
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {feeStatus?.installments?.map((inst) => (
                                        <button
                                            key={inst.id}
                                            disabled={inst.paid}
                                            onClick={() => toggleInstallment(inst.id)}
                                            className={`
                                                p-4 rounded-2xl border transition-all text-left flex items-center justify-between group
                                                ${inst.paid
                                                    ? 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-70'
                                                    : selectedInstallments.includes(inst.id)
                                                        ? 'bg-[#f1f0ff] border-[#6c5ce7]/20 shadow-inner'
                                                        : 'bg-white border-gray-100 hover:border-[#6c5ce7]/20 hover:shadow-sm'}
                                            `}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${inst.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 group-hover:bg-[#f1f0ff] group-hover:text-[#6c5ce7]'}`}>
                                                        {inst.installment_no}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 capitalize">Installment #{inst.installment_no}</span>
                                                </div>
                                                <div className="mt-3 flex flex-col gap-1">
                                                    <p className="text-xs text-gray-400">Due: <span className="text-gray-600 font-medium">{new Date(inst.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                                                    <p className="text-xs text-[#6c5ce7] font-bold tracking-wide">₹{(inst.amount || 0).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {inst.paid ? (
                                                    <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                                                ) : (
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedInstallments.includes(inst.id) ? 'bg-[#6c5ce7] border-[#6c5ce7]' : 'border-gray-200 group-hover:border-[#6c5ce7]/60'}`}>
                                                        {selectedInstallments.includes(inst.id) && <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45" style={{ marginBottom: '2px' }} />}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-50">💰</div>
                            <h3 className="text-lg font-bold text-gray-900">No Student Selected</h3>
                            <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Please search for a student using the search bar above to begin processing fees.</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Payment Form */}
                <div className="lg:col-span-4 sticky top-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                        <div className="bg-[#6c5ce7] p-6 text-white">
                            <h3 className="text-lg font-bold">Process Payment</h3>
                            <p className="text-[#a29bfe]/50 text-xs mt-1">Select installments to calculate total</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                                    <span className="text-sm text-gray-500 font-medium">Selected Installments</span>
                                    <span className="text-sm font-bold text-gray-900">{selectedInstallments.length}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 font-medium pb-1">Amount to Pay</span>
                                    <div className="text-right">
                                        <p className="text-xs text-[#6c5ce7] font-bold uppercase tracking-wider mb-1">Net Payable</p>
                                        <p className="text-3xl font-black text-gray-900 tracking-tighter">₹{paymentForm.amount_paid.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Payment Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['cash', 'online', 'cheque', 'bank'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setPaymentForm({ ...paymentForm, payment_mode: mode })}
                                                className={`py-2 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all
                                                    ${paymentForm.payment_mode === mode ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-[#6c5ce7]/20'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 text-red-500">Receipt Number</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-mono text-gray-900 focus:bg-white focus:border-[#6c5ce7] transition-all outline-none"
                                        value={paymentForm.receipt_no}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Notes / Remarks</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 focus:bg-white focus:border-[#6c5ce7] transition-all outline-none resize-none"
                                        placeholder="Add any internal payment notes..."
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={selectedInstallments.length === 0 || loading || !selectedStudent}
                                onClick={handlePay}
                                className={`
                                    w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2
                                    ${selectedInstallments.length > 0 && selectedStudent
                                        ? 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] hover:shadow-[#6c5ce7]/15'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Verify & Pay ₹{paymentForm.amount_paid.toLocaleString()}</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex gap-3">
                            <span className="text-xl">💡</span>
                            <div>
                                <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Quick Note</h4>
                                <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                                    Selecting multiple installments will distribute the payment across them. Receipt will be generated for the total amount.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
