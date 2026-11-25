import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import { evaluationService } from '../../services/evaluationService';
import {
  BarChart2,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  HelpCircle,
  ArrowUpRight,
  Search,
  Sparkles,
} from 'lucide-react';

export const ScheduleAnalyticsModal = ({ isOpen, onClose, scheduleId, scheduleTitle }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leaderboard' | 'questions'
  const [analytics, setAnalytics] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);
      const [analyticsRes, lbRes] = await Promise.all([
        evaluationService.getScheduleAnalytics(scheduleId),
        evaluationService.getScheduleLeaderboard(scheduleId, { limit: 100 }),
      ]);
      setAnalytics(analyticsRes.data);
      setLeaderboardData(lbRes.data?.leaderboard || []);
    } catch (err) {
      console.error('Failed to load schedule analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (isOpen && scheduleId) {
      loadData();
    }
  }, [isOpen, scheduleId, loadData]);

  // Actions
  const handleBatchEvaluate = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await evaluationService.evaluateSchedule(scheduleId);
      setFeedback({
        type: 'success',
        message: `Successfully evaluated and ranked ${res.data?.evaluatedCount || 0} examination attempts.`,
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Batch evaluation failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishResults = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await evaluationService.publishResults(scheduleId);
      setFeedback({
        type: 'success',
        message: `Published scorecards to ${res.data?.publishedCount || 0} examinees.`,
      });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to publish results.' });
    } finally {
      setActionLoading(false);
    }
  };

  const summary = analytics?.summary || {
    totalEvaluated: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passPercentage: 0,
  };

  const filteredLeaderboard = leaderboardData.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name?.toLowerCase().includes(q) ||
      entry.email?.toLowerCase().includes(q) ||
      entry.studentId?.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assessment Results & Analytics: ${scheduleTitle || 'Schedule'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Action & Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Sub-tabs */}
          <div className="flex space-x-2">
            {[
              { id: 'overview', label: 'Overview & Distribution', icon: BarChart2 },
              { id: 'leaderboard', label: `Leaderboard (${leaderboardData.length})`, icon: Trophy },
              {
                id: 'questions',
                label: `Question Accuracy (${analytics?.questionAnalytics?.length || 0})`,
                icon: HelpCircle,
              },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === t.id
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={handleBatchEvaluate}
              disabled={actionLoading}
            >
              Run Evaluation
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={handlePublishResults}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              Publish Results
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="font-bold text-slate-400 hover:text-slate-600 ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            Calculating cohort performance analytics and rank percentiles...
          </div>
        ) : summary.totalEvaluated === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <h4 className="font-bold text-slate-700">No Evaluated Submissions Yet</h4>
            <p className="max-w-md mx-auto text-[11px]">
              Once examinees complete their test attempts, click &quot;Run Evaluation&quot; to compute
              automated scores, cohort rankings, and performance percentiles.
            </p>
          </div>
        ) : (
          <div className="max-h-[68vh] overflow-y-auto pr-1 space-y-4">
            {/* TAB 1: OVERVIEW & SCORE DISTRIBUTION */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Card className="p-3 border-l-4 border-l-blue-500">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Evaluated</span>
                    <span className="text-xl font-bold text-navy">{summary.totalEvaluated}</span>
                  </Card>
                  <Card className="p-3 border-l-4 border-l-brand-primary">
                    <span className="text-[10px] text-brand-primary uppercase font-bold block">Avg Score</span>
                    <span className="text-xl font-bold text-brand-primary">{summary.averageScore}</span>
                  </Card>
                  <Card className="p-3 border-l-4 border-l-emerald-500">
                    <span className="text-[10px] text-emerald-600 uppercase font-bold block">Highest Score</span>
                    <span className="text-xl font-bold text-emerald-700">{summary.highestScore}</span>
                  </Card>
                  <Card className="p-3 border-l-4 border-l-slate-400">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Lowest Score</span>
                    <span className="text-xl font-bold text-slate-600">{summary.lowestScore}</span>
                  </Card>
                  <Card className="p-3 border-l-4 border-l-purple-500">
                    <span className="text-[10px] text-purple-600 uppercase font-bold block">Pass Rate</span>
                    <span className="text-xl font-bold text-purple-700">{summary.passPercentage}%</span>
                  </Card>
                </div>

                {/* Score Distribution Breakdown */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-brand-primary" />
                    <span>Score Distribution Histogram</span>
                  </h4>

                  <div className="space-y-2">
                    {analytics?.scoreDistribution?.map((item) => {
                      const count = item.count || 0;
                      const percentage =
                        summary.totalEvaluated > 0
                          ? Math.round((count / summary.totalEvaluated) * 100)
                          : 0;

                      return (
                        <div key={item.bracket} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-slate-600">
                            <span>Bracket {item.bracket}</span>
                            <span>
                              {count} student{count !== 1 ? 's' : ''} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: COHORT LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-navy">
                    Rankings & Percentiles ({filteredLeaderboard.length})
                  </span>

                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search candidate..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="p-3 text-center">Rank</th>
                        <th className="p-3">Candidate</th>
                        <th className="p-3">ID / Roll</th>
                        <th className="p-3 text-right">Marks</th>
                        <th className="p-3 text-center">Percentile</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeaderboard.map((entry, idx) => (
                        <tr key={entry.candidateId || idx} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-bold text-navy">
                            {entry.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800">
                                🥇
                              </span>
                            ) : entry.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800">
                                🥈
                              </span>
                            ) : entry.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50 text-amber-700">
                                🥉
                              </span>
                            ) : (
                              `#${entry.rank}`
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-navy">{entry.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{entry.email}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{entry.studentId}</td>
                          <td className="p-3 text-right font-bold text-navy">
                            {entry.totalMarksObtained} / {entry.maximumMarks}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ({entry.percentage}%)
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">
                            {typeof entry.percentile === 'number' ? `${entry.percentile}%` : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={entry.isPassed ? 'success' : 'error'} size="sm">
                              {entry.isPassed ? 'Passed' : 'Failed'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: QUESTION ACCURACY ANALYSIS */}
            {activeTab === 'questions' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-navy">
                  Question-Level Accuracy & Difficulty Matrix
                </span>

                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Question Statement</th>
                        <th className="p-3 text-center">Type</th>
                        <th className="p-3 text-center">Correct</th>
                        <th className="p-3 text-center">Incorrect</th>
                        <th className="p-3 text-right">Accuracy Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics?.questionAnalytics?.map((q, idx) => {
                        const acc = q.accuracyRate || 0;
                        let badgeVariant = 'success';
                        if (acc < 40) badgeVariant = 'error';
                        else if (acc < 70) badgeVariant = 'warning';

                        return (
                          <tr key={q.questionId || idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-navy">Q{idx + 1}</td>
                            <td className="p-3 max-w-sm">
                              <span className="font-medium text-slate-800 line-clamp-2">
                                {q.questionText}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="neutral" size="sm">
                                {q.questionType?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center text-emerald-600 font-semibold">
                              {q.correctCount}
                            </td>
                            <td className="p-3 text-center text-rose-600 font-semibold">
                              {q.incorrectCount}
                            </td>
                            <td className="p-3 text-right">
                              <Badge variant={badgeVariant} size="sm">
                                {acc}% Accuracy
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleAnalyticsModal;
