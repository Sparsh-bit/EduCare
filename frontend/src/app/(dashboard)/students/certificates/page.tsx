'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Student, Class } from '@/lib/types';

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

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (classId) {
            api.getStudents({ class_id: classId, limit: 100 })
                .then((res) => setStudents(res.data || []))
                .catch(reportApiError);
        }
    }, [classId]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await api.generateTC(Number(selectedStudentId), reason);
            setTcGenerated(data);
            alert('Transfer Certificate Generated Successfully!');
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to generate TC');
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Transfer Certificates</h1>
                <p className="text-sm text-gray-500">Generate and print Transfer Certificates (TC)</p>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm max-w-2xl print:hidden">
                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Class</label>
                            <select
                                required className="w-full px-3 py-2 border rounded-lg text-sm"
                                value={classId} onChange={e => { setClassId(e.target.value); setSelectedStudentId(''); }}
                            >
                                <option value="">Select...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Student</label>
                            <select
                                required disabled={!classId} className="w-full px-3 py-2 border rounded-lg text-sm"
                                value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                            >
                                <option value="">Select...</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admission_no})</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Leaving</label>
                        <input
                            required className="w-full px-3 py-2 border rounded-lg text-sm"
                            value={reason} onChange={e => setReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={!selectedStudentId} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                            📜 Generate TC
                        </button>
                    </div>
                </form>
            </div>

            {tcGenerated && (
                <div className="mt-8 bg-white border-2 border-gray-800 p-8 pt-12 pb-16 max-w-3xl mx-auto shadow-lg text-center relative">
                    <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-gray-200 pointer-events-none" />
                    <h1 className="text-3xl font-serif font-bold text-gray-900 border-b-2 border-gray-900 inline-block pb-2 mb-8 uppercase tracking-widest">
                        Transfer Certificate
                    </h1>
                    <div className="space-y-8 text-lg font-serif leading-relaxed text-gray-800 px-8 text-left">
                        <div className="flex justify-between items-end border-b-2 border-dotted border-gray-300 pb-1">
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
                            <div className="border-t-2 border-gray-900 w-40 pt-2 font-bold text-sm">Class Teacher</div>
                            <div className="border-t-2 border-gray-900 w-40 pt-2 font-bold text-sm">Principal</div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t print:hidden">
                        <button onClick={() => window.print()} className="px-6 py-2 bg-gray-900 text-white rounded-lg block mx-auto hover:bg-black font-sans font-medium hover:scale-105 transition-transform">
                            🖨️ Print Certificate
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
