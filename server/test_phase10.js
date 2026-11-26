/**
 * REVITEST — Phase 10 Verification Suite
 * Tests Security Hardening, Input Sanitization, Rate Limiting,
 * Compound Database Indexes, Health Telemetry, and Graceful Shutdown.
 */

import http from 'http';
import mongoose from 'mongoose';
import app from './src/app.js';
import { env, validateEnvironment } from './src/config/environment.js';
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from './src/config/database.js';
import { auditDatabaseIndexes } from './src/utils/indexAuditor.js';
import { sanitizeInput } from './src/middleware/sanitize.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Simple HTTP request helper
function makeRequest({ method = 'GET', path = '/', headers = {}, body = null, port = 5099 }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = raw;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: json,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runPhase10Tests() {
  console.log('🧪 Starting Phase 10 Automated Performance, Security & Deployment Verification Suite...\n');

  const TEST_PORT = 5099;
  let testServer = null;

  try {
    await connectDatabase();

    // Start a dedicated test server instance
    testServer = http.createServer(app);
    await new Promise((resolve) => testServer.listen(TEST_PORT, resolve));

    // =========================================================================
    // TEST GROUP 1: Helmet HTTP Security Headers & CORS Exposed Headers
    // =========================================================================
    console.log('\n--- Test Group 1: Helmet HTTP Security Headers & CORS ---');
    const healthRes = await makeRequest({
      method: 'GET',
      path: '/api/health',
      headers: { Origin: 'http://localhost:5173' },
      port: TEST_PORT,
    });

    assert(healthRes.statusCode === 200, 'GET /api/health returns HTTP 200 OK');
    assert(
      healthRes.headers['x-content-type-options'] === 'nosniff',
      'X-Content-Type-Options is enforced as nosniff'
    );
    assert(
      healthRes.headers['x-frame-options'] === 'DENY',
      'X-Frame-Options is strictly enforced as DENY'
    );
    assert(
      healthRes.headers['x-dns-prefetch-control'] === 'off',
      'X-DNS-Prefetch-Control is disabled (off)'
    );
    assert(
      healthRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
      'Referrer-Policy enforced as strict-origin-when-cross-origin'
    );
    assert(
      typeof healthRes.headers['content-security-policy'] === 'string',
      'Content-Security-Policy (CSP) header is present'
    );
    assert(
      healthRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
      'CORS correctly reflects authorized client origin'
    );
    assert(
      healthRes.headers['access-control-expose-headers'] &&
        healthRes.headers['access-control-expose-headers'].includes('X-Revitest-Signature'),
      'CORS exposes X-Revitest-Signature header'
    );

    // =========================================================================
    // TEST GROUP 2: NoSQL Injection & Prototype Pollution Sanitization
    // =========================================================================
    console.log('\n--- Test Group 2: NoSQL Injection & Input Sanitization ---');
    const mockReq = {
      body: {
        email: { $gt: '' },
        'nested.key': 'exploit',
        normalField: 'validValue',
        __proto__: { polluted: true },
        safeArray: [{ $ne: null }, 'cleanItem'],
      },
      query: {
        filter: { $regex: '.*' },
        page: '1',
      },
      params: {
        id: 'param1',
      },
    };

    let nextCalled = false;
    sanitizeInput(mockReq, {}, () => {
      nextCalled = true;
    });

    assert(nextCalled === true, 'Sanitizer calls next() middleware');
    assert(mockReq.body.normalField === 'validValue', 'Sanitizer preserves legitimate fields');
    assert(mockReq.body.email === undefined || typeof mockReq.body.email.$gt === 'undefined', 'Sanitizer strips $gt operator key');
    assert(mockReq.body['nested.key'] === undefined, 'Sanitizer strips dotted key containing "."');
    assert(mockReq.query.page === '1', 'Sanitizer preserves safe query params');
    assert(typeof mockReq.query.filter.$regex === 'undefined', 'Sanitizer strips $regex from query');
    assert(Array.isArray(mockReq.body.safeArray) && mockReq.body.safeArray.length === 2, 'Sanitizer cleans array items');

    // =========================================================================
    // TEST GROUP 3: Rate Limiting & Brute Force Defense
    // =========================================================================
    console.log('\n--- Test Group 3: Rate Limiting & Brute Force Defense ---');
    const rateLimitRes = await makeRequest({
      method: 'GET',
      path: '/api/health',
      port: TEST_PORT,
    });

    assert(
      rateLimitRes.headers['ratelimit-limit'] !== undefined,
      'Standard RateLimit-Limit header is returned'
    );
    assert(
      rateLimitRes.headers['ratelimit-remaining'] !== undefined,
      'Standard RateLimit-Remaining header is returned'
    );

    // Test auth rate limiter presence on /api/auth/login
    const authRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'invalid@test.com', password: 'wrong' },
      port: TEST_PORT,
    });

    assert(
      authRes.headers['ratelimit-limit'] !== undefined,
      'Auth endpoint returns dedicated RateLimit headers'
    );
    assert(
      authRes.statusCode === 400 || authRes.statusCode === 401,
      'Invalid auth payload rejected cleanly'
    );

    // =========================================================================
    // TEST GROUP 4: Database Compound Indexes & Performance Auditing
    // =========================================================================
    console.log('\n--- Test Group 4: Database Compound Indexes & Performance Auditing ---');
    const indexAudit = await auditDatabaseIndexes();

    const expectedModels = [
      'User',
      'Organization',
      'Exam',
      'ExamSnapshot',
      'ExamSchedule',
      'ScheduleCandidate',
      'ExamAttempt',
      'AttemptResponse',
      'ExamViolation',
      'ExamResult',
      'ApiKey',
      'WebhookSubscription',
      'AuditLog',
      'Question',
    ];

    for (const modelName of expectedModels) {
      const modelAudit = indexAudit[modelName];
      assert(
        modelAudit && modelAudit.count >= 2,
        `Model ${modelName} has >= 2 active database indexes (found ${modelAudit?.count || 0})`
      );
    }

    // Verify critical partial index on ExamAttempt
    const attemptAudit = indexAudit['ExamAttempt'];
    const hasPartialIndex = attemptAudit?.indexes?.some((idx) => idx.partial === true);
    assert(
      hasPartialIndex,
      'ExamAttempt possesses active partial unique index for concurrent attempt safety'
    );

    // Verify index audit endpoint
    const indexApiRes = await makeRequest({
      method: 'GET',
      path: '/api/health/indexes',
      port: TEST_PORT,
    });
    assert(indexApiRes.statusCode === 200, 'GET /api/health/indexes returns HTTP 200 OK');
    assert(
      Boolean(indexApiRes.data?.data?.models?.ExamResult),
      'Index audit endpoint reports ExamResult model indexes'
    );

    // =========================================================================
    // TEST GROUP 5: Production Health, Telemetry & Environment Validation
    // =========================================================================
    console.log('\n--- Test Group 5: Production Health Telemetry & Environment Validation ---');
    const fullHealthRes = await makeRequest({
      method: 'GET',
      path: '/api/health',
      port: TEST_PORT,
    });

    const healthData = fullHealthRes.data?.data;
    assert(healthData.application === 'REVITEST', 'Telemetry reports correct application name');
    assert(typeof healthData.uptime === 'string', 'Telemetry reports uptime string');
    assert(healthData.process.nodeVersion.startsWith('v'), 'Telemetry reports Node.js version');
    assert(healthData.process.memory.heapUsed.endsWith('MB'), 'Telemetry reports heap memory in MB');
    assert(healthData.security.helmet === 'ACTIVE', 'Telemetry reports Helmet security status');
    assert(healthData.security.noSqlSanitizer === 'ACTIVE', 'Telemetry reports NoSQL sanitizer status');

    const dbHealthRes = await makeRequest({
      method: 'GET',
      path: '/api/health/db',
      port: TEST_PORT,
    });
    const dbData = dbHealthRes.data?.data?.database;
    assert(dbData.connected === true, 'Database health check verifies connected === true');
    assert(typeof dbData.pingMs === 'number', `Database ping latency measured (${dbData.pingMs}ms)`);

    const envValidation = validateEnvironment();
    assert(envValidation.isValid === true, 'Environment validation confirms all required variables present');

    // =========================================================================
    // TEST GROUP 6: Graceful Shutdown Capability
    // =========================================================================
    console.log('\n--- Test Group 6: Graceful Shutdown Capability ---');
    await disconnectDatabase();
    const postDisconnectStatus = await getDatabaseStatus();
    assert(
      postDisconnectStatus.connected === false,
      'disconnectDatabase() successfully closes active MongoDB connection cleanly'
    );

    // Reconnect for any subsequent test runs
    await connectDatabase();
    const reconnectStatus = await getDatabaseStatus();
    assert(
      reconnectStatus.connected === true,
      'Database connection restored cleanly after test termination'
    );
  } finally {
    if (testServer) {
      await new Promise((resolve) => testServer.close(resolve));
    }
    await disconnectDatabase();
  }

  console.log('\n========================================');
  console.log(`Phase 10 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Tests().catch((err) => {
  console.error('Fatal error during Phase 10 test execution:', err);
  process.exit(1);
});
