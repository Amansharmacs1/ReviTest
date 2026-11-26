import { quizService } from '../services/quiz.service.js';
import { googleSheetsService } from '../services/googleSheets.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const quizController = {
  // 1. Create a simple quiz
  createQuiz: asyncHandler(async (req, res) => {
    const { title, description, durationMinutes, instructions, questions, quizSettings } = req.body;

    const result = await quizService.createQuiz({
      organizationId: req.user.organizationId,
      createdBy: req.user._id,
      title,
      description,
      durationMinutes,
      instructions,
      questions,
      quizSettings,
    });

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Quiz created successfully.',
      data: result,
    });
  }),

  // 2. List quizzes with metrics
  listQuizzes: asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const result = await quizService.listQuizzes(req.user.organizationId, { search, status });

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Quizzes retrieved successfully.',
      data: result,
    });
  }),

  // 3. Get quiz details by ID
  getQuizById: asyncHandler(async (req, res) => {
    const result = await quizService.getQuizById(req.params.id, req.user.organizationId);

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Quiz details retrieved successfully.',
      data: result,
    });
  }),

  // 4. Update quiz status (LIVE, STOPPED)
  updateQuizStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    const result = await quizService.updateQuizStatus(
      req.params.id,
      req.user.organizationId,
      status
    );

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Quiz status updated to ${status}.`,
      data: result,
    });
  }),

  // 5. Get quiz results
  getQuizResults: asyncHandler(async (req, res) => {
    const { search, sortBy, sortOrder } = req.query;
    const result = await quizService.getQuizResults(
      req.params.id,
      req.user.organizationId,
      { search, sortBy, sortOrder }
    );

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Quiz results retrieved successfully.',
      data: result,
    });
  }),

  // 6. Get quiz leaderboard
  getLeaderboard: asyncHandler(async (req, res) => {
    const result = await quizService.getLeaderboard(req.params.id);

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Leaderboard retrieved successfully.',
      data: result,
    });
  }),

  // 7. Export quiz results as CSV
  exportResultsCsv: asyncHandler(async (req, res) => {
    const csvData = await quizService.exportResultsCsv(req.params.id, req.user.organizationId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quiz_results_${req.params.id}.csv"`
    );
    return res.status(HTTP_STATUS.OK).send(csvData);
  }),

  // 8. Manual sync to Google Sheets
  syncGoogleSheets: asyncHandler(async (req, res) => {
    const result = await googleSheetsService.syncQuizResults(
      req.params.id,
      req.user.organizationId
    );

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.message,
      data: result,
    });
  }),

  // 9. Update Google Sheet configuration
  updateGoogleConfig: asyncHandler(async (req, res) => {
    const { webhookUrl, spreadsheetId, sheetName } = req.body;
    const { Exam } = await import('../models/Exam.js');

    const quiz = await Exam.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      {
        $set: {
          'googleSheet.webhookUrl': webhookUrl?.trim() || '',
          'googleSheet.spreadsheetId': spreadsheetId?.trim() || '',
          'googleSheet.sheetName': sheetName?.trim() || 'Quiz Results',
        },
      },
      { new: true }
    );

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Google Sheets configuration updated.',
      data: quiz.googleSheet,
    });
  }),

  // 10. Get all participants
  getAllParticipants: asyncHandler(async (req, res) => {
    const { search } = req.query;
    const result = await quizService.getAllParticipants(req.user.organizationId, { search });

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Participants retrieved successfully.',
      data: result,
    });
  }),

  // ==========================================
  // PUBLIC STUDENT QUIZ ENDPOINTS
  // ==========================================

  // Public 1: Get metadata
  getPublicQuizMetadata: asyncHandler(async (req, res) => {
    const result = await quizService.getPublicQuizMetadata(req.params.publicQuizId);

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Public quiz details retrieved.',
      data: result,
    });
  }),

  // Public 2: Join quiz
  joinPublicQuiz: asyncHandler(async (req, res) => {
    const { name, email, rollNumber, college, department } = req.body;

    const result = await quizService.joinPublicQuiz(req.params.publicQuizId, {
      name,
      email,
      rollNumber,
      college,
      department,
    });

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Joined quiz successfully. Good luck!',
      data: result,
    });
  }),

  // Public 3: Autosave answer
  savePublicAnswer: asyncHandler(async (req, res) => {
    const { attemptId, candidateId, ...answerData } = req.body;
    const result = await quizService.savePublicAnswer(attemptId, candidateId, answerData);

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Answer saved.',
      data: result,
    });
  }),

  // Public 4: Submit quiz
  submitPublicQuiz: asyncHandler(async (req, res) => {
    const { attemptId, candidateId } = req.body;
    const result = await quizService.submitPublicQuiz(
      req.params.publicQuizId,
      attemptId,
      candidateId
    );

    return ApiResponse.success(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Quiz submitted successfully!',
      data: result,
    });
  }),

  // Public 5: Public leaderboard (Strictly Private to Quiz Creator)
  getPublicLeaderboard: asyncHandler(async (_req, res) => {
    return ApiResponse.error(res, {
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: 'Leaderboards are private and strictly accessible to the quiz creator in the dashboard.',
    });
  }),
};

export default quizController;
