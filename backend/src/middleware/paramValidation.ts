/**
 * Reusable express-validator param() chains for common URL parameters.
 * Import and spread into validate([...]) calls.
 */
import { param } from 'express-validator';

export const paramId = (name: string = 'id') =>
    param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

export const paramDate = (name: string = 'date') =>
    param(name).isDate().withMessage(`${name} must be a valid date (YYYY-MM-DD)`);

export const paramMonth = (name: string = 'month') =>
    param(name).matches(/^\d{4}-\d{2}$/).withMessage(`${name} must be in YYYY-MM format`);
