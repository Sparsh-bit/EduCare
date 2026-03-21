'use client';
import { useRouter } from 'next/navigation';
import { Settings, Tag, Calendar, IndianRupee, Users, Sliders } from 'lucide-react';

const feesOptions = [
    { title: 'Fee Settings', description: 'Late fines, receipts, rounding', link: '/fees/setup/settings', icon: Settings, step: 1 },
    { title: 'Fee Categories', description: 'Tuition, transport, etc.', link: '/fees/setup/fees-category', icon: Tag, step: 2 },
    { title: 'Installment Plans', description: 'Set due dates and splits', link: '/fees/setup/installments', icon: Calendar, step: 3 },
    { title: 'Class-wise Fees', description: 'Define fees per class', link: '/fees/setup/class-fees', icon: IndianRupee, step: 4 },
    { title: 'Assign to Students', description: 'Apply fee plans to students', link: '/fees/setup/assign', icon: Users, step: 5 },
    { title: 'Fee Adjustment', description: 'Discounts and corrections', link: '/fees/setup/adjustment', icon: Sliders, step: 6 },
];

export default function FeesSettingsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Fee Setup</h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure fees step by step — follow the numbered order for first-time setup</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feesOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                        <div
                            key={option.step}
                            onClick={() => router.push(option.link)}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md hover:border-[#f1f0ff] transition-all cursor-pointer group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[#f1f0ff] flex items-center justify-center shrink-0 group-hover:bg-[#f1f0ff] transition-colors">
                                <Icon size={18} className="text-[#6c5ce7]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#6c5ce7] bg-[#f1f0ff] px-1.5 py-0.5 rounded">
                                        Step {option.step}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 mt-1 text-sm">{option.title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">{option.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
