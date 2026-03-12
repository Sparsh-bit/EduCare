import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requireEnv = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const isWeakSecret = (value: string): boolean => {
    const weakValues = new Set([
        'dev-secret-change-me',
        'dev-refresh-secret',
        'ndps-aadhaar-secret-change-in-production',
        'changeme',
        'password',
    ]);
    return value.length < 32 || weakValues.has(value.toLowerCase());
};

const validateCriticalConfig = () => {
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'AADHAAR_ENCRYPTION_KEY'];
    const missing = required.filter((key) => !process.env[key]?.trim());

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const jwtSecret = process.env.JWT_SECRET!.trim();
    const refreshSecret = process.env.JWT_REFRESH_SECRET!.trim();
    const aadhaarKey = process.env.AADHAAR_ENCRYPTION_KEY!.trim();
    const dbHost = process.env.DB_HOST!.trim();
    const dbPassword = process.env.DB_PASSWORD ?? '';

    if (isWeakSecret(jwtSecret)) throw new Error('JWT_SECRET is weak. Use a cryptographically strong secret (min 32 chars).');
    if (isWeakSecret(refreshSecret)) throw new Error('JWT_REFRESH_SECRET is weak. Use a cryptographically strong secret (min 32 chars).');
    if (isWeakSecret(aadhaarKey)) throw new Error('AADHAAR_ENCRYPTION_KEY is weak. Use a cryptographically strong secret (min 32 chars).');

    const isLocalDb = dbHost === 'localhost' || dbHost === '127.0.0.1';
    if (!isLocalDb && !dbPassword.trim()) {
        throw new Error('DB_PASSWORD is required for non-local database hosts.');
    }

    const needsRazorpay = process.env.ENABLE_ONLINE_PAYMENTS === 'true' || process.env.NODE_ENV === 'production';
    if (needsRazorpay) {
        const keyId = process.env.RAZORPAY_KEY_ID?.trim();
        const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
        if (!keyId || !keySecret) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required when online payments are enabled or in production.');
        }
    }
};

validateCriticalConfig();

export const config = {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    trustProxy: process.env.TRUST_PROXY || 'loopback',

    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        name: process.env.DB_NAME || 'ndps_erp',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('supabase.com') || false,
        poolMin: parseInt(process.env.DB_POOL_MIN || '0'),
        poolMax: parseInt(process.env.DB_POOL_MAX || (process.env.NODE_ENV === 'production' ? '20' : '10')),
        acquireTimeoutMs: parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS || '20000'),
        connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000'),
        idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
    },

    jwt: {
        secret: requireEnv('JWT_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    },

    msg91: {
        authKey: process.env.MSG91_AUTH_KEY || '',
        senderId: process.env.MSG91_SENDER_ID || 'EDUCAR',
        templateId: process.env.MSG91_TEMPLATE_ID || '',
    },

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
    importMaxFileSize: parseInt(process.env.IMPORT_MAX_FILE_SIZE || String(10 * 1024 * 1024)), // 10 MB default for Excel/CSV uploads

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000)),
        apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || (process.env.NODE_ENV === 'production' ? '600' : '5000')),
        authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || (process.env.NODE_ENV === 'production' ? '40' : '500')),
        sensitiveAuthMax: parseInt(process.env.RATE_LIMIT_SENSITIVE_AUTH_MAX || (process.env.NODE_ENV === 'production' ? '20' : '300')),
        highValueMax: parseInt(process.env.RATE_LIMIT_HIGH_VALUE_MAX || (process.env.NODE_ENV === 'production' ? '300' : '3000')),
        mutationMax: parseInt(process.env.RATE_LIMIT_MUTATION_MAX || (process.env.NODE_ENV === 'production' ? '120' : '1500')),
    },

    lateFee: {
        perDay: parseInt(process.env.LATE_FEE_PER_DAY || '50'),
        max: parseInt(process.env.LATE_FEE_MAX || '2000'),
    },

    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || '',
    },

    // API key used by the school website to post admission enquiries into the ERP
    erpApiKey: process.env.ERP_API_KEY || '',
};
