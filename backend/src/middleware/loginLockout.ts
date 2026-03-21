/**
 * Login Lockout Middleware
 *
 * Tracks failed login attempts per (schoolCode + username) identifier.
 * After MAX_FAILURES failures within WINDOW_MS, the account is locked for LOCKOUT_MS.
 *
 * Stored in process memory — intentionally lightweight; resets on server restart,
 * which is acceptable since the rate limiter (express-rate-limit) is the first
 * line of defence and also resets on restart.
 */

const MAX_FAILURES = 10;          // lock after this many consecutive failures
const WINDOW_MS    = 15 * 60 * 1000; // rolling 15-minute window
const LOCKOUT_MS   = 15 * 60 * 1000; // locked for 15 minutes

interface FailRecord {
    count: number;
    windowStart: number;  // timestamp when this window began
    lockedUntil: number;  // 0 = not locked
}

const _store = new Map<string, FailRecord>();

// Prune entries that are fully expired to prevent unbounded memory growth.
// Called lazily on every check — O(n) but the store stays small in practice.
function _prune(): void {
    const now = Date.now();
    for (const [key, rec] of _store) {
        if (rec.lockedUntil > 0 && rec.lockedUntil < now) {
            _store.delete(key);
        } else if (rec.lockedUntil === 0 && now - rec.windowStart > WINDOW_MS) {
            _store.delete(key);
        }
    }
}

function _key(schoolCode: string, username: string): string {
    // Normalise both to lower-case so "ADMIN" and "admin" share the same counter.
    return `${schoolCode.toLowerCase()}:${username.toLowerCase()}`;
}

/** Returns seconds remaining in lockout, or 0 if not locked. */
export function getLockoutSeconds(schoolCode: string, username: string): number {
    _prune();
    const rec = _store.get(_key(schoolCode, username));
    if (!rec || rec.lockedUntil === 0) return 0;
    const remaining = rec.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/** Record a failed login attempt. Returns seconds of lockout (0 if not yet locked). */
export function recordFailure(schoolCode: string, username: string): number {
    _prune();
    const now = Date.now();
    const key = _key(schoolCode, username);
    let rec = _store.get(key);

    if (!rec || now - rec.windowStart > WINDOW_MS) {
        // Start a fresh window
        rec = { count: 1, windowStart: now, lockedUntil: 0 };
    } else {
        rec.count += 1;
    }

    if (rec.count >= MAX_FAILURES) {
        rec.lockedUntil = now + LOCKOUT_MS;
    }

    _store.set(key, rec);
    return getLockoutSeconds(schoolCode, username);
}

/** Clear the failure record after a successful login. */
export function recordSuccess(schoolCode: string, username: string): void {
    _store.delete(_key(schoolCode, username));
}

/** Returns remaining failure attempts before lockout (for informational use). */
export function remainingAttempts(schoolCode: string, username: string): number {
    const rec = _store.get(_key(schoolCode, username));
    if (!rec) return MAX_FAILURES;
    return Math.max(0, MAX_FAILURES - rec.count);
}
