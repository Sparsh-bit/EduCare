'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { StaffMember } from '@/lib/types';

export default function StaffIdCardPage() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getStaffList().then((data) => {
            setStaffList((data as { data?: StaffMember[] }).data || []);
            setLoading(false);
        }).catch(err => {
            reportApiError(err);
            setLoading(false);
        });
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Staff...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff ID Cards</h1>
                    <p className="text-sm text-slate-500">View and print employee ID cards</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6]"
                >
                    🖨️ Print All Cards
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {staffList.map(staff => (
                    <div key={staff.id} className="bg-white border-2 border-[#6c5ce7]/20 rounded-xl overflow-hidden shadow-sm flex flex-col items-center p-6 text-center break-inside-avoid">
                        <div className="w-full bg-[#6c5ce7] h-16 absolute top-0 left-0 right-0 z-0 opacity-10" />

                        <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-sm z-10 overflow-hidden mb-3 flex items-center justify-center text-3xl">
                            👤
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 z-10">{staff.name}</h3>
                        <p className="text-[#6c5ce7] font-medium text-sm mb-4 tracking-wide">{staff.designation}</p>

                        <div className="w-full space-y-2 mt-2 bg-slate-50 p-3 rounded-lg text-left text-xs text-slate-700">
                            <div className="flex justify-between border-b pb-1">
                                <span className="font-medium">Emp ID:</span>
                                <span>EMP-{String(staff.id).padStart(4, '0')}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="font-medium">Dept:</span>
                                <span className="capitalize">{staff.department?.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                                <span className="font-medium">Phone:</span>
                                <span>{staff.phone}</span>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col items-center">
                            <div className="w-32 h-8 bg-black/10 rounded-sm mb-1 flex items-center justify-center text-[8px] text-slate-500 font-mono tracking-widest">
                                || | | || | | ||
                            </div>
                        </div>
                    </div>
                ))}

                {staffList.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        No staff members found.
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
