import React from 'react';
import { Bookmark, ChevronLeft, ChevronRight, RotateCcw, CheckSquare, Square } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';

export const QuestionDisplay = ({
  question,
  questionNumber,
  totalQuestions,
  sectionTitle,
  response, // { selectedOptions: [], textResponse: '', isMarkedForReview: false }
  onOptionToggle,
  onTextChange,
  onToggleMarkReview,
  onClearResponse,
  onPrev,
  onNext,
  isFirst,
  isLast,
}) => {
  if (!question) {
    return (
      <div className="p-8 text-center text-slate-400">
        Select a question from the palette to begin.
      </div>
    );
  }

  const {
    questionText,
    questionType,
    options = [],
    marks = 1,
    negativeMarks = 0,
  } = question;

  const selectedOptions = response?.selectedOptions || [];
  const textResponse = response?.textResponse || '';
  const isMarked = response?.isMarkedForReview || false;

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Question Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <span className="font-bold text-navy text-sm sm:text-base">
            Question {questionNumber} of {totalQuestions}
          </span>
          {sectionTitle && (
            <Badge variant="neutral" size="sm">
              {sectionTitle}
            </Badge>
          )}
          <Badge variant="info" size="sm">
            {questionType?.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            +{marks} marks
          </span>
          {negativeMarks > 0 && (
            <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
              -{negativeMarks} mark
            </span>
          )}
        </div>
      </div>

      {/* Question Content & Input Controls */}
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Statement */}
        <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium">
          {questionText}
        </div>

        {/* Options Render based on Question Type */}
        <div className="pt-2">
          {/* MCQ_SINGLE */}
          {questionType === 'MCQ_SINGLE' && (
            <div className="space-y-3">
              {options.map((opt, idx) => {
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <label
                    key={opt.id || idx}
                    onClick={() => onOptionToggle(opt.id, false)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/5 text-navy font-semibold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-bold mr-2 text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* MCQ_MULTIPLE */}
          {questionType === 'MCQ_MULTIPLE' && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Multiple choices allowed — select all that apply
              </p>
              {options.map((opt, idx) => {
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <label
                    key={opt.id || idx}
                    onClick={() => onOptionToggle(opt.id, true)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/5 text-navy font-semibold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-bold mr-2 text-slate-400">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* TRUE_FALSE */}
          {questionType === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {['True', 'False'].map((val) => {
                const isSelected = selectedOptions.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onOptionToggle(val, false)}
                    className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-xs ring-2 ring-brand-primary ring-offset-1'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}

          {/* DESCRIPTIVE */}
          {questionType === 'DESCRIPTIVE' && (
            <div className="space-y-2">
              <textarea
                value={textResponse}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Type your detailed answer response here... Answers are automatically saved as you write."
                rows={8}
                className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm leading-relaxed font-sans text-slate-800"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>
                  Words: {textResponse.trim() ? textResponse.trim().split(/\s+/).length : 0} | Characters: {textResponse.length}
                </span>
                <span className="italic">Autosaves continuously</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action & Navigation Bar */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        {/* Left Actions: Mark for Review & Clear Response */}
        <div className="flex items-center gap-2">
          <Button
            variant={isMarked ? 'primary' : 'outline'}
            size="sm"
            icon={Bookmark}
            onClick={onToggleMarkReview}
            className={isMarked ? 'bg-purple-600 hover:bg-purple-700 border-purple-700' : ''}
          >
            {isMarked ? 'Marked for Review' : 'Mark for Review'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={onClearResponse}
            className="text-slate-600 hover:text-slate-900"
          >
            Clear Response
          </Button>
        </div>

        {/* Right Navigation: Previous / Next */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={onPrev}
            disabled={isFirst}
          >
            Previous
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onNext}
            disabled={isLast}
            className="flex items-center gap-1.5"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuestionDisplay;
