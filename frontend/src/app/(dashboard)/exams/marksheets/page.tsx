'use client';
import Link from 'next/link';
import { Printer, ChevronRight, FileText, LayoutGrid, Filter, Download } from 'lucide-react';

export default function MarkSheetsPage() {
    return (
        <div className="space-y-6 pb-10">
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-600">Mark Sheets</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Mark Sheets</h1>
                <p className="text-sm text-slate-500 mt-0.5">Print consolidated mark sheets for classes and students</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mb-5">
                    <Printer size={36} className="text-violet-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Consolidated Mark Sheets</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Generate class-wise or student-wise mark sheets showing all subjects, marks obtained, grade, and result summary in a printable format.
                </p>
                <div className="grid grid-cols-1 gap-3 w-full text-left mb-6">
                    {[
                        { icon: LayoutGrid, title: 'Class-wise mark sheet', desc: 'All students in a class on one sheet' },
                        { icon: FileText, title: 'Individual mark sheet', desc: 'Single student with all subject marks' },
                        { icon: Filter, title: 'Term-wise filter', desc: 'FA1, FA2, SA1, SA2, or Annual' },
                        { icon: Download, title: 'PDF / Excel export', desc: 'Download for printing or sharing' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon size={15} className="text-violet-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{title}</p>
                                <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 w-full">
                    <Link
                        href="/exams/results"
                        className="flex-1 py-3 bg-[#f1f0ff] text-[#6c5ce7] text-sm font-semibold rounded-xl hover:bg-[#ebe8ff] transition-colors text-center"
                    >
                        View Results
                    </Link>
                    <Link
                        href="/board/report-cards"
                        className="flex-1 py-3 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors text-center"
                    >
                        Report Cards
                    </Link>
                </div>
            </div>
        </div>
    );
}
