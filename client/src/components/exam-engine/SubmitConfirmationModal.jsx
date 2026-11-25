import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { AlertTriangle, CheckCircle2, Send, HelpCircle } from 'lucide-react';

export const SubmitConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  questions = [],
  responses = {},
}) => {
  const [confirmedChecked, setConfirmedChecked] = useState(false);

  let answeredCount = 0;
  let notAnsweredCount = 0;
  let markedCount = 0;

  questions.forEach((q) => {
    const resp = responses[q._id];
    const hasAnswer =
      (Array.isArray(resp?.selectedOptions) && resp.selectedOptions.length > 0) ||
      (typeof resp?.textResponse === 'string' && resp.textResponse.trim().length > 0);

    if (hasAnswer) {
      answeredCount++;
    } else {
      notAnsweredCount++;
    }

    if (resp?.isMarkedForReview) {
      markedCount++;
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Submission Confirmation"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 text-xs">
        {/* Warning if unanswered questions */}
        {notAnsweredCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Unanswered Questions Remaining</span>
              <p className="leading-relaxed">
                You have <strong>{notAnsweredCount}</strong> question{notAnsweredCount > 1 ? 's' : ''} not yet answered out of {questions.length} total questions. Once submitted, you cannot change any answers.
              </p>
            </div>
          </div>
        )}

        {/* Statistics Table */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <h4 className="font-bold text-navy text-xs uppercase tracking-wider">
            Attempt Response Summary
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-white rounded border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Questions</span>
              <span className="text-base font-bold text-navy">{questions.length}</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-emerald-200 bg-emerald-50/20">
              <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Answered</span>
              <span className="text-base font-bold text-emerald-700">{answeredCount}</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-amber-200 bg-amber-50/20">
              <span className="text-amber-700 block text-[10px] uppercase font-semibold">Unanswered</span>
              <span className="text-base font-bold text-amber-700">{notAnsweredCount}</span>
            </div>
            <div className="p-2.5 bg-white rounded border border-purple-200 bg-purple-50/20">
              <span className="text-purple-700 block text-[10px] uppercase font-semibold">Marked Review</span>
              <span className="text-base font-bold text-purple-700">{markedCount}</span>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedChecked}
            onChange={(e) => setConfirmedChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
          />
          <span className="text-slate-700 leading-tight">
            I confirm that I have reviewed my responses and wish to conclude this examination. I understand that this action is final and irreversible.
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Return to Exam
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Send}
            onClick={onConfirm}
            disabled={!confirmedChecked || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? 'Submitting Responses...' : 'Confirm Final Submission'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SubmitConfirmationModal;
