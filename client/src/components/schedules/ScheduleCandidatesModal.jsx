import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Pagination from '../common/Pagination';
import { scheduleService } from '../../services/scheduleService';
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const ScheduleCandidatesModal = ({ isOpen, onClose, schedule }) => {
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Assign additional candidates section
  const [assignBatchInput, setAssignBatchInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadCandidates = useCallback(async () => {
    if (!schedule?._id) return;
    setLoading(true);
    try {
      const res = await scheduleService.getScheduleCandidates(schedule._id, {
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setCandidates(res.data?.candidates || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch assigned candidates.',
      });
    } finally {
      setLoading(false);
    }
  }, [schedule, page, search, statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadCandidates();
    }
  }, [isOpen, loadCandidates]);

  const handleAssignAll = async () => {
    if (
      !window.confirm(
        'Assign ALL active candidates in your organization to this scheduled assessment?'
      )
    ) {
      return;
    }
    setAssigning(true);
    try {
      const res = await scheduleService.assignCandidates(schedule._id, { assignAll: true });
      setFeedback({
        type: 'success',
        message: res.message || 'All eligible candidates successfully assigned.',
      });
      loadCandidates();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to assign all candidates.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignBatch = async (e) => {
    e.preventDefault();
    if (!assignBatchInput.trim()) return;

    setAssigning(true);
    try {
      const res = await scheduleService.assignCandidates(schedule._id, {
        batch: assignBatchInput.trim(),
      });
      setFeedback({
        type: 'success',
        message: res.message || `Candidates in batch '${assignBatchInput}' assigned.`,
      });
      setAssignBatchInput('');
      loadCandidates();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to assign candidates by batch.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveCandidate = async (candidateId, name) => {
    if (!window.confirm(`Remove '${name}' from this examination schedule?`)) {
      return;
    }
    try {
      await scheduleService.removeCandidate(schedule._id, candidateId);
      setFeedback({
        type: 'success',
        message: `Candidate '${name}' removed from schedule.`,
      });
      loadCandidates();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to remove candidate.',
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACKNOWLEDGED':
        return <Badge variant="info">Acknowledged</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'SUBMITTED':
        return <Badge variant="success">Submitted</Badge>;
      case 'EXPIRED':
        return <Badge variant="navy">Expired</Badge>;
      case 'ASSIGNED':
      default:
        return <Badge variant="neutral">Assigned</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Candidate Roster: ${schedule?.title || 'Exam Schedule'}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        {feedback && (
          <div
            className={`p-3 text-xs rounded-lg flex items-center justify-between ${
              feedback.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Assignment Quick Actions */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleAssignBatch} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Department / Batch (e.g. CS-2026)"
              value={assignBatchInput}
              onChange={(e) => setAssignBatchInput(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary w-48 sm:w-60"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              icon={UserPlus}
              disabled={assigning || !assignBatchInput.trim()}
            >
              Assign Batch
            </Button>
          </form>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Users}
            onClick={handleAssignAll}
            disabled={assigning}
          >
            Assign All Candidates
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assigned candidates by name, email, or student ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={loadCandidates}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Student / Roll ID</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Attempts</th>
                <th className="py-2.5 px-3">Acknowledged</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Loading assigned candidates...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No candidates assigned to this schedule yet.
                  </td>
                </tr>
              ) : (
                candidates.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-navy">
                        {item.candidateId?.name || 'Unknown Candidate'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.candidateId?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {item.candidateId?.profile?.studentId || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {item.candidateId?.profile?.department || '—'}
                    </td>
                    <td className="py-2.5 px-3">{getStatusBadge(item.status)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {item.attemptsCount} / {schedule?.maxAttempts || 1}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {item.acknowledgedAt
                        ? new Date(item.acknowledgedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Pending'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.attemptsCount === 0 && item.status === 'ASSIGNED' ? (
                        <button
                          onClick={() =>
                            handleRemoveCandidate(item.candidateId?._id, item.candidateId?.name)
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove Candidate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Locked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={(p) => setPage(p)}
            isLoading={loading}
          />
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleCandidatesModal;
