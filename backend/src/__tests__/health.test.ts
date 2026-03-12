/**
 * Smoke tests for the EduCare ERP API.
 *
 * The database module is mocked so these tests run entirely in-process
 * without a real PostgreSQL connection.
 */

// Mock the database before any app module is imported
jest.mock('../config/database', () => {
    const mockDb: any = jest.fn();
    mockDb.raw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    mockDb.fn = { now: jest.fn(() => new Date().toISOString()) };
    return { __esModule: true, default: mockDb };
});

// Mock the logger to silence output during tests
jest.mock('../config/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import request from 'supertest';
import app from '../app';

describe('Health endpoints', () => {
    it('GET /api/health should return 200 with status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toMatch(/EduCare/i);
    });

    it('GET /api/unknown-route should return 404', async () => {
        const res = await request(app).get('/api/this-does-not-exist');
        expect(res.status).toBe(404);
    });
});

describe('Auth — input validation (no DB needed)', () => {
    it('POST /api/auth/login with empty body should return 400/422', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect([400, 422]).toContain(res.status);
    });

    it('POST /api/auth/register-school with invalid email should return 400/422', async () => {
        const res = await request(app)
            .post('/api/auth/register-school')
            .send({ schoolName: 'Test', ownerName: 'Owner', email: 'not-an-email', password: 'password123' });
        expect([400, 422]).toContain(res.status);
    });

    it('POST /api/auth/register-school with short password should return 400/422', async () => {
        const res = await request(app)
            .post('/api/auth/register-school')
            .send({ schoolName: 'Test', ownerName: 'Owner', email: 'owner@test.com', password: 'short' });
        expect([400, 422]).toContain(res.status);
    });
});

describe('Protected routes — unauthenticated access', () => {
    it('GET /api/students should return 401', async () => {
        const res = await request(app).get('/api/students');
        expect(res.status).toBe(401);
    });

    it('GET /api/fees/dues should return 401', async () => {
        const res = await request(app).get('/api/fees/dues');
        expect(res.status).toBe(401);
    });

    it('GET /api/exams should return 401', async () => {
        const res = await request(app).get('/api/exams');
        expect(res.status).toBe(401);
    });

    it('GET /api/staff should return 401', async () => {
        const res = await request(app).get('/api/staff');
        expect(res.status).toBe(401);
    });

    it('GET /api/admin/dashboard/stats should return 401', async () => {
        const res = await request(app).get('/api/admin/dashboard/stats');
        expect(res.status).toBe(401);
    });
});
