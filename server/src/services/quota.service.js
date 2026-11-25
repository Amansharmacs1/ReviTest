import {
  Organization,
  User,
  Exam,
  ExamAttempt,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

export const quotaService = {
  /**
   * Get real-time usage statistics vs subscription quotas for an organization
   */
  async getUsageMetrics(organizationId) {
    const org = await Organization.findById(organizationId);
    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    const quotas = org.subscriptionQuotas || {
      maxActiveExams: 10,
      maxCandidates: 500,
      maxMonthlySubmissions: 2500,
      enableWebhooks: true,
      enableApiKeys: true,
      enableCsvExport: true,
    };

    // Calculate current usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [activeExamsCount, candidatesCount, monthlySubmissionsCount] = await Promise.all([
      Exam.countDocuments({ organizationId, status: { $ne: 'ARCHIVED' } }),
      User.countDocuments({ organizationId, role: ROLES.CANDIDATE, status: 'ACTIVE' }),
      ExamAttempt.countDocuments({
        organizationId,
        submittedAt: { $gte: startOfMonth },
      }),
    ]);

    return {
      plan: org.plan || 'FREE_TRIAL',
      quotas,
      usage: {
        activeExams: {
          current: activeExamsCount,
          max: quotas.maxActiveExams,
          percentage: Math.min(100, Math.round((activeExamsCount / quotas.maxActiveExams) * 100)),
        },
        candidates: {
          current: candidatesCount,
          max: quotas.maxCandidates,
          percentage: Math.min(100, Math.round((candidatesCount / quotas.maxCandidates) * 100)),
        },
        monthlySubmissions: {
          current: monthlySubmissionsCount,
          max: quotas.maxMonthlySubmissions,
          percentage: Math.min(
            100,
            Math.round((monthlySubmissionsCount / quotas.maxMonthlySubmissions) * 100)
          ),
        },
      },
    };
  },

  /**
   * Enforces that an organization cannot exceed its active examination quota
   */
  async checkCanCreateExam(organizationId) {
    const org = await Organization.findById(organizationId);
    if (!org) throw ApiError.notFound('Organization not found');

    const maxActive = org.subscriptionQuotas?.maxActiveExams || 10;
    const currentActive = await Exam.countDocuments({
      organizationId,
      status: { $ne: 'ARCHIVED' },
    });

    if (currentActive >= maxActive) {
      throw ApiError.forbidden(
        `Subscription quota exceeded: Your organization tier permits a maximum of ${maxActive} active exams. Archive older assessments or upgrade to expand.`
      );
    }
  },

  /**
   * Enforces candidate enrollment quota
   */
  async checkCanRegisterCandidate(organizationId) {
    const org = await Organization.findById(organizationId);
    if (!org) throw ApiError.notFound('Organization not found');

    const maxCandidates = org.subscriptionQuotas?.maxCandidates || 500;
    const currentCandidates = await User.countDocuments({
      organizationId,
      role: ROLES.CANDIDATE,
      status: 'ACTIVE',
    });

    if (currentCandidates >= maxCandidates) {
      throw ApiError.forbidden(
        `Candidate enrollment quota reached: Your organization plan allows up to ${maxCandidates} active examinees.`
      );
    }
  },
};

export default quotaService;
