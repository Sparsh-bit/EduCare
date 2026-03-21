import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import logger from './config/logger';
import db from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticate, AuthRequest } from './middleware/auth';

// Routes
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import attendanceRoutes from './routes/attendance';
import feeRoutes from './routes/fees';
import examRoutes from './routes/exams';
import staffRoutes from './routes/staff';
import parentRoutes from './routes/parent';
import dashboardRoutes from './routes/dashboard';
import alertRoutes from './routes/alerts';
import noticeRoutes from './routes/notices';
import frontDeskRoutes from './routes/frontDesk';
import accountRoutes from './routes/accounts';
import hrRoutes from './routes/hr';
import communicationRoutes from './routes/communication';
import masterRoutes from './routes/master';
import boardRoutes from './routes/board';
import rteRoutes from './routes/rte';
import udiseRoutes from './routes/udise';
import taxRoutes from './routes/tax';
import paymentInstrumentRoutes from './routes/paymentInstruments';
import publicEnquiryRoutes from './routes/publicEnquiry';
const app = express();

// Honor reverse-proxy IP forwarding so rate limiting does not collapse all users into one IP bucket.
app.set('trust proxy', config.trustProxy);

// ─── Request ID ─── (attach before anything else so logs/errors carry the same trace ID)
app.use((req, res, next) => {
    const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
});

// ─── Request Timeout (30 s) ───
// Sends 503 and destroys the socket if the handler hasn't finished in 30 seconds.
const REQUEST_TIMEOUT_MS = 30_000;
app.use((req, res, next) => {
    // Health checks get a shorter timeout; they should respond in < 2 s.
    const timeout = req.path.startsWith('/api/health') ? 5_000 : REQUEST_TIMEOUT_MS;
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            logger.warn(`Request timeout: ${req.method} ${req.path}`, {
                requestId: req.headers['x-request-id'],
                ip: req.ip,
            });
            res.status(503).json({ error: 'Request timed out. Please try again.' });
        }
        req.socket.destroy();
    }, timeout);
    // Clear on finish so the timer doesn't hold the event loop open
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
});

// ─── Security ───
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    noSniff: true,
    // xssFilter deliberately omitted — X-XSS-Protection is deprecated in modern browsers;
    // CSP below is the correct defence against XSS.
    xssFilter: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"],   // inline styles only for email templates
            imgSrc:         ["'self'", 'data:', 'blob:'],
            connectSrc:     ["'self'"],
            fontSrc:        ["'self'"],
            objectSrc:      ["'none'"],
            frameAncestors: ["'none'"],
            baseUri:        ["'self'"],
            formAction:     ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// ─── Gzip Compression ───
// Compress all JSON/text responses > 1 KB. Reduces bandwidth ~70% for large list payloads.
app.use(compression({ threshold: 1024 }));

// CORS — supports a comma-separated list of allowed origins so both the
// production domain and Cloudflare Pages preview URLs can be whitelisted.
// Example: FRONTEND_URL=https://ndps-erp.pages.dev,https://www.ndps.edu.in
const allowedOrigins = config.frontendUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Same-origin / non-browser requests have no origin header — allow them.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(cookieParser());

// ─── Rate Limiting ───
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.apiMax,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/health/db',
});
app.use('/api', limiter);

// Stricter rate limit for auth — login attempts
const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);

// Tight rate limit for sensitive auth write operations (password reset, user creation)
const sensitiveAuthLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.sensitiveAuthMax,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/users', sensitiveAuthLimiter);
app.use('/api/auth/register-school', sensitiveAuthLimiter);
app.use('/api/auth/forgot-password', sensitiveAuthLimiter);
app.use('/api/auth/reset-password', sensitiveAuthLimiter);
app.use('/api/auth/send-verification-otp', sensitiveAuthLimiter);

const highValueLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.highValueMax,
    message: { error: 'Too many requests on this endpoint. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const mutationLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.mutationMax,
    message: { error: 'Too many write requests. Please slow down and retry.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/fees', highValueLimiter);
app.use('/api/attendance', highValueLimiter);
app.use('/api/students', highValueLimiter);
app.use('/api/communication', highValueLimiter);
app.use('/api/front-desk', highValueLimiter);
app.use('/api/parent', highValueLimiter);
app.use('/api/alerts', highValueLimiter);
app.use('/api/hr', highValueLimiter);
app.use('/api/exams', highValueLimiter);
app.use('/api/accounts', highValueLimiter);
app.use('/api/board', highValueLimiter);
app.use('/api/rte', highValueLimiter);
app.use('/api/udise', highValueLimiter);
app.use('/api/tax', highValueLimiter);
app.use('/api/payment-instruments', highValueLimiter);
app.use('/api/students/:id/documents', mutationLimiter);

// Tight rate limit for public website enquiry submissions (10 per 15 min per IP)
const publicEnquiryLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: 10,
    message: { error: 'Too many enquiry submissions. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/public/enquiry', publicEnquiryLimiter);

// ─── Body Parsing (route-specific limits) ───
// Small limit for most JSON APIs; larger limit only for document uploads
app.use('/api/students/:id/documents', express.json({ limit: '1mb' }));
app.use('/api', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Protected files (uploads) ───
// Supports both the legacy flat path  /uploads/:fileName
// and the new school-namespaced path  /uploads/:schoolId/:fileName
app.get('/uploads/:schoolIdOrFile/:fileName?', authenticate, async (req: AuthRequest, res) => {
    try {
        const userSchoolId = req.user?.school_id;
        if (!userSchoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        // Determine whether the request uses the namespaced or legacy format
        let relPath: string;
        if (req.params.fileName) {
            // New format: /uploads/{schoolId}/{filename}
            const reqSchoolId = parseInt(req.params.schoolIdOrFile as string, 10);
            if (isNaN(reqSchoolId) || reqSchoolId !== userSchoolId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            relPath = path.join(String(reqSchoolId), path.basename(req.params.fileName as string));
        } else {
            // Legacy flat format: /uploads/{filename}
            relPath = path.basename(req.params.schoolIdOrFile as string);
        }

        // Path traversal guard — resolved path must stay inside uploadDir
        const filePath = path.resolve(config.uploadDir, relPath);
        if (!filePath.startsWith(path.resolve(config.uploadDir) + path.sep)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        // Verify ownership — the document must belong to this school
        const doc = await db('student_documents as sd')
            .join('students as s', 'sd.student_id', 's.id')
            .where('s.school_id', userSchoolId)
            .where('sd.school_id', userSchoolId)
            .where(function () {
                this.where('sd.file_url', `/uploads/${relPath}`)
                    .orWhere('sd.file_url', `/uploads/${path.basename(relPath)}`);
            })
            .select('sd.mime_type', 'sd.file_name')
            .first();

        if (!doc) return res.status(404).json({ error: 'File not found' });

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Force download — prevents browsers from executing any uploaded content
        const safeFileName = (doc.file_name || path.basename(relPath)).replace(/["\\;\r\n]/g, '_');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
        if (doc.mime_type) res.type(doc.mime_type);
        res.sendFile(filePath);
    } catch (error) {
        logger.error('Protected file fetch error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Request logging ─── (method, path, status, duration, request ID)
app.use((req, res, next) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    res.on('finish', () => {
        const ms = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger[level](`${req.method} ${req.path} ${res.statusCode} ${ms}ms`, {
            requestId,
            ip: req.ip,
            userAgent: req.headers['user-agent']?.substring(0, 120),
            ...(ms > 5_000 ? { slowRequest: true } : {}),
        });
    });
    next();
});

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'EduCare ERP API by Concilio',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
    });
});

app.get('/api/health/db', async (_req, res) => {
    try {
        await db.raw('select 1');
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        logger.error('Database health check failed', error);
        res.status(503).json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() });
    }
});

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/front-desk', frontDeskRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/rte', rteRoutes);
app.use('/api/udise', udiseRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/payment-instruments', paymentInstrumentRoutes);
app.use('/api/public/enquiry', publicEnquiryRoutes);

// ─── Error Handling ───
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───
const PORT = config.port;
let server: ReturnType<typeof app.listen>;

const startServer = async () => {
    try {
        await db.raw('select 1');
        logger.info('✅ Database connection validated at startup');

        server = app.listen(PORT, () => {
            logger.info(`🚀 EduCare ERP API running on port ${PORT}`);
            logger.info(`📚 Environment: ${config.nodeEnv}`);
            logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
        });
    } catch (error) {
        logger.error('❌ Failed to connect to database during startup', error);
        process.exit(1);
    }
};

// Don't auto-start when imported from tests — supertest manages its own ephemeral server
if (process.env.NODE_ENV !== 'test') {
    void startServer();
}

let shuttingDown = false;
const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}. Shutting down server gracefully...`);

    if (!server) {
        try {
            await db.destroy();
        } finally {
            process.exit(0);
        }
    }

    server.close(async () => {
        try {
            await db.destroy();
            logger.info('Database connections closed.');
            process.exit(0);
        } catch (error) {
            logger.error('Error while closing database connections', error);
            process.exit(1);
        }
    });

    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000).unref();
};

process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});

export default app;
