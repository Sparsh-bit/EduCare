/**
 * Format a number as Indian Rupee (INR) with Indian number grouping.
 * e.g. 124500 → ₹1,24,500
 */
export function formatINR(amount: number): string {
    if (!isFinite(amount)) return '₹0';
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/**
 * Format a number with Indian grouping (no ₹ prefix).
 */
export function formatNumber(n: number): string {
    return n.toLocaleString('en-IN');
}

/**
 * Compact INR: 1,24,500 → ₹1.2L, 12,00,000 → ₹12L
 */
export function formatINRCompact(amount: number): string {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
    if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
    return formatINR(amount);
}

/**
 * Return a relative time string like "3 minutes ago".
 */
export function timeAgo(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) {
        const m = Math.floor(diff / 60_000);
        return `${m} minute${m !== 1 ? 's' : ''} ago`;
    }
    if (diff < 86_400_000) {
        const h = Math.floor(diff / 3_600_000);
        return `${h} hour${h !== 1 ? 's' : ''} ago`;
    }
    if (diff < 7 * 86_400_000) {
        const day = Math.floor(diff / 86_400_000);
        return `${day} day${day !== 1 ? 's' : ''} ago`;
    }
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Format date as "Wednesday, 18 March 2026"
 */
export function formatDateLong(date = new Date()): string {
    return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
