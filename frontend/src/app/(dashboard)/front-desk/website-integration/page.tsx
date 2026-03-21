/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Copy, RefreshCw, Globe, Code } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';
const PUBLIC_ENDPOINT = `${API_BASE}/api/public/enquiry`;
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
                if (isActive) toast.error('Failed to load integration settings');
            } finally {
                if (isActive) setLoading(false);
            }
        })();
        return () => { isActive = false; };
    }, []);

    const copyToClipboard = (text: string, label = 'Copied!') => {
        navigator.clipboard.writeText(text).then(() => toast.success(label));
    };

    const handleRegenerate = async () => {
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

    const htmlApiKey = `<!-- ${schoolName} Admission Enquiry Form -->
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
  body.school_id = ${schoolId ?? 'YOUR_SCHOOL_ID'};

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
      school_id: ${schoolId ?? 'YOUR_SCHOOL_ID'},
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

    const htmlToken = `<!-- ${schoolName} Admission Enquiry Form — using school_token -->
<form id="admissionEnquiryForm">
  <input type="text"  name="student_name"  placeholder="Child's Full Name *" required />
  <input type="text"  name="father_name"   placeholder="Father's Name *"     required />
  <input type="tel"   name="contact_phone" placeholder="Phone Number *"      required />
  <input type="email" name="email"         placeholder="Email Address" />
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
        : { html: htmlToken, js: jsApiKey, react: reactApiKey };

    const tabLabels = { html: 'HTML + Script', js: 'Node.js (Server)', react: 'Next.js API Route' };

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl w-64" />
            <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Globe size={24} className="text-[#6c5ce7]" />
                    Website Integration
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Connect your school website — admission enquiries submitted there appear instantly in the ERP.
                </p>
            </div>

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { step: '1', title: 'Get your credentials', desc: 'Use the ERP API Key (recommended) or the per-school token below.' },
                    { step: '2', title: 'Add to your website', desc: "Paste the code snippet into your website's enquiry form page." },
                    { step: '3', title: 'Enquiries flow in', desc: 'Every submission appears in Front Desk → Enquiry (source: website).' },
                ].map(({ step, title, desc }) => (
                    <div key={step} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-lg bg-[#6c5ce7] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{step}</div>
                        <div>
                            <p className="font-semibold text-slate-900 text-sm">{title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Credentials */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
                {/* API endpoint */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">API Endpoint (POST)</p>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
                        <span className="text-sm font-mono text-[#6c5ce7] truncate flex-1">{PUBLIC_ENDPOINT}</span>
                        <button onClick={() => copyToClipboard(PUBLIC_ENDPOINT, 'Endpoint copied!')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#f1f0ff] text-[#6c5ce7] rounded-lg hover:bg-[#f1f0ff] flex-shrink-0">
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                </div>

                {/* School ID */}
                {schoolId && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your School ID</p>
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                            <span className="text-sm font-mono text-emerald-800 flex-1 font-bold">{schoolId}</span>
                            <button onClick={() => copyToClipboard(String(schoolId), 'School ID copied!')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex-shrink-0">
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">Send as <code className="bg-slate-100 px-1 rounded text-xs">school_id</code> in the request body when using the API key method.</p>
                    </div>
                )}

                {/* Method selection */}
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Authentication Method</p>
                    <div className="flex gap-3">
                        <button onClick={() => setAuthMethod('apikey')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${authMethod === 'apikey' ? 'bg-[#6c5ce7] text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            API Key (Recommended)
                        </button>
                        <button onClick={() => setAuthMethod('token')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${authMethod === 'token' ? 'bg-[#6c5ce7] text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            School Token
                        </button>
                    </div>
                </div>

                {authMethod === 'apikey' ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-800">ERP API Key is configured</p>
                                <p className="text-xs text-amber-600 font-mono mt-0.5">{API_KEY_HINT}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            Send as <code className="bg-slate-100 px-1 rounded text-xs">x-api-key</code> HTTP header.
                            Always use a <strong>server-side proxy</strong> so the key never appears in browser source code.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">School Token</p>
                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                                <span className="text-sm font-mono text-amber-800 truncate flex-1 select-all">{token}</span>
                                <button onClick={() => copyToClipboard(token, 'Token copied!')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex-shrink-0">
                                    <Copy size={12} /> Copy
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">Send as <code className="bg-slate-100 px-1 rounded text-xs">school_token</code> in the request body.</p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleRegenerate} disabled={regenerating}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
                                <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                                {regenerating ? 'Regenerating...' : 'Regenerate Token'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Code snippets */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Code size={18} className="text-[#6c5ce7]" />
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Integration Code</h3>
                            <p className="text-xs text-slate-400">Paste into your school website to connect it with the ERP</p>
                        </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${authMethod === 'apikey' ? 'bg-[#f1f0ff] text-[#6c5ce7]' : 'bg-amber-50 text-amber-600'}`}>
                        {authMethod === 'apikey' ? 'API Key method' : 'Token method'}
                    </span>
                </div>

                <div className="flex border-b border-slate-100 px-6">
                    {(Object.keys(tabLabels) as Array<keyof typeof tabLabels>).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-3 text-xs font-medium border-b-2 transition-all ${activeTab === tab ? 'border-[#6c5ce7] text-[#6c5ce7]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tabLabels[tab]}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <pre className="overflow-x-auto p-6 text-xs text-slate-700 bg-slate-50 leading-relaxed font-mono whitespace-pre">
                        {snippets[activeTab as keyof typeof snippets]}
                    </pre>
                    <button onClick={() => copyToClipboard(snippets[activeTab as keyof typeof snippets], 'Code copied!')}
                        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-[#6c5ce7] hover:border-[#6c5ce7]/20 shadow-sm transition">
                        <Copy size={12} /> Copy Code
                    </button>
                </div>
            </div>

            {/* Fields reference */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900 text-sm">API Fields Reference</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Field</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Type</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Required</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
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
                                <tr key={row.field} className="hover:bg-slate-50/50">
                                    <td className="px-5 py-3 font-mono text-[#6c5ce7] font-semibold text-xs">{row.field}</td>
                                    <td className="px-5 py-3 text-slate-500">{row.type}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${row.req === 'Yes' ? 'bg-red-50 text-red-600' : row.req.startsWith('If') || row.req.startsWith('With') ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {row.req}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-5 m-5 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Success Response (HTTP 201)</p>
                    <pre className="text-xs font-mono text-emerald-600">{`{ "success": true, "message": "Enquiry submitted successfully...", "enquiry_number": "ENQ/2026/0001" }`}</pre>
                </div>
            </div>
        </div>
    );
}
