import winston from 'winston';
import { config } from './index';

const SENSITIVE_KEYS = /password|secret|token|aadhaar|authorization|cookie/i;

const redactFormat = winston.format((info) => {
    const redact = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        const result: any = Array.isArray(obj) ? [] : {};
        for (const key of Object.keys(obj)) {
            if (SENSITIVE_KEYS.test(key)) {
                result[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                result[key] = redact(obj[key]);
            } else {
                result[key] = obj[key];
            }
        }
        return result;
    };
    return redact(info);
});

const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        redactFormat(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'ndps-erp' },
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10 * 1024 * 1024,  // rotate at 10 MB
            maxFiles: 5,                 // keep last 5 rotated files
            tailable: true,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 20 * 1024 * 1024,  // rotate at 20 MB
            maxFiles: 7,                 // keep last 7 rotated files
            tailable: true,
        }),
    ],
});

if (config.nodeEnv !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
    );
}

export default logger;
