import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : 'http://localhost:5000';

// Supabase origin for auth/storage calls
const SUPABASE_ORIGIN =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : '';

const connectSrc = ["'self'", API_ORIGIN, SUPABASE_ORIGIN]
  .filter(Boolean).join(' ');

// NOTE: script-src 'unsafe-inline' is required by Next.js App Router for
// hydration inline scripts. To remove it, implement nonce-based CSP via
// middleware.ts (requires per-request nonce injection into the root layout).
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src ${connectSrc};
  object-src 'none';
  media-src 'none';
  worker-src 'none';
  frame-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent tab-napping and cross-origin isolation attacks
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Prevent cross-domain policy file access
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Immutable cache + cross-origin resource policy for static assets
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  // Strip source maps in production to prevent code exposure
  productionBrowserSourceMaps: false,
};

export default nextConfig;
