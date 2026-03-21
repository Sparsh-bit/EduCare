import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/students', '/attendance', '/fees', '/exams', '/staff',
    '/alerts', '/notices', '/front-desk', '/accounts', '/hr', '/communication', '/tax',
    '/board', '/rte', '/udise', '/payments', '/team'];

// Staff portal routes
const STAFF_PREFIX = '/staff';

// Routes that require parent auth
const PARENT_PREFIX = '/parent';

// Public routes (never redirect)
const PUBLIC_ROUTES = ['/', '/login', '/register', '/signup', '/forgot-password', '/reset-password'];

function isPublic(pathname: string): boolean {
    return PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
}

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function isParentRoute(pathname: string): boolean {
    return pathname === PARENT_PREFIX || pathname.startsWith(PARENT_PREFIX + '/');
}

function isStaffRoute(pathname: string): boolean {
    return pathname === STAFF_PREFIX || pathname.startsWith(STAFF_PREFIX + '/');
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip API routes, static files, and Next.js internals
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    if (isPublic(pathname)) {
        return NextResponse.next();
    }

    // Check for auth token in cookies (set by the client after login)
    const token = request.cookies.get('auth_token')?.value;

    if (isProtected(pathname) || isParentRoute(pathname) || isStaffRoute(pathname)) {
        if (!token) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public folder files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
