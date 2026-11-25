import mongoose from 'mongoose';
import {
  Organization,
  User,
  Exam,
  ExamSnapshot,
  ExamSchedule,
  ExamResult,
  ApiKey,
  WebhookSubscription,
  WEBHOOK_EVENTS,
} from './src/models/index.js';
import { quotaService } from './src/services/quota.service.js';
import { apiKeyService } from './src/services/apiKey.service.js';
import { webhookService } from './src/services/webhook.service.js';
import { exportService } from './src/services/export.service.js';
import { ROLES } from './src/constants/roles.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/revitest';

async function runPhase9Tests() {
  console.log('🧪 Starting Phase 9 Automated Integrations & SaaS Management Verification Suite...\n');

  await mongoose.connect(MONGO_URI);
  await ApiKey.syncIndexes();
  await WebhookSubscription.syncIndexes();

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

  try {
    // -------------------------------------------------------------
    // Test Setup: Organization with custom quotas & Admin User
    // -------------------------------------------------------------
    const org = await Organization.create({
      name: 'Integrations Testing Institute',
      slug: `saas-test-${Date.now()}`,
      code: `SAS${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'ENTERPRISE_RECRUITER',
      contactEmail: `admin-${Date.now()}@saas-test.com`,
      plan: 'PRO',
      status: 'ACTIVE',
      subscriptionQuotas: {
        maxActiveExams: 2, // limit to 2 for quota test
        maxCandidates: 3, // limit to 3 for quota test
        maxMonthlySubmissions: 500,
        enableWebhooks: true,
        enableApiKeys: true,
        enableCsvExport: true,
      },
    });

    const adminUser = await User.create({
      organizationId: org._id,
      name: 'SaaS Administrator',
      email: `admin-${Date.now()}@saas-test.com`,
      password: 'SecurePassword123!',
      role: ROLES.ORG_ADMIN,
      status: 'ACTIVE',
    });

    console.log('\n--- Test Group 1: Subscription Quota & Usage Enforcement ---');

    // 1. Initial usage metrics
    const metrics = await quotaService.getUsageMetrics(org._id);
    assert(metrics.plan === 'PRO', 'Organization plan correctly identified as PRO');
    assert(metrics.usage.activeExams.max === 2, 'Reports maxActiveExams quota of 2');
    assert(metrics.usage.candidates.max === 3, 'Reports maxCandidates quota of 3');

    // 2. Create 2 exams (reaches limit of 2)
    const exam1 = await Exam.create({
      organizationId: org._id,
      title: 'Exam Alpha',
      subject: 'Tech',
      durationMinutes: 30,
      createdBy: adminUser._id,
      status: 'PUBLISHED',
    });

    const exam2 = await Exam.create({
      organizationId: org._id,
      title: 'Exam Beta',
      subject: 'Tech',
      durationMinutes: 30,
      createdBy: adminUser._id,
      status: 'DRAFT',
    });

    let examQuotaBlocked = false;
    try {
      await quotaService.checkCanCreateExam(org._id);
    } catch (err) {
      examQuotaBlocked = err.statusCode === 403;
    }
    assert(examQuotaBlocked, 'Active exam quota limit (2/2) strictly enforced with 403 Forbidden');

    // 3. Create 3 candidates (reaches limit of 3)
    await User.create([
      {
        organizationId: org._id,
        name: 'Cand 1',
        email: `c1-${Date.now()}@saas.com`,
        password: 'Password123!',
        role: ROLES.CANDIDATE,
        status: 'ACTIVE',
      },
      {
        organizationId: org._id,
        name: 'Cand 2',
        email: `c2-${Date.now()}@saas.com`,
        password: 'Password123!',
        role: ROLES.CANDIDATE,
        status: 'ACTIVE',
      },
      {
        organizationId: org._id,
        name: 'Cand 3',
        email: `c3-${Date.now()}@saas.com`,
        password: 'Password123!',
        role: ROLES.CANDIDATE,
        status: 'ACTIVE',
      },
    ]);

    let candQuotaBlocked = false;
    try {
      await quotaService.checkCanRegisterCandidate(org._id);
    } catch (err) {
      candQuotaBlocked = err.statusCode === 403;
    }
    assert(candQuotaBlocked, 'Candidate registration quota limit (3/3) strictly enforced with 403 Forbidden');

    console.log('\n--- Test Group 2: Programmatic API Keys Engine ---');

    // Generate API Key
    const createdKey = await apiKeyService.createApiKey(
      org._id,
      { name: 'Canvas LMS Connector', permissions: ['READ_RESULTS', 'READ_ROSTER'] },
      adminUser
    );

    assert(createdKey.rawKey.startsWith('rvt_live_'), 'Raw API Key generated with rvt_live_ prefix');
    assert(createdKey.keyPrefix.length === 15, 'Key prefix formatted to 15 characters');

    // List API keys hides secret
    const listKeys = await apiKeyService.listApiKeys(org._id);
    assert(listKeys.length === 1, 'API key listed for organization');
    assert(listKeys[0].hashedKey === undefined, 'hashedKey is strictly excluded from query results');

    // Authenticate raw key
    const authResult = await apiKeyService.authenticateKey(createdKey.rawKey);
    assert(authResult !== null, 'Raw API Key authenticates successfully');
    assert(authResult.name === 'Canvas LMS Connector', 'Authenticates correct key metadata');

    // Revoke key
    await apiKeyService.revokeApiKey(createdKey._id, org._id, adminUser);
    let revokedAuthBlocked = false;
    try {
      await apiKeyService.authenticateKey(createdKey.rawKey);
    } catch (err) {
      revokedAuthBlocked = err.statusCode === 401;
    }
    assert(revokedAuthBlocked, 'Revoked API key rejected with 401 Unauthorized');

    console.log('\n--- Test Group 3: Webhook Subscriptions & HMAC Signature Engine ---');

    // Register webhook endpoint
    const webhook = await webhookService.createSubscription(
      org._id,
      {
        name: 'GradeSync Webhook',
        url: 'https://api.partner-university.edu/webhooks/revitest',
        events: [WEBHOOK_EVENTS.RESULTS_PUBLISHED, WEBHOOK_EVENTS.EXAM_SUBMITTED],
      },
      adminUser
    );

    assert(webhook.secret.length === 48, 'Generated 48-char secret for HMAC signing');

    // HMAC signature generation
    const samplePayload = { attemptId: 'att-123', score: 95 };
    const signature = webhookService.generateSignature(samplePayload, webhook.secret);
    assert(signature.length === 64, 'Generated 64-char hexadecimal HMAC-SHA256 signature');

    // Dispatch webhook event
    const dispatchResult = await webhookService.dispatchEvent(
      org._id,
      WEBHOOK_EVENTS.RESULTS_PUBLISHED,
      samplePayload
    );
    assert(dispatchResult.targetCount === 1, 'Dispatched to 1 subscribed webhook endpoint');
    assert(dispatchResult.deliveryResults[0].dispatched === true, 'Webhook delivery marked as dispatched');

    // Delete webhook
    await webhookService.deleteSubscription(webhook._id, org._id, adminUser);
    const remainingSubs = await webhookService.listSubscriptions(org._id);
    assert(remainingSubs.length === 0, 'Webhook subscription removed');

    console.log('\n--- Test Group 4: CSV Data Export Tools ---');

    // Candidate roster CSV
    const rosterCsv = await exportService.exportCandidateRosterCsv(org._id);
    assert(rosterCsv.includes('Name,Email,Student ID'), 'Roster CSV contains standard headers');
    assert(rosterCsv.includes('Cand 1'), 'Roster CSV includes enrolled candidate');

    // Schedule results CSV
    const sched = await ExamSchedule.create({
      organizationId: org._id,
      examId: exam1._id,
      examSnapshotId: new mongoose.Types.ObjectId(),
      title: 'Export Test Schedule',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      durationMinutes: 60,
      status: 'COMPLETED',
      createdBy: adminUser._id,
    });

    const candUser = await User.findOne({ organizationId: org._id, role: ROLES.CANDIDATE });

    await ExamResult.create({
      organizationId: org._id,
      scheduleId: sched._id,
      examId: exam1._id,
      examSnapshotId: sched.examSnapshotId,
      candidateId: candUser._id,
      attemptId: new mongoose.Types.ObjectId(),
      totalMarksObtained: 90,
      maximumMarks: 100,
      percentage: 90,
      isPassed: true,
      rank: 1,
      percentile: 100,
    });

    const resultsCsv = await exportService.exportScheduleResultsCsv(sched._id, org._id);
    assert(resultsCsv.includes('Rank,Candidate Name,Email'), 'Results CSV contains standard headers');
    assert(resultsCsv.includes('"90"'), 'Results CSV contains score');
    assert(resultsCsv.includes('"PASSED"'), 'Results CSV contains status');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await ExamResult.deleteMany({ scheduleId: sched._id });
    await ExamSchedule.deleteMany({ _id: sched._id });
    await WebhookSubscription.deleteMany({ organizationId: org._id });
    await ApiKey.deleteMany({ organizationId: org._id });
    await Exam.deleteMany({ organizationId: org._id });
    await User.deleteMany({ organizationId: org._id });
    await Organization.deleteMany({ _id: org._id });
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n========================================');
  console.log(`Phase 9 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runPhase9Tests();
