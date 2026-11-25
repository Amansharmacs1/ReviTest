import mongoose from 'mongoose';
import {
  Organization,
  User,
  Exam,
  ExamSnapshot,
  ExamSchedule,
  ScheduleCandidate,
  ExamAttempt,
  ExamViolation,
  VIOLATION_TYPE,
  VIOLATION_SEVERITY,
  ATTEMPT_STATUS,
  SUBMISSION_REASON,
  AuditLog,
} from './src/models/index.js';
import { proctorService } from './src/services/proctor.service.js';
import { startOrResumeAttempt } from './src/services/attempt.service.js';
import { ROLES } from './src/constants/roles.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/revitest';

async function runPhase7Tests() {
  console.log('🧪 Starting Phase 7 Automated Proctoring & Examination Security Verification Suite...\n');

  await mongoose.connect(MONGO_URI);
  await ExamViolation.syncIndexes();
  await ExamAttempt.syncIndexes();

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
    // Test Setup: Create Organization, Proctor, Candidates, Exam & Schedule
    // -------------------------------------------------------------
    const org = await Organization.create({
      name: 'Proctor Testing Institute',
      slug: `proctor-test-${Date.now()}`,
      code: `PRC${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'COLLEGE_UNIVERSITY',
      contactEmail: `admin-${Date.now()}@proctor-test.edu`,
      status: 'ACTIVE',
    });

    const proctorUser = await User.create({
      organizationId: org._id,
      name: 'Chief Proctor Officer',
      email: `proctor-${Date.now()}@proctor-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.PROCTOR,
      status: 'ACTIVE',
    });

    const candidate1 = await User.create({
      organizationId: org._id,
      name: 'Examinee One',
      email: `candidate1-${Date.now()}@proctor-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.CANDIDATE,
      status: 'ACTIVE',
    });

    const candidate2 = await User.create({
      organizationId: org._id,
      name: 'Examinee Two (Intruder)',
      email: `candidate2-${Date.now()}@proctor-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.CANDIDATE,
      status: 'ACTIVE',
    });

    const exam = await Exam.create({
      organizationId: org._id,
      title: 'Proctor Security Assessment',
      subject: 'Computer Science',
      durationMinutes: 60,
      totalMarks: 50,
      passingMarks: 20,
      createdBy: proctorUser._id,
      status: 'PUBLISHED',
      settings: {
        maxTabSwitches: 3,
        enableProctoring: true,
      },
    });

    const snapshot = await ExamSnapshot.create({
      organizationId: org._id,
      examId: exam._id,
      version: 1,
      examMetadata: {
        title: exam.title,
        subject: exam.subject,
        durationMinutes: 60,
        totalMarks: 50,
        passingMarks: 20,
        settings: {
          maxTabSwitches: 3,
          enableProctoring: true,
        },
      },
      sections: [],
      totalQuestions: 10,
      totalMarks: 50,
      publishedBy: proctorUser._id,
    });

    const now = new Date();
    const schedule = await ExamSchedule.create({
      organizationId: org._id,
      examId: exam._id,
      examSnapshotId: snapshot._id,
      title: 'Proctor Test Live Slot',
      startTime: new Date(now.getTime() - 10 * 60 * 1000), // opened 10m ago
      endTime: new Date(now.getTime() + 120 * 60 * 1000), // closes in 2h
      durationMinutes: 60,
      status: 'ACTIVE',
      createdBy: proctorUser._id,
    });

    await ScheduleCandidate.create([
      {
        organizationId: org._id,
        scheduleId: schedule._id,
        candidateId: candidate1._id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
      {
        organizationId: org._id,
        scheduleId: schedule._id,
        candidateId: candidate2._id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    ]);

    // Candidate 1 starts attempt
    const startRes = await startOrResumeAttempt(candidate1._id, schedule._id);
    const attempt1Id = startRes.attempt._id;

    console.log('\n--- Test Group 1: Candidate Violation Logging & Isolation ---');

    // 1. Log a tab switch violation
    const v1 = await proctorService.recordViolation(candidate1, attempt1Id, {
      violationType: VIOLATION_TYPE.TAB_SWITCH,
      severity: VIOLATION_SEVERITY.MEDIUM,
      details: 'Examinee switched to another browser tab',
    });

    assert(v1.violation && v1.violation.violationType === VIOLATION_TYPE.TAB_SWITCH, 'Tab switch recorded successfully');
    assert(v1.tabSwitchCount === 1, 'tabSwitchCount incremented to 1');
    assert(v1.remainingTabSwitches === 2, 'remainingTabSwitches calculated as 2 (3 - 1)');
    assert(!v1.autoTerminated, 'Attempt not auto-terminated on 1st violation');

    // 2. Candidate 2 attempts to record a violation on Candidate 1's attempt (Security check)
    let crossLogBlocked = false;
    try {
      await proctorService.recordViolation(candidate2, attempt1Id, {
        violationType: VIOLATION_TYPE.CLIPBOARD_COPY,
      });
    } catch (err) {
      crossLogBlocked = err.statusCode === 403;
    }
    assert(crossLogBlocked, 'Cross-candidate violation injection blocked with 403 Forbidden');

    // 3. Invalid violation type rejected
    let invalidTypeRejected = false;
    try {
      await proctorService.recordViolation(candidate1, attempt1Id, {
        violationType: 'HACKING_ATTEMPT_INVALID',
      });
    } catch (err) {
      invalidTypeRejected = err.statusCode === 400;
    }
    assert(invalidTypeRejected, 'Invalid violation type rejected with 400 Bad Request');

    console.log('\n--- Test Group 2: Violation Audit Access Control ---');

    // Candidate 1 can view own violations
    const c1Audit = await proctorService.getViolationsForAttempt(attempt1Id, candidate1);
    assert(c1Audit.violations.length >= 1, 'Candidate 1 can retrieve their own violations audit');

    // Candidate 2 is blocked from viewing Candidate 1's violations
    let crossViewBlocked = false;
    try {
      await proctorService.getViolationsForAttempt(attempt1Id, candidate2);
    } catch (err) {
      crossViewBlocked = err.statusCode === 403;
    }
    assert(crossViewBlocked, 'Candidate 2 blocked from viewing Candidate 1 violations (403 Forbidden)');

    // Proctor can view violations
    const proctorAudit = await proctorService.getViolationsForAttempt(attempt1Id, proctorUser);
    assert(proctorAudit.violations.length >= 1, 'Proctor can retrieve candidate violations audit');

    console.log('\n--- Test Group 3: Violation Threshold & Auto-Termination ---');

    // 2nd tab switch
    const v2 = await proctorService.recordViolation(candidate1, attempt1Id, {
      violationType: VIOLATION_TYPE.TAB_SWITCH,
      details: 'Examinee switched tabs a 2nd time',
    });
    assert(v2.tabSwitchCount === 2, 'tabSwitchCount incremented to 2');
    assert(v2.remainingTabSwitches === 1, 'remainingTabSwitches is 1');
    assert(!v2.autoTerminated, 'Attempt remains IN_PROGRESS on 2nd violation');

    // 3rd tab switch (Exceeds / reaches maxTabSwitches = 3)
    const v3 = await proctorService.recordViolation(candidate1, attempt1Id, {
      violationType: VIOLATION_TYPE.TAB_SWITCH,
      details: 'Examinee switched tabs a 3rd time (Threshold exceeded)',
    });
    assert(v3.tabSwitchCount === 3, 'tabSwitchCount reached 3');
    assert(v3.autoTerminated === true, 'Attempt auto-terminated when threshold reached');
    assert(v3.attempt.status === ATTEMPT_STATUS.AUTO_SUBMITTED, 'Attempt status transitioned to AUTO_SUBMITTED');
    assert(v3.attempt.submissionReason === SUBMISSION_REASON.VIOLATION_TERMINATED, 'Submission reason recorded as VIOLATION_TERMINATED');
    assert(v3.attempt.isFlagged === true, 'Attempt marked isFlagged: true');

    // Check Audit Log created for auto-termination
    const termAudit = await AuditLog.findOne({
      targetId: attempt1Id,
      action: 'ATTEMPT_AUTO_TERMINATED_VIOLATION',
    });
    assert(termAudit !== null, 'AuditLog generated for auto-termination');

    // Further violations on terminated attempt are ignored cleanly
    const vAfter = await proctorService.recordViolation(candidate1, attempt1Id, {
      violationType: VIOLATION_TYPE.FULLSCREEN_EXIT,
    });
    assert(vAfter.ignored === true, 'Violations on terminated attempt ignored gracefully');

    console.log('\n--- Test Group 4: Live Proctor Dashboard Feed ---');

    // Candidate 2 starts attempt
    const start2Res = await startOrResumeAttempt(candidate2._id, schedule._id);
    const attempt2Id = start2Res.attempt._id;

    // Record a clipboard paste on candidate 2
    await proctorService.recordViolation(candidate2, attempt2Id, {
      violationType: VIOLATION_TYPE.CLIPBOARD_PASTE,
      severity: VIOLATION_SEVERITY.HIGH,
      details: 'Candidate pasted text into answer field',
    });

    const feed = await proctorService.getLiveScheduleProctorFeed(schedule._id, proctorUser);
    assert(feed.summary.totalAssigned === 2, 'Summary records totalAssigned: 2');
    assert(feed.summary.activeNow === 1, 'Summary records activeNow: 1 (Candidate 2 is in progress)');
    assert(feed.summary.submitted === 1, 'Summary records submitted: 1 (Candidate 1 was terminated)');
    assert(feed.summary.flagged >= 1, 'Summary records flagged attempts');
    assert(feed.summary.totalViolations >= 4, 'Summary records totalViolations >= 4');
    assert(feed.recentViolations.length >= 4, 'Recent violations array populated');

    console.log('\n--- Test Group 5: Proctor Interventions (Warnings & Force Termination) ---');

    // Proctor issues warning to Candidate 2
    const warnedAttempt = await proctorService.issueProctorWarning(proctorUser, attempt2Id, {
      message: 'Please refrain from using copy-paste shortcuts. Your session is monitored.',
    });
    assert(warnedAttempt.proctorWarnings.length === 1, 'Warning added to attempt.proctorWarnings');
    assert(warnedAttempt.proctorWarnings[0].message.includes('copy-paste'), 'Warning message preserved');
    assert(warnedAttempt.proctorWarnings[0].proctorName === proctorUser.name, 'Proctor name attributed to warning');
    assert(warnedAttempt.isFlagged === true, 'Attempt flagged on warning');

    // Proctor force-terminates Candidate 2
    const terminatedAttempt = await proctorService.terminateAttemptByProctor(proctorUser, attempt2Id, {
      reason: 'Confirmed academic dishonesty during live proctor audit',
    });
    assert(terminatedAttempt.status === ATTEMPT_STATUS.AUTO_SUBMITTED, 'Proctor terminated attempt status is AUTO_SUBMITTED');
    assert(terminatedAttempt.submissionReason === SUBMISSION_REASON.PROCTOR_FORCE_SUBMIT, 'Submission reason is PROCTOR_FORCE_SUBMIT');
    assert(terminatedAttempt.flaggedReason.includes('dishonesty'), 'Flagged reason recorded proctor justification');

    // Attempt cannot be terminated twice
    let doubleTermBlocked = false;
    try {
      await proctorService.terminateAttemptByProctor(proctorUser, attempt2Id, {
        reason: 'Terminating again',
      });
    } catch (err) {
      doubleTermBlocked = err.statusCode === 400;
    }
    assert(doubleTermBlocked, 'Re-terminating already submitted attempt rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await ExamViolation.deleteMany({ scheduleId: schedule._id });
    await ExamAttempt.deleteMany({ scheduleId: schedule._id });
    await ScheduleCandidate.deleteMany({ scheduleId: schedule._id });
    await ExamSchedule.deleteMany({ _id: schedule._id });
    await ExamSnapshot.deleteMany({ _id: snapshot._id });
    await Exam.deleteMany({ _id: exam._id });
    await User.deleteMany({ _id: { $in: [proctorUser._id, candidate1._id, candidate2._id] } });
    await Organization.deleteMany({ _id: org._id });
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n========================================');
  console.log(`Phase 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runPhase7Tests();
