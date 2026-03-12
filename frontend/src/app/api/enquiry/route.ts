import { NextRequest, NextResponse } from 'next/server';

// Simple in-process rate limiter: max 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT) return true;
    entry.count++;
    return false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{6,19}$/;

function validate(body: Record<string, unknown>): string | null {
    if (!body.schoolName || typeof body.schoolName !== 'string' || body.schoolName.trim().length < 2) {
        return 'School name is required (min 2 characters)';
    }
    if (!body.ownerName || typeof body.ownerName !== 'string' || body.ownerName.trim().length < 2) {
        return 'Owner name is required (min 2 characters)';
    }
    if (!body.email || typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
        return 'A valid email address is required';
    }
    if (!body.phone || typeof body.phone !== 'string' || !PHONE_RE.test(body.phone)) {
        return 'A valid phone number is required';
    }
    const students = Number(body.students);
    if (!body.students || isNaN(students) || students < 1 || students > 100000) {
        return 'Expected students must be between 1 and 100,000';
    }
    return null;
}

export async function POST(req: NextRequest) {
    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
        return NextResponse.json({ error: 'Enquiry service not configured' }, { status: 503 });
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: 'Too many enquiries submitted. Please try again later.' },
            { status: 429 },
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Input validation — only forward explicitly allowed fields
    const validationError = validate(body);
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 422 });
    }

    // Build a sanitised payload — never spread untrusted body directly
    const payload = {
        access_key: accessKey,
        subject: `New EduCare ERP Setup Request: ${String(body.schoolName).trim()}`,
        from_name: String(body.ownerName).trim(),
        school_name: String(body.schoolName).trim(),
        owner_name: String(body.ownerName).trim(),
        email: String(body.email).toLowerCase().trim(),
        phone: String(body.phone).trim(),
        students: String(body.students),
    };

    const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.success) {
        return NextResponse.json({ error: data.message || 'Submission failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
