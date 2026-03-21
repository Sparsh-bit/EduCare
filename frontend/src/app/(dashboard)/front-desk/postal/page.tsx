/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import toast from 'react-hot-toast';
import { api, reportApiError } from '@/lib/api';
import { PostalRecord } from '@/lib/types';
import {
  Mail,
  Send,
  ChevronDown,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

const INPUT_CLASS =
  'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 mb-1';

const postalTypeOptions = [
  { label: 'Letter', value: 'letter' },
  { label: 'Courier', value: 'courier' },
  { label: 'Parcel', value: 'parcel' },
  { label: 'Document', value: 'document' },
  { label: 'Legal', value: 'legal' },
  { label: 'Government', value: 'government' },
];

const modeOptions = [
  { label: 'Speed Post', value: 'speed_post' },
  { label: 'Registered Post', value: 'registered' },
  { label: 'Courier', value: 'courier' },
  { label: 'Hand Delivery', value: 'hand_delivery' },
];

const receivedStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Received', value: 'received' },
  { label: 'Forwarded', value: 'forwarded' },
];

const dispatchedStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered', value: 'delivered' },
];

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelForValue(options: { label: string; value: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  let cls = 'px-2.5 py-0.5 text-xs font-medium rounded-full';
  if (s === 'received' || s === 'dispatched') cls += ' bg-emerald-50 text-emerald-700';
  else if (s === 'pending') cls += ' bg-amber-50 text-amber-700';
  else if (s === 'forwarded' || s === 'delivered') cls += ' bg-blue-50 text-blue-700';
  else cls += ' bg-slate-100 text-slate-500';
  return <span className={cls}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}</span>;
}

// ─── Received Form ───────────────────────────────────────────────────────────
function ReceivedForm({ onCreated }: { onCreated: () => void }) {
  const [refNum, setRefNum] = useState('');
  const [partyName, setPartyName] = useState('');
  const [postalType, setPostalType] = useState('letter');
  const [addressedTo, setAddressedTo] = useState('');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('received');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRefNum('');
    setPartyName('');
    setPostalType('letter');
    setAddressedTo('');
    setDate(todayStr());
    setDescription('');
    setStatus('received');
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partyName.trim() || !postalType || !addressedTo.trim() || !date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.createPostalRecord({
        type: 'received',
        reference_number: refNum.trim() || undefined,
        party_name: partyName.trim(),
        postal_type: postalType,
        addressed_to: addressedTo.trim(),
        date,
        description: description.trim() || undefined,
        status,
      } as Partial<PostalRecord>);
      toast.success('Postal record added');
      reset();
      onCreated();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Reference Number</label>
          <input
            type="text"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="Ref #"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Received From <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          placeholder="Sender name / organisation"
          className={INPUT_CLASS}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>
            Postal Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={postalType}
              onChange={(e) => setPostalType(e.target.value)}
              className={INPUT_CLASS + ' appearance-none pr-8'}
              required
            >
              {postalTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Addressed To <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={addressedTo}
            onChange={(e) => setAddressedTo(e.target.value)}
            placeholder="Department / person"
            className={INPUT_CLASS}
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes…"
          className={INPUT_CLASS + ' resize-none'}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Status</label>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={INPUT_CLASS + ' appearance-none pr-8'}
          >
            {receivedStatusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-[#6c5ce7] hover:bg-[#5b4dd0] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Add Record'}
      </button>
    </form>
  );
}

// ─── Dispatched Form ──────────────────────────────────────────────────────────
function DispatchedForm({ onCreated }: { onCreated: () => void }) {
  const [refNum, setRefNum] = useState('');
  const [partyName, setPartyName] = useState('');
  const [address, setAddress] = useState('');
  const [postalType, setPostalType] = useState('letter');
  const [mode, setMode] = useState('speed_post');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [costInr, setCostInr] = useState('');
  const [status, setStatus] = useState('dispatched');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRefNum('');
    setPartyName('');
    setAddress('');
    setPostalType('letter');
    setMode('speed_post');
    setDate(todayStr());
    setDescription('');
    setCostInr('');
    setStatus('dispatched');
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partyName.trim() || !postalType || !mode || !date) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const notes = [address.trim(), description.trim()].filter(Boolean).join(' | ');
      await api.createPostalRecord({
        type: 'dispatched',
        reference_number: refNum.trim() || undefined,
        party_name: partyName.trim(),
        postal_type: postalType,
        mode,
        date,
        description: notes || undefined,
        status,
      } as Partial<PostalRecord>);
      toast.success('Postal record added');
      reset();
      onCreated();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Reference Number</label>
          <input
            type="text"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="Ref #"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Sent To <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          placeholder="Recipient name / organisation"
          className={INPUT_CLASS}
          required
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address"
          className={INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>
            Postal Type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={postalType}
              onChange={(e) => setPostalType(e.target.value)}
              className={INPUT_CLASS + ' appearance-none pr-8'}
              required
            >
              {postalTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Mode <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className={INPUT_CLASS + ' appearance-none pr-8'}
              required
            >
              {modeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Cost (₹)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={costInr}
            onChange={(e) => setCostInr(e.target.value)}
            placeholder="Optional"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Status</label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={INPUT_CLASS + ' appearance-none pr-8'}
            >
              {dispatchedStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Description</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes…"
          className={INPUT_CLASS + ' resize-none'}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-[#6c5ce7] hover:bg-[#5b4dd0] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Add Record'}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ActiveTab = 'received' | 'dispatched';

export default function PostalPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('received');
  const [records, setRecords] = useState<PostalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPostalRecords();
      setRecords(res.data ?? []);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = records.filter((r) => r.type === activeTab);

  const tabs: { key: ActiveTab; label: string; icon: any }[] = [
    { key: 'received', label: 'Received', icon: ArrowDownCircle },
    { key: 'dispatched', label: 'Dispatched', icon: ArrowUpCircle },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Postal Register</h1>
        <p className="text-sm text-slate-500 mt-1">Manage incoming and outgoing postal items</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const count = records.filter((r) => r.type === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === t.key
                  ? 'bg-white text-[#6c5ce7] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {t.label}
              <span
                className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === t.key
                    ? 'bg-[#f1f0ff] text-[#6c5ce7]'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Add form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f1f0ff] flex items-center justify-center">
                {activeTab === 'received' ? (
                  <Mail size={16} className="text-[#6c5ce7]" />
                ) : (
                  <Send size={16} className="text-[#6c5ce7]" />
                )}
              </div>
              <h2 className="text-base font-semibold text-slate-800">
                {activeTab === 'received' ? 'Log Received Item' : 'Log Dispatched Item'}
              </h2>
            </div>

            {activeTab === 'received' ? (
              <ReceivedForm onCreated={loadRecords} />
            ) : (
              <DispatchedForm onCreated={loadRecords} />
            )}
          </div>
        </div>

        {/* ── Right: List ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              {activeTab === 'received' ? (
                <ArrowDownCircle size={18} className="text-[#6c5ce7]" />
              ) : (
                <ArrowUpCircle size={18} className="text-[#6c5ce7]" />
              )}
              <h2 className="text-base font-semibold text-slate-800">
                {activeTab === 'received' ? 'Received Items' : 'Dispatched Items'}
              </h2>
              <span className="ml-auto px-2.5 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-semibold rounded-full">
                {filtered.length}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading records…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Package size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No records yet</p>
                <p className="text-xs text-slate-300 mt-1">
                  Add a {activeTab === 'received' ? 'received' : 'dispatched'} item using the form
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === 'received' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Ref #</th>
                        <th className="px-4 py-3 text-left font-medium">From</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Addressed To</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {r.reference_number ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {r.party_name}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {formatDate(r.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                              {labelForValue(postalTypeOptions, r.postal_type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{r.addressed_to ?? '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Ref #</th>
                        <th className="px-4 py-3 text-left font-medium">To</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Mode</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {r.reference_number ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {r.party_name}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {formatDate(r.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                              {labelForValue(postalTypeOptions, r.postal_type)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.mode ? labelForValue(modeOptions, r.mode) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
