import { Exam } from '../models/Exam.js';
import { QuizParticipant } from '../models/QuizParticipant.js';
import { logger } from '../utils/logger.js';

export const googleSheetsService = {
  /**
   * Format quiz results as table data for Google Sheets sync or preview
   */
  async formatQuizResultsForSheets(quizId) {
    const participants = await QuizParticipant.find({
      quizId,
      status: 'SUBMITTED',
    }).sort({ score: -1, timeTakenSeconds: 1 });

    const headers = [
      'Timestamp',
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
    ];

    const rows = participants.map((p) => ({
      timestamp: p.submittedAt ? p.submittedAt.toISOString() : new Date().toISOString(),
      rank: p.rank,
      name: p.name,
      email: p.email,
      rollNumber: p.rollNumber || 'N/A',
      college: p.college || 'N/A',
      department: p.department || 'N/A',
      score: p.score,
      maximumMarks: p.maximumMarks,
      percentage: `${p.percentage}%`,
      timeTakenSeconds: p.timeTakenSeconds,
      status: p.status,
    }));

    return { headers, rows };
  },

  /**
   * Synchronize quiz submissions to Google Sheets via configured Webhook / Sheet Integration
   */
  async syncQuizResults(quizId, organizationId) {
    const quiz = await Exam.findOne({ _id: quizId, organizationId });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const participants = await QuizParticipant.find({
      quizId,
      status: 'SUBMITTED',
    }).sort({ score: -1, timeTakenSeconds: 1 });

    const rows = participants.map((p) => ({
      timestamp: p.submittedAt ? p.submittedAt.toISOString() : new Date().toISOString(),
      studentName: p.name,
      email: p.email,
      rollNumber: p.rollNumber || 'N/A',
      college: p.college || 'N/A',
      department: p.department || 'N/A',
      score: p.score,
      maximumMarks: p.maximumMarks,
      percentage: `${p.percentage}%`,
      status: p.status,
    }));

    const webhookUrl = quiz.googleSheet?.webhookUrl;

    if (!webhookUrl) {
      // No external sheet configured yet, but records are 100% saved in MongoDB
      logger.info(`Google Sheets sync skipped for quiz ${quizId}: No Webhook URL configured.`);
      return {
        success: true,
        syncedCount: 0,
        message: 'Quiz results are safely saved in MongoDB. Connect a Google Sheet Webhook in Settings to stream live rows.',
        data: rows,
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizTitle: quiz.title,
          quizId: quiz._id.toString(),
          publicQuizId: quiz.publicQuizId,
          totalParticipants: participants.length,
          syncedAt: new Date().toISOString(),
          rows,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets endpoint responded with HTTP ${response.status}`);
      }

      await Exam.updateOne(
        { _id: quizId },
        {
          $set: {
            'googleSheet.lastSyncedAt': new Date(),
            'googleSheet.syncStatus': 'SYNCED',
            'googleSheet.syncError': '',
          },
        }
      );

      await QuizParticipant.updateMany(
        { quizId, status: 'SUBMITTED' },
        { $set: { googleSynced: true } }
      );

      return {
        success: true,
        syncedCount: rows.length,
        message: `Successfully synchronized ${rows.length} participants to Google Sheets.`,
      };
    } catch (err) {
      logger.error(`Google Sheets sync error for quiz ${quizId}:`, err);
      await Exam.updateOne(
        { _id: quizId },
        {
          $set: {
            'googleSheet.syncStatus': 'FAILED',
            'googleSheet.syncError': err.message,
          },
        }
      );
      throw new Error(`Google Sheets synchronization failed: ${err.message}`);
    }
  },
};

export default googleSheetsService;
