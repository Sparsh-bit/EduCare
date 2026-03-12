/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';

export default function ParentResults() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [results, setResults] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildResults(parseInt(studentId));
                if (active) setResults(result as Record<string, any>[]);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [studentId]);

    if (!studentId) return <div className="text-gray-400 text-center py-8">Select a child from the dashboard</div>;
    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📝 Exam Results</h1>
            {results.length === 0 ? <p className="text-gray-400">No results available</p> : results.map((exam) => (
                <div key={exam.exam_id} className="card-glass p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div><h3 className="font-semibold text-gray-900">{exam.exam_name}</h3><p className="text-xs text-gray-400">Term {exam.term}</p></div>
                        <div className="text-right"><p className="text-2xl font-bold text-[#6c5ce7]">{exam.percentage}%</p><p className="text-xs text-gray-400">{exam.total_obtained}/{exam.total_max}</p></div>
                    </div>
                    <table className="data-table"><thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>Status</th></tr></thead><tbody>
                        {(exam.subjects as Array<Record<string, any>>)?.map((s) => <tr key={String(s.subject)}><td>{s.subject}</td><td>{s.max_marks}</td><td className={s.passed ? '' : 'text-red-600 font-bold'}>{s.obtained}</td><td><span className={`badge ${s.passed ? 'badge-green' : 'badge-red'}`}>{s.passed ? 'Pass' : 'Fail'}</span></td></tr>)}
                    </tbody></table>
                </div>
            ))}
        </div>
    );
}
