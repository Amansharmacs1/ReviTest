import React from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import {
  Clock,
  Award,
  Layers,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const ExamDetailsModal = ({ isOpen, onClose, exam }) => {
  if (!exam) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success" size="sm" dot>Published</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral" size="sm" dot>Archived</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="warning" size="sm" dot>Draft</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Examination: ${exam.title}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-xs sm:text-sm">
        {/* Header Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">
              Status
            </span>
            <div className="mt-1">{getStatusBadge(exam.status)}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">
              Duration
            </span>
            <span className="text-sm font-bold text-navy flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{exam.durationMinutes} mins</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">
              Total / Pass
            </span>
            <span className="text-sm font-bold text-brand-primary mt-1 block">
              {exam.totalMarks} / {exam.passingMarks}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">
              Version
            </span>
            <span className="text-sm font-bold text-navy mt-1 block">
              {exam.currentPublishedVersion > 0
                ? `v${exam.currentPublishedVersion} (Snapshot)`
                : 'Draft (v0)'}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Subject / Category:</span>
            <p className="font-semibold text-navy mt-0.5">
              {exam.subject} <span className="text-slate-400 font-normal">({exam.category})</span>
            </p>
          </div>
          <div>
            <span className="text-slate-400">Created By:</span>
            <p className="font-semibold text-navy mt-0.5">
              {exam.createdBy?.name || 'Administrator'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Candidate Instructions
            </h4>
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs whitespace-pre-wrap leading-relaxed shadow-subtle">
              {exam.instructions}
            </div>
          </div>
        )}

        {/* Sections & Questions Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-primary" />
              <span>Sections & Questions ({exam.sections?.length || 0} Sections)</span>
            </h4>
          </div>

          <div className="space-y-3">
            {exam.sections?.map((section, sIdx) => (
              <div
                key={section.sectionId || sIdx}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-subtle"
              >
                <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-xs">
                      {sIdx + 1}
                    </span>
                    <strong className="text-navy">{section.title}</strong>
                    {section.description && (
                      <span className="text-slate-400 text-[11px]">— {section.description}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-navy font-mono">
                    {section.sectionMarks || 0} Marks ({section.questions?.length || 0} Qs)
                  </span>
                </div>

                <div className="divide-y divide-slate-100 p-2">
                  {section.questions?.map((qRef, qIdx) => {
                    const qObj = qRef.questionId;
                    return (
                      <div
                        key={qObj?._id || qIdx}
                        className="p-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono text-slate-400 text-[11px] mt-0.5">
                            Q{qIdx + 1}.
                          </span>
                          <div>
                            <p className="font-medium text-navy leading-snug">
                              {qObj?.statement || 'Question Statement'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <Badge variant="neutral" size="sm">
                                {qObj?.questionType || 'MCQ'}
                              </Badge>
                              <Badge variant="navy" size="sm">
                                {qObj?.difficulty || 'MEDIUM'}
                              </Badge>
                              <span className="text-slate-400 font-mono">
                                Topic: {qObj?.topic || 'General'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono text-xs font-semibold">
                          <span className="text-emerald-700">+{qRef.marks} Marks</span>
                          {qRef.negativeMarks > 0 && (
                            <span className="text-rose-600 block text-[10px]">
                              -{qRef.negativeMarks} Neg
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Settings Badges */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
          <span className="font-bold text-slate-600 block">Assessment Delivery Settings:</span>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <Badge variant={exam.settings?.allowQuestionNavigation ? 'success' : 'neutral'} size="sm">
              Free Navigation: {exam.settings?.allowQuestionNavigation ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant={exam.settings?.allowMarkForReview ? 'info' : 'neutral'} size="sm">
              Mark for Review: {exam.settings?.allowMarkForReview ? 'Enabled' : 'Disabled'}
            </Badge>
            <Badge variant={exam.settings?.shuffleQuestions ? 'warning' : 'neutral'} size="sm">
              Shuffle Questions: {exam.settings?.shuffleQuestions ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={exam.settings?.allowNegativeMarking ? 'error' : 'neutral'} size="sm">
              Negative Marking: {exam.settings?.allowNegativeMarking ? 'Active' : 'Off'}
            </Badge>
            <Badge variant="neutral" size="sm">
              Results: {exam.settings?.resultVisibility}
            </Badge>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExamDetailsModal;
