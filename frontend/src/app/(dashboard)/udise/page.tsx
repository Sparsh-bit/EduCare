/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['Export Data', 'Infrastructure', 'Enrollment Summary'] as const;
type Tab = typeof TABS[number];

interface Infrastructure {
  classrooms: number; labs: number; library_books: number;
  boys_toilets: number; girls_toilets: number;
  has_drinking_water: boolean; has_electricity: boolean;
  has_internet: boolean; has_playground: boolean; has_medical_room: boolean;
}

export default function UDISEPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Export Data');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Export
  const [exportData, setExportData] = useState<Record<string, any> | null>(null);

  // Infrastructure
  const [infra, setInfra] = useState<Infrastructure>({
    classrooms: 0, labs: 0, library_books: 0,
    boys_toilets: 0, girls_toilets: 0,
    has_drinking_water: false, has_electricity: false,
    has_internet: false, has_playground: false, has_medical_room: false,
  });

  // Enrollment
  const [enrollment, setEnrollment] = useState<Record<string, any>[]>([]);
  const [teacherSummary, setTeacherSummary] = useState<Record<string, any> | null>(null);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); } else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const loadInfra = useCallback(async () => {
    try {
      const res = await fetch(`${API}/udise/infrastructure`, { headers: authHeaders() });
      if (!res.ok) return;
      const d = await res.json();
      // Backend returns the infra object directly (or {data: infra} in some versions)
      const infraData = d.data || d;
      if (infraData && typeof infraData === 'object' && infraData.classrooms !== undefined) setInfra(infraData);
    } catch { /* ignore */ }
  }, []);

  const loadEnrollment = useCallback(async () => {
    setLoading(true);
    try {
      const [enRes, tcRes] = await Promise.all([
        fetch(`${API}/udise/enrollment-summary`, { headers: authHeaders() }),
        fetch(`${API}/udise/teacher-summary`, { headers: authHeaders() }),
      ]);
      const en = await enRes.json();
      const tc = await tcRes.json();
      setEnrollment(en.data || []);
      // Teacher summary is returned directly, not wrapped in {data}
      setTeacherSummary(tc.data || tc || null);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'Infrastructure') loadInfra();
    else if (activeTab === 'Enrollment Summary') loadEnrollment();
  }, [activeTab, loadInfra, loadEnrollment]);

  const generateExport = async () => {
    setLoading(true);
    setExportData(null);
    try {
      const res = await fetch(`${API}/udise/export`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Export failed');
      setExportData(d.data || d);
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const downloadJson = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `udise-export-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const saveInfra = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/udise/infrastructure`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(infra),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      showMsg('Infrastructure data saved successfully.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">UDISE+ Reporting</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-[#6c5ce7] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {success && <div className="px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">{success}</div>}
      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {/* ── Export Data ── */}
      {activeTab === 'Export Data' && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <button onClick={generateExport} disabled={loading}
              className="px-6 py-3 bg-[#6c5ce7] text-white text-sm font-semibold rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Generating...' : 'Generate UDISE+ Report'}
            </button>
            {exportData && (
              <button onClick={downloadJson}
                className="px-4 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200">
                Download JSON
              </button>
            )}
          </div>

          {exportData && (
            <div className="space-y-6">
              {/* School Profile */}
              {exportData.school_profile && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">School Profile</h2>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {Object.entries(exportData.school_profile).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                        <dd className="font-medium text-gray-900 mt-0.5">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Enrollment Stats */}
              {exportData.enrollment && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">Enrollment Statistics</h2>
                    {exportData.enrollment.total_students != null && (
                      <p className="text-sm text-gray-500 mt-1">
                        Total: <b>{exportData.enrollment.total_students}</b>
                        {exportData.enrollment.rte_students != null && <> · RTE: <b>{exportData.enrollment.rte_students}</b></>}
                      </p>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                        <th className="px-4 py-3 text-left">Class</th>
                        <th className="px-4 py-3 text-center">Gender</th>
                        <th className="px-4 py-3 text-center">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(Array.isArray(exportData.enrollment) ? exportData.enrollment : Array.isArray(exportData.enrollment?.by_class_gender) ? exportData.enrollment.by_class_gender : []).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium">{row.class_name}</td>
                          <td className="px-4 py-3 text-center capitalize">{row.gender ?? '-'}</td>
                          <td className="px-4 py-3 text-center font-semibold">{row.count ?? row.total ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Teacher Stats */}
              {exportData.teachers && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Teacher Statistics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(exportData.teachers).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Infrastructure Summary */}
              {exportData.infrastructure && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Infrastructure Summary</h2>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {Object.entries(exportData.infrastructure).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                        <dd className="font-medium text-gray-900 mt-0.5">{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Infrastructure ── */}
      {activeTab === 'Infrastructure' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 max-w-2xl">
          <h2 className="font-semibold text-gray-800">School Infrastructure Details</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {([
              ['classrooms', 'Classrooms'],
              ['labs', 'Labs'],
              ['library_books', 'Library Books'],
              ['boys_toilets', 'Boys Toilets'],
              ['girls_toilets', 'Girls Toilets'],
            ] as [keyof Infrastructure, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="number" value={infra[key] as number}
                  onChange={e => setInfra({ ...infra, [key]: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Facilities Available</p>
            {([
              ['has_drinking_water', 'Drinking Water'],
              ['has_electricity', 'Electricity'],
              ['has_internet', 'Internet Connectivity'],
              ['has_playground', 'Playground'],
              ['has_medical_room', 'Medical Room'],
            ] as [keyof Infrastructure, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <input type="checkbox" id={key} checked={infra[key] as boolean}
                  onChange={e => setInfra({ ...infra, [key]: e.target.checked })}
                  className="w-4 h-4 accent-[#6c5ce7]" />
                <label htmlFor={key} className="text-sm text-gray-700">{label}</label>
              </div>
            ))}
          </div>
          <button onClick={saveInfra} disabled={loading}
            className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Infrastructure Data'}
          </button>
        </div>
      )}

      {/* ── Enrollment Summary ── */}
      {activeTab === 'Enrollment Summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Class-wise Enrollment</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-center">Boys</th>
                  <th className="px-4 py-3 text-center">Girls</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">SC</th>
                  <th className="px-4 py-3 text-center">ST</th>
                  <th className="px-4 py-3 text-center">OBC</th>
                  <th className="px-4 py-3 text-center">General</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : enrollment.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No enrollment data found.</td></tr>
                ) : enrollment.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.class_name}</td>
                    <td className="px-4 py-3 text-center">{row.boys ?? '-'}</td>
                    <td className="px-4 py-3 text-center">{row.girls ?? '-'}</td>
                    <td className="px-4 py-3 text-center font-semibold">{row.total ?? '-'}</td>
                    <td className="px-4 py-3 text-center">{row.sc ?? '-'}</td>
                    <td className="px-4 py-3 text-center">{row.st ?? '-'}</td>
                    <td className="px-4 py-3 text-center">{row.obc ?? '-'}</td>
                    <td className="px-4 py-3 text-center">{row.general ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Teacher Summary */}
          {teacherSummary && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Teacher Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(teacherSummary).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
