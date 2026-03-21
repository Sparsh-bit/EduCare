/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import toast from 'react-hot-toast';
import { Plus, X, Upload, QrCode } from 'lucide-react';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['Instruments', 'Bounced Cheques', 'Bank Reconciliation', 'UPI QR'] as const;
type Tab = typeof TABS[number];

export default function AdvancedPaymentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Instruments');
  const [loading, setLoading] = useState(false);

  // Instruments
  const [instruments, setInstruments] = useState<Record<string, any>[]>([]);
  const [instFilter, setInstFilter] = useState({ instrument_type: '', date_from: '', date_to: '', status: '' });
  const [updateModal, setUpdateModal] = useState<Record<string, any> | null>(null);
  const [updateForm, setUpdateForm] = useState({ instrument_type: '', instrument_number: '', bank_name: '', instrument_date: '' });
  const [clearModal, setClearModal] = useState<Record<string, any> | null>(null);
  const [clearForm, setClearForm] = useState({ action: 'clear', clearance_date: '', bounce_penalty: '' });

  // Bounced Cheques
  const [bouncedList, setBouncedList] = useState<Record<string, any>[]>([]);

  // Bank Reconciliation
  const [csvText, setCsvText] = useState('');
  const [importModal, setImportModal] = useState(false);
  const [unreconciled, setUnreconciled] = useState<Record<string, any>[]>([]);
  const [reconSummary, setReconSummary] = useState<Record<string, any> | null>(null);
  const [matchModal, setMatchModal] = useState<Record<string, any> | null>(null);
  const [matchSearch, setMatchSearch] = useState('');
  const [matchResults, setMatchResults] = useState<Record<string, any>[]>([]);

  // UPI QR
  const [upiSearch, setUpiSearch] = useState('');
  const [upiSearchResults, setUpiSearchResults] = useState<Record<string, any>[]>([]);
  const [selectedUpiStudent, setSelectedUpiStudent] = useState<Record<string, any> | null>(null);
  const [generatedQR, setGeneratedQR] = useState<Record<string, any> | null>(null);
  const [recentQRs, setRecentQRs] = useState<Record<string, any>[]>([]);

  const loadInstruments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (instFilter.instrument_type) params.set('instrument_type', instFilter.instrument_type);
      if (instFilter.date_from) params.set('date_from', instFilter.date_from);
      if (instFilter.date_to) params.set('date_to', instFilter.date_to);
      if (instFilter.status) params.set('status', instFilter.status);
      const res = await fetch(`${API}/payment-instruments?${params}`, { headers: authHeaders() });
      const d = await res.json();
      setInstruments(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [instFilter]);

  const loadBounced = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment-instruments/bounced`, { headers: authHeaders() });
      const d = await res.json();
      setBouncedList(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadUnreconciled = useCallback(async () => {
    setLoading(true);
    try {
      const [unreconRes, summaryRes] = await Promise.all([
        fetch(`${API}/payment-instruments/bank-statements/unreconciled`, { headers: authHeaders() }),
        fetch(`${API}/payment-instruments/bank-statements/summary`, { headers: authHeaders() }),
      ]);
      const un = await unreconRes.json();
      const su = await summaryRes.json();
      setUnreconciled(un.data || []);
      setReconSummary(su.data || null);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadRecentQRs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/payment-instruments/upi-qr/recent`, { headers: authHeaders() });
      const d = await res.json();
      setRecentQRs(d.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'Instruments') loadInstruments();
    else if (activeTab === 'Bounced Cheques') loadBounced();
    else if (activeTab === 'Bank Reconciliation') loadUnreconciled();
    else if (activeTab === 'UPI QR') loadRecentQRs();
  }, [activeTab, loadInstruments, loadBounced, loadUnreconciled, loadRecentQRs]);

  useEffect(() => {
    if (upiSearch.length < 3) { setUpiSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`${API}/students?search=${upiSearch}`, { headers: authHeaders() });
      const d = await res.json();
      setUpiSearchResults(d.data || d.students || []);
    }, 300);
    return () => clearTimeout(t);
  }, [upiSearch]);

  useEffect(() => {
    if (!matchModal || matchSearch.length < 3) { setMatchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`${API}/fees/payments?search=${matchSearch}`, { headers: authHeaders() });
      const d = await res.json();
      setMatchResults(d.data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [matchSearch, matchModal]);

  const saveInstrument = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment-instruments/${updateModal!.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(updateForm),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Update failed');
      toast.success('Instrument updated.');
      setUpdateModal(null);
      loadInstruments();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Update failed'); }
    setLoading(false);
  };

  const clearOrBounce = async () => {
    setLoading(true);
    try {
      const body = clearForm.action === 'clear'
        ? { action: 'clear', clearance_date: clearForm.clearance_date }
        : { action: 'bounce', bounce_penalty: clearForm.bounce_penalty };
      const res = await fetch(`${API}/payment-instruments/${clearModal!.id}/status`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Update failed');
      toast.success(clearForm.action === 'clear' ? 'Cleared successfully.' : 'Marked as bounced.');
      setClearModal(null);
      loadInstruments();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Operation failed'); }
    setLoading(false);
  };

  const sendSmsReminder = async (id: number) => {
    try {
      await fetch(`${API}/communication/send`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ type: 'bounce_reminder', instrument_id: id }),
      });
      toast.success('SMS reminder sent.');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to send reminder'); }
  };

  const parseAndImportCSV = async () => {
    const lines = csvText.trim().split('\n').slice(1);
    const rows = lines.map(line => {
      const [date, description, credit, debit, balance, reference] = line.split(',').map(s => s.trim());
      return { date, description, credit: Number(credit) || 0, debit: Number(debit) || 0, balance: Number(balance) || 0, reference };
    });
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment-instruments/bank-statements`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(rows),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Import failed');
      toast.success(`${rows.length} statements imported.`);
      setImportModal(false);
      setCsvText('');
      loadUnreconciled();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Import failed'); }
    setLoading(false);
  };

  const reconcile = async (statementId: number, paymentId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment-instruments/bank-statements/${statementId}/reconcile`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ payment_id: paymentId }),
      });
      if (!res.ok) throw new Error('Reconciliation failed');
      toast.success('Entry reconciled.');
      setMatchModal(null);
      loadUnreconciled();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Reconciliation failed'); }
    setLoading(false);
  };

  const generateQR = async () => {
    if (!selectedUpiStudent) { toast.error('Select a student first.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment-instruments/upi-qr/${selectedUpiStudent!.id}`, {
        method: 'POST', headers: authHeaders(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'QR generation failed');
      setGeneratedQR(d.data || d);
      loadRecentQRs();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'QR generation failed'); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage cheques, bank reconciliation, and UPI payment codes</p>
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

      {/* ── Instruments ── */}
      {activeTab === 'Instruments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select value={instFilter.instrument_type} onChange={e => setInstFilter({ ...instFilter, instrument_type: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                <option value="">All Types</option>
                {['cash','cheque','online','bank_transfer','upi','dd'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input type="date" value={instFilter.date_from} onChange={e => setInstFilter({ ...instFilter, date_from: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input type="date" value={instFilter.date_to} onChange={e => setInstFilter({ ...instFilter, date_to: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={instFilter.status} onChange={e => setInstFilter({ ...instFilter, status: e.target.value })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                <option value="">All</option>
                {['pending','cleared','bounced'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <button onClick={loadInstruments} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
              Filter
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Receipt No</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Student</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Amount</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Type</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Instrument No</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Bank</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={9} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : instruments.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400 text-sm">No instruments found.</td></tr>
                ) : instruments.map(inst => (
                  <tr key={String(inst.id)} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{String(inst.receipt_no || '')}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{String(inst.student_name || '')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">₹{Number(inst.amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-[#f1f0ff] text-[#6c5ce7] text-xs rounded">{String(inst.instrument_type || inst.payment_mode || '')}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{String(inst.instrument_number || '—')}</td>
                    <td className="px-5 py-3 text-slate-500">{String(inst.bank_name || '—')}</td>
                    <td className="px-5 py-3 text-slate-500">{String(inst.instrument_date || inst.payment_date || '')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${inst.status === 'cleared' ? 'bg-emerald-50 text-emerald-700' : inst.status === 'bounced' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        {String(inst.status || 'pending')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setUpdateModal(inst); setUpdateForm({ instrument_type: String(inst.instrument_type || ''), instrument_number: String(inst.instrument_number || ''), bank_name: String(inst.bank_name || ''), instrument_date: String(inst.instrument_date || '') }); }}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Update</button>
                        <button onClick={() => { setClearModal(inst); setClearForm({ action: 'clear', clearance_date: '', bounce_penalty: '' }); }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Clear/Bounce</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Bounced Cheques ── */}
      {activeTab === 'Bounced Cheques' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Receipt</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Student</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Amount</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Cheque No</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Bank</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Bounce Date</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Penalty</th>
                <th className="px-5 py-3 text-xs font-medium text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : bouncedList.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-sm">No bounced cheques found.</td></tr>
              ) : bouncedList.map(item => (
                <tr key={String(item.id)} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{String(item.receipt_no || '')}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{String(item.student_name || '')}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{String(item.instrument_number || '')}</td>
                  <td className="px-5 py-3 text-slate-500">{String(item.bank_name || '')}</td>
                  <td className="px-5 py-3 text-slate-500">{String(item.bounce_date || item.instrument_date || '')}</td>
                  <td className="px-5 py-3 text-right text-red-600 font-medium">₹{Number(item.bounce_penalty || 0).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => sendSmsReminder(item.id as number)}
                      className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bd5]">
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bank Reconciliation ── */}
      {activeTab === 'Bank Reconciliation' && (
        <div className="space-y-4">
          {reconSummary && (
            <div className="grid grid-cols-3 gap-4">
              {([
                { label: 'Total Credits', value: (reconSummary.total_credits as number) || 0, color: 'text-emerald-700' },
                { label: 'Reconciled', value: (reconSummary.reconciled as number) || 0, color: 'text-blue-700' },
                { label: 'Unreconciled', value: (reconSummary.unreconciled as number) || 0, color: 'text-amber-700' },
              ] as Array<{ label: string; value: number; color: string }>).map(c => (
                <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => setImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5]">
              <Upload size={14} /> Import Bank Statement
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Description</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Credit</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Reference</th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unreconciled.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">No unreconciled entries. Import a bank statement to begin.</td></tr>
                ) : unreconciled.map(entry => (
                  <tr key={String(entry.id)} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{String(entry.date || '')}</td>
                    <td className="px-5 py-3 text-slate-900">{String(entry.description || '')}</td>
                    <td className="px-5 py-3 text-right text-emerald-700 font-semibold">₹{Number(entry.credit).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{String(entry.reference || '')}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setMatchModal(entry); setMatchSearch(''); setMatchResults([]); }}
                        className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bd5]">
                        Match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── UPI QR ── */}
      {activeTab === 'UPI QR' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 max-w-lg">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2"><QrCode size={18} className="text-[#6c5ce7]" /> Generate UPI Payment Code</h2>
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 mb-1">Search Student</label>
              <input type="text" placeholder="Name or admission number..." value={upiSearch}
                onChange={e => setUpiSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
              {upiSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {upiSearchResults.map(s => (
                    <button key={String(s.id)} onClick={() => { setSelectedUpiStudent(s); setUpiSearch(String(s.name || '')); setUpiSearchResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-0">
                      <span className="font-medium">{String(s.name || '')}</span> <span className="text-slate-500 text-xs">— {String(s.admission_no || '')} {String(s.class_name || '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedUpiStudent && (
              <div className="bg-[#f1f0ff] rounded-lg p-3 text-sm">
                <span className="text-slate-600">Selected: </span>
                <span className="font-semibold text-[#6c5ce7]">{String(selectedUpiStudent.name || '')}</span>
                <span className="text-slate-500 text-xs ml-2">({String(selectedUpiStudent.admission_no || '')})</span>
              </div>
            )}
            <button onClick={generateQR} disabled={loading || !selectedUpiStudent}
              className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
              <Plus size={14} /> {loading ? 'Generating...' : 'Generate QR Code'}
            </button>

            {generatedQR && (
              <div className="border border-slate-200 rounded-xl p-4 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700">QR Code Generated</p>
                {generatedQR.qr_image_url ? (
                  <img src={String(generatedQR.qr_image_url)} alt="UPI QR" className="w-48 h-48 mx-auto border rounded-xl" />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">QR Image</div>
                )}
                <p className="text-xs text-slate-500">UPI ID: {String(generatedQR.upi_id || '')}</p>
                <p className="text-xs text-slate-500">Amount: ₹{Number(generatedQR.amount || 0).toLocaleString('en-IN')}</p>
                <button onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
                  Print QR
                </button>
              </div>
            )}
          </div>

          {recentQRs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Recently Generated QR Codes</h2>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Student</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Amount</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">UPI ID</th>
                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentQRs.map((qr, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-medium text-slate-900">{String(qr.student_name || '')}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">₹{Number(qr.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{String(qr.upi_id || '')}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{String(qr.created_at || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Update Instrument Modal ── */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Update Instrument Details</h2>
              <button onClick={() => setUpdateModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            {([['instrument_type','Type'],['instrument_number','Instrument Number'],['bank_name','Bank Name'],['instrument_date','Instrument Date']] as [string,string][]).map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                {k === 'instrument_type' ? (
                  <select value={updateForm[k as keyof typeof updateForm]} onChange={e => setUpdateForm({ ...updateForm, [k]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none bg-white">
                    <option value="">Select</option>
                    {['cash','cheque','online','bank_transfer','upi','dd'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                ) : (
                  <input type={k === 'instrument_date' ? 'date' : 'text'} value={updateForm[k as keyof typeof updateForm]}
                    onChange={e => setUpdateForm({ ...updateForm, [k]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setUpdateModal(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={saveInstrument} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear/Bounce Modal ── */}
      {clearModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Clear / Bounce Instrument</h2>
              <button onClick={() => setClearModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="flex gap-3">
              {['clear','bounce'].map(a => (
                <button key={a} onClick={() => setClearForm({ ...clearForm, action: a })}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${clearForm.action === a ? 'bg-[#6c5ce7] text-white border-[#6c5ce7]' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                  {a === 'clear' ? 'Mark Cleared' : 'Mark Bounced'}
                </button>
              ))}
            </div>
            {clearForm.action === 'clear' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Clearance Date</label>
                <input type="date" value={clearForm.clearance_date} onChange={e => setClearForm({ ...clearForm, clearance_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bounce Penalty (₹)</label>
                <input type="number" value={clearForm.bounce_penalty} onChange={e => setClearForm({ ...clearForm, bounce_penalty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setClearModal(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={clearOrBounce} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Statement Modal ── */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Import Bank Statement (CSV)</h2>
              <button onClick={() => setImportModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <p className="text-xs text-slate-500">Format: date, description, credit, debit, balance, reference — first row is header</p>
            <textarea rows={10} value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder={"date,description,credit,debit,balance,reference\n2025-01-01,Fee Payment,5000,0,50000,REF001"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:border-[#a29bfe] outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportModal(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={parseAndImportCSV} disabled={loading || !csvText.trim()}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Match Modal ── */}
      {matchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Match Entry — {String(matchModal.description || '')}</h2>
              <button onClick={() => setMatchModal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-600">Amount: <span className="font-semibold text-emerald-700">₹{Number(matchModal.credit).toLocaleString('en-IN')}</span></p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search Fee Payment</label>
              <input type="text" placeholder="Student name or amount..." value={matchSearch} onChange={e => setMatchSearch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
            </div>
            {matchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                {matchResults.map(p => (
                  <div key={String(p.id)} className="flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium">{String(p.student_name || '')}</p>
                      <p className="text-xs text-slate-500">{String(p.receipt_no || '')} — {String(p.payment_date || '')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">₹{Number(p.amount_paid).toLocaleString('en-IN')}</span>
                      <button onClick={() => reconcile(matchModal!.id as number, p.id as number)}
                        className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bd5]">
                        Match
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setMatchModal(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
