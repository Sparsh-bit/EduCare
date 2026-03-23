/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import toast from 'react-hot-toast';
import { X, Plus } from 'lucide-react';

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const TABS = ['Tax Configuration', 'Payroll', 'TDS / Form 16', 'GST Report'] as const;
type Tab = typeof TABS[number];

const PAYROLL_BADGE: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    processed: 'bg-blue-50 text-blue-700',
    paid: 'bg-emerald-50 text-emerald-700',
};

export default function TaxPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Tax Configuration');
    const [loading, setLoading] = useState(false);

    const [taxConfig, setTaxConfig] = useState<Record<string, any>>({
        pan_number: '', tan_number: '', gstin: '', gst_state_code: '', pt_state: '',
        epf_establishment_id: '', esic_code: '',
        gst_applicable: false, pf_applicable: false, esi_applicable: false,
        pf_employee_rate: 12, pf_employer_rate: 12,
        esi_employee_rate: 0.75, esi_employer_rate: 3.25,
        gst_rate: 18, pf_wage_ceiling: 15000, esi_wage_ceiling: 21000,
    });
    const [ptSlabs, setPtSlabs] = useState<Record<string, any>[]>([]);

    const [payrollMonth, setPayrollMonth] = useState('');
    const [payrollYear, setPayrollYear] = useState(new Date().getFullYear().toString());
    const [payrollList, setPayrollList] = useState<Record<string, any>[]>([]);
    const [payslipModal, setPayslipModal] = useState<Record<string, any> | null>(null);

    const [financialYear, setFinancialYear] = useState('2024-25');
    const [form16List, setForm16List] = useState<Record<string, any>[]>([]);
    const [form16Detail, setForm16Detail] = useState<Record<string, any> | null>(null);

    const [gstMonth, setGstMonth] = useState('');
    const [gstYear, setGstYear] = useState(new Date().getFullYear().toString());
    const [gstReport, setGstReport] = useState<Record<string, any> | null>(null);

    const loadTaxConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API}/tax/config`, { headers: authHeaders() });
            const d = await res.json();
            if (d.data) setTaxConfig(prev => ({ ...prev, ...(d.data as Record<string, any>) }));
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
            toast.success('Tax configuration saved');
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
        setLoading(false);
    };

    const savePtSlabs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tax/pt-slabs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(ptSlabs) });
            if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
            toast.success('PT slabs saved');
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save'); }
        setLoading(false);
    };

    const processPayroll = async () => {
        if (!payrollMonth || !payrollYear) { toast.error('Select month and year'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/tax/payroll/process`, {
                method: 'POST', headers: authHeaders(), body: JSON.stringify({ month: payrollMonth, year: payrollYear }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Processing failed');
            toast.success('Payroll processed successfully');
            loadPayroll();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to process'); }
        setLoading(false);
    };

    const markPaid = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tax/payroll/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'paid' }) });
            if (!res.ok) throw new Error('Update failed');
            toast.success('Marked as paid');
            loadPayroll();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to update'); }
        setLoading(false);
    };

    const viewPayslip = async (id: number) => {
        try {
            const res = await fetch(`${API}/tax/payroll/${id}/slip`, { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Failed to load payslip');
            setPayslipModal(d.data || d);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to load payslip'); }
    };

    const generateForm16 = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/tax/form16/generate/${financialYear}`, { method: 'POST', headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Generation failed');
            setForm16List(d.data || []);
            toast.success('Form 16 generated successfully');
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to generate'); }
        setLoading(false);
    };

    const loadGstReport = async () => {
        if (!gstMonth || !gstYear) { toast.error('Select month and year'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/tax/gst-report?month=${gstMonth}&year=${gstYear}`, { headers: authHeaders() });
            const d = await res.json();
            if (!res.ok) throw new Error(d.message || 'Failed to load report');
            setGstReport(d.data || d);
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to load'); }
        setLoading(false);
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';
    const btnPrimary = 'bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors';
    const btnSecondary = 'border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-60';

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tax & Payroll</h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage tax configuration, payroll processing, and compliance reports</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-[#6c5ce7] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tax Configuration */}
            {activeTab === 'Tax Configuration' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
                        <h2 className="font-semibold text-slate-900">Registration Numbers</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {([['pan_number','PAN Number'],['tan_number','TAN Number'],['gstin','GSTIN'],
                                ['gst_state_code','GST State Code'],['pt_state','PT State'],
                                ['epf_establishment_id','EPF Establishment ID'],['esic_code','ESIC Code']] as [string,string][]).map(([k, label]) => (
                                <div key={k} className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">{label}</label>
                                    <input type="text" value={taxConfig[k] || ''} onChange={e => setTaxConfig({ ...taxConfig, [k]: e.target.value })} className={inputCls} />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-6">
                            {([['gst_applicable','GST Applicable'],['pf_applicable','PF Applicable'],['esi_applicable','ESI Applicable']] as [string,string][]).map(([k, label]) => (
                                <div key={k} className="flex items-center gap-2">
                                    <input type="checkbox" id={k} checked={!!taxConfig[k]} onChange={e => setTaxConfig({ ...taxConfig, [k]: e.target.checked })} className="w-4 h-4 accent-[#6c5ce7]" />
                                    <label htmlFor={k} className="text-sm text-slate-700">{label}</label>
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
                                <div key={k} className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">{label}</label>
                                    <input type="number" value={taxConfig[k] || 0} onChange={e => setTaxConfig({ ...taxConfig, [k]: Number(e.target.value) })} className={inputCls} />
                                </div>
                            ))}
                        </div>
                        <button onClick={saveTaxConfig} disabled={loading} className={btnPrimary}>
                            {loading ? 'Saving...' : 'Save Tax Configuration'}
                        </button>
                    </div>

                    {/* PT Slabs */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Professional Tax Slabs</h2>
                            <button onClick={() => setPtSlabs(prev => [...prev, { state: '', min_salary: 0, max_salary: 0, monthly_tax: 0, feb_tax: 0 }])}
                                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                                <Plus size={12} /> Add Slab
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['State', 'Min Salary', 'Max Salary', 'Monthly Tax', 'Feb Tax', ''].map(h => (
                                            <th key={h} className="px-3 py-2.5 text-xs font-medium text-slate-500 text-left">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {ptSlabs.length === 0 ? (
                                        <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">No PT slabs configured</td></tr>
                                    ) : ptSlabs.map((slab, i) => (
                                        <tr key={i}>
                                            {(['state','min_salary','max_salary','monthly_tax','feb_tax'] as const).map(k => (
                                                <td key={k} className="px-3 py-2">
                                                    <input type={k === 'state' ? 'text' : 'number'} value={slab[k]}
                                                        onChange={e => setPtSlabs(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: k === 'state' ? e.target.value : Number(e.target.value) } : s))}
                                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none" />
                                                </td>
                                            ))}
                                            <td className="px-3 py-2">
                                                <button onClick={() => setPtSlabs(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {ptSlabs.length > 0 && (
                            <button onClick={savePtSlabs} disabled={loading} className={btnPrimary}>
                                {loading ? 'Saving...' : 'Save PT Slabs'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Payroll */}
            {activeTab === 'Payroll' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Month</label>
                            <select value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors">
                                <option value="">Select Month</option>
                                {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Year</label>
                            <input type="number" value={payrollYear} onChange={e => setPayrollYear(e.target.value)}
                                className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors" />
                        </div>
                        <button onClick={loadPayroll} disabled={loading} className={btnSecondary}>Load Records</button>
                        <button onClick={processPayroll} disabled={loading} className={btnPrimary}>
                            {loading ? 'Processing...' : 'Process Payroll'}
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-sm min-w-max">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {['Employee','Gross','PF','ESI','PT','TDS','Deductions','Net Pay','Status',''].map(h => (
                                        <th key={h} className={`px-5 py-3 text-xs font-medium text-slate-500 ${['Gross','PF','ESI','PT','TDS','Deductions','Net Pay'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {payrollList.length === 0 ? (
                                    <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-400 text-sm">Select month and year, then load or process payroll</td></tr>
                                ) : payrollList.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-slate-800">{row.employee_name}</td>
                                        <td className="px-5 py-3 text-right">₹{Number(row.gross).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">₹{Number(row.pf).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">₹{Number(row.esi).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">₹{Number(row.professional_tax ?? row.pt ?? 0).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">₹{Number(row.tds).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right text-rose-600">₹{Number(row.total_deductions).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">₹{Number(row.net).toLocaleString('en-IN')}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${PAYROLL_BADGE[row.status] || 'bg-slate-100 text-slate-600'}`}>{row.status}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex gap-2">
                                                {row.status !== 'paid' && (
                                                    <button onClick={() => markPaid(row.id)} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">Mark Paid</button>
                                                )}
                                                <button onClick={() => viewPayslip(row.id)} className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">Payslip</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TDS / Form 16 */}
            {activeTab === 'TDS / Form 16' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Financial Year</label>
                            <select value={financialYear} onChange={e => setFinancialYear(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors">
                                {['2022-23','2023-24','2024-25','2025-26'].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={generateForm16} disabled={loading} className={btnPrimary}>
                            {loading ? 'Generating...' : 'Generate Form 16'}
                        </button>
                    </div>

                    {form16List.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['Name','Gross Salary','Taxable Income','Total TDS','Status',''].map(h => (
                                            <th key={h} className={`px-5 py-3 text-xs font-medium text-slate-500 ${['Gross Salary','Taxable Income','Total TDS'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {form16List.map((emp, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3 font-medium text-slate-800">{emp.name}</td>
                                            <td className="px-5 py-3 text-right">₹{Number(emp.gross_salary).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3 text-right">₹{Number(emp.taxable_income).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3 text-right font-semibold">₹{Number(emp.total_tds).toLocaleString('en-IN')}</td>
                                            <td className="px-5 py-3"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">{emp.status || 'generated'}</span></td>
                                            <td className="px-5 py-3">
                                                <button onClick={() => setForm16Detail(emp)} className="px-3 py-1 text-xs bg-[#f1f0ff] text-[#6c5ce7] rounded-lg hover:bg-[#f1f0ff] transition-colors">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* GST Report */}
            {activeTab === 'GST Report' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Month</label>
                            <select value={gstMonth} onChange={e => setGstMonth(e.target.value)}
                                className="px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors">
                                <option value="">Select Month</option>
                                {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Year</label>
                            <input type="number" value={gstYear} onChange={e => setGstYear(e.target.value)}
                                className="w-24 px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors" />
                        </div>
                        <button onClick={loadGstReport} disabled={loading} className={btnPrimary}>
                            {loading ? 'Loading...' : 'Load GST Report'}
                        </button>
                    </div>

                    {gstReport && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Total Fee Collection', value: gstReport.total_fee_collection },
                                { label: 'Taxable Amount', value: gstReport.taxable_amount },
                                { label: 'GST Collected', value: gstReport.gst_collected },
                                { label: 'CGST', value: gstReport.cgst },
                                { label: 'SGST', value: gstReport.sgst },
                            ].map(item => (
                                <div key={item.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                                    <p className="text-xs text-slate-500">{item.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">₹{Number(item.value || 0).toLocaleString('en-IN')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Payslip Modal */}
            {payslipModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Payslip — {payslipModal.employee_name}</h2>
                            <button onClick={() => setPayslipModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2">Earnings</p>
                                <dl className="space-y-1 text-sm">
                                    {(payslipModal.earnings as Array<Record<string, any>> || []).map((e, i) => (
                                        <div key={i} className="flex justify-between">
                                            <dt className="text-slate-600">{e.label}</dt>
                                            <dd className="font-medium">₹{Number(e.amount).toLocaleString('en-IN')}</dd>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold">
                                        <span>Gross</span><span>₹{Number(payslipModal.gross).toLocaleString('en-IN')}</span>
                                    </div>
                                </dl>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 mb-2">Deductions</p>
                                <dl className="space-y-1 text-sm">
                                    {(payslipModal.deductions as Array<Record<string, any>> || []).map((d, i) => (
                                        <div key={i} className="flex justify-between">
                                            <dt className="text-slate-600">{d.label}</dt>
                                            <dd className="font-medium text-rose-600">₹{Number(d.amount).toLocaleString('en-IN')}</dd>
                                        </div>
                                    ))}
                                    <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold text-rose-600">
                                        <span>Total</span><span>₹{Number(payslipModal.total_deductions).toLocaleString('en-IN')}</span>
                                    </div>
                                </dl>
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 flex justify-between items-center">
                            <span className="font-semibold text-emerald-800">Net Pay</span>
                            <span className="text-xl font-bold text-emerald-700">₹{Number(payslipModal.net).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Form 16 Modal */}
            {form16Detail && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">Form 16 — {form16Detail.name}</h2>
                            <button onClick={() => setForm16Detail(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <dt className="text-slate-500">Financial Year</dt><dd className="font-medium">{financialYear}</dd>
                            <dt className="text-slate-500">Gross Salary</dt><dd className="font-medium">₹{Number(form16Detail.gross_salary).toLocaleString('en-IN')}</dd>
                            <dt className="text-slate-500">Taxable Income</dt><dd className="font-medium">₹{Number(form16Detail.taxable_income).toLocaleString('en-IN')}</dd>
                            <dt className="text-slate-500">Total TDS</dt><dd className="font-semibold text-rose-600">₹{Number(form16Detail.total_tds).toLocaleString('en-IN')}</dd>
                            {form16Detail.details && Object.entries(form16Detail.details).map(([k, v]) => (
                                <><dt key={`k-${k}`} className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                                <dd key={`v-${k}`} className="font-medium">{String(v)}</dd></>
                            ))}
                        </dl>
                    </div>
                </div>
            )}
        </div>
    );
}
