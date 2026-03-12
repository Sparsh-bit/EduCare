'use client';
import { useRouter } from 'next/navigation';

export default function FeesSettingsPage() {
    const router = useRouter();

    const feesOptions = [
        { id: '1', title: 'Fees Setting', step: '1', link: '/fees/setup/settings', icon: '⚙️' },
        { id: '2', title: 'Fees Category', step: '2', link: '/fees/setup/fees-category', icon: '🏷️' },
        { id: '3', title: 'Installment Setup', step: '3', link: '/fees/setup/installments', icon: '📅' },
        { id: '4', title: 'Class Wise Fees Setup', step: '4', link: '/fees/setup/class-fees', icon: '₹' },
        { id: '5', title: 'Assign Fees to Student', step: '5', link: '/fees/setup/assign', icon: '₹' },
        { id: '6', title: 'Fees Adjustment', step: '6', link: '/fees/setup/adjustment', icon: '₹' },
        { id: '7', title: 'Sibling Fees Adjustment', step: '7', link: '#', icon: '₹' },
        { id: '8', title: 'Publish Fees to Parents', step: '8', link: '#', icon: '₹' },
        { id: '9', title: 'Setup Fees (Old Way)', step: '9', link: '/fees/setup/fees-group', icon: '₹' },
        { id: '10', title: 'Fees Structure', step: '10', link: '#', icon: '₹' },
        { id: '11', title: 'Fees Card', step: '11', link: '#', icon: '₹' },
    ];

    return (
        <div className="p-6 bg-[#f8f9fb] min-h-screen">
            <div className="mb-6 flex items-center text-sm text-gray-500 gap-2">
                <button onClick={() => router.push('/dashboard')} className="hover:text-teal-600 transition-colors">
                    <span className="text-teal-600">🏠</span>
                </button>
                <span>/</span>
                <span className="text-gray-900 font-medium cursor-pointer">Fees Setting</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {feesOptions.map((option) => (
                    <div
                        key={option.id}
                        onClick={() => router.push(option.link)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all cursor-pointer h-[120px]"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-600 rounded-l-xl"></div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">
                                {option.icon === '₹' ? '₹' : <span className="text-lg opacity-80">{option.icon}</span>}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-teal-700 font-bold text-sm leading-tight">{option.title}</h3>
                                <p className="text-teal-600/70 text-[11px] font-bold mt-1">
                                    Step: {option.step}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
