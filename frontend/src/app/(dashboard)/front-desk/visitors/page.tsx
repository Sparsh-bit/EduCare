/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, SyntheticEvent } from 'react';
import toast from 'react-hot-toast';
import { api, reportApiError } from '@/lib/api';
import { Visitor } from '@/lib/types';
import {
  UserCheck,
  Users,
  Clock,
  LogOut,
  ChevronDown,
  Car,
  BadgeCheck,
  Phone,
  User,
  Building2,
} from 'lucide-react';

const INPUT_CLASS =
  'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors w-full';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600 mb-1';

const purposeOptions = [
  { label: 'Meeting', value: 'meeting' },
  { label: 'Enquiry', value: 'enquiry' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Official', value: 'official' },
  { label: 'Personal', value: 'personal' },
];

const idTypeOptions = [
  { label: 'Aadhaar', value: 'aadhaar' },
  { label: 'PAN', value: 'pan' },
  { label: 'Passport', value: 'passport' },
  { label: 'Driving Licence', value: 'dl' },
  { label: 'Other', value: 'other' },
];

type FilterTab = 'inside' | 'today' | 'all';

function nowLocalDatetime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return iso.length >= 16 ? iso.slice(11, 16) : iso;
  }
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatPurpose(p: string): string {
  return purposeOptions.find((o) => o.value === p)?.label ?? p;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');

  // Form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('meeting');
  const [whomToMeet, setWhomToMeet] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [numPersons, setNumPersons] = useState(1);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [inTime, setInTime] = useState(nowLocalDatetime());

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getVisitors();
      setVisitors(res.data ?? []);
    } catch (err) {
      reportApiError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const resetForm = () => {
    setVisitorName('');
    setVisitorPhone('');
    setPurpose('meeting');
    setWhomToMeet('');
    setIdType('');
    setIdNumber('');
    setNumPersons(1);
    setVehicleNumber('');
    setBadgeNumber('');
    setInTime(nowLocalDatetime());
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim() || !purpose || !whomToMeet.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Visitor> = {
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim(),
        purpose,
        whom_to_meet: whomToMeet.trim(),
        id_type: idType || undefined,
        id_number: idNumber.trim() || undefined,
        num_persons: numPersons,
        vehicle_number: vehicleNumber.trim() || undefined,
        in_time: inTime ? new Date(inTime).toISOString() : undefined,
        status: 'in',
      };
      const created = await api.createVisitor(payload);
      toast.success(`Visitor #${(created as any).id ?? ''} logged`);
      resetForm();
      await loadVisitors();
    } catch (err) {
      reportApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (id: number) => {
    setCheckingOut(id);
    try {
      await api.checkoutVisitor(id);
      toast.success('Visitor checked out');
      await loadVisitors();
    } catch (err) {
      reportApiError(err);
    } finally {
      setCheckingOut(null);
    }
  };

  const today = todayStr();
  const todayVisitors = visitors.filter((v) => {
    const d = v.in_time ? v.in_time.slice(0, 10) : v.created_at.slice(0, 10);
    return d === today;
  });

  const filteredVisitors: Visitor[] =
    activeTab === 'inside'
      ? visitors.filter((v) => v.status === 'in')
      : activeTab === 'today'
      ? todayVisitors
      : visitors;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'inside', label: 'Currently Inside' },
    { key: 'today', label: 'All Today' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Visitor Management</h1>
        <p className="text-sm text-slate-500 mt-1">Log and track all school visitors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Log Visitor form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f1f0ff] flex items-center justify-center">
                <UserCheck size={16} className="text-[#6c5ce7]" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Log Visitor</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={LABEL_CLASS}>
                  Visitor Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Full name"
                    className={INPUT_CLASS + ' pl-8'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className={INPUT_CLASS + ' pl-8'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Purpose <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className={INPUT_CLASS + ' appearance-none pr-8'}
                    required
                  >
                    {purposeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  Whom to Meet <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={whomToMeet}
                    onChange={(e) => setWhomToMeet(e.target.value)}
                    placeholder="Name / department"
                    className={INPUT_CLASS + ' pl-8'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>ID Type</label>
                  <div className="relative">
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className={INPUT_CLASS + ' appearance-none pr-8'}
                    >
                      <option value="">— Select —</option>
                      {idTypeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="ID number"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>No. of Persons</label>
                  <input
                    type="number"
                    min={1}
                    value={numPersons}
                    onChange={(e) => setNumPersons(Number(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Vehicle Number</label>
                  <div className="relative">
                    <Car size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="DL01AB1234"
                      className={INPUT_CLASS + ' pl-8'}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>Badge Number</label>
                  <div className="relative">
                    <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      placeholder="Badge #"
                      className={INPUT_CLASS + ' pl-8'}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>In Time</label>
                  <input
                    type="datetime-local"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4dd0] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Logging…' : 'Log Visitor'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Visitor list ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* List header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#6c5ce7]" />
                <h2 className="text-base font-semibold text-slate-800">Visitor Log</h2>
                <span className="px-2.5 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] text-xs font-semibold rounded-full">
                  {todayVisitors.length} today
                </span>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === t.key
                        ? 'bg-white text-[#6c5ce7] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading visitors…</div>
            ) : filteredVisitors.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No visitors found</p>
                <p className="text-xs text-slate-300 mt-1">
                  {activeTab === 'inside'
                    ? 'No one is currently inside'
                    : activeTab === 'today'
                    ? 'No visitors logged today'
                    : 'No visitor records yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium">V#</th>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Phone</th>
                      <th className="px-4 py-3 text-left font-medium">Purpose</th>
                      <th className="px-4 py-3 text-left font-medium">Meeting</th>
                      <th className="px-4 py-3 text-left font-medium">In</th>
                      <th className="px-4 py-3 text-left font-medium">Out</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredVisitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">#{v.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 whitespace-nowrap">{v.visitor_name}</p>
                          {v.num_persons && v.num_persons > 1 && (
                            <p className="text-xs text-slate-400">{v.num_persons} persons</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{v.visitor_phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full capitalize">
                            {formatPurpose(v.purpose)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{v.whom_to_meet ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock size={12} className="text-slate-400" />
                            {formatTime(v.in_time)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {v.out_time ? (
                            <div className="flex items-center gap-1 text-slate-500">
                              <LogOut size={12} className="text-slate-400" />
                              {formatTime(v.out_time)}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {v.status === 'in' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Inside
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                              Left
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {v.status === 'in' && (
                            <button
                              onClick={() => handleCheckout(v.id)}
                              disabled={checkingOut === v.id}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
                            >
                              {checkingOut === v.id ? 'Checking…' : 'Check Out'}
                            </button>
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
      </div>
    </div>
  );
}
