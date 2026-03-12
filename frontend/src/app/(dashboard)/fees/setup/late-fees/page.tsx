'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface LocalFeeSettings {
    late_fine_enabled: boolean;
    fine_type: string;
    fine_amount: number;
    grace_period_days: number;
    max_fine_cap: number;
    receipt_prefix: string;
    receipt_start_number: number;
    allow_advance_payment: boolean;
    allow_partial_payment: boolean;
    rounding: string;
}

export default function LateFeeSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<LocalFeeSettings>({
        late_fine_enabled: false,
        fine_type: 'fixed',
        fine_amount: 0,
        grace_period_days: 7,
        max_fine_cap: 0,
        receipt_prefix: 'REC/',
        receipt_start_number: 1,
        allow_advance_payment: true,
        allow_partial_payment: true,
        rounding: 'none'
    });

    const loadSettings = async () => {
        try {
            const data = await api.getFeeSettings();
            if (data) setSettings(prev => ({ ...prev, ...data }));
        } catch {
            toast.error('Failed to load settings');
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadSettings();
        })();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateFeeSettings(settings as Parameters<typeof api.updateFeeSettings>[0]);
            toast.success('Configuration saved successfully');
        } catch {
            toast.error('Failed to update configuration');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center text-gray-400 animate-pulse font-black uppercase tracking-widest text-xs">Synchronizing Policy...</div>;

    return (
        <div className="p-6 space-y-8 animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">⚙️</span>
                        Institutional Fee Policy
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Configure penalties, grace periods, and accounting defaults</p>
                </div>
                <button onClick={() => router.push('/fees/setup')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 hover:text-[#6c5ce7] hover:border-[#f1f0ff] transition-all shadow-sm">
                    ⬅ Back to Setup
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Penalty Configuration */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-50" />

                        <div className="flex items-center justify-between relative z-10">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm">⌛</span>
                                Late Fine Policy
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.late_fine_enabled} onChange={e => setSettings({ ...settings, late_fine_enabled: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>

                        <div className={`space-y-6 transition-all duration-300 ${settings.late_fine_enabled ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setSettings({ ...settings, fine_type: 'fixed' })} className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.fine_type === 'fixed' ? 'border-amber-500 bg-amber-50/50' : 'border-gray-50 hover:border-gray-100'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Static</p>
                                    <p className="text-sm font-extrabold text-gray-900 mt-1">Fixed Amount</p>
                                </button>
                                <button type="button" onClick={() => setSettings({ ...settings, fine_type: 'percentage' })} className={`p-4 rounded-2xl border-2 transition-all text-left ${settings.fine_type === 'percentage' ? 'border-amber-500 bg-amber-50/50' : 'border-gray-50 hover:border-gray-100'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Dynamic</p>
                                    <p className="text-sm font-extrabold text-gray-900 mt-1">Percentage %</p>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Daily Penalty</label>
                                    <div className="relative">
                                        <input type="number" value={settings.fine_amount} onChange={e => setSettings({ ...settings, fine_amount: parseFloat(e.target.value) })}
                                            className="w-full bg-gray-50 border-none rounded-2xl text-sm font-black py-4 px-5 focus:ring-2 focus:ring-amber-500/20" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300">{settings.fine_type === 'fixed' ? '₹' : '%'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Grace Period</label>
                                    <div className="relative">
                                        <input type="number" value={settings.grace_period_days} onChange={e => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) })}
                                            className="w-full bg-gray-50 border-none rounded-2xl text-sm font-black py-4 px-5 focus:ring-2 focus:ring-amber-500/20" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-[10px] uppercase">Days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Configuration */}
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f1f0ff] rounded-full -mr-16 -mt-16 opacity-50" />

                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 relative z-10">
                            <span className="w-8 h-8 rounded-xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center text-sm">🧾</span>
                            Receipt Defaults
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Receipt Prefix</label>
                                <input value={settings.receipt_prefix} onChange={e => setSettings({ ...settings, receipt_prefix: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl text-sm font-black py-4 px-5 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. REC/" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Rounding Rule</label>
                                    <select value={String(settings.rounding)} onChange={e => setSettings({ ...settings, rounding: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-black py-4 px-5 focus:ring-2 focus:ring-[#6c5ce7]/20">
                                        <option value="none">No Rounding</option>
                                        <option value="rupee">Nearest Rupee</option>
                                        <option value="ten">Nearest Ten</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <label className="relative flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors">
                                        <input type="checkbox" checked={settings.allow_partial_payment} onChange={e => setSettings({ ...settings, allow_partial_payment: e.target.checked })} className="w-4 h-4 rounded text-[#6c5ce7] focus:ring-[#6c5ce7]" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tight">Partial Pay</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between p-8 bg-gray-900 rounded-[32px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 translate-x-32" />
                    <div className="relative z-10">
                        <p className="text-white font-bold text-lg">Save Global Configuration</p>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Changes reflect instantly for all new invoices</p>
                    </div>
                    <button type="submit" disabled={saving} className="relative z-10 px-12 py-4 bg-[#f1f0ff]0 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-[#a29bfe] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {saving ? 'Synchronizing...' : 'Update Policy'}
                        {!saving && <span className="text-lg">⚡</span>}
                    </button>
                </div>
            </form>

            {/* Quick Warning */}
            <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 flex gap-4 items-start">
                <span className="text-2xl mt-1">⚠️</span>
                <div>
                    <h4 className="text-[11px] font-black text-rose-800 uppercase tracking-widest">Crucial Note on Accounting</h4>
                    <p className="text-xs text-rose-700/70 mt-1 leading-relaxed font-medium">
                        Modified late fee policies only apply to installments becoming due AFTER the update. Existing overdue records retain the policy active at their moment of generation to maintain historical ledger integrity.
                    </p>
                </div>
            </div>
        </div>
    );
}
