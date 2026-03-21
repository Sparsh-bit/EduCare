'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { authStorage } from '@/lib/authStorage';
import { API_BASE } from '@/lib/runtimeConfig';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';

const API = API_BASE;
const getToken = () => authStorage.getToken() || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['RTE Students', 'Quota Management', 'Entitlements', 'Claims'] as const;
type Tab = typeof TABS[number];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  paid: 'bg-emerald-50 text-emerald-700',
};

export default function RTEPage() {
  const [activeTab, setActiveTab] = useState<Tab>('RTE Students');
  const [loading, setLoading] = useState(false);

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
    fetch(`${API}/students/academic-years`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setAcademicYears(Array.isArray(d) ? d : (d.data || [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'RTE Students') loadRteStudents();
    else if (activeTab === 'Quota Management') loadQuota();
    else if (activeTab === 'Claims') loadClaims();
  }, [activeTab, loadRteStudents, loadQuota, loadClaims]);

  useEffect(() => { loadEntitlements(); }, [loadEntitlements]);

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
      toast.error('All fields are required.'); return;
    }
    setLoading(true);
    try {
      const { student_id, ...tagPayload } = tagForm;
      const res = await fetch(`${API}/rte/students/${student_id}/tag`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(tagPayload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || d.error || 'Failed to tag student');
      toast.success('Student tagged as RTE successfully.');
      setTagModal(false);
      setTagForm({ student_id: '', rte_category: 'EWS', rte_admission_number: '', rte_admission_date: '' });
      loadRteStudents();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Operation failed'); }
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
      toast.success('Quota saved successfully.');
      loadQuota();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Operation failed'); }
    setLoading(false);
  };

  const saveEntitlement = async () => {
    if (!entModal) {
      toast.error('No student selected for entitlement.');
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
      toast.success('Entitlement recorded.');
      setEntModal(null);
      loadEntitlements();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Operation failed'); }
    setLoading(false);
  };

  const createClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/rte/claims`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(claimForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create claim');
      toast.success('Claim created successfully.');
      setClaimModal(false);
      setClaimForm({ academic_year_id: '', claim_date: '', claim_number: '', total_amount: '', student_count: '' });
      loadClaims();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Operation failed'); }
    setLoading(false);
  };

  const ewsCount = rteStudents.filter(s => s.rte_category === 'EWS').length;
  const dgCount = rteStudents.filter(s => s.rte_category === 'DG').length;
  const cwsnCount = rteStudents.filter(s => s.rte_category === 'CWSN').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">RTE Students</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage Right to Education student records, quotas, and government claims</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-[#6c5ce7] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── RTE Students ── */}
      {activeTab === 'RTE Students' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total RTE Students', value: rteStudents.length, color: 'text-[#6c5ce7]' },
              { label: 'EWS', value: ewsCount, color: 'text-blue-700' },
              { label: 'DG', value: dgCount, color: 'text-amber-700' },
              { label: 'CWSN', value: cwsnCount, color: 'text-emerald-700' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setTagModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5]">
              <Plus size={14} /> Tag Student as RTE
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Class</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Category</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">RTE Admission No</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Admission Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : rteStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No RTE students found.</td></tr>
                ) : rteStudents.map((s, idx) => (
                  <tr key={String(s.id ?? `rte-${idx}`)} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.class_name}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-medium rounded">{s.rte_category}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-5 py-3 text-slate-500">{s.rte_admission_date}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded">{s.status || 'active'}</span>
                    </td>
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
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Quota'}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Class</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Total Seats</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">RTE Seats (25%)</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Filled</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quota.map((row, i) => (
                  <tr key={row.class_id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{row.class_name}</td>
                    <td className="px-5 py-3">
                      <input type="number" value={row.total_seats}
                        onChange={e => setQuota(prev => prev.map((r, idx) => idx === i ? { ...r, total_seats: Number(e.target.value) } : r))}
                        className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                    </td>
                    <td className="px-5 py-3 text-[#6c5ce7] font-semibold">{Math.floor(row.total_seats * 0.25)}</td>
                    <td className="px-5 py-3 text-slate-500">{row.filled || 0}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${(Math.floor(row.total_seats * 0.25) - (row.filled || 0)) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Math.floor(row.total_seats * 0.25) - (row.filled || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
                {quota.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No quota data found.</td></tr>
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
            <label className="text-sm text-slate-600 font-medium">Academic Year:</label>
            <select value={entAcademicYear} onChange={e => setEntAcademicYear(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
              <option value="">Select Year</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name || ay.year}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Student Name</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Class</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Uniform</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Books</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Mid-day Meal</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Stationery</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Bag</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entitlements.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-sm">Select academic year to view entitlements.</td></tr>
                ) : entitlements.map(s => (
                  <tr key={s.student_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.class_name}</td>
                    {['uniform', 'books', 'mid_day_meal', 'stationery', 'bag'].map(key => (
                      <td key={key} className="px-5 py-3 text-center">
                        <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${s[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          {s[key] ? '✓' : '×'}
                        </span>
                      </td>
                    ))}
                    <td className="px-5 py-3">
                      <button onClick={() => { setEntModal(s); setEntForm({ entitlement_type: '', provided: false, provided_date: '', cost: '', remarks: '' }); }}
                        className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bd5]">
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
              className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5]">
              <Plus size={14} /> New Claim
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Claim No</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Students</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {claims.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">No claims found.</td></tr>
                ) : claims.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{c.claim_number}</td>
                    <td className="px-5 py-3 text-slate-500">{c.claim_date}</td>
                    <td className="px-5 py-3 text-slate-500">{c.student_count}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">₹{Number(c.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => setSelectedClaim(c)}
                        className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Tag Student as RTE</h2>
              <button onClick={() => setTagModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search Student</label>
              <input type="text" placeholder="Name or admission number..." value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {searchResults.map(s => (
                    <button key={s.id} onClick={() => { setTagForm(f => ({ ...f, student_id: s.id })); setStudentSearch(s.name); setSearchResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-0">
                      <span className="font-medium">{s.name}</span> <span className="text-slate-500 text-xs">— {s.admission_no} {s.class_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RTE Category</label>
              <select value={tagForm.rte_category} onChange={e => setTagForm({ ...tagForm, rte_category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                <option value="EWS">EWS (Economically Weaker Section)</option>
                <option value="DG">DG (Disadvantaged Group)</option>
                <option value="CWSN">CWSN (Children with Special Needs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RTE Admission Number</label>
              <input type="text" value={tagForm.rte_admission_number}
                onChange={e => setTagForm({ ...tagForm, rte_admission_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">RTE Admission Date</label>
              <input type="date" value={tagForm.rte_admission_date}
                onChange={e => setTagForm({ ...tagForm, rte_admission_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setTagModal(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={tagStudent} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Saving...' : 'Tag Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entitlement Modal ── */}
      {entModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Record Entitlement — {entModal.name}</h2>
              <button onClick={() => setEntModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Entitlement Type</label>
              <select value={entForm.entitlement_type} onChange={e => setEntForm({ ...entForm, entitlement_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                <option value="">Select Type</option>
                {['uniform', 'books', 'mid_day_meal', 'stationery', 'bag'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ent_provided" checked={entForm.provided}
                onChange={e => setEntForm({ ...entForm, provided: e.target.checked })} className="w-4 h-4 accent-[#6c5ce7]" />
              <label htmlFor="ent_provided" className="text-sm text-slate-700">Provided</label>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Provided Date</label>
              <input type="date" value={entForm.provided_date} onChange={e => setEntForm({ ...entForm, provided_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cost (₹)</label>
              <input type="number" value={entForm.cost} onChange={e => setEntForm({ ...entForm, cost: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Remarks</label>
              <textarea rows={2} value={entForm.remarks} onChange={e => setEntForm({ ...entForm, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEntModal(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={saveEntitlement} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Claim Modal ── */}
      {claimModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">New Reimbursement Claim</h2>
              <button onClick={() => setClaimModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Academic Year</label>
              <select value={claimForm.academic_year_id} onChange={e => setClaimForm({ ...claimForm, academic_year_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                <option value="">Select Year</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name || ay.year}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Claim Number</label>
              <input type="text" value={claimForm.claim_number} onChange={e => setClaimForm({ ...claimForm, claim_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Claim Date</label>
              <input type="date" value={claimForm.claim_date} onChange={e => setClaimForm({ ...claimForm, claim_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount (₹)</label>
              <input type="number" value={claimForm.total_amount} onChange={e => setClaimForm({ ...claimForm, total_amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Number of Students</label>
              <input type="number" value={claimForm.student_count} onChange={e => setClaimForm({ ...claimForm, student_count: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setClaimModal(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={createClaim} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Claim Details — {selectedClaim.claim_number}</h2>
              <button onClick={() => setSelectedClaim(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Date</dt><dd className="font-medium">{selectedClaim.claim_date}</dd>
              <dt className="text-slate-500">Students</dt><dd className="font-medium">{selectedClaim.student_count}</dd>
              <dt className="text-slate-500">Amount</dt><dd className="font-semibold text-slate-900">₹{Number(selectedClaim.total_amount).toLocaleString('en-IN')}</dd>
              <dt className="text-slate-500">Status</dt>
              <dd><span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_BADGE[selectedClaim.status] || 'bg-slate-100 text-slate-600'}`}>{selectedClaim.status}</span></dd>
            </dl>
            <button onClick={() => setSelectedClaim(null)} className="w-full px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
