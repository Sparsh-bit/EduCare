'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Exam, ExamResultsResponse, Class } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function ExamsPage() {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [results, setResults] = useState<ExamResultsResponse | null>(null);

    useEffect(() => {
        Promise.all([api.getExams(), api.getClasses()])
            .then(([e, c]) => { setExams(e); setClasses(c); })
            .catch(reportApiError).finally(() => setLoading(false));
    }, []);

    const viewResults = async (exam: Exam) => {
        setSelectedExam(exam);
        try { setResults(await api.getExamResults(exam.id, exam.class_id)); } catch (e) { reportApiError(e); }
    };

    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">📝 Examinations</h1>
                {!isTeacher ? (
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">➕ Create Exam</button>
                ) : (
                    <button onClick={async () => {
                        try {
                            await api.requestExamAccess();
                            toast.success('Request sent to admin for examination creation access.');
                        } catch (e) {
                            reportApiError(e);
                        }
                    }} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        🔒 Request Access
                    </button>
                )}
            </div>

            {showCreate && !isTeacher && <CreateExamForm classes={classes} onClose={() => { setShowCreate(false); api.getExams().then(setExams); }} />}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="card-glass p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div><h3 className="font-semibold text-gray-900">{exam.name}</h3><p className="text-xs text-gray-400">{String(exam.class_name || '').toLowerCase().startsWith('class') ? exam.class_name : 'Class ' + exam.class_name} · Term {exam.term}</p></div>
                            <span className={`badge ${exam.status === 'upcoming' ? 'badge-blue' : exam.status === 'ongoing' ? 'badge-yellow' : 'badge-green'}`}>{exam.status}</span>
                        </div>
                        {exam.start_date && <p className="text-xs text-gray-400 mb-3">📅 {new Date(exam.start_date).toLocaleDateString('en-IN')}</p>}
                        <button onClick={() => viewResults(exam)} className="text-[#6c5ce7] hover:text-[#5b4bd5] text-sm font-medium">📊 View Results →</button>
                    </div>
                ))}
            </div>

            {results && selectedExam && (
                <div className="card-glass p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Results: {selectedExam.name} — {String(selectedExam.class_name || '').toLowerCase().startsWith('class') ? selectedExam.class_name : 'Class ' + selectedExam.class_name}</h3>
                        <button onClick={() => { setResults(null); setSelectedExam(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    {results.results?.length === 0 ? <p className="text-gray-400">No results yet</p> : (
                        <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Roll</th><th>Name</th><th>Total</th><th>%</th><th>Grade</th><th>Status</th></tr></thead><tbody>
                            {results.results?.map((r) => (
                                <tr key={r.student_id}><td>{r.roll_no}</td><td className="text-gray-900 font-medium">{r.student_name}</td>
                                    <td className="font-medium">{r.total_obtained}/{r.total_max}</td><td className="font-bold">{r.percentage}%</td>
                                    <td className="text-[#6c5ce7] font-semibold">{r.grade}</td>
                                    <td><span className={`badge ${r.status === 'Pass' ? 'badge-green' : 'badge-red'}`}>{r.status}</span></td></tr>
                            ))}
                        </tbody></table></div>
                    )}
                </div>
            )}
        </div>
    );
}

function CreateExamForm({ classes, onClose }: { classes: Class[]; onClose: () => void }) {
    const [form, setForm] = useState({ name: '', term: '1', class_id: '', start_date: '', end_date: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await api.createExam({ ...form, class_id: parseInt(form.class_id), subjects: [{ subject_id: 1, max_marks: 100, passing_marks: 33 }] }); onClose(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to create exam'); } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="card-glass p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-500 mb-1 block">Exam Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" required placeholder="Half Yearly Exam" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Term</label><select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm"><option value="1">Term 1</option><option value="2">Term 2</option></select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Class</label><select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" required><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{String(c.name || '').toLowerCase().startsWith('class') ? c.name : 'Class ' + c.name}</option>)}</select></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" /></div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={loading} className="btn-primary text-sm">{loading ? 'Creating...' : '💾 Create'}</button><button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button></div>
        </form>
    );
}
