'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';

export default function InstallmentSetupPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Installment Setup</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Configure installment schedules for fee collection</p>
                </div>
                <button onClick={() => router.push('/fees/setup')} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors">
                    <ArrowLeft size={14} />
                    Back to Setup
                </button>
            </div>

            <div className="flex gap-3 items-start bg-[#f1f0ff] border border-[#f1f0ff] rounded-xl p-4">
                <Info size={16} className="text-[#6c5ce7] mt-0.5 shrink-0" />
                <div className="text-sm text-[#4834d4]">
                    <p className="font-medium">Installment dates are configured per class</p>
                    <p className="mt-0.5 text-[#5b4bd5]">Go to <button onClick={() => router.push('/fees/setup/class-fees')} className="underline font-medium">Class-wise Fees</button> to set installment due dates for each class individually.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-1">Add Installment Plan</h3>
                    <p className="text-xs text-slate-400 mb-4">Define a named installment plan for a class</p>

                    <form className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Installment Name *</label>
                            <input type="text" placeholder="e.g. April Installment" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Month(s)</label>
                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors">
                                <option value="">Select month</option>
                                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Due Date *</label>
                            <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Sequence Number *</label>
                            <input type="number" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors" />
                        </div>
                        <button type="submit" className="bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] transition-colors">
                            Save
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm">Installment Plans</h3>
                    </div>
                    <div className="p-12 text-center text-slate-400">
                        <p className="text-sm">No installment plans configured yet.</p>
                        <p className="text-xs mt-1">Use the form on the left to add a plan, or set due dates in Class-wise Fees.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
