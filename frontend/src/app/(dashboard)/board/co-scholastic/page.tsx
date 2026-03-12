'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import { api } from '@/lib/api';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D', 'E'];
const TERMS = ['Term1', 'Term2', 'Annual'];

const CO_SCHOLASTIC_FIELDS = [
  { key: 'art_education', label: 'Art Education' },
  { key: 'work_education', label: 'Work Education' },
  { key: 'health_pe', label: 'Health & Physical Education' },
  { key: 'thinking_skills', label: 'Thinking Skills' },
  { key: 'social_skills', label: 'Social Skills' },
  { key: 'emotional_skills', label: 'Emotional Skills' },
  { key: 'attitude_school', label: 'Attitude towards School' },
  { key: 'attitude_teachers', label: 'Attitude towards Teachers' },
  { key: 'attitude_peers', label: 'Attitude towards Peers' },
];

interface StudentRow {
  student_id: number;
  name: string;
  roll_number: string;
  art_education: string;
  work_education: string;
  health_pe: string;
  thinking_skills: string;
  social_skills: string;
  emotional_skills: string;
  attitude_school: string;
  attitude_teachers: string;
  attitude_peers: string;
  teacher_remarks: string;
}

export default function CoScholasticPage() {
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: number; year: string; name?: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [term, setTerm] = useState('Term1');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); } else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  useEffect(() => {
    Promise.all([
      api.getClasses(),
      api.getAcademicYears(),
    ]).then(([cls, ay]) => {
      setClasses(cls);
      setAcademicYears(ay);
    }).catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    if (!classId || !academicYearId) { showMsg('Please select class and academic year.', true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/board/co-scholastic/bulk/${classId}/${academicYearId}/${term}`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to load students');
      setStudents(d.data || []);
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  }, [classId, academicYearId, term]);

  const updateField = (studentId: number, field: keyof StudentRow, value: string) => {
    setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, [field]: value } : s));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/board/co-scholastic/bulk`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ class_id: classId, academic_year_id: academicYearId, term, students }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Save failed');
      showMsg('Co-scholastic grades saved successfully.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Co-Scholastic Grading</h1>
        {students.length > 0 && (
          <button onClick={saveAll} disabled={saving}
            className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
            {saving ? 'Saving...' : 'Save All Grades'}
          </button>
        )}
      </div>

      {success && <div className="px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">{success}</div>}
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
          <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
            <option value="">Select Year</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name || ay.year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
          <select value={term} onChange={e => setTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={loadStudents} disabled={loading}
          className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
          {loading ? 'Loading...' : 'Load Students'}
        </button>
      </div>

      {/* Grades Table */}
      {students.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50/80 z-10">Student</th>
                <th className="px-4 py-3 text-left sticky left-[200px] bg-gray-50/80 z-10">Roll No</th>
                {CO_SCHOLASTIC_FIELDS.map(f => (
                  <th key={f.key} className="px-3 py-3 text-left whitespace-nowrap">{f.label}</th>
                ))}
                <th className="px-4 py-3 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.student_id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10 whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-2 text-gray-500 sticky left-[200px] bg-white z-10">{s.roll_number}</td>
                  {CO_SCHOLASTIC_FIELDS.map(f => (
                    <td key={f.key} className="px-3 py-2">
                      <select value={(s[f.key as keyof StudentRow] as string) || ''}
                        onChange={e => updateField(s.student_id, f.key as keyof StudentRow, e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] w-16">
                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g || '--'}</option>)}
                      </select>
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <input type="text" value={s.teacher_remarks || ''}
                      onChange={e => updateField(s.student_id, 'teacher_remarks', e.target.value)}
                      placeholder="Remarks..."
                      className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] w-40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center text-gray-400">
          Select filters and click &quot;Load Students&quot; to begin grading.
        </div>
      )}
    </div>
  );
}
