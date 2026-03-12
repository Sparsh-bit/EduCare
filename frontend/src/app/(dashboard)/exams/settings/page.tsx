'use client';
import { useRouter } from 'next/navigation';

export default function ExamsSettingsPage() {
    const router = useRouter();

    const settingsOptions = [
        { id: '1', title: 'Exam Area', examples: 'Scholastic, Co-Scholastic, Discipline', link: '/exams/settings/exam-area' },
        { id: '2', title: 'Subject Group', examples: 'Science Subjects Group', link: '/exams/settings/subject-group' },
        { id: '3', title: 'Subject', examples: 'Hindi, English, Art Education', link: '#' },
        { id: '4', title: 'Term', examples: 'Term I, Term II', link: '#' },
        { id: '5', title: 'Exam Type', examples: 'Perodic Test, Note Book, Half Yearly', link: '#' },
        { id: '6', title: 'Marks & Grade Mapping', examples: 'A1 (91% - 100%), A2 (81% - 90%)', link: '/exams/settings/grade-mapping' },
        { id: '7', title: 'Class & Template Mapping', examples: '', link: '#' },
        { id: '8', title: 'Subject Maximum Marks Setting', examples: '', link: '#' },
        { id: '9', title: 'Exam Datesheet Classwise', examples: '', link: '#' },
        { id: '10', title: 'Remark Setting', examples: '', link: '/exams/settings/remark-setting' },
        { id: '11', title: 'Exam Datesheet for All Class', examples: '', link: '#' },
        { id: '12', title: 'Report Card 360', examples: '', link: '#' },
    ];

    return (
        <div className="p-6 bg-[#f8f9fb] min-h-screen">
            <div className="mb-6 flex items-center text-sm text-gray-500 gap-2">
                <button onClick={() => router.push('/dashboard')} className="hover:text-teal-600 transition-colors">
                    <span className="text-teal-600">🏠</span>
                </button>
                <span>/</span>
                <span className="text-teal-600 cursor-pointer">Examination</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Exam Setting</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsOptions.map((option) => (
                    <div
                        key={option.id}
                        onClick={() => router.push(option.link)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all cursor-pointer h-[120px]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-600"></div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                {option.id}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-teal-700 font-bold text-lg leading-tight">{option.title}</h3>
                                {option.examples && (
                                    <p className="text-teal-600/70 text-[11px] font-medium mt-1 truncate">
                                        <span className="font-bold">Examples: </span>{option.examples}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
