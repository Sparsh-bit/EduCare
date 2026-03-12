import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import db from '../config/database';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
        name: string;
        school_id: number;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // 1. Try HttpOnly cookie first, then Bearer header
        let token: string | undefined;
        const cookieToken = (req as any).cookies?.auth_token;
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

        const decoded = jwt.verify(token, config.jwt.secret) as any;

        const user = await db('users').where({ id: decoded.id, is_active: true }).first();
        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            school_id: user.school_id,
        };

        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
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
