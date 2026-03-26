'use client';
import Link from 'next/link';
import { CreditCard, ChevronRight, User, Shield, Printer, QrCode } from 'lucide-react';

export default function AdmitCardsPage() {
    return (
        <div className="space-y-6 pb-10">
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-600">Admit Cards</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Admit Cards</h1>
                <p className="text-sm text-slate-500 mt-0.5">Generate and print student admit cards for examinations</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center mb-5">
                    <CreditCard size={36} className="text-pink-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Admit Card Generation</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Auto-generate admit cards with student photo, roll number, exam schedule, and hall ticket number for each registered student.
                </p>
                <div className="grid grid-cols-1 gap-3 w-full text-left mb-6">
                    {[
                        { icon: User, title: 'Student details & photo', desc: 'Name, roll no., class, and section' },
                        { icon: QrCode, title: 'QR code verification', desc: 'Scan to verify student identity at exam hall' },
                        { icon: Shield, title: 'Anti-duplication seal', desc: 'Unique hall ticket numbers per student' },
                        { icon: Printer, title: 'Bulk PDF printing', desc: 'Print all admit cards in one click' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon size={15} className="text-pink-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{title}</p>
                                <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-3 bg-pink-50 border border-pink-100 rounded-xl w-full">
                    <p className="text-xs font-semibold text-pink-600">Coming in next release</p>
                    <p className="text-xs text-pink-500 mt-0.5">Ensure exam schedules are set up before admit cards can be generated.</p>
                </div>
            </div>
        </div>
    );
}
