/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, reportApiError } from '@/lib/api';
import { GatePass } from '@/lib/types';
import toast from 'react-hot-toast';
import { Search, Printer, RefreshCw, CheckCircle2, Clock, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const inputCls =
  'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full';

const labelCls = 'text-xs font-medium text-slate-500 block mb-1';

const REASON_OPTIONS = [
  { value: 'medical', label: 'Medical' },
  { value: 'parent_request', label: 'Parent Request' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'official', label: 'Official' },
  { value: 'other', label: 'Other' },
];

// ─── Default form state ───────────────────────────────────────────────────────

function emptyForm() {
  return {
    reason: 'parent_request',
    customReason: '',
    authorized_by: '',
    out_time: new Date().toISOString().slice(0, 16),
    expected_return: '',
    pickup_person_name: '',
    pickup_person_phone: '',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GatePassPage() {
  // ── Student search state ──────────────────────────────────────────────────
  const [studentInfo, setStudentInfo] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // ── Print state ───────────────────────────────────────────────────────────
  const [printPass, setPrintPass] = useState<GatePass | null>(null);

  // ── Pass list state ───────────────────────────────────────────────────────
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // ── Student search debounce ───────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.lookupStudentForGatePass(searchQuery.trim());
        // Backend may return { data: student } or { data: student[] }
        const raw = (res as any).data;
        if (!raw) {
          setSearchResults([]);
        } else if (Array.isArray(raw)) {
          setSearchResults(raw);
        } else {
          setSearchResults([raw]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Close search dropdown on outside click ────────────────────────────────

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ── Load passes ───────────────────────────────────────────────────────────

  const loadPasses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      if (filterClass) params.class_name = filterClass;
      const res = await api.getGatePasses(params);
      setPasses(res.data ?? []);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus, filterClass]);

  useEffect(() => {
    loadPasses();
  }, [loadPasses]);

  // ── Select student from dropdown ──────────────────────────────────────────

  function selectStudent(s: any) {
    setStudentInfo(s);
    setSearchQuery(s.name ?? s.student_name ?? '');
    setSearchResults([]);
  }

  // ── Issue gate pass ───────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentInfo) {
      toast.error('Please search and select a student first.');
      return;
    }
    if (!form.authorized_by.trim()) {
      toast.error('Authorized by is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<GatePass> = {
        student_id: studentInfo.id ?? studentInfo.student_id,
        reason: form.reason,
        reason_detail: form.reason === 'other' ? form.customReason : undefined,
        authorized_by: form.authorized_by,
        out_time: form.out_time || undefined,
        pickup_person_name: form.pickup_person_name || undefined,
        pickup_person_phone: form.pickup_person_phone || undefined,
      };
      // expected_return is not on GatePass type — send via cast
      (payload as any).expected_return = form.expected_return || undefined;

      const result = await api.createGatePass(payload);
      setPrintPass(result);
      window.print();
      toast.success(`Gate pass ${result.pass_number} issued!`);
      setStudentInfo(null);
      setSearchQuery('');
      setForm(emptyForm());
      loadPasses();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSaving(false);
    }
  }

  // ── Mark returned ─────────────────────────────────────────────────────────

  async function handleMarkReturned(id: number) {
    try {
      await api.markGatePassReturn(id);
      toast.success('Marked as returned.');
      loadPasses();
    } catch (err) {
      reportApiError(err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatDateTime(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function reasonLabel(val: string) {
    return REASON_OPTIONS.find((r) => r.value === val)?.label ?? val;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Print styles ────────────────────────────────────────────────────── */}
      <style>{`@media print { body > * { display: none; } #gp-print { display: block !important; } @page { size: A5; margin: 1cm; } }`}</style>

      {/* ── Print template (hidden on screen) ───────────────────────────────── */}
      <div id="gp-print" className="hidden print:block font-sans text-black p-4">
        {printPass && (
          <>
            <div className="text-center mb-6">
              <p className="text-sm font-medium uppercase tracking-widest text-gray-500 mb-1">
                School Gate Pass
              </p>
              <h1 className="text-3xl font-bold tracking-wide">GATE PASS</h1>
              <p className="text-4xl font-black mt-2 tracking-widest">{printPass.pass_number}</p>
            </div>

            <div className="border-t border-b border-gray-300 py-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Student</span>
                <span className="font-semibold">{printPass.student_name ?? studentInfo?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Class / Section</span>
                <span>
                  {printPass.class_name ?? '—'}
                  {printPass.section_name ? ` – ${printPass.section_name}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Reason</span>
                <span>{reasonLabel(printPass.reason)}{printPass.reason_detail ? ` — ${printPass.reason_detail}` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Out Time</span>
                <span>{formatDateTime(printPass.out_time)}</span>
              </div>
              {(printPass as any).expected_return && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-500">Expected Return</span>
                  <span>{formatDateTime((printPass as any).expected_return)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Authorized By</span>
                <span className="font-semibold">{printPass.authorized_by ?? '—'}</span>
              </div>
            </div>

            <div className="mt-4 border-2 border-black p-3 text-center font-mono text-xl tracking-[0.4em]">
              {printPass.pass_number}
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              This pass is valid for single use only. Please return to school gate on re-entry.
            </p>
          </>
        )}
      </div>

      {/* ── Main screen content ──────────────────────────────────────────────── */}
      <div className="p-6 space-y-6 print:hidden">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gate Pass</h1>
          <p className="text-sm text-slate-500 mt-0.5">Issue and track student gate passes</p>
        </div>

        {/* Issue form card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#6c5ce7]" />
            <h2 className="font-semibold text-slate-800 text-sm">Issue New Gate Pass</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Student search */}
            <div>
              <label className={labelCls}>Search Student *</label>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full"
                  placeholder="Type student name or admission number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (studentInfo) setStudentInfo(null);
                  }}
                />
                {/* Dropdown */}
                {(searchLoading || searchResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {searchLoading && (
                      <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
                    )}
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-400">No students found.</div>
                    )}
                    {searchResults.map((s: any, i) => (
                      <button
                        key={s.id ?? i}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        onClick={() => selectStudent(s)}
                      >
                        <div className="font-medium text-slate-800 text-sm">
                          {s.name ?? s.student_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {s.admission_no ?? s.admissionNo ?? ''}{' '}
                          {s.class_name ? `· ${s.class_name}` : ''}
                          {s.section_name ? ` ${s.section_name}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Selected student chip */}
              {studentInfo && (
                <div className="mt-2 inline-flex items-center gap-2 bg-[#f1f0ff] text-[#6c5ce7] px-3 py-1.5 rounded-lg text-sm font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {studentInfo.name ?? studentInfo.student_name}
                  {studentInfo.class_name ? ` · ${studentInfo.class_name}` : ''}
                  {studentInfo.section_name ? ` ${studentInfo.section_name}` : ''}
                  <button
                    type="button"
                    onClick={() => { setStudentInfo(null); setSearchQuery(''); }}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Form fields — 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reason */}
              <div>
                <label className={labelCls}>Reason</label>
                <select
                  className={inputCls}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom reason (only if other) */}
              {form.reason === 'other' && (
                <div>
                  <label className={labelCls}>Specify Reason</label>
                  <input
                    className={inputCls}
                    placeholder="Describe the reason..."
                    value={form.customReason}
                    onChange={(e) => setForm({ ...form, customReason: e.target.value })}
                  />
                </div>
              )}

              {/* Authorized by */}
              <div>
                <label className={labelCls}>Authorized By *</label>
                <input
                  className={inputCls}
                  placeholder="Staff name / designation"
                  value={form.authorized_by}
                  onChange={(e) => setForm({ ...form, authorized_by: e.target.value })}
                  required
                />
              </div>

              {/* Out time */}
              <div>
                <label className={labelCls}>Out Time</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.out_time}
                  onChange={(e) => setForm({ ...form, out_time: e.target.value })}
                />
              </div>

              {/* Expected return */}
              <div>
                <label className={labelCls}>Expected Return (optional)</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={form.expected_return}
                  onChange={(e) => setForm({ ...form, expected_return: e.target.value })}
                />
              </div>

              {/* Pickup person name */}
              <div>
                <label className={labelCls}>Pickup Person Name</label>
                <input
                  className={inputCls}
                  placeholder="Name of person picking up"
                  value={form.pickup_person_name}
                  onChange={(e) => setForm({ ...form, pickup_person_name: e.target.value })}
                />
              </div>

              {/* Pickup person phone */}
              <div>
                <label className={labelCls}>Pickup Person Phone</label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Phone number"
                  value={form.pickup_person_phone}
                  onChange={(e) => setForm({ ...form, pickup_person_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !studentInfo}
                className="px-6 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bd4] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                {saving ? 'Issuing...' : 'Issue Gate Pass + Print'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Gate Pass List ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Gate Pass Records</h2>
            <button
              onClick={loadPasses}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                className={inputCls}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="out">Out</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full"
                  placeholder="Student or pass number..."
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading passes...</div>
          ) : passes.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-200 mx-auto" />
              <p className="text-slate-400 text-sm">No gate passes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">GP #</th>
                    <th className="px-4 py-3 text-left font-medium">Student</th>
                    <th className="px-4 py-3 text-left font-medium">Class</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Out Time</th>
                    <th className="px-4 py-3 text-left font-medium">Return Time</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {passes.map((pass) => (
                    <tr key={pass.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {pass.pass_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {pass.student_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {pass.class_name ?? '—'}
                        {pass.section_name ? ` · ${pass.section_name}` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {reasonLabel(pass.reason)}
                        {pass.reason_detail ? (
                          <span className="text-slate-400 text-xs ml-1">({pass.reason_detail})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {formatDateTime(pass.out_time)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {pass.actual_return ? formatDateTime(pass.actual_return) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            pass.status === 'out'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {pass.status === 'out' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {pass.status === 'out' ? 'Out' : 'Returned'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pass.status === 'out' && (
                          <button
                            onClick={() => handleMarkReturned(pass.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Returned
                          </button>
                        )}
                        {pass.status === 'returned' && (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
