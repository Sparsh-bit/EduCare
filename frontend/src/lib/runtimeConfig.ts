const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.trim();

if (!configuredApiBase) {
    throw new Error('NEXT_PUBLIC_API_URL is required. Refusing to start with implicit localhost fallback.');
}

// Warn — but don't throw — if the build is deploying a localhost URL to a real production host.
// next build sets NODE_ENV=production, so we can't reliably distinguish build-time from runtime here.
// Use NEXT_PUBLIC_DEPLOY_ENV=production in your deployment pipeline to enforce this.
if (process.env.NEXT_PUBLIC_DEPLOY_ENV === 'production' && configuredApiBase.includes('localhost')) {
    throw new Error('NEXT_PUBLIC_API_URL cannot point to localhost in production.');
}

export const API_BASE = configuredApiBase.replace(/\/$/, '');
