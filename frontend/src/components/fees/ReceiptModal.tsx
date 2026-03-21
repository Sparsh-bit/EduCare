'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, MessageSquare, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import type { FeePayment } from '@/lib/types';
import { Button } from '@/components/ui';
import { formatINR } from '@/lib/format';

interface ReceiptModalProps {
    paymentId: number;
    onClose: () => void;
}

export function ReceiptModal({ paymentId, onClose }: ReceiptModalProps) {
    const [payment, setPayment] = useState<FeePayment | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getReceipt(paymentId)
            .then(setPayment)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [paymentId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:bg-transparent print:p-0 print:block">
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-h-none print:max-w-none"
            >
                {/* Modal header (hidden on print) */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 print:hidden">
                    <h2 className="text-sm font-semibold text-neutral-700">Fee Receipt</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
                </div>

                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-neutral-200 border-t-brand-600 rounded-full animate-spin" />
                    </div>
                ) : payment ? (
                    <div className="p-6" id="receipt-content">
                        {/* School Header */}
                        <div className="text-center mb-5 pb-4 border-b-2 border-neutral-800">
                            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-700)' }}>
                                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="white" strokeWidth="2">
                                    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" />
                                </svg>
                            </div>
                            <h1 className="text-lg font-bold text-neutral-900">EduCare School</h1>
                            <p className="text-xs text-neutral-500">Powered by EduCare ERP · Concilio</p>
                            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-neutral-700">Official Fee Receipt</p>
                        </div>

                        {/* Two-column info */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-xs">
                            <div>
                                <p className="text-neutral-400 uppercase tracking-wide text-[10px]">Receipt No</p>
                                <p className="font-bold font-mono">{payment.receipt_no}</p>
                            </div>
                            <div>
                                <p className="text-neutral-400 uppercase tracking-wide text-[10px]">Student Name</p>
                                <p className="font-semibold">{payment.student_name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-neutral-400 uppercase tracking-wide text-[10px]">Date</p>
                                <p className="font-semibold">{new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p className="text-neutral-400 uppercase tracking-wide text-[10px]">Payment Mode</p>
                                <p className="font-semibold capitalize">{payment.payment_mode}</p>
                            </div>
                        </div>

                        {/* Fee table */}
                        <table className="w-full text-sm mb-4 border border-neutral-200 rounded-lg overflow-hidden">
                            <thead>
                                <tr className="bg-neutral-100">
                                    <th className="text-left text-xs font-semibold text-neutral-600 px-3 py-2">Description</th>
                                    <th className="text-right text-xs font-semibold text-neutral-600 px-3 py-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-neutral-100">
                                    <td className="px-3 py-2 text-neutral-700">Fee Payment (Installment #{payment.installment_id})</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(payment.amount_paid)}</td>
                                </tr>
                                {payment.notes && (
                                    <tr className="border-t border-neutral-50">
                                        <td className="px-3 py-1.5 text-xs text-neutral-400 italic" colSpan={2}>{payment.notes}</td>
                                    </tr>
                                )}
                                <tr className="border-t-2 border-neutral-800 bg-neutral-50">
                                    <td className="px-3 py-2 font-bold text-neutral-900">Total Paid</td>
                                    <td className="px-3 py-2 text-right font-bold text-lg tabular-nums" style={{ color: 'var(--color-brand-800)' }}>
                                        {formatINR(payment.amount_paid)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* PAID stamp (rotated watermark) */}
                        <div className="relative">
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                                style={{ zIndex: 0 }}
                            >
                                <span
                                    className="text-5xl font-black opacity-[0.06] rotate-[-25deg] tracking-widest"
                                    style={{ color: 'var(--color-brand-700)' }}
                                >
                                    PAID
                                </span>
                            </div>

                            <div className="relative z-10 text-center py-4 border-t border-dashed border-neutral-200">
                                <p className="text-xs text-neutral-400">This is a computer-generated receipt. No signature required.</p>
                                <p className="text-xs text-neutral-400 mt-1">Thank you for your payment.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-neutral-500">Receipt not found</div>
                )}

                {/* Actions (hidden on print) */}
                {payment && (
                    <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end print:hidden">
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<MessageSquare size={13} />}
                        >
                            WhatsApp
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Phone size={13} />}
                        >
                            SMS
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer size={13} />}
                            onClick={() => window.print()}
                        >
                            Print
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
                    </div>
                )}
            </motion.div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body > *:not(#receipt-print-root) { display: none !important; }
                    #receipt-content { display: block !important; }
                }
            `}</style>
        </div>
    );
}
