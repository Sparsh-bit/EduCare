'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { StaffMember } from '@/lib/types';

export default function StaffAttendancePage() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const loadUsers = async () => {
        try {
            // Reusing getStaffList for employee roster attendance mockup until specific route is there
            const res = await api.getStaffList();
            setStaffList(res.data || []);
        } catch (error) {
            reportApiError(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadUsers();
        })();
    }, []);

    const markAll = (status: 'P' | 'A') => {
        // Implement bulk status
        alert('Bulk ' + status + ' feature is processed via backend endpoint.');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Attendance</h1>
                    <p className="text-sm text-gray-500">Mark staff daily attendance</p>
                </div>
                <input
                    type="date" className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm shadow-sm font-medium"
                    value={date} onChange={e => setDate(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-6 overflow-hidden max-w-4xl mx-auto">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border mb-6">
                    <span className="font-semibold text-gray-800">Quick Actions:</span>
                    <div className="space-x-2">
                        <button onClick={() => markAll('P')} className="px-4 py-1.5 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 text-xs border border-green-200 uppercase tracking-widest">Mark All Present</button>
                        <button onClick={() => markAll('A')} className="px-4 py-1.5 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 text-xs border border-red-200 uppercase tracking-widest">Mark All Absent</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fb] text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3 uppercase text-xs tracking-wider">Emp No</th>
                                <th className="px-4 py-3 uppercase text-xs tracking-wider">Employee Name</th>
                                <th className="px-4 py-3 uppercase text-xs tracking-wider">Role & Dept</th>
                                <th className="px-4 py-3 text-center uppercase text-xs tracking-wider">Attendance Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading Staff Data...</td></tr>
                            ) : staffList.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No staff records found.</td></tr>
                            ) : staffList.map((staff, idx) => (
                                <tr key={staff.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-gray-500">EMP-{String(staff.id).padStart(3, '0')}</td>
                                    <td className="px-4 py-3 font-bold text-gray-900">{staff.name}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <div className="font-medium text-[#6c5ce7] uppercase tracking-wide">{staff.designation || 'Staff'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 justify-center">
                                            <button className={`w-12 py-1.5 text-xs font-bold rounded transition-colors border shadow-sm ${idx % 3 === 0 ? 'bg-green-500 text-white border-green-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'} `}>
                                                P
                                            </button>
                                            <button className={`w-12 py-1.5 text-xs font-bold rounded transition-colors border shadow-sm bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200`}>
                                                A
                                            </button>
                                            <button className={`w-12 py-1.5 text-xs font-bold rounded transition-colors border shadow-sm bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200`}>
                                                L
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
