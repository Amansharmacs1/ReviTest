import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { scheduleService } from '../../services/scheduleService';
import { proctorService } from '../../services/proctorService';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  Bell,
  Clock,
  Send,
  Radio,
  Search,
} from 'lucide-react';

export const LiveProctorDashboard = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  const [feedData, setFeedData] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [warningModalTarget, setWarningModalTarget] = useState(null); // attempt
  const [warningMessage, setWarningMessage] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);

  const [terminateModalTarget, setTerminateModalTarget] = useState(null); // attempt
  const [terminateReason, setTerminateReason] = useState('');
  const [terminating, setTerminating] = useState(false);

  const [auditModalTarget, setAuditModalTarget] = useState(null); // attempt
  const [auditViolations, setAuditViolations] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [feedback, setFeedback] = useState(null);
  const refreshIntervalRef = useRef(null);

  // 1. Fetch available schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoadingSchedules(true);
        const res = await scheduleService.getSchedules({ limit: 50 });
        const list = res.data?.schedules || [];
        setSchedules(list);
        if (list.length > 0) {
          // Select first active schedule, or first schedule
          const active = list.find((s) => s.status === 'ACTIVE') || list[0];
          setSelectedScheduleId(active._id);
        }
      } catch (err) {
        console.error('Error fetching schedules for proctoring:', err);
      } finally {
        setLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, []);

  // 2. Fetch live feed for selected schedule
  const fetchLiveFeed = useCallback(async () => {
    if (!selectedScheduleId) return;
    try {
      const res = await proctorService.getLiveScheduleFeed(selectedScheduleId);
      setFeedData(res.data);
    } catch (err) {
      console.error('Error fetching proctor live feed:', err);
    }
  }, [selectedScheduleId]);

  useEffect(() => {
    if (!selectedScheduleId) return;
    setLoadingFeed(true);
    fetchLiveFeed().finally(() => setLoadingFeed(false));
  }, [selectedScheduleId, fetchLiveFeed]);

  // 3. Auto-refresh polling every 6 seconds
  useEffect(() => {
    if (autoRefresh && selectedScheduleId) {
      refreshIntervalRef.current = setInterval(() => {
        fetchLiveFeed();
      }, 6000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh, selectedScheduleId, fetchLiveFeed]);

  // Handle Warning
  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!warningModalTarget || !warningMessage.trim()) return;

    setSendingWarning(true);
    try {
      await proctorService.issueWarning(warningModalTarget._id, warningMessage.trim());
      setFeedback({ type: 'success', message: 'Warning dispatched to candidate interface.' });
      setWarningModalTarget(null);
      setWarningMessage('');
      fetchLiveFeed();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to issue warning.' });
    } finally {
      setSendingWarning(false);
    }
  };

  // Handle Terminate
  const handleTerminateAttempt = async (e) => {
    e.preventDefault();
    if (!terminateModalTarget) return;

    setTerminating(true);
    try {
      await proctorService.terminateAttempt(
        terminateModalTarget._id,
        terminateReason.trim() || 'Misconduct confirmed by proctor'
      );
      setFeedback({ type: 'success', message: 'Attempt terminated and sealed.' });
      setTerminateModalTarget(null);
      setTerminateReason('');
      fetchLiveFeed();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to terminate attempt.' });
    } finally {
      setTerminating(false);
    }
  };

  // Handle View Audit
  const handleOpenAudit = async (attempt) => {
    setAuditModalTarget(attempt);
    setLoadingAudit(true);
    try {
      const res = await proctorService.getAttemptViolations(attempt._id);
      setAuditViolations(res.data?.violations || []);
    } catch (err) {
      console.error('Failed to load audit violations:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const summary = feedData?.summary || {
    totalAssigned: 0,
    activeNow: 0,
    submitted: 0,
    flagged: 0,
    totalViolations: 0,
  };

  const attempts = feedData?.attempts || [];
  const filteredAttempts = attempts.filter((att) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = att.candidateId?.name?.toLowerCase() || '';
    const email = att.candidateId?.email?.toLowerCase() || '';
    const studentId = att.candidateId?.profile?.studentId?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || studentId.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Bar: Assessment Selector & Auto-Refresh Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-navy whitespace-nowrap">
            Monitored Assessment:
          </label>
          {loadingSchedules ? (
            <div className="text-xs text-slate-400">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="text-xs text-slate-400">No schedules created yet.</div>
          ) : (
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {schedules.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title} ({s.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span className="text-xs font-semibold text-slate-600">
              {autoRefresh ? 'Live Monitoring (6s)' : 'Paused'}
            </span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-[11px] rounded font-bold border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
            >
              {autoRefresh ? 'Turn Off' : 'Enable Live'}
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchLiveFeed}
            disabled={loadingFeed}
          >
            Refresh
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Enrolled</span>
          <span className="text-xl font-bold text-navy">{summary.totalAssigned}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-emerald-600 block text-[10px] uppercase font-bold">Active Now</span>
          <span className="text-xl font-bold text-emerald-700">{summary.activeNow}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-400">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Completed</span>
          <span className="text-xl font-bold text-slate-700">{summary.submitted}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-amber-600 block text-[10px] uppercase font-bold">Flagged</span>
          <span className="text-xl font-bold text-amber-700">{summary.flagged}</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <span className="text-rose-600 block text-[10px] uppercase font-bold">Incidents</span>
          <span className="text-xl font-bold text-rose-700">{summary.totalViolations}</span>
        </Card>
      </div>

      {/* Main Grid: Examinees Table + Incident Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Candidate Roster */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-navy text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-primary" />
              <span>Examinee Roster ({filteredAttempts.length})</span>
            </h3>

            {/* Search filter */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search examinee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            {filteredAttempts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active or submitted examination attempts recorded for this schedule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Switches</th>
                      <th className="p-3 text-center">Violations</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att) => {
                      const isTerminated =
                        att.submissionReason === 'VIOLATION_TERMINATED' ||
                        att.submissionReason === 'PROCTOR_FORCE_SUBMIT';

                      return (
                        <tr
                          key={att._id}
                          className={`hover:bg-slate-50 transition-colors ${
                            att.isFlagged ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-navy">{att.candidateId?.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {att.candidateId?.email}
                            </div>
                            {att.candidateId?.profile?.studentId && (
                              <div className="text-[10px] text-slate-500">
                                ID: {att.candidateId.profile.studentId}
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            {att.status === 'IN_PROGRESS' ? (
                              <Badge variant="success" size="sm" dot>
                                Active Exam
                              </Badge>
                            ) : isTerminated ? (
                              <Badge variant="error" size="sm" dot>
                                Terminated
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm" dot>
                                Submitted
                              </Badge>
                            )}
                            {att.isFlagged && (
                              <span className="block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded w-fit">
                                ⚠️ Flagged
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-xs ${
                                (att.tabSwitchCount || 0) > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-600'
                              }`}
                            >
                              {att.tabSwitchCount || 0}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenAudit(att)}
                              className={`font-bold px-2 py-0.5 rounded text-xs transition-colors ${
                                (att.violationCount || 0) > 0
                                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                  : 'text-slate-400 hover:text-slate-700'
                              }`}
                              title="Click to view incidents"
                            >
                              {att.violationCount || 0}
                            </button>
                          </td>

                          <td className="p-3 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleOpenAudit(att)}
                              title="Audit Incidents"
                            />
                            {att.status === 'IN_PROGRESS' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={Bell}
                                  onClick={() => setWarningModalTarget(att)}
                                  className="text-amber-600 hover:text-amber-700 border-amber-300"
                                  title="Issue Warning"
                                >
                                  Warn
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  icon={XCircle}
                                  onClick={() => setTerminateModalTarget(att)}
                                  className="text-rose-600 hover:text-rose-700 border-rose-300"
                                  title="Terminate Attempt"
                                >
                                  End
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right (1 col): Live Incidents Stream */}
        <div className="space-y-3">
          <h3 className="font-bold text-navy text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Security Incident Stream</span>
          </h3>

          <Card className="p-4 divide-y divide-slate-100 max-h-[540px] overflow-y-auto space-y-3">
            {feedData?.recentViolations?.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No security incidents reported.
              </div>
            ) : (
              feedData?.recentViolations?.map((violation) => (
                <div key={violation._id} className="pt-2 first:pt-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy truncate max-w-[140px]">
                      {violation.candidateId?.name || 'Examinee'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(violation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        violation.severity === 'CRITICAL' || violation.severity === 'HIGH'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {violation.violationType}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-tight">
                    {violation.details}
                  </p>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Warning Modal */}
      <Modal
        isOpen={Boolean(warningModalTarget)}
        onClose={() => setWarningModalTarget(null)}
        title={`Issue Official Warning to ${warningModalTarget?.candidateId?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSendWarning} className="space-y-4 text-xs">
          <p className="text-slate-600">
            This message will appear directly on the examinee&apos;s screen as an integrity warning alert.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warning Message:</label>
            <textarea
              required
              rows={3}
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              placeholder="e.g. Please refrain from switching windows. Your screen is being actively monitored."
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setWarningModalTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Send}
              disabled={sendingWarning || !warningMessage.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {sendingWarning ? 'Sending...' : 'Dispatch Warning'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Terminate Modal */}
      <Modal
        isOpen={Boolean(terminateModalTarget)}
        onClose={() => setTerminateModalTarget(null)}
        title="Force Terminate Examination Attempt"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTerminateAttempt} className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg space-y-1">
            <span className="font-bold block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Immediate Disqualification
            </span>
            <p className="leading-relaxed text-[11px]">
              This will immediately lock the examinee out of the assessment, seal their answers as
              auto-submitted under misconduct, and generate a permanent audit record.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Termination Justification:
            </label>
            <textarea
              required
              rows={3}
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              placeholder="e.g. Unauthorised materials detected during physical / webcam proctoring audit."
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setTerminateModalTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={XCircle}
              disabled={terminating || !terminateReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {terminating ? 'Terminating...' : 'Confirm Disqualification'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Incidents Audit Modal */}
      <Modal
        isOpen={Boolean(auditModalTarget)}
        onClose={() => setAuditModalTarget(null)}
        title={`Integrity Audit Log: ${auditModalTarget?.candidateId?.name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-bold text-navy block">
                {auditModalTarget?.candidateId?.name}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {auditModalTarget?.candidateId?.email}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Total Violations
              </span>
              <span className="text-base font-bold text-rose-600">
                {auditModalTarget?.violationCount || 0}
              </span>
            </div>
          </div>

          {loadingAudit ? (
            <div className="py-8 text-center text-slate-400">Loading incident history...</div>
          ) : auditViolations.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No violations logged for this attempt.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {auditViolations.map((v, idx) => (
                <div key={v._id || idx} className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={v.severity === 'HIGH' ? 'error' : 'warning'} size="sm">
                      {v.violationType}
                    </Badge>
                    <span className="text-slate-400 text-[10px] font-mono">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px]">{v.details}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setAuditModalTarget(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LiveProctorDashboard;
