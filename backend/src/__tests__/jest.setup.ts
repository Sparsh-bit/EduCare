/**
 * Jest global setup — runs before any test file imports app modules.
 * Provides stub environment variables so config validation passes without a real DB.
 */

// Required by src/config/index.ts
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
// 32-char secrets to pass the weak-secret check
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-32c';
process.env.AADHAAR_ENCRYPTION_KEY = 'test-aadhaar-key-for-unit-tests-32chars';
