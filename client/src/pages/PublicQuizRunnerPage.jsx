import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizService } from '../services/quizService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  Layers,
  BarChart2,
  ChevronRight,
  User,
  Mail,
  GraduationCap,
  Building,
} from 'lucide-react';

export const PublicQuizRunnerPage = () => {
  const { publicQuizId } = useParams();

  // Screen stages: 'LOADING', 'REGISTER', 'RUNNER', 'SUBMITTED', 'ERROR'
  const [stage, setStage] = useState('LOADING');
  const [errorMsg, setErrorMsg] = useState('');

  // Quiz metadata
  const [quizMeta, setQuizMeta] = useState(null);

  // Student registration details
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    college: '',
    department: '',
  });
  const [joining, setJoining] = useState(false);

  // Active attempt state
  const [attemptId, setAttemptId] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOptionId, selectedOptionIds, textAnswer } }
  const [savingState, setSavingState] = useState('idle'); // 'saving', 'saved', 'error'
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Server-authoritative timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const endsAtRef = useRef(null);

  // 1. Load Quiz Metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        setStage('LOADING');
        const res = await quizService.getPublicQuizMetadata(publicQuizId);
        setQuizMeta(res.data);
        setStage('REGISTER');
      } catch (err) {
        setErrorMsg(err.message || 'Unable to load quiz. Please verify the link.');
        setStage('ERROR');
      }
    };

    fetchMeta();
  }, [publicQuizId]);

  // 2. Handle joining the quiz
  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.email.trim()) return;

    setJoining(true);
    setErrorMsg('');
    try {
      const res = await quizService.joinPublicQuiz(publicQuizId, studentForm);
      const {
        attemptId: attId,
        candidateId: candId,
        endsAt,
        questions: qList,
      } = res.data;

      setAttemptId(attId);
      setCandidateId(candId);
      setQuestions(qList);

      // Setup countdown timer
      if (endsAt) {
        endsAtRef.current = new Date(endsAt).getTime();
        const diff = Math.max(0, Math.floor((endsAtRef.current - Date.now()) / 1000));
        setTimeLeftSeconds(diff);
      }

      setStage('RUNNER');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start quiz.');
    } finally {
      setJoining(false);
    }
  };

  // 3. Timer Countdown
  useEffect(() => {
    if (stage !== 'RUNNER' || !endsAtRef.current) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endsAtRef.current - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  // Format time remaining MM:SS
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 4. Save answer with debounce
  const saveAnswer = async (qId, optionId, isMultiple = false, text = '') => {
    setSavingState('saving');
    let updated;

    if (isMultiple) {
      const currentIds = answers[qId]?.selectedOptionIds || [];
      const newIds = currentIds.includes(optionId)
        ? currentIds.filter((id) => id !== optionId)
        : [...currentIds, optionId];
      updated = { selectedOptionIds: newIds, isMultiple: true };
    } else if (text !== undefined && text !== '') {
      updated = { textAnswer: text };
    } else {
      updated = { selectedOptionId: optionId };
    }

    setAnswers((prev) => ({
      ...prev,
      [qId]: updated,
    }));

    try {
      await quizService.savePublicAnswer(publicQuizId, {
        attemptId,
        candidateId,
        questionId: qId,
        selectedOptionId: updated.selectedOptionId,
        selectedOptionIds: updated.selectedOptionIds,
        descriptiveAnswer: updated.textAnswer,
      });
      setSavingState('saved');
    } catch (err) {
      console.error('Failed to autosave answer:', err);
      setSavingState('error');
    }
  };

  // 5. Submit Quiz
  const handleSubmitQuiz = async () => {
    if (
      !window.confirm(
        'Are you sure you want to finish and submit your quiz answers?'
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await quizService.submitPublicQuiz(publicQuizId, {
        attemptId,
        candidateId,
      });
      setSubmissionResult(res.data);
      setStage('SUBMITTED');
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      const res = await quizService.submitPublicQuiz(publicQuizId, {
        attemptId,
        candidateId,
      });
      setSubmissionResult(res.data);
      setStage('SUBMITTED');
    } catch (err) {
      console.error('Auto submission error:', err);
      setStage('SUBMITTED');
    }
  };

  // =========================================================================
  // RENDER: LOADING STATE
  // =========================================================================
  if (stage === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-navy">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: ERROR STATE
  // =========================================================================
  if (stage === 'ERROR') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy">Unable to Open Quiz</h2>
          <p className="text-sm text-slate-600">{errorMsg}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER: SUBMITTED CONFIRMATION & RESULTS
  // =========================================================================
  if (stage === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-navy">Quiz Submitted!</h2>
            <p className="text-xs text-slate-500">
              Your responses have been securely recorded.
            </p>
          </div>

          {/* Show Immediate Result Score if configured */}
          {submissionResult?.showResults && submissionResult?.score !== null && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 space-y-1">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Your Score
              </span>
              <div className="text-3xl font-black text-brand-primary">
                {submissionResult.score}{' '}
                <span className="text-base font-semibold text-slate-400">
                  / {submissionResult.maximumMarks}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Percentage: <strong>{submissionResult.percentage}%</strong>
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              Your submission has been safely recorded.
            </p>
            <p className="text-[11px] text-slate-400">
              Leaderboard rankings and cohort results are private to the quiz creator. You can now safely close this window.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STAGE 1 — REGISTRATION FORM
  // =========================================================================
  if (stage === 'REGISTER') {
    const isLive = quizMeta?.quizStatus === 'LIVE';

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 py-8">
          {/* Header Card */}
          <Card className="p-6 sm:p-8 space-y-4 text-center border-t-4 border-t-brand-primary">
            <Badge variant="navy" size="md">
              <Sparkles className="w-3.5 h-3.5 text-brand-electric mr-1" />
              <span>Online Quiz</span>
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight">
              {quizMeta?.title}
            </h1>

            {quizMeta?.description && (
              <p className="text-sm text-slate-600">{quizMeta.description}</p>
            )}

            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-primary" />
                <span>{quizMeta?.durationMinutes} Minutes</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                <span>{quizMeta?.totalMarks} Total Marks</span>
              </span>
            </div>

            {quizMeta?.instructions && (
              <div className="text-left text-xs text-slate-500 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">
                  Instructions:
                </span>
                {quizMeta.instructions}
              </div>
            )}
          </Card>

          {/* Registration Box */}
          <Card className="p-6 sm:p-8 space-y-5 bg-white">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                <span>Enter Your Details to Begin</span>
              </h3>
              <p className="text-xs text-slate-400">
                No account or sign in required.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isLive ? (
              <div className="p-5 text-center bg-amber-50 rounded-xl border border-amber-200 text-amber-800 space-y-2">
                <h4 className="font-bold text-sm">
                  {quizMeta?.quizStatus === 'DRAFT'
                    ? 'Quiz Has Not Started Yet'
                    : 'Quiz Has Ended'}
                </h4>
                <p className="text-xs text-amber-700">
                  {quizMeta?.quizStatus === 'DRAFT'
                    ? 'The instructor has not activated this quiz yet. Please check back when instructed.'
                    : 'This quiz is closed and is no longer accepting student participants.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleJoinQuiz} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={studentForm.name}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@example.com"
                    value={studentForm.email}
                    onChange={(e) =>
                      setStudentForm({ ...studentForm, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {quizMeta?.quizSettings?.requireRollNumber && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Roll Number / Student ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2026-CS-042"
                      value={studentForm.rollNumber}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          rollNumber: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                )}

                {quizMeta?.quizSettings?.requireCollege && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      College / Institution Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chitkara University"
                      value={studentForm.college}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          college: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                )}

                {quizMeta?.quizSettings?.requireDepartment && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Department / Branch *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Science"
                      value={studentForm.department}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          department: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={joining}
                    className="w-full font-bold shadow-md"
                    icon={ArrowRight}
                  >
                    {joining ? 'Starting Quiz...' : 'Start Quiz'}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STAGE 2 — QUIZ RUNNER (ZERO TAB RESTRICTIONS)
  // =========================================================================
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isMultiple = currentQuestion?.questionType === 'MCQ_MULTIPLE';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-navy truncate max-w-[200px] sm:max-w-md">
              {quizMeta?.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave status indicator */}
            <span className="text-[11px] text-slate-400 hidden sm:inline-block">
              {savingState === 'saving'
                ? 'Saving...'
                : savingState === 'saved'
                ? 'Saved ✓'
                : ''}
            </span>

            {/* Countdown timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                timeLeftSeconds < 180
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'bg-blue-50 text-brand-primary border border-blue-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleSubmitQuiz}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Runner Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Progress Bar & Question Counter */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
            <span>
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span>
              Marks:{' '}
              <strong className="text-navy">{currentQuestion?.marks || 1}</strong>
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-primary rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <Card className="p-6 sm:p-8 space-y-6 bg-white shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="navy" size="sm">
                  {currentQuestion.questionType === 'TRUE_FALSE'
                    ? 'True / False'
                    : isMultiple
                    ? 'Multiple Correct'
                    : 'Single Choice'}
                </Badge>
                {currentQuestion.negativeMarks > 0 && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    (-{currentQuestion.negativeMarks} for wrong)
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-navy leading-relaxed">
                {currentQuestion.statement}
              </h2>
            </div>

            {/* Options list */}
            <div className="space-y-3">
              {(currentQuestion.options || []).map((option, idx) => {
                const optId = option.optionId || `opt_${idx + 1}`;
                const isSelected = isMultiple
                  ? answers[currentQuestion.questionId]?.selectedOptionIds?.includes(
                      optId
                    )
                  : answers[currentQuestion.questionId]?.selectedOptionId === optId;

                return (
                  <button
                    key={optId}
                    type="button"
                    onClick={() =>
                      saveAnswer(currentQuestion.questionId, optId, isMultiple)
                    }
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-brand-primary text-brand-primary ring-2 ring-brand-primary/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium">{option.text}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-${
                        isMultiple ? 'md' : 'full'
                      } border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={`w-2 h-2 ${
                            isMultiple ? 'rounded-xs' : 'rounded-full'
                          } bg-white`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="md"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            icon={ArrowLeft}
          >
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
              icon={Send}
            >
              {submitting ? 'Submitting...' : 'Finish & Submit'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
              icon={ArrowRight}
            >
              Next
            </Button>
          )}
        </div>

        {/* Question Palette Shortcuts */}
        <div className="pt-4 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Jump to Question
          </span>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(
                answers[q.questionId]?.selectedOptionId ||
                  answers[q.questionId]?.selectedOptionIds?.length
              );
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.questionId}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'ring-2 ring-brand-primary ring-offset-2 bg-navy text-white'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicQuizRunnerPage;
