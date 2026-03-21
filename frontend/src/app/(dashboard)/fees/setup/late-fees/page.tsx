'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';

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
        rounding: 'none',
    });

    useEffect(() => {
        api.getFeeSettings()
            .then(data => { if (data) setSettings(prev => ({ ...prev, ...data })); })
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateFeeSettings(settings as Parameters<typeof api.updateFeeSettings>[0]);
            toast.success('Fee settings saved successfully');
        } catch {
            toast.error('Failed to save settings');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fee Settings</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure late fines, grace periods, and receipt defaults</p>
                </div>
                <button
                    onClick={() => router.push('/fees/setup')}
                    className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                >
                    <ArrowLeft size={14} />
                    Back to Setup
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Late Fine Policy */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Late Fine Policy</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.late_fine_enabled}
                                    onChange={e => setSettings({ ...settings, late_fine_enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                            </label>
                        </div>

                        <div className={`space-y-4 transition-opacity ${settings.late_fine_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, fine_type: 'fixed' })}
                                    className={`p-3 rounded-lg border-2 text-left transition-colors ${settings.fine_type === 'fixed' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <p className="text-xs font-medium text-amber-600">Fixed</p>
                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">Fixed Amount</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, fine_type: 'percentage' })}
                                    className={`p-3 rounded-lg border-2 text-left transition-colors ${settings.fine_type === 'percentage' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <p className="text-xs font-medium text-amber-600">Dynamic</p>
                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">Percentage %</p>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">Daily Fine</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={settings.fine_amount}
                                            onChange={e => setSettings({ ...settings, fine_amount: parseFloat(e.target.value) })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                            {settings.fine_type === 'fixed' ? '₹' : '%'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">Grace Period (days)</label>
                                    <input
                                        type="number"
                                        value={settings.grace_period_days}
                                        onChange={e => setSettings({ ...settings, grace_period_days: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Settings */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
                        <h3 className="font-semibold text-slate-900">Receipt Settings</h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Receipt Prefix</label>
                                <input
                                    value={settings.receipt_prefix}
                                    onChange={e => setSettings({ ...settings, receipt_prefix: e.target.value })}
                                    placeholder="e.g. REC/"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-600">Amount Rounding</label>
                                    <select
                                        value={settings.rounding}
                                        onChange={e => setSettings({ ...settings, rounding: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                                    >
                                        <option value="none">No Rounding</option>
                                        <option value="rupee">Nearest Rupee</option>
                                        <option value="ten">Nearest Ten</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <label className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={settings.allow_partial_payment}
                                            onChange={e => setSettings({ ...settings, allow_partial_payment: e.target.checked })}
                                            className="w-4 h-4 accent-[#6c5ce7]"
                                        />
                                        <span className="text-sm text-slate-600">Allow partial payments</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <p className="text-sm text-slate-600">Changes apply to all new invoices generated after saving.</p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#6c5ce7] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                {/* Note */}
                <div className="flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">
                        Late fine changes only apply to installments becoming due after saving. Existing overdue records keep the policy that was active when they were created.
                    </p>
                </div>
            </form>
        </div>
    );
}
