'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// ─── Types ────────────────────────────────────────────────────────────────────
interface BoardConfig {
  board_type: string; state_board_name: string; udise_code: string;
  pan_number: string; gstin: string; cce_enabled: boolean;
  fa_weightage: number; sa_weightage: number;
}
interface ExamTerm {
  id: number; term_type: string; term_name: string; max_marks: number;
  weightage_percent: number; start_date: string; end_date: string; status: string;
}
interface ReportCardConfig {
  school_name: string; school_address: string; school_phone: string;
  principal_name: string; affiliation_number: string;
  show_co_scholastic: boolean; show_attendance: boolean; show_remarks: boolean;
}

const TABS = ['Board Setup', 'Exam Terms', 'Report Card Settings'] as const;
type Tab = typeof TABS[number];

export default function BoardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Board Setup');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Board Setup
  const [boardConfig, setBoardConfig] = useState<BoardConfig>({
    board_type: 'CBSE', state_board_name: '', udise_code: '', pan_number: '',
    gstin: '', cce_enabled: false, fa_weightage: 40, sa_weightage: 60,
  });

  // Exam Terms
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [termForm, setTermForm] = useState({
    term_type: 'FA1', term_name: '', max_marks: 100, weightage_percent: 0,
    start_date: '', end_date: '',
  });

  // Report Card
  const [rcConfig, setRcConfig] = useState<ReportCardConfig>({
    school_name: '', school_address: '', school_phone: '', principal_name: '',
    affiliation_number: '', show_co_scholastic: true, show_attendance: true, show_remarks: true,
  });

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const loadBoardConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/board/config`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json(); if (d.data) setBoardConfig(d.data); }
    } catch { /* ignore */ }
  }, []);

  const loadTerms = useCallback(async () => {
    try {
      const res = await fetch(`${API}/board/terms`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json(); setTerms(d.data || []); }
    } catch { /* ignore */ }
  }, []);

  const loadRcConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/board/report-card-config`, { headers: authHeaders() });
      if (res.ok) { const d = await res.json(); if (d.data) setRcConfig(d.data); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'Board Setup') loadBoardConfig();
    else if (activeTab === 'Exam Terms') loadTerms();
    else loadRcConfig();
  }, [activeTab, loadBoardConfig, loadTerms, loadRcConfig]);

  const saveBoardConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/board/config`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(boardConfig),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      showMsg('Board configuration saved successfully.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const addTerm = async () => {
    if (!termForm.term_name || !termForm.start_date || !termForm.end_date) {
      showMsg('Please fill all term fields.', true); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/board/terms`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(termForm),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to add term');
      showMsg('Term added successfully.');
      setTermForm({ term_type: 'FA1', term_name: '', max_marks: 100, weightage_percent: 0, start_date: '', end_date: '' });
      loadTerms();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const deleteTerm = async (id: number) => {
    if (!confirm('Delete this term?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/board/terms/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      showMsg('Term deleted.');
      loadTerms();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const saveRcConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/board/report-card-config`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(rcConfig),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      showMsg('Report card configuration saved.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Board Configuration</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-[#6c5ce7] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Messages */}
      {success && <div className="px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-700 border border-emerald-200">{success}</div>}
      {error && <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {/* ── Board Setup ── */}
      {activeTab === 'Board Setup' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 max-w-2xl">
          <h2 className="font-semibold text-gray-800">Examination Board Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Board Type</label>
              <select value={boardConfig.board_type} onChange={e => setBoardConfig({ ...boardConfig, board_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State">State Board</option>
              </select>
            </div>
            {boardConfig.board_type === 'State' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State Board Name</label>
                <input type="text" value={boardConfig.state_board_name}
                  onChange={e => setBoardConfig({ ...boardConfig, state_board_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">UDISE Code</label>
              <input type="text" value={boardConfig.udise_code}
                onChange={e => setBoardConfig({ ...boardConfig, udise_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PAN Number</label>
              <input type="text" value={boardConfig.pan_number}
                onChange={e => setBoardConfig({ ...boardConfig, pan_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
              <input type="text" value={boardConfig.gstin}
                onChange={e => setBoardConfig({ ...boardConfig, gstin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">FA Weightage (%)</label>
              <input type="number" value={boardConfig.fa_weightage}
                onChange={e => setBoardConfig({ ...boardConfig, fa_weightage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SA Weightage (%)</label>
              <input type="number" value={boardConfig.sa_weightage}
                onChange={e => setBoardConfig({ ...boardConfig, sa_weightage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="cce" checked={boardConfig.cce_enabled}
                onChange={e => setBoardConfig({ ...boardConfig, cce_enabled: e.target.checked })}
                className="w-4 h-4 accent-[#6c5ce7]" />
              <label htmlFor="cce" className="text-sm text-gray-700">Enable CCE (Continuous & Comprehensive Evaluation)</label>
            </div>
          </div>
          <button onClick={saveBoardConfig} disabled={loading}
            className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Board Configuration'}
          </button>
        </div>
      )}

      {/* ── Exam Terms ── */}
      {activeTab === 'Exam Terms' && (
        <div className="space-y-6">
          {/* Add Term Form */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Add New Exam Term</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Term Type</label>
                <select value={termForm.term_type} onChange={e => setTermForm({ ...termForm, term_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                  {['FA1','FA2','SA1','SA2','ANNUAL','QUARTERLY','HALF_YEARLY','YEARLY'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Term Name</label>
                <input type="text" placeholder="e.g. First Term" value={termForm.term_name}
                  onChange={e => setTermForm({ ...termForm, term_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Marks</label>
                <input type="number" value={termForm.max_marks}
                  onChange={e => setTermForm({ ...termForm, max_marks: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weightage (%)</label>
                <input type="number" value={termForm.weightage_percent}
                  onChange={e => setTermForm({ ...termForm, weightage_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input type="date" value={termForm.start_date}
                  onChange={e => setTermForm({ ...termForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input type="date" value={termForm.end_date}
                  onChange={e => setTermForm({ ...termForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
              </div>
            </div>
            <button onClick={addTerm} disabled={loading}
              className="mt-4 px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Adding...' : '+ Add Term'}
            </button>
          </div>

          {/* Terms Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Max Marks</th>
                  <th className="px-4 py-3 text-left">Weightage</th>
                  <th className="px-4 py-3 text-left">Start Date</th>
                  <th className="px-4 py-3 text-left">End Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {terms.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No exam terms configured yet.</td></tr>
                ) : terms.map(term => (
                  <tr key={term.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-purple-50 text-[#6c5ce7] text-xs font-medium rounded-lg">{term.term_type}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-800">{term.term_name}</td>
                    <td className="px-4 py-3 text-gray-600">{term.max_marks}</td>
                    <td className="px-4 py-3 text-gray-600">{term.weightage_percent}%</td>
                    <td className="px-4 py-3 text-gray-600">{term.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">{term.end_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-lg font-medium ${term.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {term.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteTerm(term.id)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Report Card Settings ── */}
      {activeTab === 'Report Card Settings' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 max-w-2xl">
          <h2 className="font-semibold text-gray-800">Report Card Header Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">School Name</label>
              <input type="text" value={rcConfig.school_name}
                onChange={e => setRcConfig({ ...rcConfig, school_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">School Address</label>
              <textarea rows={2} value={rcConfig.school_address}
                onChange={e => setRcConfig({ ...rcConfig, school_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">School Phone</label>
              <input type="text" value={rcConfig.school_phone}
                onChange={e => setRcConfig({ ...rcConfig, school_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Principal Name</label>
              <input type="text" value={rcConfig.principal_name}
                onChange={e => setRcConfig({ ...rcConfig, principal_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Affiliation Number</label>
              <input type="text" value={rcConfig.affiliation_number}
                onChange={e => setRcConfig({ ...rcConfig, affiliation_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Display Options</p>
            {([
              ['show_co_scholastic', 'Show Co-Scholastic Activities'],
              ['show_attendance', 'Show Attendance Summary'],
              ['show_remarks', 'Show Teacher Remarks'],
            ] as [keyof ReportCardConfig, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <input type="checkbox" id={key} checked={rcConfig[key] as boolean}
                  onChange={e => setRcConfig({ ...rcConfig, [key]: e.target.checked })}
                  className="w-4 h-4 accent-[#6c5ce7]" />
                <label htmlFor={key} className="text-sm text-gray-700">{label}</label>
              </div>
            ))}
          </div>
          <button onClick={saveRcConfig} disabled={loading}
            className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
            {loading ? 'Saving...' : 'Save Report Card Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
