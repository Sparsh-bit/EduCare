'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, Class } from '@/lib/types';
import { Printer, CreditCard } from 'lucide-react';

export default function StudentIdCardPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classId, setClassId] = useState('');
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<Class[]>([]);

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (!classId) { return; }
        let active = true;
        (async () => {
            if (active) setLoading(true);
            try {
                const res = await api.getStudents({ class_id: classId, limit: 100 });
                if (active) setStudents(res.data || []);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [classId]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student ID Cards</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Generate and print ID cards for a class</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors"
                        value={classId} onChange={e => setClassId(e.target.value)}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={() => window.print()}
                        disabled={students.length === 0}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-black text-sm disabled:opacity-40 transition-colors"
                    >
                        <Printer size={14} />
                        Print Cards
                    </button>
                </div>
            </div>

            {!classId && !loading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <CreditCard size={40} className="mb-3 text-slate-200" />
                    <p className="text-sm">Select a class to generate ID cards</p>
                </div>
            )}

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${loading ? 'opacity-50' : ''}`}>
                {students.map(student => (
                    <div key={student.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center text-center break-inside-avoid">
                        <div className="w-full h-14 bg-[#6c5ce7]" />
                        <div className="px-5 pb-5 flex flex-col items-center -mt-7 w-full">
                            <div className="w-14 h-14 rounded-full bg-[#f1f0ff] border-4 border-white shadow-sm flex items-center justify-center text-[#6c5ce7] font-bold text-xl mb-3">
                                {student.name.charAt(0)}
                            </div>
                            <h3 className="font-bold text-slate-900">{student.name}</h3>
                            <p className="text-xs text-[#6c5ce7] font-semibold uppercase tracking-wide mt-0.5 mb-4">
                                {String(student.class_name || '').toLowerCase().startsWith('class') ? student.class_name : 'Class ' + student.class_name} {student.section_name}
                            </p>
                            <div className="w-full bg-slate-50 rounded-lg p-3 text-left space-y-1.5 text-xs text-slate-700">
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="font-medium text-slate-500">Admn No</span>
                                    <span>{student.admission_no}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="font-medium text-slate-500">Roll No</span>
                                    <span>{student.current_roll_no}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                    <span className="font-medium text-slate-500">Date of Birth</span>
                                    <span>{new Date(student.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-500">Blood Group</span>
                                    <span className="text-red-600 font-bold">{student.blood_group || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
