import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { scheduleService } from '../../services/scheduleService';
import {
  FileText,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export const CandidatePreExamModal = ({ isOpen, onClose, scheduleId, onAcknowledged }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !scheduleId) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setAgreeChecked(false);

    const fetchPrecheck = async () => {
      try {
        const res = await scheduleService.getCandidatePrecheck(scheduleId);
        setData(res.data);
        if (res.data?.assignment?.status === 'ACKNOWLEDGED') {
          setSuccess(true);
        }
      } catch (err) {
        setError(err.message || 'Failed to verify exam access.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrecheck();
  }, [isOpen, scheduleId]);

  const handleAcknowledge = async () => {
    if (!agreeChecked) {
      setError('Please check the box confirming your agreement to exam integrity guidelines.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await scheduleService.acknowledgeExam(scheduleId);
      setSuccess(true);
      if (onAcknowledged) onAcknowledged();
    } catch (err) {
      setError(err.message || 'Failed to record rules acknowledgement.');
    } finally {
      setSubmitting(false);
    }
  };

  const snapshot = data?.safeExamSnapshot;
  const timing = data?.timing;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Instructions & Candidate Verification"
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Verifying student eligibility and assessment access window...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Access Blocked</span>
          </div>
          <p>{error}</p>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Header Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                {snapshot?.subject || 'Assessment'}
              </span>
              <Badge variant={data?.isEligible ? 'success' : 'warning'}>
                {data?.isEligible ? 'Access Window Open' : 'Restricted Window'}
              </Badge>
            </div>
            <h2 className="text-base font-bold text-navy">{snapshot?.title || data?.schedule?.title}</h2>
            {snapshot?.description && (
              <p className="text-slate-600 leading-relaxed">{snapshot.description}</p>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-brand-primary" />
                <span>
                  <strong>{snapshot?.durationMinutes || data?.schedule?.durationMinutes}</strong> mins
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  <strong>{snapshot?.totalMarks || 0}</strong> total marks
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  <strong>{snapshot?.totalQuestions || 0}</strong> questions
                </span>
              </div>
            </div>
          </div>

          {/* Timing & Schedule Window */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-navy">
              <Calendar className="w-3.5 h-3.5 text-brand-primary" />
              <span>Scheduled Access Slot</span>
            </div>
            <div className="text-[11px] text-slate-600 flex justify-between">
              <span>
                <strong>Opens:</strong>{' '}
                {new Date(data?.schedule?.startTime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              <span>
                <strong>Closes:</strong>{' '}
                {new Date(data?.schedule?.endTime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            {timing?.startsInSeconds > 0 && (
              <p className="text-[11px] font-semibold text-amber-600 pt-1">
                ⏳ Exam window opens in approximately {Math.ceil(timing.startsInSeconds / 60)} minutes.
              </p>
            )}
          </div>

          {/* Exam Instructions */}
          <div className="space-y-2">
            <h3 className="font-bold text-navy flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Assessment Rules & Instructions</span>
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
              {snapshot?.instructions ? (
                <p className="whitespace-pre-wrap">{snapshot.instructions}</p>
              ) : (
                <p>Ensure you have a reliable internet connection before commencing your attempt.</p>
              )}
              <ul className="list-disc pl-4 space-y-1 pt-1 text-slate-500">
                <li>Once started, the examination timer runs continuously on the server.</li>
                <li>Closing or refreshing your browser tab will not pause the timer.</li>
                <li>Answers are automatically synchronized with the server as you answer questions.</li>
                <li>
                  {snapshot?.settings?.allowNegativeMarking
                    ? '⚠️ Negative marking is enabled for incorrect answers on objective questions.'
                    : '✅ No negative marks will be deducted for incorrect answers.'}
                </li>
                <li>Browser navigation and window focus events may be logged for audit integrity.</li>
              </ul>
            </div>
          </div>

          {/* Acknowledgement Status / Form */}
          {success ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Integrity Rules Acknowledged</span>
                <span className="text-[11px] text-emerald-700">
                  You are verified and enrolled. When Phase 6 (Examination Engine) launches, you can proceed directly into the test interface.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeChecked}
                  onChange={(e) => setAgreeChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                />
                <span className="text-slate-700 leading-tight">
                  I confirm that I am the registered examinee. I have read and agree to abide by all
                  examination integrity guidelines and instructions stated above.
                </span>
              </label>

              {error && <p className="text-rose-600 text-[11px]">{error}</p>}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            {!success && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={handleAcknowledge}
                disabled={submitting || !agreeChecked}
              >
                {submitting ? 'Recording...' : 'Acknowledge Rules & Confirm'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CandidatePreExamModal;
