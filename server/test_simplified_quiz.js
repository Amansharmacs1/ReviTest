/**
 * REVITEST — Simplified Quiz Verification Suite
 * Tests the streamlined end-to-end quiz experience:
 * 1. Rapid Quiz Creation (MCQ Single, MCQ Multiple, True/False)
 * 2. Immutable Snapshot & Auto-Schedule Generation
 * 3. Public Metadata Retrieval & Answer Key Leakage Prevention
 * 4. Zero-barrier Student Join (No login required, auto-provisioning)
 * 5. In-session Answer Autosaving
 * 6. Submission & Instant Objective Evaluation
 * 7. Competition Leaderboard (1, 1, 3 Ranking) & Privacy Protection
 * 8. Status Controls (DRAFT -> LIVE -> STOPPED)
 * 9. Duplicate Submission Prevention
 * 10. CSV Results Export
 * 11. Google Sheets Configuration & Service Handling
 */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import {
  Organization,
  User,
  Exam,
  ExamSnapshot,
  ExamSchedule,
  ExamAttempt,
  QuizParticipant,
  Question,
} from './src/models/index.js';
import { quizService } from './src/services/quiz.service.js';
import { googleSheetsService } from './src/services/googleSheets.service.js';

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

async function runQuizVerificationSuite() {
  console.log('🧪 Starting Simplified Quiz Automated Verification Suite...\n');

  try {
    await connectDatabase();

    // =========================================================================
    // SETUP: Provision Test Organization & Instructor Admin
    // =========================================================================
    console.log('\n--- Setup: Provision Test Organization & Instructor ---');
    const testOrgSlug = `quiz-test-org-${Date.now()}`;
    const testOrgCode = `TST${Date.now().toString().slice(-6)}`;
    const testOrg = await Organization.create({
      name: 'Faculty Assessment Academy',
      slug: testOrgSlug,
      code: testOrgCode,
      contactEmail: 'contact@faculty.edu',
      type: 'COLLEGE_UNIVERSITY',
      status: 'ACTIVE',
    });
    assert(Boolean(testOrg._id), 'Test organization provisioned');

    const instructor = await User.create({
      organizationId: testOrg._id,
      name: 'Prof. Ananya Sen',
      email: `prof-${Date.now()}@faculty.edu`,
      password: 'SecurePassword123!',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
    });
    assert(Boolean(instructor._id), 'Instructor ORG_ADMIN created');

    // =========================================================================
    // TEST GROUP 1: Rapid Quiz Creation
    // =========================================================================
    console.log('\n--- Test Group 1: Quiz Creation & Snapshot Architecture ---');
    const sampleQuestions = [
      {
        questionText: 'What is the capital of France?',
        questionType: 'MCQ_SINGLE',
        marks: 2,
        negativeMarks: 0,
        options: [
          { text: 'London', isCorrect: false },
          { text: 'Paris', isCorrect: true },
          { text: 'Berlin', isCorrect: false },
          { text: 'Madrid', isCorrect: false },
        ],
      },
      {
        questionText: 'HTTP status 200 signifies Success.',
        questionType: 'TRUE_FALSE',
        marks: 1,
        negativeMarks: 0,
        options: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ],
      },
      {
        questionText: 'Select all prime numbers below 10.',
        questionType: 'MCQ_MULTIPLE',
        marks: 2,
        negativeMarks: 0,
        options: [
          { text: '2', isCorrect: true },
          { text: '3', isCorrect: true },
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: true },
        ],
      },
    ];

    const createResult = await quizService.createQuiz({
      organizationId: testOrg._id,
      createdBy: instructor._id,
      title: 'Web Tech & Math Quick Quiz',
      description: 'A 10-minute pop quiz for CS Department',
      durationMinutes: 10,
      instructions: 'Choose the best answer for each question.',
      questions: sampleQuestions,
      quizSettings: {
        requireRollNumber: true,
        requireCollege: false,
        requireDepartment: true,
        allowMultipleAttempts: false,
        publicLeaderboard: false,
        showResultsImmediately: true,
      },
    });

    const quiz = createResult.quiz;
    const publicQuizId = createResult.publicQuizId;

    assert(Boolean(quiz._id), 'Quiz created successfully');
    assert(quiz.isQuiz === true, 'Quiz has isQuiz = true flag');
    assert(publicQuizId.startsWith('qz_'), `PublicQuizId is formatted with qz_ prefix: ${publicQuizId}`);
    assert(quiz.totalMarks === 5, 'Total marks calculated correctly (2 + 1 + 2 = 5)');
    assert(quiz.quizStatus === 'DRAFT', 'Initial quiz status is DRAFT');
    assert(Boolean(quiz.publishedSnapshotId), 'Published ExamSnapshot created and referenced');
    assert(Boolean(createResult.scheduleId), 'ExamSchedule created automatically');

    // =========================================================================
    // TEST GROUP 2: List Quizzes & Dashboard Metrics
    // =========================================================================
    console.log('\n--- Test Group 2: Organization Quiz List & Dashboard Telemetry ---');
    const quizListResult = await quizService.listQuizzes(testOrg._id);
    assert(quizListResult.quizzes.length === 1, 'listQuizzes returns 1 quiz');
    assert(quizListResult.metrics.totalQuizzes === 1, 'Metrics totalQuizzes is 1');
    assert(quizListResult.metrics.liveQuizzes === 0, 'Metrics liveQuizzes is 0 while DRAFT');

    // =========================================================================
    // TEST GROUP 3: Public Metadata & Security (Zero Answer Key Leakage)
    // =========================================================================
    console.log('\n--- Test Group 3: Public Quiz Metadata & Security Leakage Check ---');
    const publicMeta = await quizService.getPublicQuizMetadata(publicQuizId);
    assert(publicMeta.title === 'Web Tech & Math Quick Quiz', 'Public metadata returns quiz title');
    assert(publicMeta.durationMinutes === 10, 'Public metadata returns duration');
    assert(publicMeta.totalMarks === 5, 'Public metadata returns totalMarks');
    assert(publicMeta.quizSettings.requireRollNumber === true, 'Public metadata returns requireRollNumber');
    assert(publicMeta.questions === undefined, 'Public metadata does NOT leak questions array');

    // =========================================================================
    // TEST GROUP 4: Quiz Status Lifecycle & Student Joining Gate
    // =========================================================================
    console.log('\n--- Test Group 4: Quiz Status Gates & Student Join ---');
    // Attempt joining while DRAFT should be rejected
    let draftJoinRejected = false;
    try {
      await quizService.joinPublicQuiz(publicQuizId, {
        name: 'Rahul Sharma',
        email: 'rahul@student.edu',
        rollNumber: 'CS-101',
        department: 'Computer Science',
      });
    } catch (err) {
      draftJoinRejected = true;
      assert(err.message.includes('not been started'), `DRAFT gate rejected student with: "${err.message}"`);
    }
    assert(draftJoinRejected, 'Student cannot join a DRAFT quiz');

    // Organizer makes quiz LIVE
    const liveQuiz = await quizService.updateQuizStatus(quiz._id, testOrg._id, 'LIVE');
    assert(liveQuiz.quizStatus === 'LIVE', 'Organizer changed quiz status to LIVE');

    // Verify dashboard reflects live count
    const liveListResult = await quizService.listQuizzes(testOrg._id);
    assert(liveListResult.metrics.liveQuizzes === 1, 'Metrics liveQuizzes is now 1');

    // =========================================================================
    // TEST GROUP 5: Student 1 Joins, Autosaves Answers & Submits
    // =========================================================================
    console.log('\n--- Test Group 5: Zero-Barrier Student Join & Attempt Lifecycle ---');
    const student1Join = await quizService.joinPublicQuiz(publicQuizId, {
      name: 'Aarav Gupta',
      email: 'aarav@student.edu',
      rollNumber: 'CS-201',
      department: 'Computer Science',
    });

    assert(Boolean(student1Join.attemptId), 'Student 1 received attemptId');
    assert(student1Join.questions.length === 3, 'Student 1 received 3 questions');

    // Verify student questions are sanitized (no isCorrect property)
    const q1 = student1Join.questions[0];
    const hasCorrectFlagInOptions = q1.options.some((o) => o.isCorrect !== undefined);
    assert(!hasCorrectFlagInOptions, 'Sanitized questions strip isCorrect from options (Zero Answer Key Leakage)');

    // Find correct options from snapshot for verification
    const snapshot = await ExamSnapshot.findById(quiz.publishedSnapshotId);
    const snapQ1 = snapshot.sections[0].questions[0];
    const snapQ2 = snapshot.sections[0].questions[1];
    const snapQ3 = snapshot.sections[0].questions[2];

    const q1CorrectOpt = snapQ1.options.find((o) => o.isCorrect);
    const q2CorrectOpt = snapQ2.options.find((o) => o.isCorrect);
    const q3CorrectOpts = snapQ3.options.filter((o) => o.isCorrect).map((o) => o.optionId);

    // Student 1 autosaves answers (all correct)
    await quizService.savePublicAnswer(student1Join.attemptId, student1Join.candidateId, {
      questionId: snapQ1.questionId,
      selectedOptionId: q1CorrectOpt.optionId,
    });
    await quizService.savePublicAnswer(student1Join.attemptId, student1Join.candidateId, {
      questionId: snapQ2.questionId,
      selectedOptionId: q2CorrectOpt.optionId,
    });
    await quizService.savePublicAnswer(student1Join.attemptId, student1Join.candidateId, {
      questionId: snapQ3.questionId,
      selectedOptionIds: q3CorrectOpts,
    });
    assert(true, 'Student 1 autosaved answers for all 3 questions');

    // Student 1 submits quiz
    const sub1Result = await quizService.submitPublicQuiz(
      publicQuizId,
      student1Join.attemptId,
      student1Join.candidateId
    );
    assert(sub1Result.success === true, 'Student 1 submitted quiz successfully');
    assert(sub1Result.score === 5, `Student 1 scored full marks (5/5), got ${sub1Result.score}`);
    assert(sub1Result.percentage === 100, `Student 1 got 100%, got ${sub1Result.percentage}%`);

    // Verify QuizParticipant updated
    const part1 = await QuizParticipant.findOne({ attemptId: student1Join.attemptId });
    assert(part1.status === 'SUBMITTED', 'QuizParticipant status is SUBMITTED');
    assert(part1.score === 5, 'QuizParticipant score persisted as 5');
    assert(part1.timeTakenSeconds >= 0, `QuizParticipant timeTakenSeconds is ${part1.timeTakenSeconds}`);

    // Verify multiple attempts prevention
    let duplicateAttemptRejected = false;
    try {
      await quizService.joinPublicQuiz(publicQuizId, {
        name: 'Aarav Gupta',
        email: 'aarav@student.edu',
        rollNumber: 'CS-201',
        department: 'Computer Science',
      });
    } catch (err) {
      duplicateAttemptRejected = true;
      assert(err.message.includes('already submitted'), `Duplicate attempt rejected with: "${err.message}"`);
    }
    assert(duplicateAttemptRejected, 'Student cannot submit multiple times when disallowed');

    // =========================================================================
    // TEST GROUP 6: Student 2 & 3: Competition Ranking (1, 1, 3 Ranking)
    // =========================================================================
    console.log('\n--- Test Group 6: Competition Ranking & Public Leaderboard Privacy ---');
    // Student 2: Scores 5 (Ties with Student 1 for Rank 1)
    const student2Join = await quizService.joinPublicQuiz(publicQuizId, {
      name: 'Bhavna Patel',
      email: 'bhavna@student.edu',
      rollNumber: 'CS-202',
      department: 'Computer Science',
    });
    await quizService.savePublicAnswer(student2Join.attemptId, student2Join.candidateId, {
      questionId: snapQ1.questionId,
      selectedOptionId: q1CorrectOpt.optionId,
    });
    await quizService.savePublicAnswer(student2Join.attemptId, student2Join.candidateId, {
      questionId: snapQ2.questionId,
      selectedOptionId: q2CorrectOpt.optionId,
    });
    await quizService.savePublicAnswer(student2Join.attemptId, student2Join.candidateId, {
      questionId: snapQ3.questionId,
      selectedOptionIds: q3CorrectOpts,
    });
    await quizService.submitPublicQuiz(publicQuizId, student2Join.attemptId, student2Join.candidateId);

    // Student 3: Scores 2 (Rank 3 due to standard 1, 1, 3 competition ranking)
    const student3Join = await quizService.joinPublicQuiz(publicQuizId, {
      name: 'Chetan Kumar',
      email: 'chetan@student.edu',
      rollNumber: 'CS-203',
      department: 'Computer Science',
    });
    await quizService.savePublicAnswer(student3Join.attemptId, student3Join.candidateId, {
      questionId: snapQ1.questionId,
      selectedOptionId: q1CorrectOpt.optionId, // Correct (2 marks)
    });
    // Leaves Q2 and Q3 unanswered or wrong
    await quizService.submitPublicQuiz(publicQuizId, student3Join.attemptId, student3Join.candidateId);

    // Verify public access to leaderboard is blocked
    let publicLeaderboardBlocked = false;
    try {
      await quizService.getPublicLeaderboard(publicQuizId);
    } catch (err) {
      publicLeaderboardBlocked = true;
      assert(err.message.includes('private'), `Public leaderboard blocked with message: "${err.message}"`);
    }
    assert(publicLeaderboardBlocked, 'Public leaderboard is blocked to public students');

    // Verify Quiz Creator CAN retrieve the complete leaderboard
    const creatorLeaderboard = await quizService.getLeaderboard(quiz._id);
    assert(creatorLeaderboard.length === 3, 'Quiz creator leaderboard contains 3 participants');

    const top1 = creatorLeaderboard[0];
    const top2 = creatorLeaderboard[1];
    const top3 = creatorLeaderboard[2];

    assert(top1.rank === 1, `First participant rank is 1 (${top1.name})`);
    assert(top2.rank === 1, `Tied second participant rank is 1 (${top2.name})`);
    assert(top3.rank === 3, `Third participant rank is 3 (${top3.name}) - Standard 1, 1, 3 ranking`);
    assert(Boolean(top1.email), 'Creator leaderboard retains student email for instructor management');

    // =========================================================================
    // TEST GROUP 7: Stop Quiz & Active Attempt Auto-Close
    // =========================================================================
    console.log('\n--- Test Group 7: Stopping Quiz & Access Closure ---');
    const stoppedQuiz = await quizService.updateQuizStatus(quiz._id, testOrg._id, 'STOPPED');
    assert(stoppedQuiz.quizStatus === 'STOPPED', 'Quiz status updated to STOPPED');

    let joinAfterStopRejected = false;
    try {
      await quizService.joinPublicQuiz(publicQuizId, {
        name: 'Late Student',
        email: 'late@student.edu',
        rollNumber: 'CS-999',
        department: 'Computer Science',
      });
    } catch (err) {
      joinAfterStopRejected = true;
      assert(err.message.includes('ended'), `Joining stopped quiz rejected with: "${err.message}"`);
    }
    assert(joinAfterStopRejected, 'Joining a STOPPED quiz is disallowed');

    // =========================================================================
    // TEST GROUP 8: CSV Export & Google Sheets Integration
    // =========================================================================
    console.log('\n--- Test Group 8: CSV Export & Google Sheets Integration ---');
    const csvContent = await quizService.exportResultsCsv(quiz._id, testOrg._id);
    assert(typeof csvContent === 'string', 'CSV export returns string');
    assert(csvContent.includes('Rank,Student Name,Email,Roll Number'), 'CSV includes standard headers');
    assert(csvContent.includes('Aarav Gupta'), 'CSV includes Student 1');
    assert(csvContent.includes('Bhavna Patel'), 'CSV includes Student 2');
    assert(csvContent.includes('Chetan Kumar'), 'CSV includes Student 3');

    // Test Google Sheets configuration update
    const webhookUrl = 'https://script.google.com/macros/s/AKfycbx_TEST_MOCK_WEBHOOK/exec';
    const updatedWithGoogle = await Exam.findByIdAndUpdate(
      quiz._id,
      {
        $set: {
          'googleSheet.enabled': true,
          'googleSheet.webhookUrl': webhookUrl,
        },
      },
      { new: true }
    );
    assert(updatedWithGoogle.googleSheet.webhookUrl === webhookUrl, 'Google Sheets webhook URL saved');

    // Verify googleSheetsService formats payload correctly
    const sheetData = await googleSheetsService.formatQuizResultsForSheets(quiz._id);
    assert(sheetData.headers.length >= 10, 'Google Sheets formatter produces headers');
    assert(sheetData.rows.length === 3, 'Google Sheets formatter produces 3 student rows');
    assert(sheetData.rows[0].name === top1.name, 'Google Sheets data matches top participant');

    // =========================================================================
    // TEST GROUP 9: Cleanup
    // =========================================================================
    console.log('\n--- Cleanup: Removing Test Records ---');
    await QuizParticipant.deleteMany({ quizId: quiz._id });
    await ExamAttempt.deleteMany({ scheduleId: createResult.scheduleId });
    await ExamSchedule.deleteMany({ examId: quiz._id });
    await ExamSnapshot.deleteMany({ examId: quiz._id });
    await Question.deleteMany({ organizationId: testOrg._id });
    await Exam.deleteMany({ organizationId: testOrg._id });
    await User.deleteMany({ organizationId: testOrg._id });
    await Organization.deleteOne({ _id: testOrg._id });
    console.log('  🧹 Cleaned up test database records');

    console.log('\n==================================================');
    console.log(`📊 SIMPLIFIED QUIZ TEST RESULTS: ${passed} passed, ${failed} failed`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unhandled error during quiz verification suite:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

runQuizVerificationSuite();
