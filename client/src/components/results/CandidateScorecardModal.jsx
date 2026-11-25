import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { evaluationService } from '../../services/evaluationService';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  FileText,
  BarChart2,
  Target,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const CandidateScorecardModal = ({ isOpen, onClose, attemptId }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    if (!isOpen || !attemptId) return;

    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await evaluationService.getCandidateResult(attemptId);
        setResult(res.data);
      } catch (err) {
        setError(err.message || 'Results are pending evaluation or unpublished.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [isOpen, attemptId]);

  const toggleQuestion = (idx) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Scorecard & Performance Evaluation"
      maxWidth="max-w-3xl"
    >
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading authenticated scorecard and evaluation breakdown...
        </div>
      ) : error ? (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
          <span className="font-bold block">Results Pending or Unpublished</span>
          <p>{error}</p>
        </div>
      ) : !result ? null : (
        <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
          {/* Hero Banner: Score, Pass/Fail, Rank & Percentile */}
          <div
            className={`p-5 rounded-xl border text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              result.isPassed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500 shadow-sm'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                {result.examTitle}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold tracking-tight">
                  {result.totalMarksObtained}
                </span>
                <span className="text-sm text-emerald-100 font-medium">
                  / {result.maximumMarks} marks ({result.percentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    result.isPassed ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
                  }`}
                >
                  {result.isPassed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> NEEDS IMPROVEMENT
                    </>
                  )}
                </span>
                <span className="text-[11px] text-white/80">
                  Passing threshold: {result.examMetadata?.passingMarks ?? 0} marks
                </span>
              </div>
            </div>

            {/* Rank & Percentile Stats */}
            <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
              <div className="text-center">
                <span className="text-[10px] text-white/70 uppercase block font-semibold">Cohort Rank</span>
                <span className="text-lg font-bold flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  {result.rank ? `#${result.rank}` : '—'}
                </span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] text-white/70 uppercase block font-semibold">Percentile</span>
                <span className="text-lg font-bold">
                  {typeof result.percentile === 'number' ? `${result.percentile}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Accuracy Rate</span>
              <span className="text-base font-extrabold text-navy">{result.accuracyRate}%</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center text-emerald-800">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">Correct</span>
              <span className="text-base font-extrabold">{result.totalCorrect}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center text-rose-800">
              <span className="text-[10px] font-bold uppercase text-rose-600 block">Incorrect</span>
              <span className="text-base font-extrabold">{result.totalIncorrect}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center text-amber-800">
              <span className="text-[10px] font-bold uppercase text-amber-600 block">Unanswered</span>
              <span className="text-base font-extrabold">{result.totalUnanswered}</span>
            </div>
          </div>

          {/* Section Breakdown */}
          {result.sectionScores?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-brand-primary" />
                <span>Section Performance Breakdown</span>
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Section</th>
                      <th className="p-2.5 text-center">Questions</th>
                      <th className="p-2.5 text-center">Correct</th>
                      <th className="p-2.5 text-center">Incorrect</th>
                      <th className="p-2.5 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.sectionScores.map((sec, idx) => (
                      <tr key={sec.sectionId || idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-navy">{sec.title}</td>
                        <td className="p-2.5 text-center">{sec.questionsCount}</td>
                        <td className="p-2.5 text-center text-emerald-600 font-semibold">
                          {sec.correctCount}
                        </td>
                        <td className="p-2.5 text-center text-rose-600 font-semibold">
                          {sec.incorrectCount}
                        </td>
                        <td className="p-2.5 text-right font-bold text-navy">
                          {sec.marksObtained} / {sec.maximumMarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Question-By-Question Detailed Review */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-primary" />
              <span>Question-Level Answer Review ({result.questionEvaluations?.length || 0})</span>
            </h4>

            <div className="space-y-2">
              {result.questionEvaluations?.map((qe, idx) => {
                const isExpanded = expandedQuestions[idx] ?? false;

                let statusBadge = (
                  <Badge variant="neutral" size="sm">
                    Unanswered
                  </Badge>
                );
                if (qe.status === 'CORRECT') {
                  statusBadge = (
                    <Badge variant="success" size="sm">
                      Correct (+{qe.marksAwarded})
                    </Badge>
                  );
                } else if (qe.status === 'INCORRECT') {
                  statusBadge = (
                    <Badge variant="error" size="sm">
                      Incorrect ({qe.marksAwarded})
                    </Badge>
                  );
                } else if (qe.status === 'MANUAL_PENDING') {
                  statusBadge = (
                    <Badge variant="warning" size="sm">
                      Pending Faculty Review
                    </Badge>
                  );
                } else if (qe.status === 'MANUAL_GRADED') {
                  statusBadge = (
                    <Badge variant="info" size="sm">
                      Graded ({qe.marksAwarded}/{qe.maxMarks})
                    </Badge>
                  );
                }

                return (
                  <div
                    key={qe.questionId || idx}
                    className="border border-slate-200 rounded-lg bg-white overflow-hidden"
                  >
                    <div
                      onClick={() => toggleQuestion(idx)}
                      className="p-3 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-navy">Q{idx + 1}.</span>
                        <span className="text-slate-700 truncate font-medium">
                          {qe.questionText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusBadge}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100 text-xs">
                        {/* Full statement */}
                        <p className="text-slate-800 font-medium whitespace-pre-wrap">
                          {qe.questionText}
                        </p>

                        {/* Options display for objective questions */}
                        {qe.options?.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {qe.options.map((opt) => {
                              const isSelected = qe.selectedOptions?.includes(opt.optionId || opt.id);
                              const isCorrectOpt = opt.isCorrect;

                              let optClass = 'border-slate-200 bg-white text-slate-700';
                              if (isCorrectOpt) {
                                optClass = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold';
                              } else if (isSelected && !isCorrectOpt) {
                                optClass = 'border-rose-300 bg-rose-50 text-rose-900 font-semibold';
                              }

                              return (
                                <div
                                  key={opt.optionId || opt.id}
                                  className={`p-2.5 rounded-lg border flex items-center justify-between ${optClass}`}
                                >
                                  <span>{opt.text}</span>
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    {isSelected && (
                                      <span className="bg-slate-700 text-white px-2 py-0.5 rounded font-bold">
                                        Your Choice
                                      </span>
                                    )}
                                    {isCorrectOpt && (
                                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Correct Answer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Descriptive answer display */}
                        {qe.questionType === 'DESCRIPTIVE' && (
                          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Your Submitted Response:
                              </span>
                              <p className="text-slate-800 whitespace-pre-wrap mt-0.5 font-sans">
                                {qe.textAnswer || <span className="italic text-slate-400">No response provided</span>}
                              </p>
                            </div>
                            {qe.manualFeedback && (
                              <div className="pt-2 border-t border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-brand-primary block">
                                  Instructor Feedback:
                                </span>
                                <p className="text-slate-700 mt-0.5 italic">{qe.manualFeedback}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Explanation */}
                        {qe.explanation && (
                          <div className="p-2.5 bg-blue-50/60 border border-blue-200/60 rounded-lg text-blue-900">
                            <span className="font-bold block text-[10px] uppercase">Explanation:</span>
                            <p className="mt-0.5 text-[11px] leading-relaxed">{qe.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close Scorecard
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CandidateScorecardModal;
