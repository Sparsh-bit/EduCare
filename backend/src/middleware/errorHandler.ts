import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import logger from '../config/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Multer upload errors — map to appropriate HTTP status with user-friendly message
    if (err instanceof multer.MulterError) {
        const MULTER_MESSAGES: Record<string, string> = {
            LIMIT_FILE_SIZE: 'The uploaded file exceeds the maximum allowed size.',
            LIMIT_FILE_COUNT: 'Too many files uploaded at once.',
            LIMIT_UNEXPECTED_FILE: 'Unexpected field in the upload request.',
            LIMIT_PART_COUNT: 'Too many form parts in the upload request.',
            LIMIT_FIELD_KEY: 'Field name is too long.',
            LIMIT_FIELD_VALUE: 'Field value is too long.',
            LIMIT_FIELD_COUNT: 'Too many fields in the request.',
        };
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: MULTER_MESSAGES[err.code] ?? `Upload error: ${err.message}` });
    }

    // File type rejection from fileFilter callbacks (multer passes these as plain Errors)
    if (err.message?.startsWith('Unsupported file type')) {
        return res.status(415).json({ error: err.message });
    }

    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
};

export const notFound = (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};
