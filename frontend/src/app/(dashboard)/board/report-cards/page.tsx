'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import { api } from '@/lib/api';

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
  const [error, setError] = useState('');

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
    if (!classId || !sectionId || !examId) { setError('Please select class, section and exam.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/students?class_id=${classId}&section_id=${sectionId}`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to load students');
      setStudents(d.data || d.students || []);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Operation failed'); }
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
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Operation failed'); }
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Report Card Generation</h1>

      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
          <select value={sectionId} onChange={e => setSectionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
            <option value="">Select Section</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Exam</label>
          <select value={examId} onChange={e => setExamId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
            <option value="">Select Exam</option>
            {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>
        <button onClick={loadStudents} disabled={loading}
          className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
          {loading ? 'Loading...' : 'Load Students'}
        </button>
      </div>

      {/* Student List */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                <th className="px-4 py-3 text-left">Roll No</th>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Admission No</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500">{s.roll_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.admission_no}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => generateReportCard(s.id)} disabled={generating === s.id}
                      className="px-3 py-1 bg-[#6c5ce7] text-white text-xs font-medium rounded-lg hover:bg-[#5a4bd1] disabled:opacity-60">
                      {generating === s.id ? 'Generating...' : 'Generate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Print Report Card Modal */}
      {modalOpen && reportCard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:p-0">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:max-h-none print:overflow-visible" id="report-card-print">

            {/* Action Bar (hidden on print) */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 print:hidden">
              <h2 className="font-bold text-gray-800">Report Card Preview</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()}
                  className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1]">
                  Print
                </button>
                <button onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200">
                  Close
                </button>
              </div>
            </div>

            <div className="p-8 print:p-6 space-y-6">
              {/* School Header */}
              <div className="text-center border-b-2 border-gray-800 pb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-400 text-xs">Logo</div>
                <h1 className="text-xl font-bold text-gray-900">{reportCard.school.name}</h1>
                <p className="text-sm text-gray-600">{reportCard.school.address}</p>
                <p className="text-sm text-gray-600">Phone: {reportCard.school.phone} | Affiliation No: {reportCard.school.affiliation_number}</p>
                <p className="text-base font-semibold text-gray-800 mt-2">REPORT CARD</p>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                {[
                  ['Name', reportCard.student.name], ['Class', reportCard.student.class_name],
                  ['Section', reportCard.student.section_name], ['Roll No', reportCard.student.roll_number],
                  ['Admission No', reportCard.student.admission_no],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2"><span className="font-medium text-gray-600 w-28">{k}:</span><span className="text-gray-900">{v}</span></div>
                ))}
              </div>

              {/* Marks Table */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Academic Performance</h3>
                <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-center">Written</th>
                      <th className="px-3 py-2 text-center">Oral/Practical</th>
                      <th className="px-3 py-2 text-center">Total</th>
                      <th className="px-3 py-2 text-center">Max Marks</th>
                      <th className="px-3 py-2 text-center">%</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportCard.subjects || []).map((sub, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-800">{sub.subject}</td>
                        <td className="px-3 py-2 text-center">{sub.written}</td>
                        <td className="px-3 py-2 text-center">{sub.oral}</td>
                        <td className="px-3 py-2 text-center font-semibold">{sub.total}</td>
                        <td className="px-3 py-2 text-center">{sub.max_marks}</td>
                        <td className="px-3 py-2 text-center">{sub.percentage?.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-2 py-0.5 bg-purple-50 text-[#6c5ce7] text-xs font-bold rounded-lg">{sub.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Co-Scholastic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Co-Scholastic Activities</h3>
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                        <th className="px-3 py-2 text-left">Activity</th>
                        <th className="px-3 py-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ['Art Education', reportCard.co_scholastic?.art_education],
                        ['Work Education', reportCard.co_scholastic?.work_education],
                        ['Health & PE', reportCard.co_scholastic?.health_pe],
                      ].map(([k, v]) => (
                        <tr key={k}><td className="px-3 py-2">{k}</td><td className="px-3 py-2 text-center font-semibold">{v || '-'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Life Skills</h3>
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                        <th className="px-3 py-2 text-left">Skill</th>
                        <th className="px-3 py-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ['Thinking Skills', reportCard.life_skills?.thinking_skills],
                        ['Social Skills', reportCard.life_skills?.social_skills],
                        ['Emotional Skills', reportCard.life_skills?.emotional_skills],
                      ].map(([k, v]) => (
                        <tr key={k}><td className="px-3 py-2">{k}</td><td className="px-3 py-2 text-center font-semibold">{v || '-'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance */}
              {reportCard.attendance && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Attendance</h3>
                  <div className="flex gap-6 text-sm border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div><span className="text-gray-500">Total Working Days: </span><span className="font-semibold">{reportCard.attendance.total_working_days}</span></div>
                    <div><span className="text-gray-500">Present: </span><span className="font-semibold">{reportCard.attendance.present}</span></div>
                    <div><span className="text-gray-500">Attendance %: </span><span className="font-semibold">{reportCard.attendance.percentage?.toFixed(1)}%</span></div>
                  </div>
                </div>
              )}

              {/* Remarks & Signatures */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Remarks</h3>
                <div className="border border-gray-200 rounded-xl p-4 min-h-[60px] text-sm text-gray-700 bg-gray-50/50">
                  {reportCard.remarks || 'No remarks.'}
                </div>
              </div>
              <div className="flex justify-between pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="w-32 border-b border-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Class Teacher</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b border-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Principal — {reportCard.school.principal_name}</p>
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
