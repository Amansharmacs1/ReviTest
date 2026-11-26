import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  Exam,
  ExamSnapshot,
  ExamSchedule,
  ScheduleCandidate,
  ExamAttempt,
  QuizParticipant,
  Question,
  User,
  Organization,
} from '../models/index.js';
import {
  startOrResumeAttempt,
  getSanitizedQuestionsForAttempt,
  saveAnswerResponse,
  submitAttempt,
} from './attempt.service.js';
import { evaluationService } from './evaluation.service.js';
import { googleSheetsService } from './googleSheets.service.js';
import { logger } from '../utils/logger.js';

export const quizService = {
  /**
   * Create a simplified Quiz
   */
  async createQuiz({
    organizationId,
    createdBy,
    title,
    description = '',
    durationMinutes = 15,
    instructions = '',
    questions = [],
    quizSettings = {},
  }) {
    if (!title || !title.trim()) {
      throw new Error('Quiz title is required');
    }
    if (!questions || questions.length === 0) {
      throw new Error('Please add at least one question to the quiz');
    }

    // 1. Generate unique unguessable public quiz ID
    const publicQuizId = `qz_${crypto.randomBytes(8).toString('hex')}`;

    // 2. Persist questions in Question collection
    const createdQuestionRefs = [];
    const snapshotQuestionItems = [];
    let calculatedTotalMarks = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qMarks = Number(q.marks) || 1;
      const qNegMarks = Number(q.negativeMarks) || 0;
      calculatedTotalMarks += qMarks;

      const questionType = q.questionType || (q.options?.length ? 'MCQ_SINGLE' : 'TRUE_FALSE');

      // Normalize options
      const options = (q.options || []).map((opt, optIdx) => ({
        optionId: opt.optionId || `opt_${optIdx + 1}`,
        text: opt.text || String(opt),
        isCorrect: Boolean(opt.isCorrect),
      }));

      const newQ = await Question.create({
        organizationId,
        questionType,
        statement: q.questionText || q.statement,
        options,
        subject: q.subject || 'General Quiz',
        topic: q.topic || 'Quiz Topic',
        subtopic: q.subtopic || '',
        difficulty: q.difficulty || 'MEDIUM',
        marks: qMarks,
        negativeMarks: qNegMarks,
        explanation: q.explanation || '',
        createdBy,
      });

      createdQuestionRefs.push({
        questionId: newQ._id,
        order: i + 1,
        marks: qMarks,
        negativeMarks: qNegMarks,
      });

      snapshotQuestionItems.push({
        questionId: newQ._id,
        order: i + 1,
        questionType,
        statement: newQ.statement,
        options,
        subject: newQ.subject,
        topic: newQ.topic,
        subtopic: newQ.subtopic || '',
        difficulty: newQ.difficulty,
        marks: qMarks,
        negativeMarks: qNegMarks,
        explanation: newQ.explanation || '',
      });
    }

    // 3. Create the Exam document with Quiz metadata
    const singleSection = {
      sectionId: `sec_${new mongoose.Types.ObjectId().toString()}`,
      title: 'Questions',
      description: 'Quiz Questions',
      order: 1,
      questions: createdQuestionRefs,
      sectionMarks: calculatedTotalMarks,
    };

    const exam = await Exam.create({
      organizationId,
      title: title.trim(),
      description: description.trim(),
      subject: 'General Quiz',
      category: 'Quiz',
      instructions: instructions.trim(),
      durationMinutes: Number(durationMinutes) || 15,
      totalMarks: calculatedTotalMarks,
      passingMarks: 0,
      sections: [singleSection],
      isQuiz: true,
      publicQuizId,
      quizStatus: 'DRAFT',
      quizSettings: {
        requireCollege: Boolean(quizSettings.requireCollege),
        requireRollNumber: Boolean(quizSettings.requireRollNumber),
        requireDepartment: Boolean(quizSettings.requireDepartment),
        allowMultipleAttempts: Boolean(quizSettings.allowMultipleAttempts),
        publicLeaderboard: quizSettings.publicLeaderboard !== false,
        showResultsImmediately: quizSettings.showResultsImmediately !== false,
      },
      createdBy,
    });

    // 4. Create sealed ExamSnapshot
    const snapshotSection = {
      sectionId: singleSection.sectionId,
      title: 'Questions',
      order: 1,
      sectionMarks: calculatedTotalMarks,
      questions: snapshotQuestionItems,
    };

    const snapshot = await ExamSnapshot.create({
      organizationId,
      examId: exam._id,
      version: 1,
      examMetadata: {
        title: exam.title,
        description: exam.description || '',
        subject: exam.subject || 'General Quiz',
        category: exam.category || 'Quiz',
        instructions: exam.instructions || '',
        durationMinutes: exam.durationMinutes,
        totalMarks: calculatedTotalMarks,
        passingMarks: 0,
        settings: exam.quizSettings || {},
      },
      sections: [snapshotSection],
      totalQuestions: snapshotQuestionItems.length,
      totalMarks: calculatedTotalMarks,
      publishedBy: createdBy,
      publishedAt: new Date(),
    });

    exam.publishedSnapshotId = snapshot._id;
    exam.currentPublishedVersion = 1;
    exam.status = 'PUBLISHED';
    await exam.save();

    // 5. Create associated ExamSchedule for student attempts
    const schedule = await ExamSchedule.create({
      organizationId,
      examId: exam._id,
      examSnapshotId: snapshot._id,
      title: `${exam.title} (Live Quiz Slot)`,
      startTime: new Date(Date.now() - 1000),
      endTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Open window; access governed by quizStatus
      durationMinutes: Number(durationMinutes) || 15,
      lateEntryGraceMinutes: 0,
      maxAttempts: quizSettings.allowMultipleAttempts ? 10 : 1,
      eligibilityType: 'ALL_CANDIDATES',
      status: 'SCHEDULED',
      createdBy,
    });

    return {
      quiz: exam,
      publicQuizId,
      scheduleId: schedule._id,
      publicUrl: `/quiz/${publicQuizId}`,
    };
  },

  /**
   * List Organization Quizzes with summary telemetry
   */
  async listQuizzes(organizationId, { search, status } = {}) {
    const query = { organizationId, isQuiz: true };

    if (status && status !== 'ALL') {
      query.quizStatus = status;
    }

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const quizzes = await Exam.find(query).sort({ createdAt: -1 });

    // Fetch participant metrics per quiz
    const quizIds = quizzes.map((q) => q._id);
    const participantStats = await QuizParticipant.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      {
        $group: {
          _id: '$quizId',
          totalParticipants: { $sum: 1 },
          completedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = {};
    for (const stat of participantStats) {
      statsMap[stat._id.toString()] = stat;
    }

    const formattedQuizzes = quizzes.map((q) => {
      const stats = statsMap[q._id.toString()] || {
        totalParticipants: 0,
        completedSubmissions: 0,
      };
      const totalQuestions = q.sections?.[0]?.questions?.length || 0;

      return {
        _id: q._id,
        title: q.title,
        description: q.description,
        durationMinutes: q.durationMinutes,
        totalMarks: q.totalMarks,
        quizStatus: q.quizStatus,
        publicQuizId: q.publicQuizId,
        publicUrl: `/quiz/${q.publicQuizId}`,
        totalQuestions,
        totalParticipants: stats.totalParticipants,
        completedSubmissions: stats.completedSubmissions,
        startedAt: q.startedAt,
        stoppedAt: q.stoppedAt,
        googleSheet: q.googleSheet,
        createdAt: q.createdAt,
      };
    });

    // Compute high-level dashboard metrics
    const totalQuizzes = quizzes.length;
    const liveQuizzes = quizzes.filter((q) => q.quizStatus === 'LIVE').length;
    const totalParticipants = Object.values(statsMap).reduce(
      (sum, s) => sum + s.totalParticipants,
      0
    );
    const totalSubmissions = Object.values(statsMap).reduce(
      (sum, s) => sum + s.completedSubmissions,
      0
    );

    return {
      quizzes: formattedQuizzes,
      metrics: {
        totalQuizzes,
        liveQuizzes,
        totalParticipants,
        totalSubmissions,
      },
    };
  },

  /**
   * Get Quiz by ID
   */
  async getQuizById(quizId, organizationId) {
    const quiz = await Exam.findOne({ _id: quizId, organizationId });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const snapshot = await ExamSnapshot.findById(quiz.publishedSnapshotId);
    const questions = snapshot?.sections?.[0]?.questions || [];

    const stats = await QuizParticipant.aggregate([
      { $match: { quizId: quiz._id } },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          completedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, 1, 0] },
          },
          averageScore: {
            $avg: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, '$score', null] },
          },
          highestScore: {
            $max: { $cond: [{ $eq: ['$status', 'SUBMITTED'] }, '$score', null] },
          },
        },
      },
    ]);

    const summary = stats[0] || {
      totalParticipants: 0,
      completedSubmissions: 0,
      averageScore: 0,
      highestScore: 0,
    };

    return {
      quiz,
      questions,
      stats: summary,
      publicUrl: `/quiz/${quiz.publicQuizId}`,
    };
  },

  /**
   * Update Quiz Status (DRAFT -> LIVE -> STOPPED)
   */
  async updateQuizStatus(quizId, organizationId, status) {
    const validStatuses = ['DRAFT', 'LIVE', 'STOPPED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid quiz status');
    }

    const quiz = await Exam.findOne({ _id: quizId, organizationId });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const schedule = await ExamSchedule.findOne({ examId: quiz._id });

    if (status === 'LIVE') {
      quiz.quizStatus = 'LIVE';
      quiz.startedAt = new Date();
      if (schedule) {
        schedule.status = 'ACTIVE';
        schedule.startTime = new Date();
        await schedule.save();
      }
    } else if (status === 'STOPPED' || status === 'COMPLETED') {
      quiz.quizStatus = status;
      quiz.stoppedAt = new Date();
      if (schedule) {
        schedule.status = 'COMPLETED';
        schedule.endTime = new Date();
        await schedule.save();

        // Safely close any active in-progress attempts without data loss
        const activeAttempts = await ExamAttempt.find({
          scheduleId: schedule._id,
          status: 'IN_PROGRESS',
        });

        for (const attempt of activeAttempts) {
          try {
            await submitAttempt(attempt._id, attempt.candidateId, 'POLICY_TRIGGERED');
            const evalRes = await evaluationService.evaluateAttempt(attempt._id);
            await QuizParticipant.updateOne(
              { attemptId: attempt._id },
              {
                $set: {
                  status: 'SUBMITTED',
                  score: evalRes.totalMarksObtained,
                  maximumMarks: evalRes.maximumMarks,
                  percentage: evalRes.percentage,
                  submittedAt: new Date(),
                },
              }
            );
          } catch (err) {
            logger.warn(`Failed to auto-close attempt ${attempt._id}:`, err);
          }
        }
      }

      // Re-calculate rankings for all participants
      await this.calculateLeaderboardRanks(quiz._id);
    } else {
      quiz.quizStatus = status;
    }

    await quiz.save();
    return quiz;
  },

  /**
   * Get Quiz Results list with search & sorting
   */
  async getQuizResults(quizId, organizationId, { search, sortBy = 'score', sortOrder = 'desc' } = {}) {
    const quiz = await Exam.findOne({ _id: quizId, organizationId });
    if (!quiz) throw new Error('Quiz not found');

    const query = { quizId: quiz._id };
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { rollNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const sortObj = {};
    if (sortBy === 'score') sortObj.score = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'time') sortObj.timeTakenSeconds = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'date') sortObj.submittedAt = sortOrder === 'asc' ? 1 : -1;
    else sortObj.score = -1;

    const participants = await QuizParticipant.find(query).sort(sortObj);
    return {
      quizTitle: quiz.title,
      totalMarks: quiz.totalMarks,
      participants,
    };
  },

  /**
   * Calculate and save standard competition ranks (1, 1, 3)
   */
  async calculateLeaderboardRanks(quizId) {
    const participants = await QuizParticipant.find({
      quizId,
      status: 'SUBMITTED',
    }).sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 });

    let currentRank = 1;
    for (let i = 0; i < participants.length; i++) {
      if (i > 0 && participants[i].score < participants[i - 1].score) {
        currentRank = i + 1;
      }
      participants[i].rank = currentRank;
      await participants[i].save();
    }

    return participants;
  },

  /**
   * Get Leaderboard Data
   */
  async getLeaderboard(quizId) {
    await this.calculateLeaderboardRanks(quizId);
    return await QuizParticipant.find({
      quizId,
      status: 'SUBMITTED',
    })
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .select('name rollNumber score maximumMarks percentage rank timeTakenSeconds submittedAt');
  },

  /**
   * Export Results as CSV
   */
  async exportResultsCsv(quizId, organizationId) {
    const quiz = await Exam.findOne({ _id: quizId, organizationId });
    if (!quiz) throw new Error('Quiz not found');

    const participants = await QuizParticipant.find({
      quizId: quiz._id,
      status: 'SUBMITTED',
    }).sort({ rank: 1, score: -1 });

    const headers = [
      'Rank',
      'Student Name',
      'Email',
      'Roll Number',
      'College',
      'Department',
      'Score',
      'Maximum Marks',
      'Percentage',
      'Time Taken (Sec)',
      'Status',
      'Submitted At',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      let s = String(val).replace(/"/g, '""');
      if (['=', '+', '-', '@'].includes(s.charAt(0))) s = `'${s}`;
      return `"${s}"`;
    };

    const rows = participants.map((p) => [
      p.rank || '',
      escapeCsv(p.name),
      escapeCsv(p.email),
      escapeCsv(p.rollNumber),
      escapeCsv(p.college),
      escapeCsv(p.department),
      p.score,
      p.maximumMarks,
      p.percentage,
      p.timeTakenSeconds,
      escapeCsv(p.status),
      p.submittedAt ? p.submittedAt.toISOString() : '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * PUBLIC API: Get Public Quiz Metadata
   */
  async getPublicQuizMetadata(publicQuizId) {
    const quiz = await Exam.findOne({ publicQuizId }).select(
      'title description instructions durationMinutes totalMarks quizStatus quizSettings createdAt'
    );
    if (!quiz) {
      throw new Error('Quiz not found or invalid link');
    }

    return {
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      durationMinutes: quiz.durationMinutes,
      totalMarks: quiz.totalMarks,
      quizStatus: quiz.quizStatus,
      quizSettings: quiz.quizSettings,
    };
  },

  /**
   * PUBLIC API: Join Quiz without pre-existing account
   */
  async joinPublicQuiz(publicQuizId, { name, email, rollNumber = '', college = '', department = '' }) {
    if (!name || !name.trim()) throw new Error('Please enter your full name');
    if (!email || !email.trim()) throw new Error('Please enter a valid email address');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const quiz = await Exam.findOne({ publicQuizId });
    if (!quiz) throw new Error('Quiz not found');

    if (quiz.quizStatus !== 'LIVE') {
      if (quiz.quizStatus === 'DRAFT') {
        throw new Error('This quiz has not been started yet. Please contact your instructor.');
      } else if (quiz.quizStatus === 'STOPPED' || quiz.quizStatus === 'COMPLETED') {
        throw new Error('This quiz has ended and is no longer accepting submissions.');
      }
    }

    // Required fields check
    if (quiz.quizSettings.requireRollNumber && !rollNumber?.trim()) {
      throw new Error('Roll Number / Student ID is required for this quiz');
    }
    if (quiz.quizSettings.requireCollege && !college?.trim()) {
      throw new Error('College / Organization name is required for this quiz');
    }
    if (quiz.quizSettings.requireDepartment && !department?.trim()) {
      throw new Error('Department is required for this quiz');
    }

    // Duplicate check if multiple attempts are disallowed
    if (!quiz.quizSettings.allowMultipleAttempts) {
      const existingSubmission = await QuizParticipant.findOne({
        quizId: quiz._id,
        email: cleanEmail,
        status: 'SUBMITTED',
      });
      if (existingSubmission) {
        throw new Error('You have already submitted this quiz. Multiple attempts are not allowed.');
      }
    }

    // Find or create candidate User record
    let user = await User.findOne({
      email: cleanEmail,
      organizationId: quiz.organizationId,
    });

    if (!user) {
      user = await User.create({
        organizationId: quiz.organizationId,
        name: cleanName,
        email: cleanEmail,
        password: crypto.randomBytes(16).toString('hex'),
        role: 'CANDIDATE',
        status: 'ACTIVE',
        profile: {
          studentId: rollNumber.trim(),
          department: department.trim(),
          college: college.trim(),
        },
      });
    }

    // Ensure ScheduleCandidate exists
    const schedule = await ExamSchedule.findOne({ examId: quiz._id });
    if (!schedule) throw new Error('Exam schedule not found for quiz');

    let scheduleCandidate = await ScheduleCandidate.findOne({
      scheduleId: schedule._id,
      candidateId: user._id,
    });

    if (!scheduleCandidate) {
      scheduleCandidate = await ScheduleCandidate.create({
        organizationId: quiz.organizationId,
        scheduleId: schedule._id,
        candidateId: user._id,
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      });
    } else if (scheduleCandidate.status !== 'ACKNOWLEDGED') {
      scheduleCandidate.status = 'ACKNOWLEDGED';
      scheduleCandidate.acknowledgedAt = new Date();
      await scheduleCandidate.save();
    }

    // Create or resume ExamAttempt
    const attemptResult = await startOrResumeAttempt(
      user._id,
      schedule._id,
      '127.0.0.1',
      'Revitest Guest Runner'
    );

    // Create or update QuizParticipant
    let participant = await QuizParticipant.findOne({
      quizId: quiz._id,
      email: cleanEmail,
    });

    if (!participant) {
      participant = await QuizParticipant.create({
        organizationId: quiz.organizationId,
        quizId: quiz._id,
        scheduleId: schedule._id,
        attemptId: attemptResult.attempt._id,
        candidateUserId: user._id,
        name: cleanName,
        email: cleanEmail,
        rollNumber: rollNumber.trim(),
        college: college.trim(),
        department: department.trim(),
        status: 'IN_PROGRESS',
        maximumMarks: quiz.totalMarks,
        startedAt: attemptResult.attempt.startedAt,
      });
    } else {
      participant.attemptId = attemptResult.attempt._id;
      participant.status = 'IN_PROGRESS';
      await participant.save();
    }

    // Fetch sanitized questions
    const sanitizedSnapshot = await getSanitizedQuestionsForAttempt(
      attemptResult.attempt._id,
      user._id
    );

    const questionsList = sanitizedSnapshot.sections?.[0]?.questions || [];

    return {
      attemptId: attemptResult.attempt._id,
      candidateId: user._id,
      durationMinutes: quiz.durationMinutes,
      endsAt: attemptResult.attempt.endsAt,
      questions: questionsList,
      totalQuestions: questionsList.length,
      participantId: participant._id,
    };
  },

  /**
   * PUBLIC API: Save student answer
   */
  async savePublicAnswer(attemptId, candidateId, answerData) {
    const selectedOptions = answerData.selectedOptionIds ||
      (answerData.selectedOptionId ? [answerData.selectedOptionId] : []);

    return await saveAnswerResponse(
      attemptId,
      answerData.questionId,
      candidateId,
      {
        selectedOptions,
        textAnswer: answerData.descriptiveAnswer || '',
        isMarkedForReview: Boolean(answerData.isMarkedForReview),
        clientVersion: answerData.clientVersion || 1,
      }
    );
  },

  /**
   * PUBLIC API: Submit Quiz
   */
  async submitPublicQuiz(publicQuizId, attemptId, candidateId) {
    const quiz = await Exam.findOne({ publicQuizId });
    if (!quiz) throw new Error('Quiz not found');

    // Submit attempt safely
    await submitAttempt(attemptId, candidateId, 'MANUAL');

    // Run objective evaluation
    const evaluation = await evaluationService.evaluateAttempt(attemptId);

    // Update QuizParticipant
    const participant = await QuizParticipant.findOne({ attemptId });
    if (participant) {
      const now = new Date();
      participant.status = 'SUBMITTED';
      participant.score = evaluation.totalMarksObtained;
      participant.maximumMarks = evaluation.maximumMarks;
      participant.percentage = evaluation.percentage;
      participant.submittedAt = now;
      participant.timeTakenSeconds = Math.max(
        1,
        Math.round((now.getTime() - new Date(participant.startedAt).getTime()) / 1000)
      );
      await participant.save();

      // Recalculate ranks in background
      this.calculateLeaderboardRanks(quiz._id).catch((err) =>
        logger.warn('Failed to calculate leaderboard ranks:', err)
      );

      // Trigger Google Sheets sync if configured
      if (quiz.googleSheet?.webhookUrl) {
        googleSheetsService.syncQuizResults(quiz._id, quiz.organizationId).catch((err) =>
          logger.warn('Background Google Sheets sync failed:', err)
        );
      }
    }

    return {
      success: true,
      score: quiz.quizSettings.showResultsImmediately ? evaluation.totalMarksObtained : null,
      maximumMarks: quiz.totalMarks,
      percentage: quiz.quizSettings.showResultsImmediately ? evaluation.percentage : null,
      showResults: quiz.quizSettings.showResultsImmediately,
      publicLeaderboard: quiz.quizSettings.publicLeaderboard,
      submittedAt: new Date(),
    };
  },

  /**
   * PUBLIC API: Get Public Leaderboard
   */
  async getPublicLeaderboard(publicQuizId) {
    const quiz = await Exam.findOne({ publicQuizId });
    if (!quiz) throw new Error('Quiz not found');

    if (!quiz.quizSettings.publicLeaderboard) {
      throw new Error('Public leaderboard is disabled for this quiz');
    }

    const leaderboard = await QuizParticipant.find({
      quizId: quiz._id,
      status: 'SUBMITTED',
    })
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .select('rank name score maximumMarks percentage timeTakenSeconds submittedAt');

    return {
      quizTitle: quiz.title,
      leaderboard,
    };
  },

  /**
   * Get all participants across all organization quizzes
   */
  async getAllParticipants(organizationId, { search } = {}) {
    const query = { organizationId };
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { rollNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    return await QuizParticipant.find(query)
      .populate('quizId', 'title publicQuizId')
      .sort({ createdAt: -1 });
  },
};

export default quizService;
