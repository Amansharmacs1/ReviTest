import mongoose from 'mongoose';
import {
  Organization,
  User,
  Exam,
  ExamSnapshot,
  ExamSchedule,
  ScheduleCandidate,
  ExamAttempt,
  AttemptResponse,
  ExamResult,
  RESULT_STATUS,
  ATTEMPT_STATUS,
} from './src/models/index.js';
import { startOrResumeAttempt } from './src/services/attempt.service.js';
import { evaluationService } from './src/services/evaluation.service.js';
import { ROLES } from './src/constants/roles.js';
import { env } from './src/config/environment.js';

const MONGO_URI = env.mongodbUri;

async function runPhase8Tests() {
  console.log('🧪 Starting Phase 8 Automated Evaluation, Results & Analytics Verification Suite...\n');

  await mongoose.connect(MONGO_URI);
  await ExamResult.syncIndexes();

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
    // Test Setup: Organization, Admin, 2 Candidates, Exam & Snapshot
    // -------------------------------------------------------------
    const org = await Organization.create({
      name: 'Evaluation Testing Institute',
      slug: `eval-test-${Date.now()}`,
      code: `EVL${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'COLLEGE_UNIVERSITY',
      contactEmail: `admin-${Date.now()}@eval-test.edu`,
      status: 'ACTIVE',
    });

    const adminUser = await User.create({
      organizationId: org._id,
      name: 'Evaluation Director',
      email: `admin-${Date.now()}@eval-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.ORG_ADMIN,
      status: 'ACTIVE',
    });

    const alice = await User.create({
      organizationId: org._id,
      name: 'Alice Scholar',
      email: `alice-${Date.now()}@eval-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.CANDIDATE,
      status: 'ACTIVE',
      profile: { studentId: 'ROLL-101', department: 'CS' },
    });

    const bob = await User.create({
      organizationId: org._id,
      name: 'Bob Candidate',
      email: `bob-${Date.now()}@eval-test.edu`,
      password: 'SecurePassword123!',
      role: ROLES.CANDIDATE,
      status: 'ACTIVE',
      profile: { studentId: 'ROLL-102', department: 'CS' },
    });

    const q1Id = new mongoose.Types.ObjectId();
    const q2Id = new mongoose.Types.ObjectId();
    const q3Id = new mongoose.Types.ObjectId();
    const q4Id = new mongoose.Types.ObjectId();
    const qDescId = new mongoose.Types.ObjectId();

    const snapshot = await ExamSnapshot.create({
      organizationId: org._id,
      examId: new mongoose.Types.ObjectId(),
      version: 1,
      examMetadata: {
        title: 'Computer Science Comprehensive Exam',
        subject: 'Computer Science',
        durationMinutes: 60,
        totalMarks: 20, // 4 + 4 + 4 + 4 + 4 = 20
        passingMarks: 10,
        settings: {
          allowNegativeMarking: true,
        },
      },
      sections: [
        {
          sectionId: 'sec-obj',
          title: 'Section A: Objective Questions',
          order: 1,
          sectionMarks: 16,
          questions: [
            // Q1: MCQ_SINGLE (Paris is correct)
            {
              questionId: q1Id,
              statement: 'Capital of France?',
              questionType: 'MCQ_SINGLE',
              subject: 'Computer Science',
              topic: 'General',
              difficulty: 'EASY',
              marks: 4,
              negativeMarks: 1,
              options: [
                { optionId: 'opt-paris', text: 'Paris', isCorrect: true },
                { optionId: 'opt-london', text: 'London', isCorrect: false },
              ],
            },
            // Q2: MCQ_MULTIPLE (HTTP and DNS are correct)
            {
              questionId: q2Id,
              statement: 'Application layer protocols?',
              questionType: 'MCQ_MULTIPLE',
              subject: 'Computer Science',
              topic: 'Networking',
              difficulty: 'MEDIUM',
              marks: 4,
              negativeMarks: 1,
              options: [
                { optionId: 'opt-http', text: 'HTTP', isCorrect: true },
                { optionId: 'opt-dns', text: 'DNS', isCorrect: true },
                { optionId: 'opt-ip', text: 'IP', isCorrect: false },
              ],
            },
            // Q3: TRUE_FALSE (True is correct)
            {
              questionId: q3Id,
              statement: 'TCP is connection-oriented.',
              questionType: 'TRUE_FALSE',
              subject: 'Computer Science',
              topic: 'Networking',
              difficulty: 'EASY',
              marks: 4,
              negativeMarks: 1,
              options: [
                { optionId: 'opt-true', text: 'True', isCorrect: true },
                { optionId: 'opt-false', text: 'False', isCorrect: false },
              ],
            },
            // Q4: MCQ_SINGLE (Alice will leave unanswered; Bob gets wrong)
            {
              questionId: q4Id,
              statement: 'Complexity of binary search?',
              questionType: 'MCQ_SINGLE',
              subject: 'Computer Science',
              topic: 'Algorithms',
              difficulty: 'MEDIUM',
              marks: 4,
              negativeMarks: 1,
              options: [
                { optionId: 'opt-logn', text: 'O(log n)', isCorrect: true },
                { optionId: 'opt-n', text: 'O(n)', isCorrect: false },
              ],
            },
          ],
        },
        {
          sectionId: 'sec-desc',
          title: 'Section B: Theory & Architecture',
          order: 2,
          sectionMarks: 4,
          questions: [
            // Q5: DESCRIPTIVE
            {
              questionId: qDescId,
              statement: 'Explain ACID properties in database management.',
              questionType: 'DESCRIPTIVE',
              subject: 'Computer Science',
              topic: 'Databases',
              difficulty: 'HARD',
              marks: 4,
              negativeMarks: 0,
              options: [],
            },
          ],
        },
      ],
      totalQuestions: 5,
      totalMarks: 20,
      publishedBy: adminUser._id,
    });

    const now = new Date();
    const schedule = await ExamSchedule.create({
      organizationId: org._id,
      examId: snapshot.examId,
      examSnapshotId: snapshot._id,
      title: 'Final Term Assessment 2026',
      startTime: new Date(now.getTime() - 10 * 60 * 1000),
      endTime: new Date(now.getTime() + 120 * 60 * 1000),
      durationMinutes: 60,
      status: 'ACTIVE',
      createdBy: adminUser._id,
    });

    await ScheduleCandidate.create([
      {
        organizationId: org._id,
        scheduleId: schedule._id,
        candidateId: alice._id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
      {
        organizationId: org._id,
        scheduleId: schedule._id,
        candidateId: bob._id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    ]);

    // -------------------------------------------------------------
    // Alice's Attempt & Responses
    // -------------------------------------------------------------
    const aliceStart = await startOrResumeAttempt(alice._id, schedule._id);
    const aliceAttempt = aliceStart.attempt;

    // Alice answers:
    // Q1: Correct ('opt-paris') -> +4
    // Q2: Correct (['opt-http', 'opt-dns']) -> +4
    // Q3: Correct ('True') -> +4
    // Q4: Unanswered -> 0
    // Q5: Descriptive ('Atomicity, Consistency, Isolation, Durability...') -> pending
    await AttemptResponse.create([
      {
        organizationId: org._id,
        attemptId: aliceAttempt._id,
        questionId: q1Id,
        candidateId: alice._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'MCQ_SINGLE',
        selectedOptions: ['opt-paris'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: aliceAttempt._id,
        questionId: q2Id,
        candidateId: alice._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'MCQ_MULTIPLE',
        selectedOptions: ['opt-http', 'opt-dns'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: aliceAttempt._id,
        questionId: q3Id,
        candidateId: alice._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'TRUE_FALSE',
        selectedOptions: ['True'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: aliceAttempt._id,
        questionId: qDescId,
        candidateId: alice._id,
        scheduleId: schedule._id,
        sectionId: 'sec-desc',
        questionType: 'DESCRIPTIVE',
        textAnswer: 'Atomicity, Consistency, Isolation, Durability ensure reliable transactions.',
        isAnswered: true,
      },
    ]);

    aliceAttempt.status = ATTEMPT_STATUS.SUBMITTED;
    aliceAttempt.submittedAt = new Date();
    await aliceAttempt.save();

    // -------------------------------------------------------------
    // Bob's Attempt & Responses
    // -------------------------------------------------------------
    const bobStart = await startOrResumeAttempt(bob._id, schedule._id);
    const bobAttempt = bobStart.attempt;

    // Bob answers:
    // Q1: Incorrect ('opt-london') -> -1 (negative marking)
    // Q2: Correct (['opt-http', 'opt-dns']) -> +4
    // Q3: Incorrect ('False') -> -1 (negative marking)
    // Q4: Incorrect ('opt-n') -> -1 (negative marking)
    // Net objective = 4 - 1 - 1 - 1 = 1 mark
    await AttemptResponse.create([
      {
        organizationId: org._id,
        attemptId: bobAttempt._id,
        questionId: q1Id,
        candidateId: bob._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'MCQ_SINGLE',
        selectedOptions: ['opt-london'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: bobAttempt._id,
        questionId: q2Id,
        candidateId: bob._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'MCQ_MULTIPLE',
        selectedOptions: ['opt-http', 'opt-dns'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: bobAttempt._id,
        questionId: q3Id,
        candidateId: bob._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'TRUE_FALSE',
        selectedOptions: ['False'],
        isAnswered: true,
      },
      {
        organizationId: org._id,
        attemptId: bobAttempt._id,
        questionId: q4Id,
        candidateId: bob._id,
        scheduleId: schedule._id,
        sectionId: 'sec-obj',
        questionType: 'MCQ_SINGLE',
        selectedOptions: ['opt-n'],
        isAnswered: true,
      },
    ]);

    bobAttempt.status = ATTEMPT_STATUS.SUBMITTED;
    bobAttempt.submittedAt = new Date();
    await bobAttempt.save();

    console.log('\n--- Test Group 1: Automated Objective Evaluation Engine ---');

    // Evaluate Alice
    const aliceResult = await evaluationService.evaluateAttempt(aliceAttempt._id);
    assert(aliceResult !== null, 'Alice attempt evaluated successfully');
    assert(aliceResult.totalMarksObtained === 12, 'Alice scored exactly 12 objective marks (4 + 4 + 4 + 0)');
    assert(aliceResult.totalCorrect === 3, 'Alice has 3 correct objective answers');
    assert(aliceResult.totalUnanswered === 1, 'Alice has 1 unanswered objective question (Q4)');
    assert(aliceResult.status === RESULT_STATUS.PENDING_MANUAL_GRADING, 'Alice status is PENDING_MANUAL_GRADING due to descriptive Q5');
    assert(aliceResult.isPassed === true, 'Alice is marked isPassed: true (12 >= passingMarks 10)');

    // Evaluate Bob
    const bobResult = await evaluationService.evaluateAttempt(bobAttempt._id);
    assert(bobResult !== null, 'Bob attempt evaluated successfully');
    assert(bobResult.totalMarksObtained === 1, 'Bob scored exactly 1 mark after negative deductions (+4 - 1 - 1 - 1 = 1)');
    assert(bobResult.totalIncorrect === 3, 'Bob has 3 incorrect answers');
    assert(bobResult.isPassed === false, 'Bob is marked isPassed: false (1 < passingMarks 10)');
    assert(bobResult.status === RESULT_STATUS.COMPLETED, 'Bob status is COMPLETED (no descriptive questions attempted)');

    console.log('\n--- Test Group 2: Manual Grading of Descriptive Answers ---');

    // Faculty grades Alice's descriptive answer with 4 out of 4 marks
    const gradedAlice = await evaluationService.gradeDescriptiveQuestion(
      aliceAttempt._id,
      qDescId,
      { marksAwarded: 4, feedback: 'Excellent explanation of ACID properties!' },
      adminUser
    );

    assert(gradedAlice.totalMarksObtained === 16, 'Alice total marks updated to 16 after manual grading (12 + 4)');
    assert(gradedAlice.percentage === 80, 'Alice percentage calculated as 80.00% (16 / 20)');
    assert(gradedAlice.status === RESULT_STATUS.COMPLETED, 'Alice status transitioned to COMPLETED after grading');

    console.log('\n--- Test Group 3: Cohort Ranking & Percentiles ---');

    // Run batch evaluation and ranking
    const batchRes = await evaluationService.batchEvaluateSchedule(schedule._id, adminUser);
    assert(batchRes.evaluatedCount === 2, 'Batch evaluated 2 candidates');

    // Verify ranks
    const aliceRanked = await ExamResult.findOne({ attemptId: aliceAttempt._id });
    const bobRanked = await ExamResult.findOne({ attemptId: bobAttempt._id });

    assert(aliceRanked.rank === 1, 'Alice ranked #1 in cohort');
    assert(aliceRanked.percentile === 100, 'Alice scored 100th percentile (highest)');
    assert(bobRanked.rank === 2, 'Bob ranked #2 in cohort');
    assert(bobRanked.percentile === 0, 'Bob scored 0th percentile (lowest)');

    console.log('\n--- Test Group 4: Results Publishing ---');

    const pubRes = await evaluationService.publishScheduleResults(schedule._id, adminUser);
    assert(pubRes.publishedCount === 2, 'Published results for 2 examinees');

    const pubCheck = await ExamResult.find({ scheduleId: schedule._id });
    assert(pubCheck.every((r) => r.status === RESULT_STATUS.PUBLISHED), 'All results transitioned to PUBLISHED status');
    assert(pubCheck.every((r) => r.publishedAt !== null), 'publishedAt timestamps recorded');

    console.log('\n--- Test Group 5: Cohort Analytics & Question Performance ---');

    const analytics = await evaluationService.getScheduleAnalytics(schedule._id, adminUser);
    assert(analytics.summary.totalEvaluated === 2, 'Analytics summary reports totalEvaluated: 2');
    assert(analytics.summary.averageScore === 8.5, 'Analytics summary reports averageScore: 8.5 ((16 + 1)/2)');
    assert(analytics.summary.highestScore === 16, 'Highest score is 16');
    assert(analytics.summary.lowestScore === 1, 'Lowest score is 1');
    assert(analytics.summary.passPercentage === 50, 'Pass percentage is 50.00% (1 passed out of 2)');
    assert(analytics.questionAnalytics.length === 5, 'Question analytics calculated for all 5 questions');

    // Check accuracy of Q2 (both got it right -> 100%)
    const q2Analytics = analytics.questionAnalytics.find((q) => q.questionId === q2Id.toString());
    assert(q2Analytics.accuracyRate === 100, 'Q2 has 100% cohort accuracy');

    // Check accuracy of Q4 (Alice unanswered, Bob wrong -> 0%)
    const q4Analytics = analytics.questionAnalytics.find((q) => q.questionId === q4Id.toString());
    assert(q4Analytics.accuracyRate === 0, 'Q4 has 0% cohort accuracy');

    console.log('\n--- Test Group 6: Leaderboard & Scorecard Access ---');

    // Leaderboard
    const lb = await evaluationService.getScheduleLeaderboard(schedule._id, adminUser);
    assert(lb.leaderboard.length === 2, 'Leaderboard returned 2 ranked examinees');
    assert(lb.leaderboard[0].name === 'Alice Scholar', 'Leaderboard position 1 is Alice Scholar');
    assert(lb.leaderboard[1].name === 'Bob Candidate', 'Leaderboard position 2 is Bob Candidate');

    // Alice scorecard
    const aliceScorecard = await evaluationService.getCandidateResult(aliceAttempt._id, alice);
    assert(aliceScorecard.totalMarksObtained === 16, 'Alice scorecard displays correct marks (16)');
    assert(aliceScorecard.rank === 1, 'Alice scorecard displays Rank 1');
    assert(aliceScorecard.questionEvaluations.length === 5, 'Scorecard includes question statements and options');

    // Bob blocked from viewing Alice scorecard
    let crossScorecardBlocked = false;
    try {
      await evaluationService.getCandidateResult(aliceAttempt._id, bob);
    } catch (err) {
      crossScorecardBlocked = err.statusCode === 403;
    }
    assert(crossScorecardBlocked, 'Bob blocked from viewing Alice scorecard (403 Forbidden)');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await ExamResult.deleteMany({ scheduleId: schedule._id });
    await AttemptResponse.deleteMany({ scheduleId: schedule._id });
    await ExamAttempt.deleteMany({ scheduleId: schedule._id });
    await ScheduleCandidate.deleteMany({ scheduleId: schedule._id });
    await ExamSchedule.deleteMany({ _id: schedule._id });
    await ExamSnapshot.deleteMany({ _id: snapshot._id });
    await User.deleteMany({ _id: { $in: [adminUser._id, alice._id, bob._id] } });
    await Organization.deleteMany({ _id: org._id });
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n========================================');
  console.log(`Phase 8 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runPhase8Tests();
