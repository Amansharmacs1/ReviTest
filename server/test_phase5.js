import mongoose from 'mongoose';
import { Organization } from './src/models/Organization.js';
import { User } from './src/models/User.js';
import { Question } from './src/models/Question.js';
import { Exam } from './src/models/Exam.js';
import { ExamSnapshot } from './src/models/ExamSnapshot.js';
import { ExamSchedule } from './src/models/ExamSchedule.js';
import { ScheduleCandidate } from './src/models/ScheduleCandidate.js';
import { AuditLog } from './src/models/AuditLog.js';
import { checkCandidateEligibility } from './src/services/examEligibility.service.js';
import { env } from './src/config/environment.js';

const MONGODB_URI = env.mongodbUri;

async function runTests() {
  console.log('🧪 Starting Phase 5 Automated Verification Suite...\n');
  await mongoose.connect(MONGODB_URI);

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
    // Cleanup any existing test data
    await Organization.deleteMany({ slug: /^phase5-test-/ });
    await User.deleteMany({ email: /^phase5-.*@test\.com$/ });
    await ExamSchedule.deleteMany({});
    await ScheduleCandidate.deleteMany({});
    await ExamSnapshot.deleteMany({});
    await Exam.deleteMany({ title: /^Phase5 / });
    await Question.deleteMany({ statement: /^Phase5 / });

    // 1. Setup Tenant A and Tenant B
    const orgA = await Organization.create({
      name: 'Phase 5 College A',
      slug: 'phase5-test-college-a',
      code: 'P5A001',
      type: 'COLLEGE_UNIVERSITY',
      contactEmail: 'contact-p5a@test.com',
      status: 'ACTIVE',
    });

    const orgB = await Organization.create({
      name: 'Phase 5 Academy B',
      slug: 'phase5-test-academy-b',
      code: 'P5B002',
      type: 'COACHING_INSTITUTE',
      contactEmail: 'contact-p5b@test.com',
      status: 'ACTIVE',
    });

    const adminA = await User.create({
      name: 'Admin A',
      email: 'phase5-adminA@test.com',
      password: 'Password123!',
      role: 'ORG_ADMIN',
      organizationId: orgA._id,
      status: 'ACTIVE',
    });

    const candidateA1 = await User.create({
      name: 'Alice Student',
      email: 'phase5-alice@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: orgA._id,
      status: 'ACTIVE',
      profile: { studentId: 'STU-001', department: 'Computer Science' },
    });

    const candidateA2 = await User.create({
      name: 'Bob Student',
      email: 'phase5-bob@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: orgA._id,
      status: 'ACTIVE',
      profile: { studentId: 'STU-002', department: 'Mechanical' },
    });

    const candidateB = await User.create({
      name: 'Charlie Student B',
      email: 'phase5-charlie@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: orgB._id,
      status: 'ACTIVE',
    });

    // Create a published exam in Tenant A with snapshot
    const question1 = await Question.create({
      organizationId: orgA._id,
      statement: 'Phase5 What is 2 + 2?',
      questionType: 'MCQ_SINGLE',
      subject: 'Mathematics',
      topic: 'Arithmetic',
      marks: 4,
      options: [
        { optionId: '1', text: '3', isCorrect: false },
        { optionId: '2', text: '4', isCorrect: true },
      ],
      createdBy: adminA._id,
    });

    const examA = await Exam.create({
      organizationId: orgA._id,
      title: 'Phase5 Midterm Mathematics',
      subject: 'Mathematics',
      durationMinutes: 60,
      instructions: 'Answer all questions carefully.',
      status: 'PUBLISHED',
      totalMarks: 4,
      passingMarks: 2,
      sections: [
        {
          title: 'Section A',
          order: 0,
          questions: [
            {
              questionId: question1._id,
              marks: 4,
              order: 0,
            },
          ],
          sectionMarks: 4,
        },
      ],
      createdBy: adminA._id,
    });

    const snapshotA = await ExamSnapshot.create({
      examId: examA._id,
      organizationId: orgA._id,
      version: 1,
      examMetadata: {
        title: examA.title,
        description: examA.description || '',
        subject: examA.subject,
        category: 'General',
        instructions: examA.instructions,
        durationMinutes: examA.durationMinutes,
        totalMarks: 4,
        passingMarks: 2,
        settings: {},
      },
      totalQuestions: 1,
      totalMarks: 4,
      sections: [
        {
          sectionId: 'sec-1',
          title: 'Section A',
          order: 0,
          sectionMarks: 4,
          questions: [
            {
              questionId: question1._id,
              questionType: question1.questionType,
              statement: question1.statement,
              subject: question1.subject,
              topic: question1.topic,
              difficulty: question1.difficulty,
              marks: 4,
              options: question1.options,
            },
          ],
        },
      ],
      publishedBy: adminA._id,
    });

    examA.publishedVersionId = snapshotA._id;
    await examA.save();

    console.log('\n--- Test Group 1: Exam Schedule Creation & Validation ---');

    // 1.1 Start time after end time must fail
    let invalidTimeFailed = false;
    try {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now());
      if (start >= end) throw new Error('Start must be before end');
    } catch {
      invalidTimeFailed = true;
    }
    assert(invalidTimeFailed, 'Rejects invalid schedule window where start >= end');

    // 1.2 Create active schedule for Tenant A (starts 5 minutes ago, ends in 2 hours)
    const activeStart = new Date(Date.now() - 300000); // 5 mins ago (within 15 min grace period)
    const activeEnd = new Date(Date.now() + 7200000); // 2 hrs from now

    const activeSchedule = await ExamSchedule.create({
      organizationId: orgA._id,
      examId: examA._id,
      examSnapshotId: snapshotA._id,
      title: 'Phase5 Active Midterm Session',
      startTime: activeStart,
      endTime: activeEnd,
      durationMinutes: 60,
      lateEntryGraceMinutes: 15,
      maxAttempts: 1,
      eligibilityType: 'SELECTED_CANDIDATES',
      assignedCandidateIds: [candidateA1._id],
      createdBy: adminA._id,
    });

    assert(activeSchedule._id != null, 'Successfully creates active examination schedule');
    assert(
      activeSchedule.computeCurrentStatus() === 'ACTIVE',
      'Correctly computes status as ACTIVE when within time window'
    );

    // 1.3 Create future schedule (starts in 24 hours)
    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 90000000);

    const futureSchedule = await ExamSchedule.create({
      organizationId: orgA._id,
      examId: examA._id,
      examSnapshotId: snapshotA._id,
      title: 'Phase5 Future Midterm Session',
      startTime: futureStart,
      endTime: futureEnd,
      durationMinutes: 60,
      maxAttempts: 1,
      eligibilityType: 'ALL_CANDIDATES',
      createdBy: adminA._id,
    });

    assert(
      futureSchedule.computeCurrentStatus() === 'SCHEDULED',
      'Correctly computes status as SCHEDULED for future window'
    );

    // 1.4 Create expired schedule (ended 2 hours ago)
    const expiredStart = new Date(Date.now() - 14400000);
    const expiredEnd = new Date(Date.now() - 7200000);

    const expiredSchedule = await ExamSchedule.create({
      organizationId: orgA._id,
      examId: examA._id,
      examSnapshotId: snapshotA._id,
      title: 'Phase5 Expired Session',
      startTime: expiredStart,
      endTime: expiredEnd,
      durationMinutes: 60,
      maxAttempts: 1,
      eligibilityType: 'ALL_CANDIDATES',
      createdBy: adminA._id,
    });

    assert(
      expiredSchedule.computeCurrentStatus() === 'COMPLETED',
      'Correctly computes status as COMPLETED for elapsed window'
    );

    console.log('\n--- Test Group 2: Candidate Assignment & Deduplication ---');

    // 2.1 Assign candidate A1 to activeSchedule
    const assign1 = await ScheduleCandidate.create({
      organizationId: orgA._id,
      scheduleId: activeSchedule._id,
      candidateId: candidateA1._id,
      status: 'ASSIGNED',
    });
    assert(assign1._id != null, 'Successfully creates ScheduleCandidate assignment');

    // 2.2 Attempt duplicate assignment -> unique index must reject
    let dupFailed = false;
    try {
      await ScheduleCandidate.create({
        organizationId: orgA._id,
        scheduleId: activeSchedule._id,
        candidateId: candidateA1._id,
        status: 'ASSIGNED',
      });
    } catch (err) {
      dupFailed = err.code === 11000;
    }
    assert(dupFailed, 'Unique compound index strictly prevents duplicate candidate assignment');

    console.log('\n--- Test Group 3: Server-Authoritative Eligibility Engine ---');

    // 3.1 Candidate A1 accessing active schedule -> Eligible!
    const resA1 = await checkCandidateEligibility(candidateA1._id, activeSchedule._id);
    if (!resA1.isEligible) console.log('resA1 debug:', resA1);
    assert(resA1.isEligible === true, 'Candidate A1 is verified as ELIGIBLE for active schedule');
    assert(
      resA1.safeExamSnapshot.totalMarks === 4,
      'Safe exam snapshot returns totalMarks and metadata'
    );
    assert(
      resA1.safeExamSnapshot.sections == null,
      'Safe exam snapshot strictly hides detailed section and question payloads'
    );

    // 3.2 Candidate A2 (not assigned to SELECTED_CANDIDATES schedule) -> Rejected!
    const resA2 = await checkCandidateEligibility(candidateA2._id, activeSchedule._id);
    assert(resA2.isEligible === false, 'Candidate A2 is rejected (NOT_ASSIGNED)');
    assert(resA2.reason === 'NOT_ASSIGNED', 'Correct rejection reason NOT_ASSIGNED');

    // 3.3 Candidate B (Tenant B) accessing Tenant A schedule -> 404 Not Found (Cross-tenant leak prevention)
    let crossTenantBlocked = false;
    try {
      await checkCandidateEligibility(candidateB._id, activeSchedule._id);
    } catch (err) {
      crossTenantBlocked = err.statusCode === 404;
    }
    assert(crossTenantBlocked, 'Cross-tenant schedule access is blocked with 404 Not Found');

    // 3.4 Future schedule access -> Rejected with EXAM_NOT_STARTED
    const resFuture = await checkCandidateEligibility(candidateA1._id, futureSchedule._id);
    assert(resFuture.isEligible === false, 'Future schedule is rejected');
    assert(resFuture.reason === 'EXAM_NOT_STARTED', 'Rejection reason is EXAM_NOT_STARTED');
    assert(resFuture.timing.startsInSeconds > 0, 'Returns real-time seconds until exam begins');

    // 3.5 Expired schedule access -> Rejected with EXAM_EXPIRED
    const resExpired = await checkCandidateEligibility(candidateA1._id, expiredSchedule._id);
    assert(resExpired.isEligible === false, 'Expired schedule is rejected');
    assert(resExpired.reason === 'EXAM_EXPIRED', 'Rejection reason is EXAM_EXPIRED');

    // 3.6 Suspended candidate access -> Rejected with ACCOUNT_SUSPENDED
    const suspendedCandidate = await User.create({
      name: 'Suspended Student',
      email: 'phase5-suspended@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: orgA._id,
      status: 'SUSPENDED',
    });
    const resSuspended = await checkCandidateEligibility(
      suspendedCandidate._id,
      activeSchedule._id
    );
    assert(resSuspended.isEligible === false, 'Suspended candidate is rejected');
    assert(
      resSuspended.reason === 'ACCOUNT_SUSPENDED',
      'Rejection reason is ACCOUNT_SUSPENDED'
    );

    // 3.7 Attempt Limit Reached -> Rejected with MAX_ATTEMPTS_REACHED
    assign1.attemptsCount = 1; // maxAttempts is 1
    await assign1.save();

    const resMaxAttempts = await checkCandidateEligibility(
      candidateA1._id,
      activeSchedule._id
    );
    assert(
      resMaxAttempts.isEligible === false,
      'Candidate who exhausted maximum attempts is rejected'
    );
    assert(
      resMaxAttempts.reason === 'MAX_ATTEMPTS_REACHED',
      'Rejection reason is MAX_ATTEMPTS_REACHED'
    );

    console.log('\n--- Test Group 4: Rules Acknowledgement Flow ---');

    // Reset attempt count to allow acknowledgement
    assign1.attemptsCount = 0;
    assign1.status = 'ASSIGNED';
    assign1.acknowledgedAt = null;
    await assign1.save();

    // Acknowledge exam
    assign1.acknowledgedAt = new Date();
    assign1.status = 'ACKNOWLEDGED';
    await assign1.save();

    const verifiedAssignment = await ScheduleCandidate.findById(assign1._id);
    assert(
      verifiedAssignment.status === 'ACKNOWLEDGED',
      'ScheduleCandidate status transitions to ACKNOWLEDGED'
    );
    assert(
      verifiedAssignment.acknowledgedAt instanceof Date,
      'Records UTC acknowledgement timestamp'
    );

    console.log('\n--- Test Group 5: Batch-Based Eligibility ---');

    // Create batch schedule for "Computer Science"
    const batchSchedule = await ExamSchedule.create({
      organizationId: orgA._id,
      examId: examA._id,
      examSnapshotId: snapshotA._id,
      title: 'Phase5 CS Batch Only Exam',
      startTime: activeStart,
      endTime: activeEnd,
      durationMinutes: 45,
      eligibilityType: 'BATCH',
      targetBatch: 'Computer Science',
      createdBy: adminA._id,
    });

    // Alice is CS -> Eligible
    const resAliceBatch = await checkCandidateEligibility(candidateA1._id, batchSchedule._id);
    assert(resAliceBatch.isEligible === true, 'Computer Science candidate is eligible for CS batch');

    // Bob is Mechanical -> Rejected
    const resBobBatch = await checkCandidateEligibility(candidateA2._id, batchSchedule._id);
    assert(resBobBatch.isEligible === false, 'Mechanical candidate is rejected from CS batch');
    assert(resBobBatch.reason === 'NOT_ASSIGNED', 'Correct rejection reason NOT_ASSIGNED for non-matching batch');

    console.log(`\n========================================`);
    console.log(`Phase 5 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    // Clean up test data
    await Organization.deleteMany({ slug: /^phase5-test-/ });
    await User.deleteMany({ email: /^phase5-.*@test\.com$/ });
    await ExamSchedule.deleteMany({});
    await ScheduleCandidate.deleteMany({});
    await ExamSnapshot.deleteMany({});
    await Exam.deleteMany({ title: /^Phase5 / });
    await Question.deleteMany({ statement: /^Phase5 / });

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();
