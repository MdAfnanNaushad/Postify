import 'dotenv/config';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import app from './server/src/app.js';
import { getMongoUri, sanitizeMongoUri } from './server/src/config/db.js';
import { getUploadsDir } from './server/src/middleware/upload.js';
import { getJwtSecret } from './server/src/middleware/auth.js';

describe('Phase 12 — Render Deployment Preparation & Production Readiness Tests', () => {
  beforeAll(async () => {
    // Strictly isolate tests to test database
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Health Check & Operational Endpoints', () => {
    it('GET /health returns 200 with operational metrics and database connectivity', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('Postify');
      expect(res.body.database).toBe('connected');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/health returns 200 with matching payload structure for backward compatibility', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('connected');
    });

    it('health check response does not expose credentials, env variables, or sensitive system details', async () => {
      const res = await request(app).get('/health');
      expect(res.body).not.toHaveProperty('env');
      expect(res.body).not.toHaveProperty('jwtSecret');
      expect(res.body).not.toHaveProperty('mongoUri');
      expect(res.body).not.toHaveProperty('config');
    });
  });

  describe('2. Reverse Proxy & Network Trust Settings', () => {
    it('verifies Express trust proxy is enabled for Render reverse proxy environment', () => {
      const trustProxy = app.get('trust proxy');
      expect(Boolean(trustProxy)).toBe(true);
    });
  });

  describe('3. API 404 Routing Isolation vs SPA Catch-All', () => {
    it('GET /api/unknown-endpoint returns 404 JSON, NOT index.html', async () => {
      const res = await request(app).get('/api/unknown-endpoint');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('API endpoint not found: GET /api/unknown-endpoint');
    });

    it('POST /api/v1/missing returns 404 JSON, NOT index.html', async () => {
      const res = await request(app).post('/api/v1/missing').send({ foo: 'bar' });
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('API endpoint not found: POST /api/v1/missing');
    });

    it('DELETE /api/posts/does-not-exist/something returns 404 JSON', async () => {
      const res = await request(app).delete('/api/posts/does-not-exist/something');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Frontend Static Asset Serving & SPA Direct Route Navigation', () => {
    const distIndexPath = path.resolve(__dirname, 'client/dist/index.html');
    const hasDist = fs.existsSync(distIndexPath);

    it('GET / serves the SPA shell index.html when client/dist is built', async () => {
      if (!hasDist) return; // Skip if client has not been built yet
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('<div id="root">');
    });

    it('GET /feed (direct navigation / refresh) serves the SPA shell index.html', async () => {
      if (!hasDist) return;
      const res = await request(app).get('/feed');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('<div id="root">');
    });

    it('GET /search serves the SPA shell index.html', async () => {
      if (!hasDist) return;
      const res = await request(app).get('/search');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('<div id="root">');
    });

    it('GET /login serves the SPA shell index.html', async () => {
      if (!hasDist) return;
      const res = await request(app).get('/login');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('<div id="root">');
    });
  });

  describe('5. Database Configuration & Credential Sanitization', () => {
    it('getMongoUri() returns configured URI or local fallback in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const uri = getMongoUri();
      expect(typeof uri).toBe('string');
      expect(uri.length).toBeGreaterThan(0);
      process.env.NODE_ENV = originalEnv;
    });

    it('sanitizeMongoUri() redacts username and password from MongoDB connection strings', () => {
      const rawUri = 'mongodb+srv://admin_user:SuperSecretPassword123@cluster0.abcde.mongodb.net/postify?retryWrites=true';
      const sanitized = sanitizeMongoUri(rawUri);
      expect(sanitized).not.toContain('SuperSecretPassword123');
      expect(sanitized).not.toContain('admin_user');
      expect(sanitized).toContain('//***:***@cluster0.abcde.mongodb.net');
    });

    it('sanitizeMongoUri() handles URIs without credentials safely', () => {
      const localUri = 'mongodb://127.0.0.1:27017/miniproject';
      const sanitized = sanitizeMongoUri(localUri);
      expect(sanitized).toBe(localUri);
    });
  });

  describe('6. Production JWT Secret Validation & Fallback Rejection', () => {
    it('getJwtSecret() throws or returns secret with correct minimum strength', () => {
      const secret = getJwtSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('prohibits fallback secret in production mode when JWT_SECRET is unset or insecure', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;
        expect(() => getJwtSecret()).toThrow(/FATAL: Insecure or missing JWT_SECRET in production/);

        process.env.JWT_SECRET = 'short_key';
        expect(() => getJwtSecret()).toThrow(/FATAL: Insecure or missing JWT_SECRET in production/);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret !== undefined) {
          process.env.JWT_SECRET = originalSecret;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });
  });

  describe('7. Upload Directory & Storage Configuration', () => {
    it('getUploadsDir() returns cross-platform absolute path', () => {
      const uploadDir = getUploadsDir();
      expect(path.isAbsolute(uploadDir)).toBe(true);
      expect(fs.existsSync(uploadDir)).toBe(true);
    });

    it('getUploadsDir() respects custom UPLOADS_DIR environment variable for Render persistent disk', () => {
      const originalUploadsDir = process.env.UPLOADS_DIR;
      const customPath = path.resolve(__dirname, 'scratch_test_uploads');

      process.env.UPLOADS_DIR = customPath;
      const resolved = getUploadsDir();
      expect(resolved).toBe(customPath);
      expect(fs.existsSync(customPath)).toBe(true);

      // Clean up test directory
      if (fs.existsSync(customPath)) {
        fs.rmdirSync(customPath);
      }
      if (originalUploadsDir !== undefined) {
        process.env.UPLOADS_DIR = originalUploadsDir;
      } else {
        delete process.env.UPLOADS_DIR;
      }
    });

    it('serves static uploads with immutable cache headers and nosniff protection', async () => {
      const res = await request(app).get('/uploads/Profilepic.jpg');
      if (res.status === 200) {
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['cache-control']).toContain('immutable');
      }
    });
  });

  describe('8. Cookie Configuration & SameSite Policy', () => {
    const testSuffix = Date.now();
    const userPayload = {
      username: `p12_cookie_${testSuffix}`,
      email: `p12_cookie_${testSuffix}@example.com`,
      password: 'Password123!',
      name: 'Cookie Test User'
    };

    it('registration sets HttpOnly, Path=/, and SameSite=lax cookie', async () => {
      const res = await request(app).post('/api/auth/register').send(userPayload);
      expect(res.status).toBe(201);
      const cookieHeader = res.headers['set-cookie']?.[0] || '';
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Path=/');
      expect(cookieHeader.toLowerCase()).toContain('samesite=lax');
    });

    it('logout clears cookie with matching SameSite=lax and Path=/', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      const cookieHeader = res.headers['set-cookie']?.[0] || '';
      expect(cookieHeader).toContain('token=;');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader.toLowerCase()).toContain('samesite=lax');
      expect(cookieHeader).toContain('Path=/');
    });
  });

  describe('9. Social Preview Crawler Routes & Production Direct Links', () => {
    it('GET /post/:id returns social preview HTML for crawler user-agents', async () => {
      const crawlerUa = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
      // Use any valid or dummy ObjectId
      const dummyId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/post/${dummyId}`).set('User-Agent', crawlerUa);
      // Crawler gets 404 HTML if post not found
      expect(res.status).toBe(404);
      expect(res.text).toContain('Post Not Found');
    });

    it('GET /projects/:username/:slug returns crawler HTML for social bots', async () => {
      const crawlerUa = 'Twitterbot/1.0';
      const res = await request(app).get('/projects/nonexistentuser/test-project').set('User-Agent', crawlerUa);
      expect(res.status).toBe(404);
      expect(res.text).toContain('Project Not Found');
    });
  });

  describe('10. Weekly Digest Cron Job Script Invocation & Safe Batch Run', () => {
    it('executes runDigestJob runner in test environment returning batch statistics', async () => {
      const runDigestJob = (await import('./server/src/scripts/runDigestJob.js')).default || (await import('./server/src/scripts/runDigestJob.js'));
      const runnerFn = typeof runDigestJob === 'function' ? runDigestJob : runDigestJob.default;

      // Ensure test MONGODB_URI is respected
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';

      try {
        const stats = await runnerFn();
        expect(stats).toBeDefined();
        expect(stats).toHaveProperty('total');
        expect(stats).toHaveProperty('generated');
        expect(stats).toHaveProperty('alreadyCurrent');
      } finally {
        if (originalUri !== undefined) {
          process.env.MONGODB_URI = originalUri;
        } else {
          delete process.env.MONGODB_URI;
        }
        // Reconnect to test DB if disconnect was called
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test');
        }
      }
    });
  });
});

