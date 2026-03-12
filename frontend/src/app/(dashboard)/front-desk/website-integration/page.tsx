/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';
const PUBLIC_ENDPOINT = `${API_BASE}/api/public/enquiry`;
// The ERP_API_KEY is a server-side secret — we only show a masked hint, not the full value
const API_KEY_HINT = 'ndps_erp_****  (set in backend .env as ERP_API_KEY)';

export default function WebsiteIntegrationPage() {
    const [token, setToken] = useState('');
    const [schoolId, setSchoolId] = useState<number | null>(null);
    const [schoolName, setSchoolName] = useState('');
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'html' | 'js' | 'react'>('html');
    const [authMethod, setAuthMethod] = useState<'apikey' | 'token'>('apikey');

    useEffect(() => {
        let isActive = true;

        (async () => {
            try {
                const data = await api.getWebsiteToken();
                const profileApi = api as unknown as { getSchoolProfile?: () => Promise<{ id?: number }> };
                const profile = profileApi.getSchoolProfile ? await profileApi.getSchoolProfile() : null;
                if (!isActive) return;

                setToken(data.website_token);
                setSchoolName(data.school_name);
                if (profile?.id) setSchoolId(profile.id);
            } catch {
                if (isActive) {
                    toast.error('Failed to load integration settings');
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, []);

    const copyToClipboard = (text: string, label = 'Copied!') => {
        navigator.clipboard.writeText(text).then(() => toast.success(label));
    };

    const handleRegenerate = async () => {
        if (!confirm(
            'Regenerating the token will break any existing website integration until you update the token there. Continue?'
        )) return;
        setRegenerating(true);
        try {
            const data = await api.regenerateWebsiteToken();
            setToken(data.website_token);
            toast.success('Token regenerated — update your website integration now');
        } catch (err: any) {
            toast.error(err?.message ?? 'Failed to regenerate token');
        }
        setRegenerating(false);
    };

    // ── Code snippets — API Key method (primary) ──
    const htmlApiKey = `<!-- ${schoolName} Admission Enquiry Form -->
<!-- Uses ERP_API_KEY header — keep the key on your server, not in browser JS -->
<form id="admissionEnquiryForm">
  <input type="text"  name="student_name"  placeholder="Child's Full Name *" required />
  <input type="text"  name="father_name"   placeholder="Father's Name *"     required />
  <input type="tel"   name="contact_phone" placeholder="Phone Number *"      required />
  <input type="email" name="email"         placeholder="Email Address" />
  <input type="text"  name="mother_name"   placeholder="Mother's Name" />
  <textarea           name="address"       placeholder="Address"></textarea>
  <textarea           name="notes"         placeholder="Message / Query"></textarea>
  <button type="submit">Submit Enquiry</button>
  <p id="enquiryMsg"></p>
</form>

<!-- NOTE: For production, POST to your own server-side handler to keep the API key secret -->
<script>
document.getElementById('admissionEnquiryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd   = new FormData(this);
  const body = Object.fromEntries(fd.entries());
  body.school_id = ${schoolId ?? 'YOUR_SCHOOL_ID'}; // add school_id when using API key auth

  const msg = document.getElementById('enquiryMsg');
  try {
    const res = await fetch('${PUBLIC_ENDPOINT}', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_ERP_API_KEY', // replace — ideally send via your backend proxy
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    msg.style.color = res.ok ? 'green' : 'red';
    msg.textContent  = res.ok
      ? data.message + ' (Ref: ' + data.enquiry_number + ')'
      : (data.error || 'Submission failed');
    if (res.ok) this.reset();
  } catch {
    msg.style.color   = 'red';
    msg.textContent   = 'Network error. Please try again.';
  }
});
</script>`;

    const jsApiKey = `// Recommended: call this from YOUR SERVER (Node/PHP/etc.) to keep the API key hidden
// POST to your own backend route which then calls the ERP API

// --- Your server-side handler (Node.js / Express example) ---
app.post('/submit-enquiry', async (req, res) => {
  const response = await fetch('${PUBLIC_ENDPOINT}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ERP_API_KEY, // stored in your website's .env
    },
    body: JSON.stringify({
      school_id:     ${schoolId ?? 'YOUR_SCHOOL_ID'},
      student_name:  req.body.studentName,  // required
      father_name:   req.body.fatherName,   // required
      contact_phone: req.body.phone,        // required
      email:         req.body.email,
      mother_name:   req.body.motherName,
      address:       req.body.address,
      notes:         req.body.notes,
    }),
  });
  const result = await response.json();
  if (!response.ok) return res.status(response.status).json(result);
  res.json(result); // { success: true, message: '...', enquiry_number: 'ENQ/2026/0001' }
});`;

    const reactApiKey = `// pages/api/submit-enquiry.ts  (Next.js API route — keeps key server-side)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const response = await fetch('${PUBLIC_ENDPOINT}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ERP_API_KEY!, // in your website's .env.local
    },
    body: JSON.stringify({
      school_id:     ${schoolId ?? 'YOUR_SCHOOL_ID'},
      ...req.body,
    }),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}

// --- Client component ---
async function submitEnquiry(formData: Record<string, string>) {
  const res = await fetch('/api/submit-enquiry', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(formData),
  });
  return res.json();
}`;

    // ── Code snippets — school_token method (alternative) ──
    const htmlToken = `<!-- ${schoolName} Admission Enquiry Form — using school_token -->
<form id="admissionEnquiryForm">
  <input type="text"  name="student_name"  placeholder="Child's Full Name *" required />
  <input type="text"  name="father_name"   placeholder="Father's Name *"     required />
  <input type="tel"   name="contact_phone" placeholder="Phone Number *"      required />
  <input type="email" name="email"         placeholder="Email Address" />
  <input type="text"  name="mother_name"   placeholder="Mother's Name" />
  <textarea           name="address"       placeholder="Address"></textarea>
  <textarea           name="notes"         placeholder="Message / Query"></textarea>
  <button type="submit">Submit Enquiry</button>
  <p id="enquiryMsg"></p>
</form>

<script>
document.getElementById('admissionEnquiryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd   = new FormData(this);
  const body = Object.fromEntries(fd.entries());
  body.school_token = '${token}';

  const msg = document.getElementById('enquiryMsg');
  try {
    const res  = await fetch('${PUBLIC_ENDPOINT}', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    msg.style.color = res.ok ? 'green' : 'red';
    msg.textContent  = res.ok
      ? data.message + ' (Ref: ' + data.enquiry_number + ')'
      : (data.error || 'Submission failed');
    if (res.ok) this.reset();
  } catch {
    msg.style.color = 'red';
    msg.textContent = 'Network error. Please try again.';
  }
});
</script>`;

    const snippets = authMethod === 'apikey'
        ? { html: htmlApiKey, js: jsApiKey, react: reactApiKey }
        : { html: htmlToken, js: jsApiKey.replace(/x-api-key.*\n.*ERP_API_KEY.*/, '// no header needed — school_token in body'), react: reactApiKey };

    const tabLabels = { html: 'HTML + Script', js: 'Node.js (Server)', react: 'Next.js API Route' };

    if (loading) {
        return (
            <div className="p-6 animate-pulse space-y-6">
                <div className="h-10 bg-gray-100 rounded-2xl w-64" />
                <div className="h-40 bg-gray-100 rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">🌐</span>
                    Website Integration
                </h1>
                <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">
                    Connect your school website — every admission enquiry submitted there appears instantly in the ERP.
                </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { step: '1', icon: '🔑', title: 'Get your credentials', desc: 'Use the ERP API Key (recommended) or the per-school token below.' },
                    { step: '2', icon: '🖥️', title: 'Add to your website', desc: 'Paste the code snippet into your website\'s enquiry form page.' },
                    { step: '3', icon: '📥', title: 'Enquiries flow in', desc: 'Every submission appears in Front Desk → Enquiry (source: website).' },
                ].map(({ step, icon, title, desc }) => (
                    <div key={step} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-2xl bg-[#6c5ce7] text-white flex items-center justify-center font-black text-sm flex-shrink-0">{step}</div>
                        <div>
                            <p className="font-bold text-gray-900 flex items-center gap-2">{icon} {title}</p>
                            <p className="text-xs text-gray-500 mt-1">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Credentials card */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#6c5ce7]" />

                {/* API endpoint */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API Endpoint (POST)</p>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-3">
                        <span className="text-sm font-mono text-[#6c5ce7] truncate flex-1">{PUBLIC_ENDPOINT}</span>
                        <button onClick={() => copyToClipboard(PUBLIC_ENDPOINT, 'Endpoint copied!')}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[#f1f0ff] text-[#6c5ce7] rounded-xl hover:bg-[#f1f0ff] transition flex-shrink-0">
                            Copy
                        </button>
                    </div>
                </div>

                {/* School ID */}
                {schoolId && (
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Your School ID</p>
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3">
                            <span className="text-sm font-mono text-emerald-800 flex-1 font-bold">{schoolId}</span>
                            <button onClick={() => copyToClipboard(String(schoolId), 'School ID copied!')}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition flex-shrink-0">
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 ml-1">Send this as <code className="bg-gray-100 px-1 rounded text-xs">school_id</code> in the request body when using the API key method.</p>
                    </div>
                )}

                {/* Method tabs */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Authentication Method</p>
                    <div className="flex gap-3">
                        <button onClick={() => setAuthMethod('apikey')}
                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${authMethod === 'apikey' ? 'bg-[#6c5ce7] text-white border-[#6c5ce7] shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-[#f1f0ff]'}`}>
                            ERP API Key (Recommended)
                        </button>
                        <button onClick={() => setAuthMethod('token')}
                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${authMethod === 'token' ? 'bg-[#6c5ce7] text-white border-[#6c5ce7] shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-[#f1f0ff]'}`}>
                            School Token
                        </button>
                    </div>
                </div>

                {/* API Key info */}
                {authMethod === 'apikey' ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                            <span className="text-xl">🔑</span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-800">ERP API Key is configured</p>
                                <p className="text-xs text-amber-600 font-mono mt-0.5">{API_KEY_HINT}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 ml-1">
                            Send as <code className="bg-gray-100 px-1 rounded text-xs">x-api-key</code> HTTP header.
                            Always use a <strong>server-side proxy</strong> (Node/PHP/Next.js API route) so the key never leaks in browser source code.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">School Token</p>
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3">
                                <span className="text-sm font-mono text-amber-800 truncate flex-1 select-all">{token}</span>
                                <button onClick={() => copyToClipboard(token, 'Token copied!')}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition flex-shrink-0">
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 ml-1">Send as <code className="bg-gray-100 px-1 rounded text-xs">school_token</code> in the request body.</p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleRegenerate} disabled={regenerating}
                                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-50 transition disabled:opacity-50">
                                {regenerating ? 'Regenerating...' : 'Regenerate Token'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Code snippets */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-3">
                            <span className="text-xl">{'</>'}</span> Integration Code
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${authMethod === 'apikey' ? 'bg-[#f1f0ff] text-[#6c5ce7]' : 'bg-amber-50 text-amber-600'}`}>
                                {authMethod === 'apikey' ? 'API Key method' : 'Token method'}
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Paste this into your school website to connect it with the ERP.</p>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-gray-50 px-8">
                    {(Object.keys(tabLabels) as Array<keyof typeof tabLabels>).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)}
                            className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#6c5ce7] text-[#6c5ce7]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                            {tabLabels[tab]}
                        </button>
                    ))}
                </div>

                {/* Code block */}
                <div className="relative">
                    <pre className="overflow-x-auto p-8 text-xs text-gray-700 bg-gray-50 leading-relaxed font-mono whitespace-pre">
                        {snippets[activeTab as keyof typeof snippets]}
                    </pre>
                    <button onClick={() => copyToClipboard(snippets[activeTab as keyof typeof snippets], 'Code copied!')}
                        className="absolute top-4 right-4 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#6c5ce7] hover:border-[#6c5ce7]/20 shadow-sm transition">
                        Copy Code
                    </button>
                </div>
            </div>

            {/* Fields reference */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
                <h3 className="text-lg font-black text-gray-900 mb-6">API Fields Reference</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Field</th>
                                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Required</th>
                                <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[
                                { field: 'x-api-key', type: 'header', req: 'If using API key', desc: 'Your ERP_API_KEY — send as HTTP header (server-side only)' },
                                { field: 'school_id', type: 'integer', req: 'With API key', desc: 'Your school ID (shown above)' },
                                { field: 'school_token', type: 'UUID string', req: 'If using token', desc: 'Alternative to API key — per-school UUID token' },
                                { field: 'student_name', type: 'string', req: 'Yes', desc: 'Full name of the child' },
                                { field: 'father_name', type: 'string', req: 'Yes', desc: "Father's / Guardian's name" },
                                { field: 'contact_phone', type: 'string', req: 'Yes', desc: 'Primary contact phone number' },
                                { field: 'email', type: 'string', req: 'No', desc: 'Email address' },
                                { field: 'mother_name', type: 'string', req: 'No', desc: "Mother's name" },
                                { field: 'address', type: 'string', req: 'No', desc: 'Residential address' },
                                { field: 'notes', type: 'string', req: 'No', desc: 'Message or query from parent' },
                            ].map(row => (
                                <tr key={row.field}>
                                    <td className="px-5 py-4 font-mono text-[#6c5ce7] font-semibold">{row.field}</td>
                                    <td className="px-5 py-4 text-gray-500">{row.type}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${row.req === 'Yes' ? 'bg-rose-50 text-rose-500' : row.req.startsWith('If') || row.req.startsWith('With') ? 'bg-amber-50 text-amber-500' : 'bg-gray-50 text-gray-400'}`}>
                                            {row.req}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-gray-500">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700">Success Response (HTTP 201)</p>
                    <pre className="text-xs font-mono text-emerald-600 mt-2">{`{ "success": true, "message": "Enquiry submitted successfully...", "enquiry_number": "ENQ/2026/0001" }`}</pre>
                </div>
            </div>
        </div>
    );
}
