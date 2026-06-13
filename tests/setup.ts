// Set required environment variables for tests
process.env.AUTH_SECRET = 'test-secret-32-chars-minimum-length-here';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/auth_center_test';
process.env.REDIS_URL = 'redis://localhost:6379';
// NODE_ENV is read-only in strict TS; set via vitest config or test runner
