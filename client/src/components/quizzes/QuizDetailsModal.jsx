import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../common/Input';
import Card from '../common/Card';
import QRCode from '../common/QRCode';
import { quizService } from '../../services/quizService';
import {
  Play,
  Square,
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Send,
  Eye,
} from 'lucide-react';

export const QuizDetailsModal = ({ isOpen, onClose, quizId, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'results', 'leaderboard', 'sheets'
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState(null);
  const [resultsData, setResultsData] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Google Sheets config state
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [syncingSheets, setSyncingSheets] = useState(false);

  const fetchQuizDetails = async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      const res = await quizService.getQuizById(quizId);
      setQuizData(res.data);
      setSheetWebhookUrl(res.data.quiz?.googleSheet?.webhookUrl || '');
    } catch (err) {
      console.error('Error fetching quiz details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!quizId) return;
    try {
      const res = await quizService.getQuizResults(quizId, { search });
      setResultsData(res.data.participants || []);
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const fetchLeaderboard = async () => {
    if (!quizId) return;
    try {
      const res = await quizService.getLeaderboard(quizId);
      setLeaderboardData(res.data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  useEffect(() => {
    if (isOpen && quizId) {
      fetchQuizDetails();
      fetchResults();
      fetchLeaderboard();
    }
  }, [isOpen, quizId]);

  useEffect(() => {
    if (activeTab === 'results') fetchResults();
    if (activeTab === 'leaderboard') fetchLeaderboard();
  }, [activeTab, search]);

  const handleCopyLink = () => {
    if (!quizData?.quiz?.publicQuizId) return;
    const fullUrl = `${window.location.origin}/quiz/${quizData.quiz.publicQuizId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Toggle Quiz Status (Start -> LIVE, Stop -> STOPPED)
  const handleToggleStatus = async (newStatus) => {
    const isStopping = newStatus === 'STOPPED';
    if (
      isStopping &&
      !window.confirm(
        'Are you sure you want to STOP this quiz? New participants will no longer be accepted and all active student attempts will be finalized.'
      )
    ) {
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      await quizService.updateQuizStatus(quizId, newStatus);
      setFeedback({
        type: 'success',
        message: `Quiz is now ${newStatus}!`,
      });
      await fetchQuizDetails();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update quiz status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const res = await quizService.exportResultsCsv(quizId);
      const url = window.URL.createObjectURL(new Blob([res.data || res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quiz_results_${quizData?.quiz?.title || 'quiz'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Manual Google Sheets Sync
  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    setFeedback(null);
    try {
      const res = await quizService.syncGoogleSheets(quizId);
      setFeedback({ type: 'success', message: res.message });
      await fetchQuizDetails();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSyncingSheets(false);
    }
  };

  // Save Google Sheets Webhook URL
  const handleSaveGoogleConfig = async (e) => {
    e.preventDefault();
    try {
      await quizService.updateGoogleConfig(quizId, {
        webhookUrl: sheetWebhookUrl,
      });
      setFeedback({
        type: 'success',
        message: 'Google Sheets webhook configuration saved.',
      });
      await fetchQuizDetails();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  if (!isOpen) return null;

  const quiz = quizData?.quiz;
  const stats = quizData?.stats || {
    totalParticipants: 0,
    completedSubmissions: 0,
    averageScore: 0,
    highestScore: 0,
  };
  const isLive = quiz?.quizStatus === 'LIVE';
  const isStopped = quiz?.quizStatus === 'STOPPED' || quiz?.quizStatus === 'COMPLETED';
  const publicUrl = quiz?.publicQuizId
    ? `${window.location.origin}/quiz/${quiz.publicQuizId}`
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={quiz?.title || 'Quiz Management'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Top Action & Status Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-navy via-navy-800 to-navy-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  isLive ? 'success' : isStopped ? 'danger' : 'warning'
                }
                size="md"
              >
                {quiz?.quizStatus}
              </Badge>
              <span className="text-xs text-slate-300 font-mono">
                {quizData?.questions?.length || 0} Questions • {quiz?.durationMinutes} Mins • {quiz?.totalMarks} Marks
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white truncate max-w-md">
              {quiz?.title}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {isLive ? (
              <Button
                variant="outline"
                size="md"
                disabled={actionLoading}
                onClick={() => handleToggleStatus('STOPPED')}
                className="bg-rose-600/90 hover:bg-rose-700 text-white border-rose-500 font-bold"
                icon={Square}
              >
                Stop Quiz
              </Button>
            ) : isStopped ? (
              <Button
                variant="outline"
                size="md"
                disabled={actionLoading}
                onClick={() => handleToggleStatus('LIVE')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 font-bold"
                icon={Play}
              >
                Re-Open Quiz
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                disabled={actionLoading}
                onClick={() => handleToggleStatus('LIVE')}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20"
                icon={Play}
              >
                Start Quiz (Make Live)
              </Button>
            )}

            <Button
              variant="outline"
              size="md"
              onClick={handleCopyLink}
              icon={copiedLink ? Check : Copy}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs font-semibold"
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="underline font-bold hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6">
            {[
              { id: 'overview', label: 'Overview & Share', icon: Share2 },
              {
                id: 'results',
                label: `Results (${resultsData.length})`,
                icon: Users,
              },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              {
                id: 'sheets',
                label: 'Google Sheets Sync',
                icon: FileSpreadsheet,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-xs transition-colors ${
                    isActive
                      ? 'border-brand-primary text-brand-primary font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: OVERVIEW & SHARE */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Participants
                </span>
                <div className="text-2xl font-black text-navy">
                  {stats.totalParticipants}
                </div>
              </Card>
              <Card className="p-4 bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Completed
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  {stats.completedSubmissions}
                </div>
              </Card>
              <Card className="p-4 bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Average Score
                </span>
                <div className="text-2xl font-black text-brand-primary">
                  {Math.round(stats.averageScore || 0)}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {quiz?.totalMarks}
                  </span>
                </div>
              </Card>
              <Card className="p-4 bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Highest Score
                </span>
                <div className="text-2xl font-black text-purple-600">
                  {stats.highestScore || 0}
                </div>
              </Card>
            </div>

            {/* Share Public Link & QR Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center p-6 bg-blue-50/40 rounded-2xl border border-blue-100">
              <div className="sm:col-span-2 space-y-3">
                <Badge variant="navy" size="sm">
                  Student Access
                </Badge>
                <h3 className="text-base font-bold text-navy">
                  Share Quiz with Students
                </h3>
                <p className="text-xs text-slate-600">
                  Students open this link on their laptop or mobile phone to participate. No login required.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 select-all"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCopyLink}
                    icon={copiedLink ? Check : Copy}
                  >
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Classroom QR Code */}
              <div className="flex justify-center sm:justify-end">
                <QRCode value={publicUrl} size={140} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESULTS TABLE */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search student or roll number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                icon={Download}
                className="self-start sm:self-auto"
              >
                Export CSV
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Roll No</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Percentage</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultsData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No submissions yet. Share the quiz link with students to begin.
                      </td>
                    </tr>
                  ) : (
                    resultsData.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-navy">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {p.email}
                        </td>
                        <td className="py-3 px-3 font-mono">{p.rollNumber || '—'}</td>
                        <td className="py-3 px-3 font-bold text-brand-primary font-mono">
                          {p.score} / {p.maximumMarks}
                        </td>
                        <td className="py-3 px-3">{p.percentage}%</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              p.status === 'SUBMITTED' ? 'success' : 'warning'
                            }
                            size="sm"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {p.submittedAt
                            ? new Date(p.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'In Progress'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-navy">
                Competition Rankings (Tied scores receive equal rank)
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Private to Creator</span>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Percentage</th>
                    <th className="py-3 px-3">Time Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No ranked examinees yet.
                      </td>
                    </tr>
                  ) : (
                    leaderboardData.map((item, idx) => (
                      <tr
                        key={idx}
                        className={
                          item.rank <= 3
                            ? 'bg-amber-50/40 font-semibold'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                              item.rank === 1
                                ? 'bg-amber-400 text-white'
                                : item.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : item.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-navy">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 font-bold text-brand-primary font-mono">
                          {item.score} / {item.maximumMarks}
                        </td>
                        <td className="py-3 px-3">{item.percentage}%</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">
                          {Math.round(item.timeTakenSeconds || 0)}s
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: GOOGLE SHEETS SYNC */}
        {activeTab === 'sheets' && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-navy">
                      Google Sheets Live Synchronization
                    </h3>
                    <p className="text-xs text-slate-500">
                      Synchronize student registrations and marks directly to Google Sheets.
                    </p>
                  </div>
                </div>

                <Badge
                  variant={
                    quiz?.googleSheet?.syncStatus === 'SYNCED'
                      ? 'success'
                      : quiz?.googleSheet?.syncStatus === 'FAILED'
                      ? 'danger'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {quiz?.googleSheet?.syncStatus || 'IDLE'}
                </Badge>
              </div>

              <form onSubmit={handleSaveGoogleConfig} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Google Apps Script Webhook URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={sheetWebhookUrl}
                    onChange={(e) => setSheetWebhookUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="text-[11px] text-slate-400 block">
                    Paste the Webhook URL from your Google Apps Script connected to your spreadsheet.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" variant="outline" size="sm">
                    Save Webhook
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={syncingSheets || !sheetWebhookUrl}
                    onClick={handleSyncSheets}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    icon={RefreshCw}
                  >
                    {syncingSheets ? 'Syncing...' : 'Sync to Google Sheets Now'}
                  </Button>
                </div>
              </form>

              {quiz?.googleSheet?.lastSyncedAt && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>
                    Last Synced:{' '}
                    <strong>
                      {new Date(quiz.googleSheet.lastSyncedAt).toLocaleString()}
                    </strong>
                  </span>
                  {quiz.googleSheet.syncError && (
                    <span className="text-rose-600 font-semibold">
                      Error: {quiz.googleSheet.syncError}
                    </span>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuizDetailsModal;
