import db from '../config/database';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

interface AuditLogEntry {
    user_id?: number;
    school_id?: number;
    action: string;
    entity_type: string;
    entity_id?: number;
    old_value?: any;
    new_value?: any;
    ip_address?: string;
    description?: string;
}

const userSchoolCache = new Map<number, number | null>();

async function resolveSchoolId(userId?: number): Promise<number | null> {
    if (!userId) return null;
    if (userSchoolCache.has(userId)) return userSchoolCache.get(userId) ?? null;

    const row = await db('users').where({ id: userId }).select('school_id').first();
    const schoolId = row?.school_id ? Number(row.school_id) : null;
    userSchoolCache.set(userId, schoolId);
    return schoolId;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        // school_id is only included when the caller explicitly passes it.
        // This keeps the insert safe on DBs where migration 015 hasn't run yet
        // (the column doesn't exist until that migration is applied).
        const row: Record<string, unknown> = {
            user_id: entry.user_id,
            action: entry.action,
            entity_type: entry.entity_type,
            entity_id: entry.entity_id,
            old_value: entry.old_value ? JSON.stringify(entry.old_value) : null,
            new_value: entry.new_value ? JSON.stringify(entry.new_value) : null,
            ip_address: entry.ip_address,
            description: entry.description,
        };
        const resolvedSchoolId = entry.school_id !== undefined ? entry.school_id : await resolveSchoolId(entry.user_id);
        if (resolvedSchoolId !== null && resolvedSchoolId !== undefined) {
            row.school_id = resolvedSchoolId;
        }
        await db('audit_logs').insert(row);
    } catch (error) {
        // Audit log failure must never break the main operation
        logger.error('Audit log write failed', { error, action: entry.action, entity_type: entry.entity_type });
    }
}

export function getClientIp(req: AuthRequest): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress || 'unknown';
}
