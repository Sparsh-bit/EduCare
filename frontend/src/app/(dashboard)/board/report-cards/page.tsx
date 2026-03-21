'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Printer } from 'lucide-react';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

interface StudentListItem {
    id: number; name: string; roll_number: string; admission_no: string;
    class_name: string; section_name: string;
}
interface ReportCardData {
    student: { name: string; class_name: string; section_name: string; roll_number: string; admission_no: string };
    school: { name: string; address: string; affiliation_number: string; phone: string; principal_name: string };
    subjects: Array<{ subject: string; written: number; oral: number; total: number; max_marks: number; percentage: number; grade: string }>;
    co_scholastic: { art_education: string; work_education: string; health_pe: string };
    life_skills: { thinking_skills: string; social_skills: string; emotional_skills: string };
    attendance: { total_working_days: number; present: number; percentage: number };
    remarks: string;
}

export default function ReportCardsPage() {
    const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
    const [exams, setExams] = useState<{ id: number; name: string }[]>([]);
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [examId, setExamId] = useState('');
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<number | null>(null);
    const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        Promise.all([
            api.getClasses(),
            fetch(`${API}/exams`, { headers: authHeaders() }).then(r => r.json()),
        ]).then(([cls, ex]) => {
            setClasses(cls);
            setExams(ex.data || ex || []);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (!classId) { setSections([]); return; }
        api.getSections(parseInt(classId)).then(setSections).catch(() => setSections([]));
    }, [classId]);

    const loadStudents = useCallback(async () => {
        if (!classId || !sectionId || !examId) { toast.error('Please select class, section and exam'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/students?class_id=${classId}&section_id=${sectionId}`, { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Failed to load students');
            setStudents(d.data || d.students || []);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to load students'); }
        setLoading(false);
    }, [classId, sectionId, examId]);

    const generateReportCard = async (studentId: number) => {
        setGenerating(studentId);
        try {
            const res = await fetch(`${API}/board/report-card/${studentId}/${examId}`, { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Failed to generate report card');
            setReportCard(d.data || d);
            setModalOpen(true);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to generate report card'); }
        setGenerating(null);
    };

    const selectCls = 'px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
                <p className="text-sm text-slate-500 mt-0.5">Generate and print student report cards for any exam</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-600">Class</label>
                    <select value={classId} onChange={e => setClassId(e.target.value)} className={selectCls}>
                        <option value="">Select class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-600">Section</label>
                    <select value={sectionId} onChange={e => setSectionId(e.target.value)} className={selectCls}>
                        <option value="">Select section</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-600">Exam</label>
                    <select value={examId} onChange={e => setExamId(e.target.value)} className={selectCls}>
                        <option value="">Select exam</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>
                <button onClick={loadStudents} disabled={loading} className="bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors">
                    {loading ? 'Loading...' : 'Load Students'}
                </button>
            </div>

            {/* Student List */}
            {students.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Roll No</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Student Name</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Admission No</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {students.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3 text-slate-400 text-xs">{s.roll_number}</td>
                                    <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                                    <td className="px-5 py-3 text-slate-500 text-xs">{s.admission_no}</td>
                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => generateReportCard(s.id)}
                                            disabled={generating === s.id}
                                            className="px-3 py-1.5 bg-[#6c5ce7] text-white text-xs font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors"
                                        >
                                            {generating === s.id ? 'Generating...' : 'Generate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Report Card Modal */}
            {modalOpen && reportCard && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl print:shadow-none print:rounded-none print:max-h-none print:overflow-visible" id="report-card-print">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 print:hidden">
                            <h2 className="font-semibold text-slate-900">Report Card Preview</h2>
                            <div className="flex gap-2">
                                <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#6c5ce7] text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-[#5b4bd5] transition-colors">
                                    <Printer size={14} /> Print
                                </button>
                                <button onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 print:p-6 space-y-6">
                            <div className="text-center border-b-2 border-slate-800 pb-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-2 flex items-center justify-center text-slate-400 text-xs">Logo</div>
                                <h1 className="text-xl font-bold text-slate-900">{reportCard.school.name}</h1>
                                <p className="text-sm text-slate-600">{reportCard.school.address}</p>
                                <p className="text-sm text-slate-600">Phone: {reportCard.school.phone} | Affiliation No: {reportCard.school.affiliation_number}</p>
                                <p className="text-base font-semibold text-slate-800 mt-2">REPORT CARD</p>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border border-slate-200 rounded-xl p-4 bg-slate-50">
                                {[
                                    ['Name', reportCard.student.name], ['Class', reportCard.student.class_name],
                                    ['Section', reportCard.student.section_name], ['Roll No', reportCard.student.roll_number],
                                    ['Admission No', reportCard.student.admission_no],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex gap-2"><span className="font-medium text-slate-600 w-28">{k}:</span><span className="text-slate-900">{v}</span></div>
                                ))}
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Academic Performance</h3>
                                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            {['Subject', 'Written', 'Oral/Practical', 'Total', 'Max Marks', '%', 'Grade'].map(h => (
                                                <th key={h} className={`px-3 py-2 text-xs font-medium text-slate-500 ${h === 'Subject' ? 'text-left' : 'text-center'}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(reportCard.subjects || []).map((sub, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2 font-medium text-slate-800">{sub.subject}</td>
                                                <td className="px-3 py-2 text-center">{sub.written}</td>
                                                <td className="px-3 py-2 text-center">{sub.oral}</td>
                                                <td className="px-3 py-2 text-center font-semibold">{sub.total}</td>
                                                <td className="px-3 py-2 text-center">{sub.max_marks}</td>
                                                <td className="px-3 py-2 text-center">{sub.percentage?.toFixed(1)}%</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className="px-2 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-semibold rounded-lg">{sub.grade}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Co-Scholastic Activities</h3>
                                    <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 text-xs font-medium text-slate-500 text-left">Activity</th>
                                                <th className="px-3 py-2 text-xs font-medium text-slate-500 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[
                                                ['Art Education', reportCard.co_scholastic?.art_education],
                                                ['Work Education', reportCard.co_scholastic?.work_education],
                                                ['Health & PE', reportCard.co_scholastic?.health_pe],
                                            ].map(([k, v]) => (
                                                <tr key={k}><td className="px-3 py-2 text-slate-700">{k}</td><td className="px-3 py-2 text-center font-semibold">{v || '—'}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Life Skills</h3>
                                    <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2 text-xs font-medium text-slate-500 text-left">Skill</th>
                                                <th className="px-3 py-2 text-xs font-medium text-slate-500 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[
                                                ['Thinking Skills', reportCard.life_skills?.thinking_skills],
                                                ['Social Skills', reportCard.life_skills?.social_skills],
                                                ['Emotional Skills', reportCard.life_skills?.emotional_skills],
                                            ].map(([k, v]) => (
                                                <tr key={k}><td className="px-3 py-2 text-slate-700">{k}</td><td className="px-3 py-2 text-center font-semibold">{v || '—'}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {reportCard.attendance && (
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Attendance</h3>
                                    <div className="flex gap-6 text-sm border border-slate-200 rounded-xl p-4 bg-slate-50">
                                        <div><span className="text-slate-500">Total Working Days: </span><span className="font-semibold">{reportCard.attendance.total_working_days}</span></div>
                                        <div><span className="text-slate-500">Present: </span><span className="font-semibold">{reportCard.attendance.present}</span></div>
                                        <div><span className="text-slate-500">Attendance: </span><span className="font-semibold">{reportCard.attendance.percentage?.toFixed(1)}%</span></div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Remarks</h3>
                                <div className="border border-slate-200 rounded-xl p-4 min-h-[60px] text-sm text-slate-700 bg-slate-50">
                                    {reportCard.remarks || 'No remarks.'}
                                </div>
                            </div>
                            <div className="flex justify-between pt-8 border-t border-slate-200">
                                <div className="text-center">
                                    <div className="w-32 border-b border-slate-400 mb-1" />
                                    <p className="text-xs text-slate-500">Class Teacher</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-32 border-b border-slate-400 mb-1" />
                                    <p className="text-xs text-slate-500">Principal — {reportCard.school.principal_name}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            #report-card-print, #report-card-print * { visibility: visible; }
                            #report-card-print { position: fixed; top: 0; left: 0; width: 100%; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
