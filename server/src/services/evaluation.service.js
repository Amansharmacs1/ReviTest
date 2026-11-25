import {
  ExamAttempt,
  ATTEMPT_STATUS,
  ExamResult,
  RESULT_STATUS,
  ExamSnapshot,
  ExamSchedule,
  AttemptResponse,
  AuditLog,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export const evaluationService = {
  /**
   * Evaluate a single submitted attempt against the immutable ExamSnapshot answer key
   */
  async evaluateAttempt(attemptId, graderUser = null) {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Exam attempt not found');
    }

    if (
      attempt.status !== ATTEMPT_STATUS.SUBMITTED &&
      attempt.status !== ATTEMPT_STATUS.AUTO_SUBMITTED
    ) {
      throw ApiError.badRequest(
        `Cannot evaluate attempt in status '${attempt.status}'. Attempt must be submitted.`
      );
    }

    const snapshot = await ExamSnapshot.findById(attempt.examSnapshotId).lean();
    if (!snapshot) {
      throw ApiError.notFound('Associated exam snapshot not found');
    }

    // Load all saved responses for this attempt
    const responses = await AttemptResponse.find({ attemptId }).lean();
    const responseMap = new Map();
    responses.forEach((r) => {
      responseMap.set(r.questionId.toString(), r);
    });

    // Check if any questions were already manually graded by an instructor to prevent grade loss on re-evaluation
    const existingResult = await ExamResult.findOne({ attemptId: attempt._id }).lean();
    const existingGradeMap = new Map();
    if (existingResult?.questionEvaluations) {
      existingResult.questionEvaluations.forEach((qe) => {
        if (qe.status === 'MANUAL_GRADED') {
          existingGradeMap.set(qe.questionId.toString(), qe);
        }
      });
    }

    const settings = snapshot.examMetadata?.settings || {};
    const allowNegativeMarking = Boolean(settings.allowNegativeMarking);
    const passingMarks = snapshot.examMetadata?.passingMarks ?? 0;
    const maximumMarks = snapshot.totalMarks || attempt.maximumMarks;

    const questionEvaluations = [];
    const sectionScores = [];
    let grandTotalMarks = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnanswered = 0;
    let hasManualPending = false;

    // Evaluate each section and question
    for (const section of snapshot.sections || []) {
      let secMarksObtained = 0;
      let secMaxMarks = 0;
      let secCorrect = 0;
      let secIncorrect = 0;
      let secUnanswered = 0;

      for (const q of section.questions || []) {
        const qIdStr = (q.questionId?._id || q.questionId).toString();
        const candidateResp = responseMap.get(qIdStr);

        const qMarks = q.marks || 1;
        const qNegativeMarks = allowNegativeMarking ? q.negativeMarks || 0 : 0;
        secMaxMarks += qMarks;

        const selectedOptions = candidateResp?.selectedOptions || [];
        const textAnswer = candidateResp?.textAnswer || candidateResp?.textResponse || '';
        const isAnswered =
          (Array.isArray(selectedOptions) && selectedOptions.length > 0) ||
          (typeof textAnswer === 'string' && textAnswer.trim().length > 0);

        let marksAwarded = 0;
        let isCorrect = false;
        let evalStatus = 'UNANSWERED';

        if (!isAnswered) {
          evalStatus = 'UNANSWERED';
          marksAwarded = 0;
          secUnanswered++;
          totalUnanswered++;
        } else {
          switch (q.questionType) {
            case 'MCQ_SINGLE': {
              const correctOption = q.options?.find((o) => o.isCorrect);
              const correctOptId = correctOption?.optionId || correctOption?.id;
              if (correctOptId && selectedOptions.length === 1 && selectedOptions[0] === correctOptId) {
                isCorrect = true;
                marksAwarded = qMarks;
                evalStatus = 'CORRECT';
                secCorrect++;
                totalCorrect++;
              } else {
                isCorrect = false;
                marksAwarded = -qNegativeMarks;
                evalStatus = 'INCORRECT';
                secIncorrect++;
                totalIncorrect++;
              }
              break;
            }

            case 'MCQ_MULTIPLE': {
              const correctOptionIds = (q.options || [])
                .filter((o) => o.isCorrect)
                .map((o) => o.optionId || o.id)
                .sort();
              const candidateSorted = [...selectedOptions].sort();

              const isExactMatch =
                correctOptionIds.length === candidateSorted.length &&
                correctOptionIds.every((id, idx) => id === candidateSorted[idx]);

              if (isExactMatch) {
                isCorrect = true;
                marksAwarded = qMarks;
                evalStatus = 'CORRECT';
                secCorrect++;
                totalCorrect++;
              } else {
                isCorrect = false;
                marksAwarded = -qNegativeMarks;
                evalStatus = 'INCORRECT';
                secIncorrect++;
                totalIncorrect++;
              }
              break;
            }

            case 'TRUE_FALSE': {
              const correctOption = q.options?.find((o) => o.isCorrect);
              const expectedText = correctOption?.text;
              if (
                expectedText &&
                selectedOptions.length === 1 &&
                selectedOptions[0].toLowerCase() === expectedText.toLowerCase()
              ) {
                isCorrect = true;
                marksAwarded = qMarks;
                evalStatus = 'CORRECT';
                secCorrect++;
                totalCorrect++;
              } else {
                isCorrect = false;
                marksAwarded = -qNegativeMarks;
                evalStatus = 'INCORRECT';
                secIncorrect++;
                totalIncorrect++;
              }
              break;
            }

            case 'DESCRIPTIVE': {
              const existingGrade = existingGradeMap.get(qIdStr);
              if (existingGrade) {
                evalStatus = 'MANUAL_GRADED';
                marksAwarded = existingGrade.marksAwarded;
                isCorrect = existingGrade.marksAwarded > 0;
                if (isCorrect) {
                  secCorrect++;
                  totalCorrect++;
                } else {
                  secIncorrect++;
                  totalIncorrect++;
                }
              } else if (isAnswered) {
                hasManualPending = true;
                evalStatus = 'MANUAL_PENDING';
                marksAwarded = 0;
              } else {
                evalStatus = 'UNANSWERED';
                marksAwarded = 0;
                secUnanswered++;
                totalUnanswered++;
              }
              break;
            }

            default:
              evalStatus = 'UNANSWERED';
              marksAwarded = 0;
              secUnanswered++;
              totalUnanswered++;
          }
        }

        secMarksObtained += marksAwarded;

        const existingGrade = existingGradeMap.get(qIdStr);

        questionEvaluations.push({
          questionId: q.questionId,
          questionType: q.questionType,
          marksAwarded,
          maxMarks: qMarks,
          negativeMarks: qNegativeMarks,
          isCorrect,
          status: evalStatus,
          selectedOptions,
          textAnswer,
          manualFeedback: existingGrade?.manualFeedback || '',
          gradedBy: existingGrade?.gradedBy || graderUser?._id || null,
        });
      }

      grandTotalMarks += secMarksObtained;

      sectionScores.push({
        sectionId: section.sectionId || section._id?.toString() || 'sec-default',
        title: section.title || 'Section',
        marksObtained: Number(secMarksObtained.toFixed(2)),
        maximumMarks: secMaxMarks,
        questionsCount: (section.questions || []).length,
        correctCount: secCorrect,
        incorrectCount: secIncorrect,
        unansweredCount: secUnanswered,
      });
    }

    // Floor total score at 0 if negative marking deducted below 0
    const finalMarksObtained = Math.max(0, Number(grandTotalMarks.toFixed(2)));
    const percentage = maximumMarks > 0 ? Number(((finalMarksObtained / maximumMarks) * 100).toFixed(2)) : 0;
    const isPassed = finalMarksObtained >= passingMarks;
    const accuracyRate =
      totalCorrect + totalIncorrect > 0
        ? Number(((totalCorrect / (totalCorrect + totalIncorrect)) * 100).toFixed(2))
        : 0;

    const resultStatus = hasManualPending
      ? RESULT_STATUS.PENDING_MANUAL_GRADING
      : RESULT_STATUS.COMPLETED;

    // Upsert ExamResult
    const examResult = await ExamResult.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        organizationId: attempt.organizationId,
        scheduleId: attempt.scheduleId,
        examId: attempt.examId,
        examSnapshotId: attempt.examSnapshotId,
        candidateId: attempt.candidateId,
        attemptId: attempt._id,
        totalMarksObtained: finalMarksObtained,
        maximumMarks,
        percentage,
        isPassed,
        accuracyRate,
        totalCorrect,
        totalIncorrect,
        totalUnanswered,
        sectionScores,
        questionEvaluations,
        status: resultStatus,
        evaluatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync marks on attempt document
    attempt.totalMarks = finalMarksObtained;
    await attempt.save();

    return examResult;
  },

  /**
   * Batch evaluate all submitted attempts for an exam schedule and compute cohort ranks & percentiles
   */
  async batchEvaluateSchedule(scheduleId, graderUser = null, reqContext = {}) {
    const schedule = await ExamSchedule.findById(scheduleId);
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    // Find all submitted or auto-submitted attempts
    const attempts = await ExamAttempt.find({
      scheduleId,
      status: { $in: [ATTEMPT_STATUS.SUBMITTED, ATTEMPT_STATUS.AUTO_SUBMITTED] },
    });

    const evaluatedResults = [];

    for (const attempt of attempts) {
      const result = await this.evaluateAttempt(attempt._id, graderUser);
      evaluatedResults.push(result);
    }

    // Compute cohort ranking and percentiles
    if (evaluatedResults.length > 0) {
      const allResults = await ExamResult.find({ scheduleId }).sort({ totalMarksObtained: -1 });

      const totalCount = allResults.length;
      let currentRank = 1;

      for (let i = 0; i < totalCount; i++) {
        // Standard competition ranking (1224)
        if (i > 0 && allResults[i].totalMarksObtained < allResults[i - 1].totalMarksObtained) {
          currentRank = i + 1;
        }

        // Percentile: (number of candidates scored strictly below this candidate / total - 1) * 100
        const scoredBelow = allResults.filter(
          (r) => r.totalMarksObtained < allResults[i].totalMarksObtained
        ).length;

        const percentile =
          totalCount > 1 ? Number(((scoredBelow / (totalCount - 1)) * 100).toFixed(2)) : 100;

        await ExamResult.updateOne(
          { _id: allResults[i]._id },
          { $set: { rank: currentRank, percentile } }
        );
      }
    }

    if (graderUser) {
      await AuditLog.create({
        organizationId: schedule.organizationId,
        actorId: graderUser._id,
        actorRole: graderUser.role,
        actorName: graderUser.name,
        action: 'SCHEDULE_BATCH_EVALUATION',
        targetType: 'SCHEDULE',
        targetId: schedule._id,
        targetName: schedule.title,
        description: `Batch evaluated and ranked ${evaluatedResults.length} submitted attempts.`,
        metadata: { scheduleId: schedule._id, evaluatedCount: evaluatedResults.length },
        ipAddress: reqContext.ipAddress || '',
        userAgent: reqContext.userAgent || '',
      });
    }

    return {
      scheduleId,
      evaluatedCount: evaluatedResults.length,
    };
  },

  /**
   * Publish evaluation results for a schedule to examinees
   */
  async publishScheduleResults(scheduleId, publisherUser, reqContext = {}) {
    const schedule = await ExamSchedule.findById(scheduleId);
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    const now = new Date();

    const updateRes = await ExamResult.updateMany(
      { scheduleId, status: { $ne: RESULT_STATUS.PENDING_MANUAL_GRADING } },
      { $set: { status: RESULT_STATUS.PUBLISHED, publishedAt: now } }
    );

    await AuditLog.create({
      organizationId: schedule.organizationId,
      actorId: publisherUser._id,
      actorRole: publisherUser.role,
      actorName: publisherUser.name,
      action: 'SCHEDULE_RESULTS_PUBLISHED',
      targetType: 'SCHEDULE',
      targetId: schedule._id,
      targetName: schedule.title,
      description: `Official examination results published for ${schedule.title}.`,
      metadata: { scheduleId: schedule._id, publishedCount: updateRes.modifiedCount },
      ipAddress: reqContext.ipAddress || '',
      userAgent: reqContext.userAgent || '',
    });

    return {
      publishedCount: updateRes.modifiedCount,
      publishedAt: now,
    };
  },

  /**
   * Calculate detailed analytical insights and performance metrics for an exam schedule
   */
  async getScheduleAnalytics(scheduleId, requestingUser) {
    const schedule = await ExamSchedule.findById(scheduleId);
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    if (
      ['ORG_ADMIN', 'PROCTOR'].includes(requestingUser.role) &&
      schedule.organizationId.toString() !== requestingUser.organizationId.toString()
    ) {
      throw ApiError.forbidden('Access denied to other organization schedules');
    }

    const results = await ExamResult.find({ scheduleId }).lean();
    const snapshot = await ExamSnapshot.findById(schedule.examSnapshotId).lean();

    if (results.length === 0) {
      return {
        schedule: {
          _id: schedule._id,
          title: schedule.title,
        },
        summary: {
          totalEvaluated: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passPercentage: 0,
        },
        scoreDistribution: [],
        questionAnalytics: [],
      };
    }

    const totalEvaluated = results.length;
    const scores = results.map((r) => r.totalMarksObtained);
    const sumScore = scores.reduce((a, b) => a + b, 0);
    const averageScore = Number((sumScore / totalEvaluated).toFixed(2));
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passedCount = results.filter((r) => r.isPassed).length;
    const passPercentage = Number(((passedCount / totalEvaluated) * 100).toFixed(2));

    // Score distribution into 5 brackets (0-20%, 21-40%, 41-60%, 61-80%, 81-100%)
    const distribution = [
      { bracket: '0-20%', count: 0 },
      { bracket: '21-40%', count: 0 },
      { bracket: '41-60%', count: 0 },
      { bracket: '61-80%', count: 0 },
      { bracket: '81-100%', count: 0 },
    ];

    results.forEach((r) => {
      const p = r.percentage || 0;
      if (p <= 20) distribution[0].count++;
      else if (p <= 40) distribution[1].count++;
      else if (p <= 60) distribution[2].count++;
      else if (p <= 80) distribution[3].count++;
      else distribution[4].count++;
    });

    // Question-level accuracy index
    const questionMap = new Map();
    results.forEach((r) => {
      (r.questionEvaluations || []).forEach((qe) => {
        const qId = qe.questionId.toString();
        if (!questionMap.has(qId)) {
          questionMap.set(qId, { attempts: 0, correct: 0, incorrect: 0, unanswered: 0 });
        }
        const stats = questionMap.get(qId);
        stats.attempts++;
        if (qe.status === 'CORRECT') stats.correct++;
        else if (qe.status === 'INCORRECT') stats.incorrect++;
        else if (qe.status === 'UNANSWERED') stats.unanswered++;
      });
    });

    const questionAnalytics = [];
    (snapshot?.sections || []).forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        const qId = (q.questionId?._id || q.questionId).toString();
        const stats = questionMap.get(qId) || { attempts: 0, correct: 0, incorrect: 0, unanswered: 0 };
        const accuracy =
          stats.attempts > 0 ? Number(((stats.correct / stats.attempts) * 100).toFixed(1)) : 0;

        questionAnalytics.push({
          questionId: qId,
          questionText: q.statement || q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          totalExaminees: totalEvaluated,
          correctCount: stats.correct,
          incorrectCount: stats.incorrect,
          unansweredCount: stats.unanswered,
          accuracyRate: accuracy,
        });
      });
    });

    return {
      schedule: {
        _id: schedule._id,
        title: schedule.title,
        totalMarks: snapshot?.totalMarks || 0,
      },
      summary: {
        totalEvaluated,
        averageScore,
        highestScore,
        lowestScore,
        passPercentage,
        passedCount,
        failedCount: totalEvaluated - passedCount,
      },
      scoreDistribution: distribution,
      questionAnalytics,
    };
  },

  /**
   * Get leaderboard and cohort rankings for a schedule
   */
  async getScheduleLeaderboard(scheduleId, requestingUser, options = {}) {
    const { page = 1, limit = 50 } = options;
    const schedule = await ExamSchedule.findById(scheduleId);
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    if (
      ['ORG_ADMIN', 'PROCTOR'].includes(requestingUser.role) &&
      schedule.organizationId.toString() !== requestingUser.organizationId.toString()
    ) {
      throw ApiError.forbidden('Access denied to other organization schedules');
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      ExamResult.find({ scheduleId })
        .populate('candidateId', 'name email profile')
        .sort({ rank: 1, totalMarksObtained: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExamResult.countDocuments({ scheduleId }),
    ]);

    return {
      schedule: {
        _id: schedule._id,
        title: schedule.title,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      },
      leaderboard: results.map((r) => ({
        rank: r.rank || '-',
        candidateId: r.candidateId?._id,
        name: r.candidateId?.name,
        email: r.candidateId?.email,
        studentId: r.candidateId?.profile?.studentId || '—',
        department: r.candidateId?.profile?.department || '—',
        totalMarksObtained: r.totalMarksObtained,
        maximumMarks: r.maximumMarks,
        percentage: r.percentage,
        percentile: r.percentile,
        isPassed: r.isPassed,
        status: r.status,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get candidate scorecard for an attempt with strict authorization
   */
  async getCandidateResult(attemptId, requestingUser) {
    const result = await ExamResult.findOne({ attemptId })
      .populate('candidateId', 'name email profile')
      .lean();

    if (!result) {
      throw ApiError.notFound('Examination result not found or evaluation pending');
    }

    if (requestingUser.role === 'CANDIDATE') {
      if (result.candidateId._id.toString() !== requestingUser._id.toString()) {
        throw ApiError.forbidden('You are not authorized to view another candidate’s result');
      }
    } else if (['ORG_ADMIN', 'PROCTOR'].includes(requestingUser.role)) {
      if (result.organizationId.toString() !== requestingUser.organizationId.toString()) {
        throw ApiError.forbidden('Access denied');
      }
    }

    // Attach question text from snapshot for full scorecard review
    const snapshot = await ExamSnapshot.findById(result.examSnapshotId).lean();
    const questionTextMap = new Map();
    (snapshot?.sections || []).forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        questionTextMap.set((q.questionId?._id || q.questionId).toString(), {
          questionText: q.statement || q.questionText,
          options: q.options || [],
          explanation: q.explanation || '',
        });
      });
    });

    const enrichedQuestions = (result.questionEvaluations || []).map((qe) => {
      const qMeta = questionTextMap.get(qe.questionId.toString());
      return {
        ...qe,
        questionText: qMeta?.questionText || 'Question statement',
        options: qMeta?.options || [],
        explanation: qMeta?.explanation || '',
      };
    });

    return {
      ...result,
      examTitle: snapshot?.examMetadata?.title || 'Examination',
      questionEvaluations: enrichedQuestions,
    };
  },

  /**
   * Manually grade a descriptive answer response
   */
  async gradeDescriptiveQuestion(attemptId, questionId, { marksAwarded, feedback }, graderUser) {
    const result = await ExamResult.findOne({ attemptId });
    if (!result) {
      throw ApiError.notFound('Exam result not found');
    }

    const qEval = result.questionEvaluations.find(
      (qe) => qe.questionId.toString() === questionId.toString()
    );

    if (!qEval) {
      throw ApiError.notFound('Question evaluation record not found in attempt result');
    }

    const marks = Number(marksAwarded);
    if (isNaN(marks) || marks < 0 || marks > qEval.maxMarks) {
      throw ApiError.badRequest(
        `Marks awarded must be a positive number between 0 and maximum marks (${qEval.maxMarks})`
      );
    }

    qEval.marksAwarded = marks;
    qEval.manualFeedback = feedback || '';
    qEval.status = 'MANUAL_GRADED';
    qEval.isCorrect = marks > 0;
    qEval.gradedBy = graderUser._id;

    // Recalculate grand total
    let newTotal = 0;
    let anyPending = false;

    result.questionEvaluations.forEach((qe) => {
      newTotal += qe.marksAwarded;
      if (qe.status === 'MANUAL_PENDING') anyPending = true;
    });

    result.totalMarksObtained = Math.max(0, Number(newTotal.toFixed(2)));
    result.percentage =
      result.maximumMarks > 0
        ? Number(((result.totalMarksObtained / result.maximumMarks) * 100).toFixed(2))
        : 0;

    const snapshot = await ExamSnapshot.findById(result.examSnapshotId).select('examMetadata');
    const passingMarks = snapshot?.examMetadata?.passingMarks ?? 0;
    result.isPassed = result.totalMarksObtained >= passingMarks;
    result.status = anyPending ? RESULT_STATUS.PENDING_MANUAL_GRADING : RESULT_STATUS.COMPLETED;

    await result.save();

    // Sync attempt totalMarks
    await ExamAttempt.updateOne(
      { _id: attemptId },
      { $set: { totalMarks: result.totalMarksObtained } }
    );

    return result;
  },
};

export default evaluationService;
