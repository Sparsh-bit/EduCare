'use client';
import Link from 'next/link';
import {
    Trophy, PenLine, BarChart3, FileText, Settings2,
    Star, SlidersHorizontal, Calendar, CreditCard, Printer,
    ArrowUpCircle, TrendingUp, ChevronRight,
} from 'lucide-react';

const SETTINGS = [
    { num: '01', title: 'Create Exam', desc: 'Set up new examinations and term tests', href: '/exams/manage', icon: Trophy, color: 'bg-amber-50 text-amber-600' },
    { num: '02', title: 'Marks Entry', desc: 'Enter student marks by subject', href: '/exams/entries', icon: PenLine, color: 'bg-blue-50 text-blue-600' },
    { num: '03', title: 'View Results', desc: 'Browse and analyze exam results', href: '/exams/results', icon: BarChart3, color: 'bg-emerald-50 text-emerald-600' },
    { num: '04', title: 'Report Cards', desc: 'Generate and download report cards', href: '/board/report-cards', icon: FileText, color: 'bg-[#f1f0ff] text-[#6c5ce7]' },
    { num: '05', title: 'Board Config', desc: 'CBSE board and term configuration', href: '/board', icon: Settings2, color: 'bg-slate-100 text-slate-600' },
    { num: '06', title: 'Co-Scholastic', desc: 'Activities and sports marks entry', href: '/board/co-scholastic', icon: Star, color: 'bg-orange-50 text-orange-600' },
    { num: '07', title: 'Grade Mapping', desc: 'Configure grade thresholds and ranges', href: '/master', icon: SlidersHorizontal, color: 'bg-teal-50 text-teal-600' },
    { num: '08', title: 'Exam Schedule', desc: 'Date sheet and subject timetable', href: '/exams/schedule', icon: Calendar, color: 'bg-sky-50 text-sky-600' },
    { num: '09', title: 'Admit Cards', desc: 'Generate student admit cards', href: '/exams/admit-cards', icon: CreditCard, color: 'bg-pink-50 text-pink-600' },
    { num: '10', title: 'Mark Sheets', desc: 'Print consolidated mark sheets', href: '/exams/marksheets', icon: Printer, color: 'bg-violet-50 text-violet-600' },
    { num: '11', title: 'Promotions', desc: 'Manage student class promotions', href: '/students/promotion', icon: ArrowUpCircle, color: 'bg-lime-50 text-lime-600' },
    { num: '12', title: 'Analytics', desc: 'Performance trends and toppers', href: '/exams/analytics', icon: TrendingUp, color: 'bg-rose-50 text-rose-600' },
];

export default function ExamsPage() {
    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Examination Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage exams, marks, results, and report cards</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {SETTINGS.map(card => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.num}
                            href={card.href}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-slate-200 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-xs font-mono font-bold text-slate-300">{card.num}</span>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                                    <Icon size={16} />
                                </div>
                            </div>
                            <h3 className="font-semibold text-slate-900 text-sm mb-1">{card.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                            <div className="mt-3 flex justify-end">
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-[#6c5ce7] transition-colors" />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
