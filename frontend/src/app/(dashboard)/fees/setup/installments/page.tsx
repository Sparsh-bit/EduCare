'use client';

export default function InstallmentSetupPage() {
    return (
        <div className="p-6 bg-[#f8f9fb] min-h-screen">
            <div className="mb-6 flex items-center text-sm text-gray-500 gap-2">
                <span className="text-teal-600 cursor-pointer">🏠</span>
                <span>/</span>
                <span className="text-teal-600 cursor-pointer hover:underline">Fees Setting</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Installment Setup</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Add Installment Form */}
                <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-bold text-gray-800 tracking-wide text-sm bg-gray-50/50">
                        Add Installment
                    </div>
                    <form className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Installment Name*</label>
                            <input
                                type="text"
                                placeholder="eg. Apr-Mar,Apr"
                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Month(s)*</label>
                            <select className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none bg-white">
                                <option>Select</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Due Date*</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Class Standard*</label>
                            <select className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none bg-white">
                                <option>Select</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Sequence No.*</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-6 rounded text-sm transition-colors shadow-sm">
                                Save
                            </button>
                        </div>
                    </form>
                </div>

                {/* Installment List Table */}
                <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-bold text-gray-800 tracking-wide text-sm bg-gray-50/50">
                        Installment List
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <select className="border border-gray-200 rounded px-2 py-1 outline-none text-gray-700">
                                    <option>10</option>
                                    <option>25</option>
                                    <option>50</option>
                                </select>
                                <span>entries</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>Search:</span>
                                <input type="text" className="border border-gray-200 rounded px-2 py-1 outline-none focus:border-teal-500 w-48 text-sm" />
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-gray-100 rounded">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-100 font-bold text-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-200">Class Standard</th>
                                        <th className="px-4 py-3 border-b border-gray-200">Installment Name</th>
                                        <th className="px-4 py-3 border-b border-gray-200 text-center">Sequence No.</th>
                                        <th className="px-4 py-3 border-b border-gray-200">Due Date</th>
                                        <th className="px-4 py-3 border-b border-gray-200 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                    {[
                                        { class: 'Demo', name: 'JUL - APR', seq: 1, date: '2025-07-30' },
                                        { class: 'Demo', name: 'AUG', seq: 2, date: '2025-08-15' },
                                        { class: 'Demo', name: 'SEP - MAY', seq: 3, date: '2025-09-15' },
                                        { class: 'Demo', name: 'OCT', seq: 4, date: '2025-10-15' },
                                        { class: 'Demo', name: 'NOV', seq: 5, date: '2025-11-15' },
                                        { class: 'Demo', name: 'DEC', seq: 6, date: '2025-12-15' },
                                        { class: 'Demo', name: 'JAN - JUN', seq: 7, date: '2026-01-15' },
                                        { class: 'Demo', name: 'FEB', seq: 8, date: '2026-02-15' },
                                        { class: 'Demo', name: 'MAR', seq: 9, date: '2026-03-15' },
                                        { class: 'I', name: 'JUL - APR', seq: 1, date: '2025-07-30' }
                                    ].map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="px-4 py-3">{row.class}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                                            <td className="px-4 py-3 text-center">{row.seq}</td>
                                            <td className="px-4 py-3 text-gray-600">{row.date}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button className="bg-teal-600 hover:bg-teal-700 text-white rounded w-6 h-6 flex items-center justify-center mx-auto text-xs shadow-sm transition-colors">
                                                    ✏️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                            <div>Showing 1 to 10 of 180 entries</div>
                            <div className="flex items-center">
                                <button className="px-3 py-1.5 border border-gray-200 rounded-l text-gray-500 bg-white hover:bg-gray-50 transition-colors">Previous</button>
                                <button className="px-3 py-1.5 border-y border-r border-[#1e8a8a] bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors">1</button>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">2</button>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">3</button>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">4</button>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">5</button>
                                <span className="px-3 py-1.5 border-y border-r border-gray-200 text-gray-500 bg-white">...</span>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">18</button>
                                <button className="px-3 py-1.5 border-y border-r border-gray-200 rounded-r text-[#1e8a8a] bg-white hover:bg-gray-50 transition-colors">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

