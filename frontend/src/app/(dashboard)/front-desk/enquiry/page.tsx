/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, reportApiError } from '@/lib/api';
import { AdmissionEnquiry, Class } from '@/lib/types';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  X,
  Phone,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['all', 'new', 'contacted', 'follow_up', 'interested', 'admitted', 'closed'];

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  follow_up: 'bg-amber-50 text-amber-700',
  interested: 'bg-[#f1f0ff] text-[#6c5ce7]',
  not_interested: 'bg-slate-100 text-slate-500',
  admitted: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};

const SOURCE_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];

const inputCls =
  'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full';

const labelCls = 'text-xs font-medium text-slate-500 block mb-1';

// ─── Default form state ───────────────────────────────────────────────────────

function emptyForm() {
  return {
    student_name: '',
    dob: '',
    gender: '',
    class_applying_for: '',
    father_name: '',
    mother_name: '',
    contact_phone: '',
    alternate_phone: '',
    email: '',
    source: 'walkin',
    notes: '',
    follow_up_date: '',
    assigned_to: '', // UI only — not sent to API
    status: 'new',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnquiryPage() {
  // ── List state ───────────────────────────────────────────────────────────────
  const [enquiries, setEnquiries] = useState<AdmissionEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // ── Add form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // ── Actions dropdown ─────────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [selectedEnquiry, setSelectedEnquiry] = useState<AdmissionEnquiry | null>(null);
  const [changeStatusId, setChangeStatusId] = useState<number | null>(null);
  const [changeStatusVal, setChangeStatusVal] = useState('');
  const [changeStatusSaving, setChangeStatusSaving] = useState(false);
  const [followUpId, setFollowUpId] = useState<number | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);

  // ── Load helpers ──────────────────────────────────────────────────────────────

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeStatus !== 'all') params.status = activeStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterClass) params.class_applying_for = filterClass;
      const res = await api.getEnquiries(params);
      setEnquiries(res.data ?? []);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, searchQuery, filterClass]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  useEffect(() => {
    api
      .getClasses()
      .then(setClasses)
      .catch(() => {});
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────────

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // ── Form submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.student_name.trim() || !form.father_name.trim() || !form.contact_phone.trim()) {
      toast.error('Student name, father name, and phone are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<AdmissionEnquiry> = {
        student_name: form.student_name,
        father_name: form.father_name,
        mother_name: form.mother_name || undefined,
        contact_phone: form.contact_phone,
        alternate_phone: form.alternate_phone || undefined,
        email: form.email || undefined,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        class_applying_for: form.class_applying_for || undefined,
        source: form.source,
        notes: form.notes || undefined,
        follow_up_date: form.follow_up_date || undefined,
        status: form.status,
      };
      const result = await api.createEnquiry(payload);
      const enqNum = (result as any).enquiry_number;
      toast.success(enqNum ? `Enquiry ${enqNum} created!` : 'Enquiry created!');
      setForm(emptyForm());
      loadEnquiries();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSaving(false);
    }
  }

  // ── Change status ─────────────────────────────────────────────────────────────

  async function handleChangeStatus() {
    if (!changeStatusId || !changeStatusVal) return;
    setChangeStatusSaving(true);
    try {
      await api.updateEnquiry(changeStatusId, { status: changeStatusVal });
      toast.success('Status updated.');
      setChangeStatusId(null);
      setChangeStatusVal('');
      loadEnquiries();
    } catch (err) {
      reportApiError(err);
    } finally {
      setChangeStatusSaving(false);
    }
  }

  // ── Follow-up save ────────────────────────────────────────────────────────────

  async function handleFollowUpSave() {
    if (!followUpId || !followUpNote.trim()) {
      toast.error('Note is required.');
      return;
    }
    setFollowUpSaving(true);
    try {
      await api.addEnquiryFollowUp(followUpId, {
        note: followUpNote,
        status_change: followUpStatus || undefined,
        next_follow_up_date: followUpDate || undefined,
      });
      toast.success('Follow-up note saved.');
      setFollowUpId(null);
      setFollowUpNote('');
      setFollowUpStatus('');
      setFollowUpDate('');
      loadEnquiries();
    } catch (err) {
      reportApiError(err);
    } finally {
      setFollowUpSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete(enq: AdmissionEnquiry) {
    if (!window.confirm(`Delete enquiry for ${enq.student_name}? This cannot be undone.`)) return;
    try {
      await api.deleteEnquiry(enq.id);
      toast.success('Enquiry deleted.');
      loadEnquiries();
    } catch (err) {
      reportApiError(err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const followUpEnquiry = enquiries.find((e) => e.id === followUpId) ?? null;
  const changeStatusEnquiry = enquiries.find((e) => e.id === changeStatusId) ?? null;

  function formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function sourceLabel(val: string) {
    return SOURCE_OPTIONS.find((s) => s.value === val)?.label ?? val;
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admission Enquiries</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track and manage prospective student enquiries</p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Left panel: Add Form ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#6c5ce7]" />
              <h2 className="font-semibold text-slate-800 text-sm">New Enquiry</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* Student Name */}
              <div>
                <label className={labelCls}>Student Name *</label>
                <input
                  className={inputCls}
                  placeholder="Full name"
                  value={form.student_name}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                  required
                />
              </div>

              {/* DOB + Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Gender</label>
                  <select
                    className={inputCls}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Class applying for */}
              <div>
                <label className={labelCls}>Class Applying For</label>
                <select
                  className={inputCls}
                  value={form.class_applying_for}
                  onChange={(e) => setForm({ ...form, class_applying_for: e.target.value })}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Father Name */}
              <div>
                <label className={labelCls}>Father Name *</label>
                <input
                  className={inputCls}
                  placeholder="Father's full name"
                  value={form.father_name}
                  onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                  required
                />
              </div>

              {/* Mother Name */}
              <div>
                <label className={labelCls}>Mother Name</label>
                <input
                  className={inputCls}
                  placeholder="Mother's full name"
                  value={form.mother_name}
                  onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className={labelCls}>Contact Phone *</label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Primary phone number"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  required
                />
              </div>

              {/* Alternate Phone */}
              <div>
                <label className={labelCls}>Alternate Phone</label>
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Alternate phone number"
                  value={form.alternate_phone}
                  onChange={(e) => setForm({ ...form, alternate_phone: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              {/* Source */}
              <div>
                <label className={labelCls}>Source</label>
                <select
                  className={inputCls}
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className={labelCls}>Follow-up Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                />
              </div>

              {/* Assigned To (UI only) */}
              <div>
                <label className={labelCls}>Assigned To</label>
                <input
                  className={inputCls}
                  placeholder="Staff member name"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                />
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="interested">Interested</option>
                  <option value="admitted">Admitted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bd4] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saving ? 'Adding...' : 'Add Enquiry'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right panel: List ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Status pill tabs */}
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border ${
                  activeStatus === s
                    ? 'bg-[#6c5ce7] text-white border-[#6c5ce7]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#a29bfe]'
                }`}
              >
                {s === 'follow_up' ? 'Follow Up' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + class filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm">Loading enquiries...</div>
            ) : enquiries.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Users className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="text-slate-400 text-sm">No enquiries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                      <th className="px-4 py-3 text-left font-medium">Enq #</th>
                      <th className="px-4 py-3 text-left font-medium">Student</th>
                      <th className="px-4 py-3 text-left font-medium">Class</th>
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Source</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Follow-up</th>
                      <th className="px-4 py-3 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {enquiries.map((enq) => (
                      <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {enq.enquiry_number ?? `#${enq.id}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 whitespace-nowrap">{enq.student_name}</div>
                          <div className="text-xs text-slate-400">{enq.father_name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {enq.class_applying_for || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600 text-xs">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {enq.contact_phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {sourceLabel(enq.source)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              STATUS_BADGE[enq.status] ?? 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {enq.status === 'follow_up' ? 'Follow Up' : enq.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {enq.follow_up_date ? (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {formatDate(enq.follow_up_date)}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="relative"
                            ref={openMenuId === enq.id ? menuRef : undefined}
                          >
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === enq.id ? null : enq.id)
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === enq.id && (
                              <div className="absolute right-0 top-8 z-20 w-52 bg-white border border-slate-100 rounded-xl shadow-lg py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => {
                                    setSelectedEnquiry(enq);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                  View Details
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => {
                                    setChangeStatusId(enq.id);
                                    setChangeStatusVal(enq.status);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  Change Status
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  onClick={() => {
                                    setFollowUpId(enq.id);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                  Add Follow-up Note
                                </button>
                                <hr className="my-1 border-slate-100" />
                                <Link
                                  href="/students/new"
                                  className="w-full text-left px-4 py-2 text-sm text-[#6c5ce7] hover:bg-[#f1f0ff] flex items-center gap-2"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                  Convert to Admission
                                </Link>
                                <hr className="my-1 border-slate-100" />
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                  onClick={() => {
                                    handleDelete(enq);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── View Detail Modal ──────────────────────────────────────────────────── */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Enquiry Details</h3>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-slate-800">{selectedEnquiry.student_name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_BADGE[selectedEnquiry.status] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {selectedEnquiry.status === 'follow_up' ? 'Follow Up' : selectedEnquiry.status}
                </span>
              </div>
              {(
                [
                  ['Enquiry #', selectedEnquiry.enquiry_number ?? `#${selectedEnquiry.id}`],
                  ['Date of Birth', formatDate(selectedEnquiry.dob)],
                  ['Gender', selectedEnquiry.gender || '—'],
                  ['Class Applying For', selectedEnquiry.class_applying_for || '—'],
                  ['Father Name', selectedEnquiry.father_name],
                  ['Mother Name', selectedEnquiry.mother_name || '—'],
                  ['Contact Phone', selectedEnquiry.contact_phone],
                  ['Alternate Phone', selectedEnquiry.alternate_phone || '—'],
                  ['Email', selectedEnquiry.email || '—'],
                  ['Source', sourceLabel(selectedEnquiry.source)],
                  ['Follow-up Date', formatDate(selectedEnquiry.follow_up_date)],
                  ['Notes', selectedEnquiry.notes || '—'],
                  ['Created', formatDate(selectedEnquiry.created_at)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-2 border-b border-slate-50 text-sm last:border-0"
                >
                  <span className="text-slate-500 shrink-0 mr-4">{label}</span>
                  <span className="text-slate-800 font-medium text-right break-words">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Status Modal ────────────────────────────────────────────────── */}
      {changeStatusId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Change Status</h3>
              <button
                onClick={() => { setChangeStatusId(null); setChangeStatusVal(''); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {changeStatusEnquiry && (
                <p className="text-sm text-slate-500">
                  Updating enquiry for{' '}
                  <span className="font-medium text-slate-800">
                    {changeStatusEnquiry.student_name}
                  </span>
                </p>
              )}
              <div>
                <label className={labelCls}>New Status</label>
                <select
                  className={inputCls}
                  value={changeStatusVal}
                  onChange={(e) => setChangeStatusVal(e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="interested">Interested</option>
                  <option value="admitted">Admitted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setChangeStatusId(null); setChangeStatusVal(''); }}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeStatus}
                  disabled={changeStatusSaving}
                  className="flex-1 py-2 rounded-lg bg-[#6c5ce7] hover:bg-[#5b4bd4] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {changeStatusSaving ? 'Saving...' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-up Modal ────────────────────────────────────────────────────── */}
      {followUpId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Add Follow-up Note</h3>
              <button
                onClick={() => {
                  setFollowUpId(null);
                  setFollowUpNote('');
                  setFollowUpStatus('');
                  setFollowUpDate('');
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {followUpEnquiry && (
                <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">
                    {followUpEnquiry.student_name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_BADGE[followUpEnquiry.status] ?? 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {followUpEnquiry.status === 'follow_up' ? 'Follow Up' : followUpEnquiry.status}
                  </span>
                </div>
              )}
              <div>
                <label className={labelCls}>Note *</label>
                <textarea
                  className={inputCls}
                  rows={3}
                  placeholder="Enter follow-up note..."
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Change Status (optional)</label>
                <select
                  className={inputCls}
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                >
                  <option value="">No change</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="interested">Interested</option>
                  <option value="admitted">Admitted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Next Follow-up Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setFollowUpId(null);
                    setFollowUpNote('');
                    setFollowUpStatus('');
                    setFollowUpDate('');
                  }}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFollowUpSave}
                  disabled={followUpSaving}
                  className="flex-1 py-2 rounded-lg bg-[#6c5ce7] hover:bg-[#5b4bd4] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {followUpSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
