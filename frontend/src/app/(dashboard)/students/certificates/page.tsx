'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, Class } from '@/lib/types';
import toast from 'react-hot-toast';
import { FileText, Printer } from 'lucide-react';

interface TCRecord {
    tc_no?: string;
    reason?: string;
    [key: string]: string | number | boolean | null | undefined;
}

export default function StudentCertificatesPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState<Class[]>([]);
    const [reason, setReason] = useState('Transfer to another city');
    const [tcGenerated, setTcGenerated] = useState<TCRecord | null>(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (classId) {
            api.getStudents({ class_id: classId, limit: 100 })
                .then(res => setStudents(res.data || []))
                .catch(reportApiError);
        }
    }, [classId]);

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGenerating(true);
        try {
            const data = await api.generateTC(Number(selectedStudentId), reason);
            setTcGenerated(data);
            toast.success('Transfer Certificate generated successfully');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to generate TC');
        }
        setGenerating(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transfer Certificates</h1>
                <p className="text-sm text-slate-500 mt-0.5">Generate and print Transfer Certificates for students</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-2xl print:hidden">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 bg-[#f1f0ff] rounded-lg flex items-center justify-center">
                        <FileText size={16} className="text-[#6c5ce7]" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Generate Transfer Certificate</h3>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Class</label>
                            <select
                                required
                                value={classId}
                                onChange={e => { setClassId(e.target.value); setSelectedStudentId(''); }}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                            >
                                <option value="">Select class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Student</label>
                            <select
                                required
                                disabled={!classId}
                                value={selectedStudentId}
                                onChange={e => setSelectedStudentId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                                <option value="">Select student...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admission_no})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-600">Reason for Leaving</label>
                        <input
                            required
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                        />
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={!selectedStudentId || generating}
                            className="flex items-center gap-2 bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FileText size={14} />
                            {generating ? 'Generating...' : 'Generate TC'}
                        </button>
                    </div>
                </form>
            </div>

            {tcGenerated && (
                <div className="bg-white border-2 border-slate-800 p-8 pt-12 pb-16 max-w-3xl mx-auto shadow-lg text-center relative">
                    <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-slate-200 pointer-events-none" />
                    <h1 className="text-3xl font-serif font-bold text-slate-900 border-b-2 border-slate-900 inline-block pb-2 mb-8 uppercase tracking-widest">
                        Transfer Certificate
                    </h1>
                    <div className="space-y-8 text-lg font-serif leading-relaxed text-slate-800 px-8 text-left">
                        <div className="flex justify-between items-end border-b-2 border-dotted border-slate-300 pb-1">
                            <p><strong>Ref No:</strong> {tcGenerated.tc_no}</p>
                            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                        <p className="text-justify pt-4">
                            This is to certify that <strong>{students.find(s => String(s.id) === selectedStudentId)?.name || 'the student'}</strong>,
                            admission number <strong>{students.find(s => String(s.id) === selectedStudentId)?.admission_no}</strong>,
                            has left the school.
                        </p>
                        <p className="text-justify pb-4">
                            <strong>Reason for Leaving:</strong> {tcGenerated.reason}
                        </p>
                        <div className="flex justify-between text-center pt-24 pr-8 pl-8">
                            <div className="border-t-2 border-slate-900 w-40 pt-2 font-bold text-sm">Class Teacher</div>
                            <div className="border-t-2 border-slate-900 w-40 pt-2 font-bold text-sm">Principal</div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-black transition-colors mx-auto"
                        >
                            <Printer size={14} />
                            Print Certificate
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
