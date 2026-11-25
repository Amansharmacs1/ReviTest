import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  Layers,
} from 'lucide-react';

export const ExamValidationModal = ({
  isOpen,
  onClose,
  validationData,
  onProceedToPublish,
}) => {
  if (!validationData) return null;

  const { isValid, errors = [], warnings = [], summary } = validationData;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Pre-Flight Validation Report"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="font-bold text-sm">
              {isValid
                ? 'All Pre-Flight Checks Passed'
                : 'Validation Errors Detected'}
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              {isValid
                ? 'This examination meets all structural, integrity, and organization policy requirements and is ready for publication.'
                : 'Please resolve the following issues before this examination can be published.'}
            </p>
          </div>
        </div>

        {/* Errors List */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Critical Errors ({errors.length})</span>
            </h4>
            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1.5">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 text-rose-800 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings List */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Warnings ({warnings.length})</span>
            </h4>
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1.5">
              {warnings.map((warn, idx) => (
                <div key={idx} className="flex items-start gap-2 text-amber-800 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Telemetry */}
        {summary && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Examination Structure Telemetry
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Questions
                </span>
                <span className="text-lg font-black text-navy">
                  {summary.totalQuestions}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Total Marks
                </span>
                <span className="text-lg font-black text-brand-primary">
                  {summary.totalMarks}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Passing Marks
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {summary.passingMarks}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">
                  Sections
                </span>
                <span className="text-lg font-black text-indigo-700">
                  {summary.sectionCount}
                </span>
              </div>
            </div>

            {/* Distribution Breakdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 block">Difficulty Distribution</span>
                <div className="flex items-center gap-3">
                  <Badge variant="success" size="sm">
                    Easy: {summary.difficultyCounts?.EASY || 0}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    Medium: {summary.difficultyCounts?.MEDIUM || 0}
                  </Badge>
                  <Badge variant="error" size="sm">
                    Hard: {summary.difficultyCounts?.HARD || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 block">Question Types</span>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span>Single MCQ: <strong>{summary.questionTypeCounts?.MCQ_SINGLE || 0}</strong></span>
                  <span>•</span>
                  <span>Multi MCQ: <strong>{summary.questionTypeCounts?.MCQ_MULTIPLE || 0}</strong></span>
                  <span>•</span>
                  <span>T/F: <strong>{summary.questionTypeCounts?.TRUE_FALSE || 0}</strong></span>
                  <span>•</span>
                  <span>Descriptive: <strong>{summary.questionTypeCounts?.DESCRIPTIVE || 0}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Report
          </Button>
          {isValid && onProceedToPublish && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onProceedToPublish();
              }}
            >
              Proceed to Publish
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExamValidationModal;
