'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterSchoolPage() {
    const [formData, setFormData] = useState({
        schoolName: '',
        ownerName: '',
        email: '',
        phone: '',
        students: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await fetch('/api/enquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `New EduCare ERP Setup Request: ${formData.schoolName}`,
                    from_name: formData.ownerName,
                    ...formData,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit enquiry');

            setSuccess(`Enquiry submitted successfully! The Concilio team will reach out to you within 24 hours.`);
            setTimeout(() => router.push('/'), 5000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f8f9fb]">
            <div className="w-full flex flex-col min-h-screen">
                <div className="px-4 sm:px-8 py-6 flex items-center justify-between max-w-lg mx-auto w-full">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-sm">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
                    <div className="w-full max-w-lg">
                        <h1
                            className="text-3xl font-light text-[#6c5ce7] mb-2"
                            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                        >
                            Enquire About EduCare ERP
                        </h1>
                        <p className="text-sm text-[#6c5ce7]/50 mb-8">
                            Fill out your details and our team at Concilio will contact you to set up your multi-tenant school dashboard.
                        </p>

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">School Name</label>
                                    <input
                                        type="text"
                                        value={formData.schoolName}
                                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                                        placeholder="International Public School"
                                        required
                                        className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">Owner / Representative Name</label>
                                    <input
                                        type="text"
                                        value={formData.ownerName}
                                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                                        placeholder="John Doe"
                                        required
                                        className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="hello@school.com"
                                        required
                                        className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 99999 99999"
                                        required
                                        className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">Expected Number of Students</label>
                                <input
                                    type="number"
                                    value={formData.students}
                                    onChange={(e) => setFormData({ ...formData, students: e.target.value })}
                                    placeholder="500"
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 mt-4 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors disabled:opacity-50 tracking-wide"
                            >
                                {loading ? 'Submitting Application...' : 'Submit Enquiry'}
                            </button>
                        </form>

                        <p className="text-xs text-[#6c5ce7]/50 text-center mt-8">
                            Already purchased the ERP? <Link href="/signup" className="text-[#6c5ce7] hover:underline font-medium">Create user account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
