'use client';
import Link from 'next/link';
import { Calendar, ChevronRight, Clock, BookOpen, Download } from 'lucide-react';

export default function ExamSchedulePage() {
    return (
        <div className="space-y-6 pb-10">
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                    <Link href="/exams" className="hover:text-[#6c5ce7]">Exams</Link>
                    <ChevronRight size={14} />
                    <span className="text-slate-600">Exam Schedule</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Schedule</h1>
                <p className="text-sm text-slate-500 mt-0.5">Date sheet and subject-wise timetable for all classes</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-sky-50 rounded-3xl flex items-center justify-center mb-5">
                    <Calendar size={36} className="text-sky-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Exam Date Sheet</h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    The exam schedule module allows you to create and publish date sheets for all classes. Students and parents can view the schedule from their portal.
                </p>
                <div className="grid grid-cols-1 gap-3 w-full text-left mb-6">
                    {[
                        { icon: Calendar, title: 'Class-wise date sheets', desc: 'Set exam dates for each subject per class' },
                        { icon: Clock, title: 'Time slot management', desc: 'Morning and afternoon session scheduling' },
                        { icon: BookOpen, title: 'Subject allocation', desc: 'Assign invigilators and rooms' },
                        { icon: Download, title: 'PDF export', desc: 'Print and share date sheets with parents' },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon size={15} className="text-sky-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">{title}</p>
                                <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-4 py-3 bg-sky-50 border border-sky-100 rounded-xl w-full">
                    <p className="text-xs font-semibold text-sky-600">Coming in next release</p>
                    <p className="text-xs text-sky-500 mt-0.5">Meanwhile, create exams and enter marks from the Marks Entry section.</p>
                </div>
            </div>
        </div>
    );
}
