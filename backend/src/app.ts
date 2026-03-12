import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
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

// ─── Security ───
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
}));

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
    allowedHeaders: ['Content-Type', 'Authorization'],
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
app.get('/uploads/:fileName', authenticate, async (req: AuthRequest, res) => {
    try {
        const schoolId = req.user?.school_id;
        if (!schoolId) return res.status(403).json({ error: 'User is not mapped to a school' });

        const fileName = path.basename(req.params['fileName'] as string);
        if (!fileName || fileName !== req.params.fileName) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        const doc = await db('student_documents as sd')
            .join('students as s', 'sd.student_id', 's.id')
            .where('s.school_id', schoolId)
            .where(function () {
                this.where('sd.file_url', `/uploads/${fileName}`).orWhere('sd.file_name', fileName);
            })
            .select('sd.file_url', 'sd.mime_type', 'sd.file_name')
            .first();

        if (!doc) return res.status(404).json({ error: 'File not found' });

        const filePath = path.resolve(config.uploadDir, fileName);
        if (!filePath.startsWith(path.resolve(config.uploadDir))) {
            return res.status(400).json({ error: 'Invalid file path' });
        }
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `inline; filename="${doc.file_name || fileName}"`);
        if (doc.mime_type) res.type(doc.mime_type);
        res.sendFile(filePath);
    } catch (error) {
        logger.error('Protected file fetch error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── Request logging ───
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100),
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
