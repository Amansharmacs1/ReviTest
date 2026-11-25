import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SubmissionReceiptModal = ({
  isOpen,
  examTitle,
  attemptId,
  submittedAt,
  submissionReason = 'MANUAL',
}) => {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Disallow closing without navigation
      title="Examination Submitted Successfully"
      maxWidth="max-w-md"
    >
      <div className="space-y-5 text-xs text-center py-2">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-navy">
            {submissionReason === 'TIME_EXPIRED'
              ? 'Examination Time Expired & Submitted'
              : 'Examination Submitted'}
          </h3>
          <p className="text-slate-500 text-xs">
            Your responses have been recorded on the server and sealed.
          </p>
        </div>

        {/* Receipt Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assessment</span>
            <span className="font-bold text-navy">{examTitle || 'Online Examination'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submission Receipt ID</span>
            <span className="font-mono text-slate-700 text-[11px] select-all font-semibold">
              {attemptId}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submission Timestamp</span>
            <span className="font-mono text-slate-700 text-[11px]">
              {submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submission Mode</span>
            <span className="font-semibold text-slate-700">
              {submissionReason === 'TIME_EXPIRED'
                ? 'Server-authoritative timer expiration'
                : 'Candidate voluntary manual submission'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Evaluation will be performed according to your institution&apos;s evaluation schedule. Results will be accessible from your candidate dashboard once published.
        </p>

        <div className="pt-2 border-t border-slate-100">
          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            onClick={() => navigate('/app/dashboard')}
            className="w-full justify-center"
          >
            Return to Assessment Hub
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SubmissionReceiptModal;
