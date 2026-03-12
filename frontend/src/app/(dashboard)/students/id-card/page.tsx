'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, Class } from '@/lib/types';

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

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student ID Cards</h1>
                    <p className="text-sm text-gray-500">Generate ID cards for students</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm"
                        value={classId} onChange={e => setClassId(e.target.value)}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={handlePrint}
                        disabled={students.length === 0}
                        className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6] disabled:opacity-50"
                    >
                        🖨️ Print Cards
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${loading ? 'opacity-50' : ''}`}>
                {students.map(student => (
                    <div key={student.id} className="bg-white border-2 border-[#f1f0ff] rounded-xl overflow-hidden shadow-sm flex flex-col items-center p-6 text-center break-inside-avoid relative">
                        <div className="absolute top-0 w-full h-16 bg-gradient-to-r from-[#6c5ce7] to-[#8e44ad] z-0"></div>
                        <div className="w-20 h-20 rounded-full bg-gray-100 border-4 border-white shadow-md z-10 flex items-center justify-center text-4xl mb-3 overflow-hidden">
                            🎓
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 z-10">{student.name}</h3>
                        <p className="text-sm text-[#6c5ce7] font-semibold uppercase mb-4 tracking-wider">
                            {String(student.class_name || '').toLowerCase().startsWith('class') ? student.class_name : 'Class ' + student.class_name} {student.section_name}
                        </p>
                        <div className="w-full bg-gray-50 rounded-lg p-3 text-left space-y-1.5 text-xs text-gray-700 shadow-inner">
                            <div className="flex justify-between border-b border-gray-200 pb-1">
                                <span className="font-medium">Admn No:</span>
                                <span>{student.admission_no}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-1">
                                <span className="font-medium">Roll No:</span>
                                <span>{student.current_roll_no}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-1">
                                <span className="font-medium">D.O.B:</span>
                                <span>{new Date(student.dob).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                                <span className="font-medium">Blood:</span>
                                <span className="text-red-500 font-bold">{student.blood_group || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 w-full border-t border-dashed border-gray-300">
                            <p className="text-[10px] text-gray-400 font-mono">||| |||| | ||| || | |||</p>
                        </div>
                    </div>
                ))}
            </div>

            {!classId && !loading && (
                <div className="text-center py-12 text-gray-400">
                    Select a class to generate ID Cards
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
