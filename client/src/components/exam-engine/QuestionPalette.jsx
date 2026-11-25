import React from 'react';
import { Bookmark, CheckCircle2, Circle, Eye, HelpCircle } from 'lucide-react';

export const QuestionPalette = ({
  sections = [],
  activeSectionIndex,
  onSelectSection,
  questions = [],
  currentQuestionIndex,
  onSelectQuestion,
  responses = {}, // questionId -> { selectedOptions, textResponse, isMarkedForReview, visited }
}) => {
  // Compute question state helper
  const getQuestionState = (question) => {
    const resp = responses[question._id];
    const isVisited = resp?.visited || false;
    const isMarked = resp?.isMarkedForReview || false;

    const hasAnswer =
      (Array.isArray(resp?.selectedOptions) && resp.selectedOptions.length > 0) ||
      (typeof resp?.textResponse === 'string' && resp.textResponse.trim().length > 0);

    if (hasAnswer && isMarked) return 'ANSWERED_AND_MARKED';
    if (isMarked) return 'MARKED_FOR_REVIEW';
    if (hasAnswer) return 'ANSWERED';
    if (isVisited) return 'NOT_ANSWERED';
    return 'NOT_VISITED';
  };

  // Compute counts
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let markedCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q, idx) => {
    const state = getQuestionState(q, idx);
    if (state === 'ANSWERED' || state === 'ANSWERED_AND_MARKED') answeredCount++;
    if (state === 'NOT_ANSWERED') notAnsweredCount++;
    if (state === 'MARKED_FOR_REVIEW' || state === 'ANSWERED_AND_MARKED') markedCount++;
    if (state === 'NOT_VISITED') notVisitedCount++;
  });

  // Filter questions for the active section (if multiple sections exist)
  const activeSection = sections[activeSectionIndex];
  const displayQuestions = activeSection
    ? questions
        .map((q, idx) => ({ ...q, originalIndex: idx }))
        .filter((q) => q.sectionId === activeSection._id || !q.sectionId)
    : questions.map((q, idx) => ({ ...q, originalIndex: idx }));

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 select-none">
      {/* Sections tabs (if multiple) */}
      {sections.length > 1 && (
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Sections
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((sec, idx) => (
              <button
                key={sec._id || idx}
                onClick={() => onSelectSection(idx)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activeSectionIndex === idx
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Palette Legend */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50 text-[11px] grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-emerald-600 text-white shrink-0">
            {answeredCount}
          </span>
          <span className="text-slate-600">Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-amber-500 text-white shrink-0">
            {notAnsweredCount}
          </span>
          <span className="text-slate-600">Not Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-purple-600 text-white shrink-0">
            {markedCount}
          </span>
          <span className="text-slate-600">Marked Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-slate-200 text-slate-700 shrink-0">
            {notVisitedCount}
          </span>
          <span className="text-slate-600">Not Visited</span>
        </div>
      </div>

      {/* Question Number Grid */}
      <div className="p-3 flex-1 overflow-y-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Questions ({displayQuestions.length})
        </span>

        <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {displayQuestions.map((q) => {
            const originalIdx = q.originalIndex;
            const isCurrent = currentQuestionIndex === originalIdx;
            const state = getQuestionState(q, originalIdx);

            let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
            if (state === 'ANSWERED') {
              bgClass = 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700';
            } else if (state === 'NOT_ANSWERED') {
              bgClass = 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600';
            } else if (state === 'MARKED_FOR_REVIEW') {
              bgClass = 'bg-purple-600 text-white hover:bg-purple-700 border-purple-700';
            } else if (state === 'ANSWERED_AND_MARKED') {
              bgClass =
                'bg-purple-700 text-white hover:bg-purple-800 border-purple-800 ring-2 ring-emerald-400 ring-offset-1';
            }

            return (
              <button
                key={q._id || originalIdx}
                onClick={() => onSelectQuestion(originalIdx)}
                className={`relative h-10 w-full rounded-lg font-bold text-xs flex items-center justify-center transition-all border ${bgClass} ${
                  isCurrent ? 'ring-2 ring-brand-primary ring-offset-2 scale-105 shadow-sm' : ''
                }`}
                title={`Question ${originalIdx + 1} - ${state.replace(/_/g, ' ')}`}
              >
                <span>{originalIdx + 1}</span>
                {(state === 'MARKED_FOR_REVIEW' || state === 'ANSWERED_AND_MARKED') && (
                  <Bookmark className="w-2.5 h-2.5 absolute top-1 right-1 fill-white text-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionPalette;
