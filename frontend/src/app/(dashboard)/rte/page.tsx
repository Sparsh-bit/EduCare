'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { authStorage } from '@/lib/authStorage';
import { API_BASE } from '@/lib/runtimeConfig';

const API = API_BASE;
const getToken = () => authStorage.getToken() || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['RTE Students', 'Quota Management', 'Entitlements', 'Claims'] as const;
type Tab = typeof TABS[number];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  paid: 'bg-emerald-50 text-emerald-700',
};

export default function RTEPage() {
  const [activeTab, setActiveTab] = useState<Tab>('RTE Students');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // RTE Students
  const [rteStudents, setRteStudents] = useState<Record<string, any>[]>([]);
  const [tagModal, setTagModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const [tagForm, setTagForm] = useState({ student_id: '', rte_category: 'EWS', rte_admission_number: '', rte_admission_date: '' });

  // Quota
  const [quota, setQuota] = useState<Record<string, any>[]>([]);

  // Entitlements
  const [academicYears, setAcademicYears] = useState<Record<string, any>[]>([]);
  const [entAcademicYear, setEntAcademicYear] = useState('');
  const [entitlements, setEntitlements] = useState<Record<string, any>[]>([]);
  const [entModal, setEntModal] = useState<Record<string, any> | null>(null);
  const [entForm, setEntForm] = useState({ entitlement_type: '', provided: false, provided_date: '', cost: '', remarks: '' });

  // Claims
  const [claims, setClaims] = useState<Record<string, any>[]>([]);
  const [claimModal, setClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({ academic_year_id: '', claim_date: '', claim_number: '', total_amount: '', student_count: '' });
  const [selectedClaim, setSelectedClaim] = useState<Record<string, any> | null>(null);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); } else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const loadRteStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/students`, { headers: authHeaders() });
      const d = await res.json();
      setRteStudents(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadQuota = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/quota`, { headers: authHeaders() });
      const d = await res.json();
      setQuota(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/claims`, { headers: authHeaders() });
      const d = await res.json();
      setClaims(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadEntitlements = useCallback(async () => {
    if (!entAcademicYear) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/entitlements?academic_year_id=${entAcademicYear}`, { headers: authHeaders() });
      const d = await res.json();
      setEntitlements(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [entAcademicYear]);

  useEffect(() => {
    fetch(`${API}/students/academic-years`, { headers: authHeaders() }).then(r => r.json()).then(d => setAcademicYears(Array.isArray(d) ? d : (d.data || []))).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'RTE Students') loadRteStudents();
    else if (activeTab === 'Quota Management') loadQuota();
    else if (activeTab === 'Claims') loadClaims();
  }, [activeTab, loadRteStudents, loadQuota, loadClaims]);

  useEffect(() => { loadEntitlements(); }, [loadEntitlements]);

  // Student search for tag modal
  useEffect(() => {
    if (studentSearch.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`${API}/students?search=${studentSearch}`, { headers: authHeaders() });
      const d = await res.json();
      setSearchResults(d.data || d.students || []);
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const tagStudent = async () => {
    if (!tagForm.student_id || !tagForm.rte_admission_number || !tagForm.rte_admission_date) {
      showMsg('All fields are required.', true); return;
    }
    setLoading(true);
    try {
      const { student_id, ...tagPayload } = tagForm;
      const res = await fetch(`${API}/rte/students/${student_id}/tag`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(tagPayload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Failed to tag student');
      showMsg('Student tagged as RTE successfully.');
      setTagModal(false);
      setTagForm({ student_id: '', rte_category: 'EWS', rte_admission_number: '', rte_admission_date: '' });
      loadRteStudents();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const saveQuota = async () => {
    setLoading(true);
    try {
      const errors: string[] = [];
      for (const row of quota) {
        const res = await fetch(`${API}/rte/quota`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ class_id: row.class_id, total_seats: row.total_seats }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          errors.push(d.error || d.message || `Failed to save quota for class ${row.class_name}`);
        }
      }
      if (errors.length) throw new Error(errors.join('; '));
      showMsg('Quota saved successfully.');
      loadQuota();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const saveEntitlement = async () => {
    if (!entModal) {
      showMsg('No student selected for entitlement.', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/entitlements`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ student_id: entModal.student_id, ...entForm }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to save entitlement');
      showMsg('Entitlement recorded.');
      setEntModal(null);
      loadEntitlements();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const createClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/claims`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(claimForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create claim');
      showMsg('Claim created successfully.');
      setClaimModal(false);
      setClaimForm({ academic_year_id: '', claim_date: '', claim_number: '', total_amount: '', student_count: '' });
      loadClaims();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  // Counts
  const ewsCount = rteStudents.filter(s => s.rte_category === 'EWS').length;
  const dgCount = rteStudents.filter(s => s.rte_category === 'DG').length;
  const cwsnCount = rteStudents.filter(s => s.rte_category === 'CWSN').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">RTE Compliance Management</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-[#6c5ce7] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {success && <div className="px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">{success}</div>}
      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {/* ── RTE Students ── */}
      {activeTab === 'RTE Students' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total RTE Students', value: rteStudents.length, color: 'bg-purple-50 text-[#6c5ce7]' },
              { label: 'EWS', value: ewsCount, color: 'bg-blue-50 text-blue-700' },
              { label: 'DG', value: dgCount, color: 'bg-amber-50 text-amber-700' },
              { label: 'CWSN', value: cwsnCount, color: 'bg-emerald-50 text-emerald-700' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color.split(' ')[1]}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setTagModal(true)}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1]">
              + Tag Student as RTE
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Admission No</th>
                  <th className="px-4 py-3 text-left">RTE Admission Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : rteStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No RTE students found.</td></tr>
                ) : rteStudents.map((s, idx) => (
                  <tr key={String(s.id ?? `rte-${idx}`)} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.class_name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-50 text-[#6c5ce7] text-xs font-medium rounded-lg">{s.rte_category}</span></td>
                    <td className="px-4 py-3 text-gray-600">{s.admission_no}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rte_admission_date}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">{s.status || 'active'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quota Management ── */}
      {activeTab === 'Quota Management' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={saveQuota} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Quota'}
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Total Seats</th>
                  <th className="px-4 py-3 text-left">RTE Seats (25%)</th>
                  <th className="px-4 py-3 text-left">Filled</th>
                  <th className="px-4 py-3 text-left">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quota.map((row, i) => (
                  <tr key={row.class_id || i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.class_name}</td>
                    <td className="px-4 py-3">
                      <input type="number" value={row.total_seats}
                        onChange={e => setQuota(prev => prev.map((r, idx) => idx === i ? { ...r, total_seats: Number(e.target.value) } : r))}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
                    </td>
                    <td className="px-4 py-3 text-[#6c5ce7] font-semibold">{Math.floor(row.total_seats * 0.25)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.filled || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${(Math.floor(row.total_seats * 0.25) - (row.filled || 0)) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Math.floor(row.total_seats * 0.25) - (row.filled || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
                {quota.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No quota data found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Entitlements ── */}
      {activeTab === 'Entitlements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium">Academic Year:</label>
            <select value={entAcademicYear} onChange={e => setEntAcademicYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
              <option value="">Select Year</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name || ay.year}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Student Name</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-center">Uniform</th>
                  <th className="px-4 py-3 text-center">Books</th>
                  <th className="px-4 py-3 text-center">Mid-day Meal</th>
                  <th className="px-4 py-3 text-center">Stationery</th>
                  <th className="px-4 py-3 text-center">Bag</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entitlements.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Select academic year to view entitlements.</td></tr>
                ) : entitlements.map(s => (
                  <tr key={s.student_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.class_name}</td>
                    {['uniform', 'books', 'mid_day_meal', 'stationery', 'bag'].map(key => (
                      <td key={key} className="px-4 py-3 text-center">
                        <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-xs ${s[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s[key] ? '✓' : '×'}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <button onClick={() => { setEntModal(s); setEntForm({ entitlement_type: '', provided: false, provided_date: '', cost: '', remarks: '' }); }}
                        className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5a4bd1]">
                        Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Claims ── */}
      {activeTab === 'Claims' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setClaimModal(true)}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1]">
              + New Claim
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Claim No</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Students</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No claims found.</td></tr>
                ) : claims.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.claim_number}</td>
                    <td className="px-4 py-3 text-gray-600">{c.claim_date}</td>
                    <td className="px-4 py-3 text-gray-600">{c.student_count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">₹{Number(c.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedClaim(c)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tag Student Modal ── */}
      {tagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Tag Student as RTE</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
              <input type="text" placeholder="Name or admission number..." value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {searchResults.map(s => (
                    <button key={s.id} onClick={() => { setTagForm(f => ({ ...f, student_id: s.id })); setStudentSearch(s.name); setSearchResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0">
                      <span className="font-medium">{s.name}</span> <span className="text-gray-500 text-xs">— {s.admission_no} {s.class_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RTE Category</label>
              <select value={tagForm.rte_category} onChange={e => setTagForm({ ...tagForm, rte_category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="EWS">EWS (Economically Weaker Section)</option>
                <option value="DG">DG (Disadvantaged Group)</option>
                <option value="CWSN">CWSN (Children with Special Needs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RTE Admission Number</label>
              <input type="text" value={tagForm.rte_admission_number}
                onChange={e => setTagForm({ ...tagForm, rte_admission_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RTE Admission Date</label>
              <input type="date" value={tagForm.rte_admission_date}
                onChange={e => setTagForm({ ...tagForm, rte_admission_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setTagModal(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={tagStudent} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
                {loading ? 'Saving...' : 'Tag Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entitlement Modal ── */}
      {entModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Record Entitlement — {entModal.name}</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entitlement Type</label>
              <select value={entForm.entitlement_type} onChange={e => setEntForm({ ...entForm, entitlement_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="">Select Type</option>
                {['uniform', 'books', 'mid_day_meal', 'stationery', 'bag'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ent_provided" checked={entForm.provided}
                onChange={e => setEntForm({ ...entForm, provided: e.target.checked })} className="w-4 h-4 accent-[#6c5ce7]" />
              <label htmlFor="ent_provided" className="text-sm text-gray-700">Provided</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Provided Date</label>
              <input type="date" value={entForm.provided_date} onChange={e => setEntForm({ ...entForm, provided_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost (₹)</label>
              <input type="number" value={entForm.cost} onChange={e => setEntForm({ ...entForm, cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <textarea rows={2} value={entForm.remarks} onChange={e => setEntForm({ ...entForm, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEntModal(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={saveEntitlement} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Claim Modal ── */}
      {claimModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">New Reimbursement Claim</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <select value={claimForm.academic_year_id} onChange={e => setClaimForm({ ...claimForm, academic_year_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="">Select Year</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name || ay.year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Claim Number</label>
              <input type="text" value={claimForm.claim_number} onChange={e => setClaimForm({ ...claimForm, claim_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Claim Date</label>
              <input type="date" value={claimForm.claim_date} onChange={e => setClaimForm({ ...claimForm, claim_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹)</label>
              <input type="number" value={claimForm.total_amount} onChange={e => setClaimForm({ ...claimForm, total_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Student Count</label>
              <input type="number" value={claimForm.student_count} onChange={e => setClaimForm({ ...claimForm, student_count: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setClaimModal(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={createClaim} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
                {loading ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Claim Details — {selectedClaim.claim_number}</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Date</dt><dd className="font-medium">{selectedClaim.claim_date}</dd>
              <dt className="text-gray-500">Students</dt><dd className="font-medium">{selectedClaim.student_count}</dd>
              <dt className="text-gray-500">Amount</dt><dd className="font-semibold text-gray-900">₹{Number(selectedClaim.total_amount).toLocaleString('en-IN')}</dd>
              <dt className="text-gray-500">Status</dt>
              <dd><span className={`px-2 py-1 text-xs font-medium rounded-lg ${STATUS_BADGE[selectedClaim.status] || 'bg-gray-100 text-gray-600'}`}>{selectedClaim.status}</span></dd>
            </dl>
            <button onClick={() => setSelectedClaim(null)} className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
