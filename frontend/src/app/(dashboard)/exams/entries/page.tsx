'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Exam, ExamResultsResponse } from '@/lib/types';

export default function ExamEntriesPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [classId, setClassId] = useState('1');
    const [results, setResults] = useState<ExamResultsResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getExams().then(setExams).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (!selectedExamId) return;
        let active = true;
        (async () => {
            if (active) setLoading(true);
            try {
                const data = await api.getExamResults(Number(selectedExamId), Number(classId));
                if (active) setResults(data);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [selectedExamId, classId]);

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Report Card Entries</h1>
                <p className="text-sm text-gray-500">Manage marks and scores for students</p>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 flex gap-4">
                <select
                    className="px-3 py-2 border rounded-lg text-sm bg-gray-50 flex-1"
                    value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}
                >
                    <option value="">Select Exam</option>
                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name} - {String(ex.class_name || '').toLowerCase().startsWith('class') ? ex.class_name : 'Class ' + ex.class_name}</option>)}
                </select>
                <input
                    type="number" className="px-3 py-2 border rounded-lg text-sm w-32"
                    placeholder="Class ID" value={classId} onChange={e => setClassId(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
                {!selectedExamId ? (
                    <div className="flex items-center justify-center h-[400px] text-gray-400">
                        Please select an exam to view entries
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-[400px] text-gray-500">Loading entries...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Roll No</th>
                                <th className="px-4 py-3">Student Name</th>
                                <th className="px-4 py-3">Total Marks</th>
                                <th className="px-4 py-3">Percentage</th>
                                <th className="px-4 py-3">Grade</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {results?.results?.map((r) => (
                                <tr key={r.student_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{r.roll_no}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{r.student_name}</td>
                                    <td className="px-4 py-3">{r.total_obtained} / {r.total_max}</td>
                                    <td className="px-4 py-3 font-medium">{r.percentage}%</td>
                                    <td className="px-4 py-3 text-[#6c5ce7] font-semibold">{r.grade}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!results?.results || results.results.length === 0) && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No entries found for this class</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
