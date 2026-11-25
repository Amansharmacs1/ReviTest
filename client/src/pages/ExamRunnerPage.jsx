import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService } from '../services/attemptService';
import { proctorService } from '../services/proctorService';
import { useAuthStore } from '../store/authStore';
import ExamHeader from '../components/exam-engine/ExamHeader';
import QuestionPalette from '../components/exam-engine/QuestionPalette';
import QuestionDisplay from '../components/exam-engine/QuestionDisplay';
import SubmitConfirmationModal from '../components/exam-engine/SubmitConfirmationModal';
import SubmissionReceiptModal from '../components/exam-engine/SubmissionReceiptModal';
import Modal from '../components/common/Modal';
import { ShieldAlert, AlertCircle, RefreshCw, AlertTriangle, Bell, XCircle } from 'lucide-react';
import Button from '../components/common/Button';

export const ExamRunnerPage = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Exam Attempt & Question Data
  const [attempt, setAttempt] = useState(null);
  const [examMetadata, setExamMetadata] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});

  // Navigation State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Autosave & Concurrency State
  const [saveStatus, setSaveStatus] = useState('SAVED'); // 'SAVED' | 'SAVING' | 'OFFLINE' | 'ERROR'
  const debounceTimerRef = useRef({});
  const offlineQueueRef = useRef(new Map());

  // Proctoring & Integrity State
  const [integrityAlert, setIntegrityAlert] = useState(null);
  const [proctorWarningAlert, setProctorWarningAlert] = useState(null);
  const [isTerminatedModalOpen, setIsTerminatedModalOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const lastViolationTimeRef = useRef(0);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------
  // Initial Fetch & State Hydration
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadAttemptData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await attemptService.getQuestions(attemptId);
        if (!isMounted) return;

        const data = res.data;
        setAttempt(data.attempt);
        setExamMetadata(data.examMetadata);
        setSections(data.sections || []);
        setQuestions(data.questions || []);

        // Hydrate initial responses
        const initialResponses = {};
        if (Array.isArray(data.responses)) {
          data.responses.forEach((resp) => {
            initialResponses[resp.questionId] = {
              selectedOptions: resp.selectedOptions || [],
              textResponse: resp.textResponse || '',
              isMarkedForReview: resp.isMarkedForReview || false,
              visited: true,
              version: resp.version || 0,
              clientVersion: resp.version || 0,
            };
          });
        }

        // Mark first question visited
        if (data.questions?.[0]?._id) {
          const firstId = data.questions[0]._id;
          initialResponses[firstId] = {
            ...initialResponses[firstId],
            visited: true,
            selectedOptions: initialResponses[firstId]?.selectedOptions || [],
            textResponse: initialResponses[firstId]?.textResponse || '',
            isMarkedForReview: initialResponses[firstId]?.isMarkedForReview || false,
            version: initialResponses[firstId]?.version || 0,
            clientVersion: initialResponses[firstId]?.clientVersion || 0,
          };
        }

        setResponses(initialResponses);

        // Check if already submitted
        if (data.attempt?.status === 'SUBMITTED' || data.attempt?.status === 'AUTO_SUBMITTED') {
          setReceiptData({
            submittedAt: data.attempt.submittedAt,
            submissionReason: data.attempt.submissionReason,
          });
          setIsReceiptModalOpen(true);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to initialize examination attempt.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAttemptData();

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  // -------------------------------------------------------------
  // Server-Authoritative Autosave Engine
  // -------------------------------------------------------------
  const persistAnswerToServer = useCallback(
    async (questionId, payload) => {
      if (!navigator.onLine) {
        setSaveStatus('OFFLINE');
        offlineQueueRef.current.set(questionId, payload);
        try {
          localStorage.setItem(
            `revitest_offline_${attemptId}`,
            JSON.stringify(Array.from(offlineQueueRef.current.entries()))
          );
        } catch {
          // Ignore localStorage quota errors
        }
        return;
      }

      setSaveStatus('SAVING');
      try {
        const res = await attemptService.saveAnswer(attemptId, questionId, payload);
        if (res.data?.response) {
          setResponses((prev) => ({
            ...prev,
            [questionId]: {
              ...prev[questionId],
              version: res.data.response.version,
            },
          }));
        }
        offlineQueueRef.current.delete(questionId);
        setSaveStatus('SAVED');
      } catch (err) {
        console.error('Autosave sync error:', err);
        setSaveStatus('ERROR');
        // Keep in offline queue for background retry
        offlineQueueRef.current.set(questionId, payload);
      }
    },
    [attemptId]
  );

  // Flush offline queue when network is restored
  useEffect(() => {
    const handleOnline = async () => {
      setSaveStatus('SAVING');
      const queueEntries = Array.from(offlineQueueRef.current.entries());
      if (queueEntries.length === 0) {
        setSaveStatus('SAVED');
        return;
      }

      for (const [qId, payload] of queueEntries) {
        try {
          await attemptService.saveAnswer(attemptId, qId, payload);
          offlineQueueRef.current.delete(qId);
        } catch (err) {
          console.error('Failed to flush queued answer:', qId, err);
        }
      }

      if (offlineQueueRef.current.size === 0) {
        localStorage.removeItem(`revitest_offline_${attemptId}`);
        setSaveStatus('SAVED');
      } else {
        setSaveStatus('ERROR');
      }
    };

    const handleOffline = () => {
      setSaveStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [attemptId]);

  // Prevent accidental unload / tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isReceiptModalOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isReceiptModalOpen]);

  // -------------------------------------------------------------
  // Real-Time Proctoring & Client-Side Integrity Monitoring
  // -------------------------------------------------------------
  const reportSecurityViolation = useCallback(
    async (violationType, details, metadata = {}) => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1200) return;
      lastViolationTimeRef.current = now;

      if (isReceiptModalOpen || isTerminatedModalOpen) return;

      try {
        const res = await proctorService.recordViolation(attemptId, {
          violationType,
          details,
          metadata,
        });

        const data = res.data;
        if (data?.autoTerminated) {
          setIsTerminatedModalOpen(true);
          setTerminationReason(
            data.attempt?.flaggedReason || 'Maximum security violations exceeded.'
          );
          setReceiptData({
            submittedAt: new Date().toISOString(),
            submissionReason: 'VIOLATION_TERMINATED',
          });
        } else if (data?.violation) {
          setIntegrityAlert({
            type: violationType,
            message: details,
            tabSwitchCount: data.tabSwitchCount,
            maxTabSwitches: data.maxTabSwitches,
            remaining: data.remainingTabSwitches,
          });

          setTimeout(() => {
            setIntegrityAlert(null);
          }, 6000);
        }
      } catch (err) {
        console.error('Failed to log proctor violation:', err);
      }
    },
    [attemptId, isReceiptModalOpen, isTerminatedModalOpen]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportSecurityViolation(
          'TAB_SWITCH',
          'Examinee left the examination window or switched browser tabs'
        );
      }
    };

    const handleWindowBlur = () => {
      reportSecurityViolation('WINDOW_BLUR', 'Examination window lost focus');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      reportSecurityViolation('CONTEXT_MENU', 'Right-click context menu attempt blocked');
    };

    const handleCopy = (e) => {
      e.preventDefault();
      reportSecurityViolation('CLIPBOARD_COPY', 'Content copy attempt blocked');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [reportSecurityViolation]);

  // Periodic poll for proctor interventions
  useEffect(() => {
    if (isReceiptModalOpen || isTerminatedModalOpen) return;

    const proctorPollInterval = setInterval(async () => {
      try {
        const res = await attemptService.getQuestions(attemptId);
        const currentAttempt = res.data?.attempt;
        if (!currentAttempt) return;

        if (
          currentAttempt.status === 'AUTO_SUBMITTED' &&
          (currentAttempt.submissionReason === 'PROCTOR_FORCE_SUBMIT' ||
            currentAttempt.submissionReason === 'VIOLATION_TERMINATED')
        ) {
          setIsTerminatedModalOpen(true);
          setTerminationReason(currentAttempt.flaggedReason || 'Terminated by proctor');
          setReceiptData({
            submittedAt: currentAttempt.submittedAt,
            submissionReason: currentAttempt.submissionReason,
          });
          return;
        }

        if (
          Array.isArray(currentAttempt.proctorWarnings) &&
          currentAttempt.proctorWarnings.length > 0
        ) {
          const latestWarning =
            currentAttempt.proctorWarnings[currentAttempt.proctorWarnings.length - 1];
          const warnTime = new Date(latestWarning.timestamp).getTime();
          if (Date.now() - warnTime < 35000) {
            setProctorWarningAlert(latestWarning.message);
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }, 9000);

    return () => clearInterval(proctorPollInterval);
  }, [attemptId, isReceiptModalOpen, isTerminatedModalOpen]);

  // -------------------------------------------------------------
  // Candidate Actions & Answer Handlers
  // -------------------------------------------------------------
  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionToggle = (optionId, isMultiSelect) => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    const currentResp = responses[qId] || { selectedOptions: [], clientVersion: 0 };
    let updatedOptions = [...(currentResp.selectedOptions || [])];

    if (isMultiSelect) {
      if (updatedOptions.includes(optionId)) {
        updatedOptions = updatedOptions.filter((id) => id !== optionId);
      } else {
        updatedOptions.push(optionId);
      }
    } else {
      updatedOptions = [optionId];
    }

    const nextClientVersion = (currentResp.clientVersion || currentResp.version || 0) + 1;

    const updatedResponse = {
      ...currentResp,
      selectedOptions: updatedOptions,
      visited: true,
      clientVersion: nextClientVersion,
    };

    setResponses((prev) => ({
      ...prev,
      [qId]: updatedResponse,
    }));

    // Immediate save for choice selections
    persistAnswerToServer(qId, {
      selectedOptions: updatedOptions,
      isMarkedForReview: updatedResponse.isMarkedForReview || false,
      clientVersion: nextClientVersion,
    });
  };

  const handleTextChange = (text) => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    const currentResp = responses[qId] || { clientVersion: 0 };
    const nextClientVersion = (currentResp.clientVersion || currentResp.version || 0) + 1;

    const updatedResponse = {
      ...currentResp,
      textResponse: text,
      visited: true,
      clientVersion: nextClientVersion,
    };

    setResponses((prev) => ({
      ...prev,
      [qId]: updatedResponse,
    }));

    // Debounced autosave (400ms) for typing
    if (debounceTimerRef.current[qId]) {
      clearTimeout(debounceTimerRef.current[qId]);
    }

    setSaveStatus('SAVING');
    debounceTimerRef.current[qId] = setTimeout(() => {
      persistAnswerToServer(qId, {
        textResponse: text,
        isMarkedForReview: updatedResponse.isMarkedForReview || false,
        clientVersion: nextClientVersion,
      });
    }, 400);
  };

  const handleToggleMarkReview = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    const currentResp = responses[qId] || { clientVersion: 0 };
    const nextMarked = !currentResp.isMarkedForReview;
    const nextClientVersion = (currentResp.clientVersion || currentResp.version || 0) + 1;

    const updatedResponse = {
      ...currentResp,
      isMarkedForReview: nextMarked,
      visited: true,
      clientVersion: nextClientVersion,
    };

    setResponses((prev) => ({
      ...prev,
      [qId]: updatedResponse,
    }));

    persistAnswerToServer(qId, {
      selectedOptions: currentResp.selectedOptions || [],
      textResponse: currentResp.textResponse || '',
      isMarkedForReview: nextMarked,
      clientVersion: nextClientVersion,
    });
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion._id;
    const currentResp = responses[qId] || { clientVersion: 0 };
    const nextClientVersion = (currentResp.clientVersion || currentResp.version || 0) + 1;

    const updatedResponse = {
      ...currentResp,
      selectedOptions: [],
      textResponse: '',
      visited: true,
      clientVersion: nextClientVersion,
    };

    setResponses((prev) => ({
      ...prev,
      [qId]: updatedResponse,
    }));

    persistAnswerToServer(qId, {
      selectedOptions: [],
      textResponse: '',
      isMarkedForReview: currentResp.isMarkedForReview || false,
      clientVersion: nextClientVersion,
    });
  };

  const handleSelectQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      const targetQuestion = questions[index];
      setCurrentQuestionIndex(index);

      // Mark visited
      if (targetQuestion?._id) {
        setResponses((prev) => ({
          ...prev,
          [targetQuestion._id]: {
            ...prev[targetQuestion._id],
            visited: true,
          },
        }));
      }

      // Sync active section if section exists
      if (targetQuestion?.sectionId && sections.length > 0) {
        const secIdx = sections.findIndex((s) => s._id === targetQuestion.sectionId);
        if (secIdx !== -1) setActiveSectionIndex(secIdx);
      }
    }
  };

  // -------------------------------------------------------------
  // Submission Handlers
  // -------------------------------------------------------------
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await attemptService.submitAttempt(attemptId);
      setIsSubmitModalOpen(false);
      setReceiptData({
        submittedAt: res.data.attempt.submittedAt,
        submissionReason: 'MANUAL',
      });
      setIsReceiptModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to submit examination. Please check connection and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeExpired = async () => {
    try {
      const res = await attemptService.autoSubmitAttempt(attemptId);
      setIsSubmitModalOpen(false);
      setReceiptData({
        submittedAt: res.data?.attempt?.submittedAt || new Date().toISOString(),
        submissionReason: 'TIME_EXPIRED',
      });
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error('Auto submit error:', err);
      // Still display receipt if server returned already submitted or expired
      setReceiptData({
        submittedAt: new Date().toISOString(),
        submissionReason: 'TIME_EXPIRED',
      });
      setIsReceiptModalOpen(true);
    }
  };

  // -------------------------------------------------------------
  // Render Loading & Error States
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin mb-4" />
        <h2 className="text-base font-bold">Securing Candidate Session & Loading Assessment...</h2>
        <p className="text-xs text-slate-400 mt-1">Calibrating server-authoritative timer and question set</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy">Exam Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/app/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Distraction-Free Header */}
      <ExamHeader
        examTitle={examMetadata?.title || attempt?.scheduleId?.title}
        subject={examMetadata?.subject}
        candidateName={user?.name}
        endsAt={attempt?.endsAt}
        saveStatus={saveStatus}
        onTimeExpired={handleTimeExpired}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
        currentIndex={currentQuestionIndex}
        totalQuestions={questions.length}
      />

      {/* Proctor Integrity Warning Alert Banner */}
      {integrityAlert && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md sticky top-16 z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>
              Security Notice: {integrityAlert.message} (Incident {integrityAlert.tabSwitchCount} of{' '}
              {integrityAlert.maxTabSwitches} recorded. {integrityAlert.remaining} remaining before
              automatic termination).
            </span>
          </div>
          <button
            onClick={() => setIntegrityAlert(null)}
            className="text-white hover:text-amber-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Official Proctor Direct Warning Alert */}
      {proctorWarningAlert && (
        <div className="bg-rose-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md sticky top-16 z-20">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-200 animate-pulse shrink-0" />
            <span>
              <strong>OFFICIAL PROCTOR WARNING:</strong> {proctorWarningAlert}
            </span>
          </div>
          <button
            onClick={() => setProctorWarningAlert(null)}
            className="text-white hover:text-rose-100 font-bold ml-4 underline"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Examination Workspace: Left Display + Right Palette */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Active Question Area */}
        <main className="flex-1 overflow-y-auto">
          <QuestionDisplay
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            sectionTitle={
              sections.find((s) => s._id === currentQuestion?.sectionId)?.title || null
            }
            response={currentQuestion ? responses[currentQuestion._id] : null}
            onOptionToggle={handleOptionToggle}
            onTextChange={handleTextChange}
            onToggleMarkReview={handleToggleMarkReview}
            onClearResponse={handleClearResponse}
            onPrev={() => handleSelectQuestion(currentQuestionIndex - 1)}
            onNext={() => handleSelectQuestion(currentQuestionIndex + 1)}
            isFirst={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
          />
        </main>

        {/* Right: Question Navigation Palette */}
        <aside className="w-full lg:w-80 lg:shrink-0 max-h-64 lg:max-h-none border-t lg:border-t-0 border-slate-200">
          <QuestionPalette
            sections={sections}
            activeSectionIndex={activeSectionIndex}
            onSelectSection={(idx) => {
              setActiveSectionIndex(idx);
              const targetSec = sections[idx];
              const firstQIdx = questions.findIndex((q) => q.sectionId === targetSec._id);
              if (firstQIdx !== -1) handleSelectQuestion(firstQIdx);
            }}
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            onSelectQuestion={handleSelectQuestion}
            responses={responses}
          />
        </aside>
      </div>

      {/* Submission Confirmation Modal */}
      <SubmitConfirmationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={submitting}
        questions={questions}
        responses={responses}
      />

      {/* Final Submission Receipt Modal */}
      <SubmissionReceiptModal
        isOpen={isReceiptModalOpen}
        examTitle={examMetadata?.title}
        attemptId={attemptId}
        submittedAt={receiptData?.submittedAt}
        submissionReason={receiptData?.submissionReason}
      />

      {/* Disqualification / Proctor Termination Modal */}
      <Modal
        isOpen={isTerminatedModalOpen}
        onClose={() => {}}
        title="Examination Terminated for Security Violation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-center py-2">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-navy">Assessment Disqualified & Terminated</h3>
            <p className="text-rose-600 font-semibold text-xs">{terminationReason}</p>
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            Your examination has been automatically sealed and submitted under security violation.
            This incident has been logged with time, IP address, and violation telemetry for your
            institution&apos;s administrative review.
          </p>

          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsTerminatedModalOpen(false);
                setIsReceiptModalOpen(true);
              }}
              className="w-full justify-center bg-rose-600 hover:bg-rose-700 text-white"
            >
              View Submission Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamRunnerPage;
