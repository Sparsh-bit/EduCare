'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BookOpen, Users, FileText, Calendar, BarChart2, Star, Layout, Settings, ClipboardList, MessageSquare, Grid, Award } from 'lucide-react';

const settingsOptions = [
    { id: '1', title: 'Exam Areas', description: 'Scholastic, Co-Scholastic, Discipline', link: '/exams/settings/exam-area', icon: Layout },
    { id: '2', title: 'Subject Groups', description: 'Science Subjects Group, etc.', link: '/exams/settings/subject-group', icon: Users },
    { id: '3', title: 'Subjects', description: 'Hindi, English, Art Education', link: '#', icon: BookOpen },
    { id: '4', title: 'Terms', description: 'Term I, Term II', link: '#', icon: Calendar },
    { id: '5', title: 'Exam Types', description: 'Periodic Test, Note Book, Half Yearly', link: '#', icon: FileText },
    { id: '6', title: 'Marks & Grade Mapping', description: 'A1 (91–100%), A2 (81–90%)', link: '/exams/settings/grade-mapping', icon: BarChart2 },
    { id: '7', title: 'Class & Template Mapping', description: 'Link report card templates to classes', link: '#', icon: Grid },
    { id: '8', title: 'Subject Max Marks', description: 'Set maximum marks per subject', link: '#', icon: Star },
    { id: '9', title: 'Exam Timetable (Class-wise)', description: 'Set exam schedule per class', link: '#', icon: ClipboardList },
    { id: '10', title: 'Remarks', description: 'Add teacher remarks templates', link: '/exams/settings/remark-setting', icon: MessageSquare },
    { id: '11', title: 'Exam Timetable (All Classes)', description: 'View overall exam schedule', link: '#', icon: Calendar },
    { id: '12', title: 'Report Card 360', description: 'Full report card configuration', link: '#', icon: Award },
];

export default function ExamsSettingsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Exam Settings</h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure exam areas, subjects, grading, and report cards</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settingsOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                        <div
                            key={option.id}
                            onClick={() => option.link === '#' ? toast('Coming soon', { icon: '🔧' }) : router.push(option.link)}
                            className={`bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4 transition-all cursor-pointer group ${option.link === '#' ? 'border-slate-100 opacity-70 hover:opacity-90' : 'border-slate-100 hover:shadow-md hover:border-[#f1f0ff]'}`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-[#f1f0ff] flex items-center justify-center shrink-0 group-hover:bg-[#f1f0ff] transition-colors">
                                <Icon size={18} className="text-[#6c5ce7]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#6c5ce7] bg-[#f1f0ff] px-1.5 py-0.5 rounded">
                                        {option.id}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 mt-1 text-sm">{option.title}</h3>
                                {option.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{option.description}</p>}
                            </div>
                            <Settings size={14} className="text-slate-300 group-hover:text-[#a29bfe] shrink-0 transition-colors" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
