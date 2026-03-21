import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import db from '../config/database';

interface JwtTokenPayload {
    id: number;
    iat?: number;
    exp?: number;
}

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
        name: string;
        school_id: number;
    };
}

// ─── User TTL Cache ───
// Caches DB user lookups for up to 2 minutes to avoid a DB round-trip on every
// authenticated request. Invalidated explicitly on role changes, deactivation, etc.
interface CachedUser {
    data: { id: number; email: string; role: string; name: string; school_id: number };
    expiresAt: number;
}
const _userCache = new Map<number, CachedUser>();
const USER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/** Call this whenever a user's role, status, or school changes. */
export function invalidateUserCache(userId: number): void {
    _userCache.delete(userId);
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // 1. Try HttpOnly cookie first, then Bearer header
        let token: string | undefined;
        const cookieToken = req.cookies?.auth_token as string | undefined;
        if (cookieToken) {
            token = cookieToken;
        } else {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JwtTokenPayload;

        // 2. Check in-memory cache before hitting the DB
        const cached = _userCache.get(decoded.id);
        if (cached && cached.expiresAt > Date.now()) {
            req.user = cached.data;
            return next();
        }

        // 3. Cache miss — fetch from DB
        const user = await db('users')
            .select('id', 'email', 'role', 'name', 'school_id')
            .where({ id: decoded.id, is_active: true })
            .first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        const userData = {
            id: user.id as number,
            email: user.email as string,
            role: user.role as string,
            name: user.name as string,
            school_id: user.school_id as number,
        };

        _userCache.set(decoded.id, { data: userData, expiresAt: Date.now() + USER_CACHE_TTL });
        req.user = userData;
        next();
    } catch (error: unknown) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

/**
 * Middleware that rejects any request where req.user.school_id is missing.
 * Use after `authenticate` on any tenant-scoped route.
 */
export const requireSchoolId = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.school_id) {
        return res.status(403).json({ error: 'User is not mapped to a school' });
    }
    next();
};

// authorize checks if the user's role is in the allowed list
// 'owner' and 'co-owner' both have admin-level access where 'admin' is allowed
export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }

        // Expand 'admin' to also include 'owner' and 'co-owner'
        const expandedRoles = new Set(roles);
        if (expandedRoles.has('admin')) {
            expandedRoles.add('owner');
            expandedRoles.add('co-owner');
        }

        if (!expandedRoles.has(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

// ownerOnly — restricts to owner/tenant_admin (co-owner excluded)
export const ownerOnly = () => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        if (req.user.role !== 'owner' && req.user.role !== 'tenant_admin') {
            return res.status(403).json({ error: 'Access denied. Only the school owner can perform this action.' });
        }
        next();
    };
};
