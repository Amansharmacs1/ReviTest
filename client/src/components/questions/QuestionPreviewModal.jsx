import React from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { CheckCircle2, Circle, AlertCircle, HelpCircle } from 'lucide-react';

export const QuestionPreviewModal = ({ isOpen, onClose, question }) => {
  if (!question) return null;

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'EASY':
        return <Badge variant="success" size="sm">Easy</Badge>;
      case 'HARD':
        return <Badge variant="error" size="sm">Hard</Badge>;
      case 'MEDIUM':
      default:
        return <Badge variant="warning" size="sm">Medium</Badge>;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'MCQ_SINGLE':
        return 'Single-Choice MCQ';
      case 'MCQ_MULTIPLE':
        return 'Multiple-Choice MCQ';
      case 'TRUE_FALSE':
        return 'True / False';
      case 'DESCRIPTIVE':
        return 'Descriptive Response';
      default:
        return type;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Preview"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-xs sm:text-sm">
        {/* Header Tags & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Badge variant="navy" size="sm">
              {getTypeLabel(question.questionType)}
            </Badge>
            {getDifficultyBadge(question.difficulty)}
            <Badge variant="neutral" size="sm">
              {question.subject}
            </Badge>
            <span className="text-slate-400 font-medium text-xs">/ {question.topic}</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs font-semibold">
            <span className="text-emerald-700">+{question.marks} Marks</span>
            {question.negativeMarks > 0 && (
              <span className="text-rose-600">-{question.negativeMarks} Negative</span>
            )}
          </div>
        </div>

        {/* Statement */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Question Statement
          </h4>
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-navy font-medium leading-relaxed whitespace-pre-wrap shadow-subtle">
            {question.statement}
          </div>
        </div>

        {/* Options for MCQ / True False */}
        {question.questionType !== 'DESCRIPTIVE' && question.options && question.options.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Options & Correct Answers
            </h4>
            <div className="space-y-2">
              {question.options.map((opt, idx) => (
                <div
                  key={opt.optionId || idx}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    opt.isCorrect
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-600">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt.text}</span>
                  </div>

                  {opt.isCorrect ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Correct Answer</span>
                    </span>
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descriptive Note */}
        {question.questionType === 'DESCRIPTIVE' && (
          <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 text-blue-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Descriptive Response Format</span>
            </div>
            <p className="text-slate-600">
              Candidates will type an essay or paragraph response. Evaluation is conducted manually by faculty in Phase 8.
            </p>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Explanation / Rationale
            </h4>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs leading-relaxed">
              {question.explanation}
            </div>
          </div>
        )}

        {/* Evaluation Guidance (Hidden from Candidates) */}
        {question.evaluationGuidance && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <span className="font-bold flex items-center gap-1 text-amber-800">
              <AlertCircle className="w-3.5 h-3.5" />
              Internal Faculty Evaluation Guidance (Confidential)
            </span>
            <p className="text-slate-700">{question.evaluationGuidance}</p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default QuestionPreviewModal;
