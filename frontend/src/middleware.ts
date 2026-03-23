import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/students', '/attendance', '/fees', '/exams', '/staff',
    '/alerts', '/notices', '/front-desk', '/accounts', '/hr', '/communication', '/tax',
    '/board', '/rte', '/udise', '/payments', '/team'];

// Routes that require parent auth
const PARENT_PREFIX = '/parent';

// Public routes (never redirect)
const PUBLIC_ROUTES = ['/', '/login', '/register', '/signup', '/forgot-password', '/reset-password'];

// ─── Path traversal / injection pattern detection ───
// Blocks URLs containing sequences commonly used in directory traversal and
// basic injection probes before they ever reach route handlers.
const SUSPICIOUS_PATTERNS = [
    /\.\.\//,                        // directory traversal
    /\.\.\\/,                        // Windows-style traversal
    /%2e%2e/i,                       // URL-encoded ../
    /%252e%252e/i,                   // double-encoded ../
    /<script/i,                      // reflected XSS probe
    /javascript:/i,                  // JS URI scheme
    /vbscript:/i,                    // VBScript URI
    /on\w+\s*=/i,                    // event handler injection (onclick=, onload=, etc.)
    /union\s+select/i,               // SQLi probe
    /;\s*drop\s+table/i,             // SQLi destructive probe
    /\/etc\/passwd/i,                // LFI probe
    /\/proc\/self/i,                 // Linux proc traversal
    /cmd\.exe/i,                     // Windows RCE probe
    /\/bin\/sh/i,                    // Unix shell probe
];

function isPublic(pathname: string): boolean {
    return PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
}

function isParentRoute(pathname: string): boolean {
    return pathname === PARENT_PREFIX || pathname.startsWith(PARENT_PREFIX + '/');
}

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function isSuspiciousUrl(pathname: string, search: string): boolean {
    const full = pathname + search;
    return SUSPICIOUS_PATTERNS.some(re => re.test(full));
}

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Skip Next.js internals and static assets
    if (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // ─── Block suspicious URL patterns ───
    if (isSuspiciousUrl(pathname, search)) {
        return new NextResponse(
            JSON.stringify({ error: 'Bad request' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // ─── Build response, adding security headers ───
    const response = NextResponse.next();

    // Prevent browsers caching sensitive pages
    if (isProtected(pathname) || isParentRoute(pathname)) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        response.headers.set('Pragma', 'no-cache');
    }

    if (isPublic(pathname)) {
        return response;
    }

    // ─── Auth check ───
    // JWT lives in sessionStorage (frontend domain) — not accessible here.
    // The (dashboard)/layout.tsx client-side guard redirects to /login if
    // no token is found. We cannot verify the token in edge middleware without
    // a shared secret exposed to the edge runtime, which would be insecure.
    // Keeping this comment so future developers understand the design decision.

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all paths except:
         * - _next/static (static files)
         * - _next/image (image optimisation)
         * - favicon.ico
         * - public folder image files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
