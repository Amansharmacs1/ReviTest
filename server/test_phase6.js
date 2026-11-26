import mongoose from 'mongoose';
import { Organization } from './src/models/Organization.js';
import { User } from './src/models/User.js';
import { Question } from './src/models/Question.js';
import { Exam } from './src/models/Exam.js';
import { ExamSnapshot } from './src/models/ExamSnapshot.js';
import { ExamSchedule } from './src/models/ExamSchedule.js';
import { ScheduleCandidate } from './src/models/ScheduleCandidate.js';
import { ExamAttempt, ATTEMPT_STATUS } from './src/models/ExamAttempt.js';
import { AttemptResponse } from './src/models/AttemptResponse.js';
import {
  startOrResumeAttempt,
  getSanitizedQuestionsForAttempt,
  saveAnswerResponse,
  submitAttempt,
} from './src/services/attempt.service.js';
import { env } from './src/config/environment.js';

const MONGODB_URI = env.mongodbUri;

async function runPhase6Tests() {
  console.log('🧪 Starting Phase 6 Automated Examination Engine Verification Suite...\n');
  await mongoose.connect(MONGODB_URI);
  await ExamAttempt.syncIndexes();
  await AttemptResponse.syncIndexes();

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
    // 0. Cleanup
    await Organization.deleteMany({ slug: /^phase6-test-/ });
    await User.deleteMany({ email: /^phase6-.*@test\.com$/ });
    await ExamSchedule.deleteMany({ title: /^Phase6 / });
    await ScheduleCandidate.deleteMany({});
    await ExamAttempt.deleteMany({});
    await AttemptResponse.deleteMany({});
    await ExamSnapshot.deleteMany({});
    await Exam.deleteMany({ title: /^Phase6 / });
    await Question.deleteMany({ statement: /^Phase6 / });

    // 1. Setup Tenant and Users
    const org = await Organization.create({
      name: 'Phase 6 Testing University',
      slug: 'phase6-test-uni',
      code: 'P6UNI',
      type: 'COLLEGE_UNIVERSITY',
      contactEmail: 'contact-p6@test.com',
      status: 'ACTIVE',
    });

    const admin = await User.create({
      name: 'Exam Officer',
      email: 'phase6-admin@test.com',
      password: 'Password123!',
      role: 'ORG_ADMIN',
      organizationId: org._id,
      status: 'ACTIVE',
    });

    const alice = await User.create({
      name: 'Alice Examinee',
      email: 'phase6-alice@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: org._id,
      status: 'ACTIVE',
      profile: { studentId: 'ALICE-01', department: 'Computer Science' },
    });

    const bob = await User.create({
      name: 'Bob Examinee',
      email: 'phase6-bob@test.com',
      password: 'Password123!',
      role: 'CANDIDATE',
      organizationId: org._id,
      status: 'ACTIVE',
      profile: { studentId: 'BOB-02', department: 'Computer Science' },
    });

    // 2. Setup Questions (MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE, DESCRIPTIVE)
    const qSingle = await Question.create({
      organizationId: org._id,
      statement: 'Phase6 What is the capital of France?',
      questionType: 'MCQ_SINGLE',
      subject: 'Geography',
      topic: 'Capitals',
      marks: 2,
      options: [
        { optionId: 'opt-paris', text: 'Paris', isCorrect: true },
        { optionId: 'opt-lyon', text: 'Lyon', isCorrect: false },
        { optionId: 'opt-nice', text: 'Nice', isCorrect: false },
      ],
      explanation: 'Paris has been the capital of France since 987 AD.',
      evaluationGuidance: 'CONFIDENTIAL: Accept only Paris.',
      createdBy: admin._id,
    });

    const qMulti = await Question.create({
      organizationId: org._id,
      statement: 'Phase6 Which of the following are primary colors?',
      questionType: 'MCQ_MULTIPLE',
      subject: 'Art',
      topic: 'Colors',
      marks: 3,
      options: [
        { optionId: 'opt-red', text: 'Red', isCorrect: true },
        { optionId: 'opt-blue', text: 'Blue', isCorrect: true },
        { optionId: 'opt-green', text: 'Green', isCorrect: false },
      ],
      explanation: 'Red, Yellow, and Blue are primary colors in pigment mixing.',
      evaluationGuidance: 'CONFIDENTIAL: Award full marks only if red and blue are selected.',
      createdBy: admin._id,
    });

    const qTF = await Question.create({
      organizationId: org._id,
      statement: 'Phase6 The sun rises in the east.',
      questionType: 'TRUE_FALSE',
      subject: 'Astronomy',
      topic: 'Solar System',
      marks: 1,
      options: [
        { optionId: 'opt-true', text: 'True', isCorrect: true },
        { optionId: 'opt-false', text: 'False', isCorrect: false },
      ],
      explanation: 'Due to Earth rotating eastwards, the sun appears to rise in the east.',
      evaluationGuidance: 'CONFIDENTIAL: True is correct.',
      createdBy: admin._id,
    });

    const qDesc = await Question.create({
      organizationId: org._id,
      statement: 'Phase6 Explain the difference between process and thread.',
      questionType: 'DESCRIPTIVE',
      subject: 'Operating Systems',
      topic: 'Concurrency',
      marks: 5,
      options: [],
      explanation: 'Processes have independent address spaces; threads share memory.',
      evaluationGuidance: 'CONFIDENTIAL FACULTY RUBRIC: 2.5 marks for address space, 2.5 for overhead.',
      createdBy: admin._id,
    });

    // 3. Setup Exam & Immutable Snapshot
    const exam = await Exam.create({
      organizationId: org._id,
      title: 'Phase6 Comprehensive Assessment',
      subject: 'General Science',
      durationMinutes: 60,
      instructions: 'Answer all four questions carefully.',
      status: 'PUBLISHED',
      totalMarks: 11,
      passingMarks: 6,
      sections: [
        {
          sectionId: 'sec-1',
          title: 'Section 1: Objective',
          order: 0,
          sectionMarks: 6,
          questions: [
            { questionId: qSingle._id, marks: 2, order: 0 },
            { questionId: qMulti._id, marks: 3, order: 1 },
            { questionId: qTF._id, marks: 1, order: 2 },
          ],
        },
        {
          sectionId: 'sec-2',
          title: 'Section 2: Descriptive',
          order: 1,
          sectionMarks: 5,
          questions: [{ questionId: qDesc._id, marks: 5, order: 0 }],
        },
      ],
      createdBy: admin._id,
    });

    const snapshot = await ExamSnapshot.create({
      examId: exam._id,
      organizationId: org._id,
      version: 1,
      examMetadata: {
        title: exam.title,
        description: 'Comprehensive Exam Snapshot',
        subject: exam.subject,
        category: 'Science',
        instructions: exam.instructions,
        durationMinutes: 60,
        totalMarks: 11,
        passingMarks: 6,
        settings: {},
      },
      totalQuestions: 4,
      totalMarks: 11,
      sections: [
        {
          sectionId: 'sec-1',
          title: 'Section 1: Objective',
          order: 0,
          sectionMarks: 6,
          questions: [
            {
              questionId: qSingle._id,
              questionType: qSingle.questionType,
              statement: qSingle.statement,
              subject: qSingle.subject,
              topic: qSingle.topic,
              difficulty: qSingle.difficulty,
              marks: 2,
              options: qSingle.options,
            },
            {
              questionId: qMulti._id,
              questionType: qMulti.questionType,
              statement: qMulti.statement,
              subject: qMulti.subject,
              topic: qMulti.topic,
              difficulty: qMulti.difficulty,
              marks: 3,
              options: qMulti.options,
            },
            {
              questionId: qTF._id,
              questionType: qTF.questionType,
              statement: qTF.statement,
              subject: qTF.subject,
              topic: qTF.topic,
              difficulty: qTF.difficulty,
              marks: 1,
              options: qTF.options,
            },
          ],
        },
        {
          sectionId: 'sec-2',
          title: 'Section 2: Descriptive',
          order: 1,
          sectionMarks: 5,
          questions: [
            {
              questionId: qDesc._id,
              questionType: qDesc.questionType,
              statement: qDesc.statement,
              subject: qDesc.subject,
              topic: qDesc.topic,
              difficulty: qDesc.difficulty,
              marks: 5,
              options: [],
            },
          ],
        },
      ],
      publishedBy: admin._id,
    });

    exam.publishedVersionId = snapshot._id;
    await exam.save();

    // 4. Create Schedule & Acknowledge for Alice
    const schedStart = new Date(Date.now() - 60000); // Started 1 min ago
    const schedEnd = new Date(Date.now() + 7200000); // Closes in 2 hours

    const schedule = await ExamSchedule.create({
      organizationId: org._id,
      examId: exam._id,
      examSnapshotId: snapshot._id,
      title: 'Phase6 Midterm Assessment Slot',
      startTime: schedStart,
      endTime: schedEnd,
      durationMinutes: 45, // 45 minute exam duration
      maxAttempts: 1,
      eligibilityType: 'ALL_CANDIDATES',
      createdBy: admin._id,
    });

    // Alice acknowledges exam
    await ScheduleCandidate.create({
      organizationId: org._id,
      scheduleId: schedule._id,
      candidateId: alice._id,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    });

    console.log('\n--- Test Group 1: Attempt Creation & Concurrency Safety ---');

    // 1.1 Start Attempt for Alice
    const startResult = await startOrResumeAttempt(alice._id, schedule._id);
    assert(startResult.isResumed === false, 'Alice successfully creates a new IN_PROGRESS attempt');
    const attemptAlice = startResult.attempt;
    assert(attemptAlice.status === 'IN_PROGRESS', 'Attempt status is initialized as IN_PROGRESS');
    assert(attemptAlice.attemptNumber === 1, 'Attempt number is recorded as 1');
    assert(
      attemptAlice.maximumMarks === 11,
      'Maximum marks recorded from snapshot matches totalMarks (11)'
    );

    // 1.2 Concurrency safety: Immediate duplicate start returns existing attempt
    const dupStart = await startOrResumeAttempt(alice._id, schedule._id);
    assert(dupStart.isResumed === true, 'Duplicate start request safely resumes existing attempt');
    assert(
      dupStart.attempt._id.toString() === attemptAlice._id.toString(),
      'Duplicate request returns exact same attempt ID'
    );

    // 1.3 Concurrency partial-index guarantee: attempting direct database insert of second IN_PROGRESS attempt fails
    let dupIndexFailed = false;
    try {
      await ExamAttempt.create({
        organizationId: org._id,
        scheduleId: schedule._id,
        candidateId: alice._id,
        examId: exam._id,
        examSnapshotId: snapshot._id,
        scheduleCandidateId: attemptAlice.scheduleCandidateId,
        attemptNumber: 2,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        startedAt: new Date(),
        endsAt: attemptAlice.endsAt,
        maximumMarks: 11,
      });
    } catch (err) {
      dupIndexFailed = err.code === 11000;
    }
    assert(
      dupIndexFailed,
      'Unique partial index strictly blocks concurrent duplicate IN_PROGRESS attempts'
    );

    console.log('\n--- Test Group 2: Server-Authoritative Timer & Bounds ---');

    // 2.1 Calculated endsAt must be min(now + duration, schedule.endTime)
    const expectedEndMs = attemptAlice.startedAt.getTime() + 45 * 60 * 1000;
    assert(
      Math.abs(attemptAlice.endsAt.getTime() - expectedEndMs) < 2000,
      'Server-calculated endsAt reflects duration (45 mins from start)'
    );

    // 2.2 Schedule capping: If schedule closes in 20 mins, endsAt must be capped at schedule.endTime
    const tightSchedule = await ExamSchedule.create({
      organizationId: org._id,
      examId: exam._id,
      examSnapshotId: snapshot._id,
      title: 'Phase6 Tight Schedule (Ends Soon)',
      startTime: new Date(Date.now() - 300000), // 5 min ago
      endTime: new Date(Date.now() + 600000), // Closes in 10 minutes!
      durationMinutes: 60, // 60 min duration cannot exceed 10 min window
      maxAttempts: 1,
      eligibilityType: 'ALL_CANDIDATES',
      createdBy: admin._id,
    });

    await ScheduleCandidate.create({
      organizationId: org._id,
      scheduleId: tightSchedule._id,
      candidateId: bob._id,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    });

    const bobStart = await startOrResumeAttempt(bob._id, tightSchedule._id);
    assert(
      bobStart.attempt.endsAt.getTime() === tightSchedule.endTime.getTime(),
      'Server caps endsAt at schedule.endTime when remaining window is less than exam duration'
    );

    console.log('\n--- Test Group 3: Question Delivery & Answer Key Confidentiality ---');

    // 3.1 Fetch questions for Alice's attempt
    const questionDelivery = await getSanitizedQuestionsForAttempt(attemptAlice._id, alice._id);
    assert(questionDelivery.sections.length === 2, 'Delivers all configured exam sections');
    assert(
      questionDelivery.sections[0].questions.length === 3,
      'Section 1 contains 3 objective questions'
    );
    assert(
      questionDelivery.sections[1].questions.length === 1,
      'Section 2 contains 1 descriptive question'
    );

    // 3.2 ZERO answer key leakage
    let foundIsCorrect = false;
    let foundGuidance = false;
    for (const sec of questionDelivery.sections) {
      for (const q of sec.questions) {
        if ('isCorrect' in q || 'correctAnswers' in q) foundIsCorrect = true;
        if ('evaluationGuidance' in q) foundGuidance = true;
        for (const opt of q.options) {
          if ('isCorrect' in opt) foundIsCorrect = true;
        }
      }
    }
    assert(
      !foundIsCorrect,
      'Answer key confidentiality: isCorrect is 100% stripped from all questions and options'
    );
    assert(
      !foundGuidance,
      'Faculty guidance confidentiality: evaluationGuidance is 100% stripped'
    );

    // 3.3 Candidate B cannot access Candidate A's attempt questions
    let crossCandidateBlocked = false;
    try {
      await getSanitizedQuestionsForAttempt(attemptAlice._id, bob._id);
    } catch (err) {
      crossCandidateBlocked = err.statusCode === 404;
    }
    assert(crossCandidateBlocked, 'Cross-candidate attempt access blocked with 404 Not Found');

    console.log('\n--- Test Group 4: Answer Autosave, Validation & Concurrency ---');

    // 4.1 MCQ_SINGLE: Save valid answer
    const ansSingle = await saveAnswerResponse(attemptAlice._id, qSingle._id, alice._id, {
      selectedOptions: ['opt-paris'],
    });
    assert(ansSingle.success === true, 'MCQ_SINGLE valid option saves successfully');
    assert(ansSingle.version === 1, 'Initial response version is 1');
    assert(ansSingle.isAnswered === true, 'Question marked as isAnswered: true');

    // 4.2 MCQ_SINGLE: Invalid option ID rejected
    let fakeOptRejected = false;
    try {
      await saveAnswerResponse(attemptAlice._id, qSingle._id, alice._id, {
        selectedOptions: ['opt-fake-mars'],
      });
    } catch (err) {
      fakeOptRejected = err.statusCode === 400;
    }
    assert(fakeOptRejected, 'Rejects fabricated option ID with 400 Bad Request');

    // 4.3 MCQ_SINGLE: Multiple options rejected
    let multiOptRejected = false;
    try {
      await saveAnswerResponse(attemptAlice._id, qSingle._id, alice._id, {
        selectedOptions: ['opt-paris', 'opt-lyon'],
      });
    } catch (err) {
      multiOptRejected = err.statusCode === 400;
    }
    assert(multiOptRejected, 'Rejects multiple selections for MCQ_SINGLE with 400 Bad Request');

    // 4.4 MCQ_MULTIPLE: Save multi-selection
    const ansMulti = await saveAnswerResponse(attemptAlice._id, qMulti._id, alice._id, {
      selectedOptions: ['opt-red', 'opt-blue'],
      isMarkedForReview: true,
    });
    assert(ansMulti.success === true, 'MCQ_MULTIPLE multi-selection saves successfully');
    assert(ansMulti.isMarkedForReview === true, 'isMarkedForReview flag preserved');

    // 4.5 TRUE_FALSE: Save True/False option
    const ansTF = await saveAnswerResponse(attemptAlice._id, qTF._id, alice._id, {
      selectedOptions: ['opt-true'],
    });
    assert(ansTF.success === true, 'TRUE_FALSE response saves successfully');

    // 4.6 DESCRIPTIVE: Save text answer
    const ansDesc = await saveAnswerResponse(attemptAlice._id, qDesc._id, alice._id, {
      textAnswer: 'A process is an executing program instance with isolated memory space.',
    });
    assert(ansDesc.success === true, 'DESCRIPTIVE text answer saves successfully');

    // 4.7 Optimistic Concurrency: Stale write rejection
    // Current version of qSingle response is 1. If client sends clientVersion: 0 (older), server rejects
    const staleAttempt = await saveAnswerResponse(attemptAlice._id, qSingle._id, alice._id, {
      selectedOptions: ['opt-nice'],
      clientVersion: 0, // Stale!
    });
    assert(staleAttempt.stale === true, 'Stale write rejected when client version < server version');

    // 4.8 Clear response (empty array)
    const clearResp = await saveAnswerResponse(attemptAlice._id, qTF._id, alice._id, {
      selectedOptions: [],
    });
    assert(clearResp.isAnswered === false, 'Clearing response sets isAnswered: false');

    console.log('\n--- Test Group 5: Attempt Recovery & State Persistence ---');

    // 5.1 Re-fetching questions recovers all saved answers and review flags
    const recoveredState = await getSanitizedQuestionsForAttempt(attemptAlice._id, alice._id);
    const savedSingle = recoveredState.responses[qSingle._id.toString()];
    assert(savedSingle != null, 'Saved response recovered from database');
    assert(
      savedSingle.selectedOptions[0] === 'opt-paris',
      'Recovered exact selected option opt-paris'
    );

    const savedMulti = recoveredState.responses[qMulti._id.toString()];
    assert(savedMulti.isMarkedForReview === true, 'Recovered isMarkedForReview: true');
    assert(savedMulti.selectedOptions.length === 2, 'Recovered multi-select array');

    const savedDesc = recoveredState.responses[qDesc._id.toString()];
    assert(
      savedDesc.textAnswer.includes('isolated memory space'),
      'Recovered full descriptive answer text'
    );

    console.log('\n--- Test Group 6: Timer Expiry Enforcement ---');

    // 6.1 Force attempt endsAt into the past
    attemptAlice.endsAt = new Date(Date.now() - 5000); // Expired 5s ago
    await attemptAlice.save();

    let saveAfterExpiryFailed = false;
    try {
      await saveAnswerResponse(attemptAlice._id, qSingle._id, alice._id, {
        selectedOptions: ['opt-lyon'],
      });
    } catch (err) {
      saveAfterExpiryFailed = err.statusCode === 403;
    }
    assert(saveAfterExpiryFailed, 'Rejects answer saves after endsAt with 403 Forbidden');

    // Verify attempt automatically transitioned to AUTO_SUBMITTED
    const postExpiryAttempt = await ExamAttempt.findById(attemptAlice._id);
    assert(
      postExpiryAttempt.status === 'AUTO_SUBMITTED',
      'Attempt status automatically transitions to AUTO_SUBMITTED on expiry'
    );
    assert(
      postExpiryAttempt.submissionReason === 'TIME_EXPIRED',
      'Submission reason recorded as TIME_EXPIRED'
    );

    console.log('\n--- Test Group 7: Submission Engine & Idempotency ---');

    // Create a fresh active attempt for Bob to test manual submission
    bobStart.attempt.endsAt = new Date(Date.now() + 3600000);
    bobStart.attempt.status = ATTEMPT_STATUS.IN_PROGRESS;
    await bobStart.attempt.save();

    await saveAnswerResponse(bobStart.attempt._id, qSingle._id, bob._id, {
      selectedOptions: ['opt-paris'],
    });

    // 7.1 Manual Submission
    const submitResult = await submitAttempt(bobStart.attempt._id, bob._id);
    assert(submitResult.isSubmitted === true, 'Manual submission succeeds');
    assert(submitResult.attempt.status === 'SUBMITTED', 'Status updated to SUBMITTED');
    assert(submitResult.attempt.submittedAt instanceof Date, 'Records submittedAt timestamp');
    assert(
      submitResult.attempt.submissionReason === 'MANUAL',
      'Submission reason recorded as MANUAL'
    );

    // 7.2 Idempotent duplicate submission
    const dupSubmit = await submitAttempt(bobStart.attempt._id, bob._id);
    assert(dupSubmit.isAlreadySubmitted === true, 'Duplicate submission safely returns confirmation');
    assert(dupSubmit.attempt.status === 'SUBMITTED', 'Status remains SUBMITTED');

    // 7.3 Reject modification after submission
    let saveAfterSubmitFailed = false;
    try {
      await saveAnswerResponse(bobStart.attempt._id, qSingle._id, bob._id, {
        selectedOptions: ['opt-nice'],
      });
    } catch (err) {
      saveAfterSubmitFailed = err.statusCode === 400;
    }
    assert(saveAfterSubmitFailed, 'Rejects answer modifications after submission with 400 Bad Request');

    console.log(`\n========================================`);
    console.log(`Phase 6 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    // Cleanup
    await Organization.deleteMany({ slug: /^phase6-test-/ });
    await User.deleteMany({ email: /^phase6-.*@test\.com$/ });
    await ExamSchedule.deleteMany({ title: /^Phase6 / });
    await ScheduleCandidate.deleteMany({});
    await ExamAttempt.deleteMany({});
    await AttemptResponse.deleteMany({});
    await ExamSnapshot.deleteMany({});
    await Exam.deleteMany({ title: /^Phase6 / });
    await Question.deleteMany({ statement: /^Phase6 / });

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runPhase6Tests();
