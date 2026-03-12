/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['Tax Configuration', 'Payroll', 'TDS / Form 16', 'GST Report'] as const;
type Tab = typeof TABS[number];

const PAYROLL_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  processed: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
};

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Tax Configuration');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Tax Config
  const [taxConfig, setTaxConfig] = useState<Record<string, any>>({
    pan_number: '', tan_number: '', gstin: '', gst_state_code: '', pt_state: '',
    epf_establishment_id: '', esic_code: '',
    gst_applicable: false, pf_applicable: false, esi_applicable: false,
    pf_employee_rate: 12, pf_employer_rate: 12,
    esi_employee_rate: 0.75, esi_employer_rate: 3.25,
    gst_rate: 18, pf_wage_ceiling: 15000, esi_wage_ceiling: 21000,
  });
  const [ptSlabs, setPtSlabs] = useState<Record<string, any>[]>([]);

  // Payroll
  const [payrollMonth, setPayrollMonth] = useState('');
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear().toString());
  const [payrollList, setPayrollList] = useState<Record<string, any>[]>([]);
  const [payslipModal, setPayslipModal] = useState<Record<string, any> | null>(null);

  // TDS / Form 16
  const [financialYear, setFinancialYear] = useState('2024-25');
  const [form16List, setForm16List] = useState<Record<string, any>[]>([]);
  const [form16Detail, setForm16Detail] = useState<Record<string, any> | null>(null);

  // GST
  const [gstMonth, setGstMonth] = useState('');
  const [gstYear, setGstYear] = useState(new Date().getFullYear().toString());
  const [gstReport, setGstReport] = useState<Record<string, any> | null>(null);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); } else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const loadTaxConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tax/config`, { headers: authHeaders() });
      const d = await res.json();
      if (d.data) setTaxConfig((prev) => ({ ...prev, ...(d.data as Record<string, any>) }));
    } catch { /* ignore */ }
  }, []);

  const loadPtSlabs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tax/pt-slabs`, { headers: authHeaders() });
      const d = await res.json();
      setPtSlabs(d.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadPayroll = useCallback(async () => {
    if (!payrollMonth || !payrollYear) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/payroll?month=${payrollMonth}&year=${payrollYear}`, { headers: authHeaders() });
      const d = await res.json();
      setPayrollList(d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [payrollMonth, payrollYear]);

  useEffect(() => {
    if (activeTab === 'Tax Configuration') { loadTaxConfig(); loadPtSlabs(); }
  }, [activeTab, loadTaxConfig, loadPtSlabs]);

  const saveTaxConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/config`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(taxConfig) });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      showMsg('Tax configuration saved.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const savePtSlabs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/pt-slabs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(ptSlabs) });
      if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
      showMsg('PT slabs saved.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const processPayroll = async () => {
    if (!payrollMonth || !payrollYear) { showMsg('Select month and year.', true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/payroll/process`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ month: payrollMonth, year: payrollYear }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Processing failed');
      showMsg('Payroll processed successfully.');
      loadPayroll();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const markPaid = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/payroll/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'paid' }) });
      if (!res.ok) throw new Error('Update failed');
      showMsg('Marked as paid.');
      loadPayroll();
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const viewPayslip = async (id: number) => {
    try {
      const res = await fetch(`${API}/tax/payroll/${id}/slip`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to load payslip');
      setPayslipModal(d.data || d);
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
  };

  const generateForm16 = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/form16/generate/${financialYear}`, { method: 'POST', headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Generation failed');
      setForm16List(d.data || []);
      showMsg('Form 16 generated successfully.');
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const loadGstReport = async () => {
    if (!gstMonth || !gstYear) { showMsg('Select month and year.', true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax/gst-report?month=${gstMonth}&year=${gstYear}`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to load report');
      setGstReport(d.data || d);
    } catch (e: unknown) { showMsg(e instanceof Error ? e.message : 'Operation failed', true); }
    setLoading(false);
  };

  const addPtSlab = () => {
    setPtSlabs(prev => [...prev, { state: '', min_salary: 0, max_salary: 0, monthly_tax: 0, feb_tax: 0 }]);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tax Management</h1>

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

      {/* ── Tax Configuration ── */}
      {activeTab === 'Tax Configuration' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-800">Registration Numbers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([['pan_number','PAN Number'],['tan_number','TAN Number'],['gstin','GSTIN'],
                ['gst_state_code','GST State Code'],['pt_state','PT State'],
                ['epf_establishment_id','EPF Establishment ID'],['esic_code','ESIC Code']] as [string,string][]).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" value={taxConfig[k] || ''}
                    onChange={e => setTaxConfig({ ...taxConfig, [k]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {([['gst_applicable','GST Applicable'],['pf_applicable','PF Applicable'],['esi_applicable','ESI Applicable']] as [string,string][]).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="checkbox" id={k} checked={!!taxConfig[k]}
                    onChange={e => setTaxConfig({ ...taxConfig, [k]: e.target.checked })}
                    className="w-4 h-4 accent-[#6c5ce7]" />
                  <label htmlFor={k} className="text-sm text-gray-700">{label}</label>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                ['pf_employee_rate','PF Employee Rate (%)'],['pf_employer_rate','PF Employer Rate (%)'],
                ['esi_employee_rate','ESI Employee Rate (%)'],['esi_employer_rate','ESI Employer Rate (%)'],
                ['gst_rate','GST Rate (%)'],['pf_wage_ceiling','PF Wage Ceiling (₹)'],
                ['esi_wage_ceiling','ESI Wage Ceiling (₹)'],
              ] as [string,string][]).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="number" value={taxConfig[k] || 0}
                    onChange={e => setTaxConfig({ ...taxConfig, [k]: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
                </div>
              ))}
            </div>
            <button onClick={saveTaxConfig} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Saving...' : 'Save Tax Configuration'}
            </button>
          </div>

          {/* PT Slabs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Professional Tax Slabs</h2>
              <button onClick={addPtSlab} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">+ Add Slab</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-left">Min Salary</th>
                    <th className="px-3 py-2 text-left">Max Salary</th>
                    <th className="px-3 py-2 text-left">Monthly Tax</th>
                    <th className="px-3 py-2 text-left">Feb Tax</th>
                    <th className="px-3 py-2 text-left">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ptSlabs.map((slab, i) => (
                    <tr key={i}>
                      {(['state','min_salary','max_salary','monthly_tax','feb_tax'] as const).map(k => (
                        <td key={k} className="px-3 py-2">
                          <input type={k === 'state' ? 'text' : 'number'} value={slab[k]}
                            onChange={e => setPtSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: k === 'state' ? e.target.value : Number(e.target.value) } : s))}
                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <button onClick={() => setPtSlabs(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {ptSlabs.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400 text-xs">No PT slabs configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {ptSlabs.length > 0 && (
              <button onClick={savePtSlabs} disabled={loading}
                className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
                {loading ? 'Saving...' : 'Save PT Slabs'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Payroll ── */}
      {activeTab === 'Payroll' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="">Select Month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <input type="number" value={payrollYear} onChange={e => setPayrollYear(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <button onClick={loadPayroll} disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-60">
              Load Records
            </button>
            <button onClick={processPayroll} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Processing...' : 'Process Payroll'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">PF</th>
                  <th className="px-4 py-3 text-right">ESI</th>
                  <th className="px-4 py-3 text-right">PT</th>
                  <th className="px-4 py-3 text-right">TDS</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollList.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Select month/year and load or process payroll.</td></tr>
                ) : payrollList.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.employee_name}</td>
                    <td className="px-4 py-3 text-right">₹{Number(row.gross).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{Number(row.pf).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{Number(row.esi).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{Number(row.pt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{Number(row.tds).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{Number(row.total_deductions).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">₹{Number(row.net).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-lg ${PAYROLL_BADGE[row.status] || 'bg-gray-100 text-gray-600'}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {row.status !== 'paid' && (
                          <button onClick={() => markPaid(row.id)}
                            className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">
                            Mark Paid
                          </button>
                        )}
                        <button onClick={() => viewPayslip(row.id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                          Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TDS / Form 16 ── */}
      {activeTab === 'TDS / Form 16' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Financial Year</label>
              <select value={financialYear} onChange={e => setFinancialYear(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                {['2022-23','2023-24','2024-25','2025-26'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={generateForm16} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Generating...' : 'Generate Form 16'}
            </button>
          </div>

          {form16List.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Gross Salary</th>
                    <th className="px-4 py-3 text-right">Taxable Income</th>
                    <th className="px-4 py-3 text-right">Total TDS</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form16List.map((emp, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                      <td className="px-4 py-3 text-right">₹{Number(emp.gross_salary).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">₹{Number(emp.taxable_income).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-semibold">₹{Number(emp.total_tds).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">{emp.status || 'generated'}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setForm16Detail(emp)}
                          className="px-3 py-1 text-xs bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5a4bd1]">
                          View Form 16
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── GST Report ── */}
      {activeTab === 'GST Report' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={gstMonth} onChange={e => setGstMonth(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]">
                <option value="">Select Month</option>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <input type="number" value={gstYear} onChange={e => setGstYear(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" />
            </div>
            <button onClick={loadGstReport} disabled={loading}
              className="px-4 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] disabled:opacity-60">
              {loading ? 'Loading...' : 'Load GST Report'}
            </button>
          </div>

          {gstReport && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Fee Collection', value: gstReport.total_fee_collection, color: 'text-gray-900' },
                { label: 'Taxable Amount', value: gstReport.taxable_amount, color: 'text-gray-900' },
                { label: 'GST Collected', value: gstReport.gst_collected, color: 'text-[#6c5ce7]' },
                { label: 'CGST', value: gstReport.cgst, color: 'text-blue-700' },
                { label: 'SGST', value: gstReport.sgst, color: 'text-[#6c5ce7]' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${item.color}`}>₹{Number(item.value || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payslip Modal */}
      {payslipModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Payslip — {payslipModal.employee_name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Earnings</p>
                <dl className="space-y-1 text-sm">
                  {(payslipModal.earnings as Array<Record<string, any>> || []).map((e, i) => (
                    <div key={i} className="flex justify-between">
                      <dt className="text-gray-600">{e.label}</dt>
                      <dd className="font-medium">₹{Number(e.amount).toLocaleString('en-IN')}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                    <span>Gross</span><span>₹{Number(payslipModal.gross).toLocaleString('en-IN')}</span>
                  </div>
                </dl>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deductions</p>
                <dl className="space-y-1 text-sm">
                  {(payslipModal.deductions as Array<Record<string, any>> || []).map((d, i) => (
                    <div key={i} className="flex justify-between">
                      <dt className="text-gray-600">{d.label}</dt>
                      <dd className="font-medium text-red-600">₹{Number(d.amount).toLocaleString('en-IN')}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-red-600">
                    <span>Total</span><span>₹{Number(payslipModal.total_deductions).toLocaleString('en-IN')}</span>
                  </div>
                </dl>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center">
              <span className="font-semibold text-emerald-800">Net Salary</span>
              <span className="text-xl font-bold text-emerald-700">₹{Number(payslipModal.net).toLocaleString('en-IN')}</span>
            </div>
            <button onClick={() => setPayslipModal(null)} className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}

      {/* Form 16 Detail Modal */}
      {form16Detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="font-bold text-gray-900">Form 16 — {form16Detail.name}</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Financial Year</dt><dd className="font-medium">{financialYear}</dd>
              <dt className="text-gray-500">Gross Salary</dt><dd className="font-medium">₹{Number(form16Detail.gross_salary).toLocaleString('en-IN')}</dd>
              <dt className="text-gray-500">Taxable Income</dt><dd className="font-medium">₹{Number(form16Detail.taxable_income).toLocaleString('en-IN')}</dd>
              <dt className="text-gray-500">Total TDS</dt><dd className="font-semibold text-red-600">₹{Number(form16Detail.total_tds).toLocaleString('en-IN')}</dd>
              {form16Detail.details && Object.entries(form16Detail.details).map(([k, v]) => (
                <><dt key={`k-${k}`} className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                <dd key={`v-${k}`} className="font-medium">{String(v)}</dd></>
              ))}
            </dl>
            <button onClick={() => setForm16Detail(null)} className="w-full px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
