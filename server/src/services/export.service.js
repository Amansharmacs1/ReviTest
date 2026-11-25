import { User, ExamSchedule, ExamResult, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ROLES } from '../constants/roles.js';

export const exportService = {
  /**
   * Escape and format a value for clean CSV presentation
   */
  escapeCsvValue(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  },

  /**
   * Export enrolled candidate roster as CSV
   */
  async exportCandidateRosterCsv(organizationId) {
    const candidates = await User.find({
      organizationId,
      role: ROLES.CANDIDATE,
    })
      .sort({ name: 1 })
      .lean();

    const headers = ['Name', 'Email', 'Student ID', 'Department', 'Status', 'Registered Date'];
    const rows = [headers.join(',')];

    for (const c of candidates) {
      rows.push(
        [
          this.escapeCsvValue(c.name),
          this.escapeCsvValue(c.email),
          this.escapeCsvValue(c.profile?.studentId || ''),
          this.escapeCsvValue(c.profile?.department || ''),
          this.escapeCsvValue(c.status),
          this.escapeCsvValue(c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''),
        ].join(',')
      );
    }

    return rows.join('\n');
  },

  /**
   * Export examination schedule results and ranks as CSV
   */
  async exportScheduleResultsCsv(scheduleId, organizationId) {
    const schedule = await ExamSchedule.findOne({ _id: scheduleId, organizationId }).lean();
    if (!schedule) {
      throw ApiError.notFound('Exam schedule not found');
    }

    const results = await ExamResult.find({ scheduleId })
      .populate('candidateId', 'name email profile')
      .sort({ rank: 1, totalMarksObtained: -1 })
      .lean();

    const headers = [
      'Rank',
      'Candidate Name',
      'Email',
      'Student ID',
      'Department',
      'Marks Obtained',
      'Max Marks',
      'Percentage',
      'Percentile',
      'Result Status',
      'Evaluated At',
    ];

    const rows = [headers.join(',')];

    for (const r of results) {
      rows.push(
        [
          this.escapeCsvValue(r.rank || ''),
          this.escapeCsvValue(r.candidateId?.name || 'Examinee'),
          this.escapeCsvValue(r.candidateId?.email || ''),
          this.escapeCsvValue(r.candidateId?.profile?.studentId || ''),
          this.escapeCsvValue(r.candidateId?.profile?.department || ''),
          this.escapeCsvValue(r.totalMarksObtained),
          this.escapeCsvValue(r.maximumMarks),
          this.escapeCsvValue(`${r.percentage}%`),
          this.escapeCsvValue(typeof r.percentile === 'number' ? `${r.percentile}%` : ''),
          this.escapeCsvValue(r.isPassed ? 'PASSED' : 'FAILED'),
          this.escapeCsvValue(r.evaluatedAt ? new Date(r.evaluatedAt).toISOString() : ''),
        ].join(',')
      );
    }

    return rows.join('\n');
  },
};

export default exportService;
