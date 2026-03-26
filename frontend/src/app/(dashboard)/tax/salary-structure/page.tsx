/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

interface SalaryStructure {
  basic: number; hra: number; da: number; ta: number;
  medical_allowance: number; special_allowance: number; other_allowance: number;
  pf_applicable: boolean; esi_applicable: boolean; pt_applicable: boolean; tds_applicable: boolean;
  declared_investment_80c: number; declared_hra_exemption: number;
}

const DEFAULT_STRUCTURE: SalaryStructure = {
  basic: 0, hra: 0, da: 0, ta: 0, medical_allowance: 0, special_allowance: 0, other_allowance: 0,
  pf_applicable: true, esi_applicable: true, pt_applicable: true, tds_applicable: false,
  declared_investment_80c: 0, declared_hra_exemption: 0,
};

const calcGross = (s: SalaryStructure) =>
  s.basic + s.hra + s.da + s.ta + s.medical_allowance + s.special_allowance + s.other_allowance;

export default function SalaryStructurePage() {
  const [staff, setStaff] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalStaff, setModalStaff] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<SalaryStructure>(DEFAULT_STRUCTURE);
  const [search, setSearch] = useState('');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getStaffList();
      setStaff((d as any).data || (d as any).staff || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const openModal = async (member: Record<string, any>) => {
    setModalStaff(member);
    setForm(DEFAULT_STRUCTURE);
    try {
      const d = await api.getSalaryStructure(member.id) as any;
      if (d && Object.keys(d).length > 0) setForm((prev) => ({ ...prev, ...d }));
    } catch { /* ignore */ }
  };

  const saveStructure = async () => {
    if (!modalStaff) return;
    setSaving(true);
    try {
      await api.saveSalaryStructure(modalStaff.id, form as unknown as Record<string, unknown>);
      toast.success(`Salary structure saved for ${modalStaff.name}.`);
      setModalStaff(null);
      loadStaff();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  const filteredStaff = staff.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  const EARNINGS_FIELDS: [keyof SalaryStructure, string][] = [
    ['basic', 'Basic'], ['hra', 'HRA'], ['da', 'DA'], ['ta', 'TA'],
    ['medical_allowance', 'Medical Allowance'], ['special_allowance', 'Special Allowance'],
    ['other_allowance', 'Other Allowance'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salary Structure</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure salary components for each staff member</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-64 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none pl-8" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Name</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Basic</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">HRA</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">DA</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">TA</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Medical</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Special</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Other</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Gross</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">PF</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">ESI</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">PT</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">TDS</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-500 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={14} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
              ))
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={14} className="px-5 py-12 text-center text-slate-400 text-sm">No staff found.</td></tr>
            ) : filteredStaff.map(member => {
              const ss = member.salary_structure || {};
              const gross = (ss.basic || 0) + (ss.hra || 0) + (ss.da || 0) + (ss.ta || 0) +
                (ss.medical_allowance || 0) + (ss.special_allowance || 0) + (ss.other_allowance || 0);
              return (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.employee_code || member.designation}</p>
                  </td>
                  {(['basic','hra','da','ta','medical_allowance','special_allowance','other_allowance'] as const).map(k => (
                    <td key={k} className="px-5 py-3 text-right text-slate-600">
                      {ss[k] ? `₹${Number(ss[k]).toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {gross > 0 ? `₹${gross.toLocaleString('en-IN')}` : <span className="text-slate-300">—</span>}
                  </td>
                  {(['pf_applicable','esi_applicable','pt_applicable','tds_applicable'] as const).map(k => (
                    <td key={k} className="px-5 py-3 text-center">
                      <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${ss[k] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {ss[k] ? '✓' : '×'}
                      </span>
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <button onClick={() => openModal(member)}
                      className="px-3 py-1.5 bg-[#6c5ce7] text-white text-xs font-medium rounded-lg hover:bg-[#5b4bd5]">
                      Configure
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Configure Modal */}
      {modalStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Salary Structure — {modalStaff.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{modalStaff.designation || modalStaff.employee_code}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Gross Salary</p>
                  <p className="text-2xl font-bold text-[#6c5ce7]">₹{calcGross(form).toLocaleString('en-IN')}</p>
                </div>
                <button onClick={() => setModalStaff(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Earnings</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EARNINGS_FIELDS.map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label} (₹)</label>
                    <input type="number" value={form[key] as number}
                      onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Deduction Applicability</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  ['pf_applicable','PF'],['esi_applicable','ESI'],
                  ['pt_applicable','Professional Tax'],['tds_applicable','TDS'],
                ] as [keyof SalaryStructure, string][]).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="checkbox" id={`modal_${key}`} checked={form[key] as boolean}
                      onChange={e => setForm({ ...form, [key]: e.target.checked })}
                      className="w-4 h-4 accent-[#6c5ce7]" />
                    <label htmlFor={`modal_${key}`} className="text-sm text-slate-700">{label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tax Declarations</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Investment under 80C (₹)</label>
                  <input type="number" value={form.declared_investment_80c}
                    onChange={e => setForm({ ...form, declared_investment_80c: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">HRA Exemption (₹)</label>
                  <input type="number" value={form.declared_hra_exemption}
                    onChange={e => setForm({ ...form, declared_hra_exemption: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
              <div className="text-sm text-slate-600 space-y-1">
                <div className="flex gap-4">
                  <span>Basic: <strong>₹{form.basic.toLocaleString('en-IN')}</strong></span>
                  <span>HRA: <strong>₹{form.hra.toLocaleString('en-IN')}</strong></span>
                  <span>DA: <strong>₹{form.da.toLocaleString('en-IN')}</strong></span>
                </div>
                <div className="flex gap-4">
                  <span>TA: <strong>₹{form.ta.toLocaleString('en-IN')}</strong></span>
                  <span>Medical: <strong>₹{form.medical_allowance.toLocaleString('en-IN')}</strong></span>
                  <span>Special: <strong>₹{form.special_allowance.toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Gross</p>
                <p className="text-xl font-bold text-[#6c5ce7]">₹{calcGross(form).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setModalStaff(null)} className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={saveStructure} disabled={saving}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
