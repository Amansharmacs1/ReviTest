import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import { quizService } from '../../services/quizService';
import {
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  Award,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const CreateQuizModal = ({ isOpen, onClose, onCreated }) => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Questions, 3: Student Details, 4: Done
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    description: '',
    durationMinutes: 15,
    instructions: 'Answer all questions. Submit before the timer expires.',
  });

  // Step 2: Questions
  const [questions, setQuestions] = useState([
    {
      id: 1,
      questionText: 'What is the primary keyword used to declare a constant in JavaScript?',
      questionType: 'MCQ_SINGLE',
      options: [
        { optionId: 'opt_1', text: 'var', isCorrect: false },
        { optionId: 'opt_2', text: 'let', isCorrect: false },
        { optionId: 'opt_3', text: 'const', isCorrect: true },
        { optionId: 'opt_4', text: 'constant', isCorrect: false },
      ],
      marks: 1,
      negativeMarks: 0,
    },
  ]);

  // Step 3: Student Details & Settings
  const [quizSettings, setQuizSettings] = useState({
    requireRollNumber: true,
    requireCollege: false,
    requireDepartment: false,
    allowMultipleAttempts: false,
    publicLeaderboard: true,
    showResultsImmediately: true,
  });

  // Step 4 created quiz result
  const [createdResult, setCreatedResult] = useState(null);

  // Helper to add a new blank question
  const handleAddQuestion = () => {
    const nextId = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        questionText: '',
        questionType: 'MCQ_SINGLE',
        options: [
          { optionId: 'opt_1', text: '', isCorrect: true },
          { optionId: 'opt_2', text: '', isCorrect: false },
          { optionId: 'opt_3', text: '', isCorrect: false },
          { optionId: 'opt_4', text: '', isCorrect: false },
        ],
        marks: 1,
        negativeMarks: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) {
      alert('Quiz must have at least one question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    setQuestions(reordered);
  };

  const updateQuestion = (idx, key, value) => {
    const updated = [...questions];
    updated[idx][key] = value;

    if (key === 'questionType') {
      if (value === 'TRUE_FALSE') {
        updated[idx].options = [
          { optionId: 'opt_true', text: 'True', isCorrect: true },
          { optionId: 'opt_false', text: 'False', isCorrect: false },
        ];
      } else if (updated[idx].options.length < 2) {
        updated[idx].options = [
          { optionId: 'opt_1', text: 'Option A', isCorrect: true },
          { optionId: 'opt_2', text: 'Option B', isCorrect: false },
        ];
      }
    }

    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, text) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx].text = text;
    setQuestions(updated);
  };

  const toggleOptionCorrect = (qIdx, optIdx) => {
    const updated = [...questions];
    const qType = updated[qIdx].questionType;

    if (qType === 'MCQ_MULTIPLE') {
      // Toggle
      updated[qIdx].options[optIdx].isCorrect = !updated[qIdx].options[optIdx].isCorrect;
    } else {
      // Single correct: uncheck all others
      updated[qIdx].options.forEach((opt, i) => {
        opt.isCorrect = i === optIdx;
      });
    }
    setQuestions(updated);
  };

  const handleAddOption = (qIdx) => {
    const updated = [...questions];
    const newOptId = `opt_${updated[qIdx].options.length + 1}`;
    updated[qIdx].options.push({
      optionId: newOptId,
      text: '',
      isCorrect: false,
    });
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx, optIdx) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) {
      alert('Questions must have at least 2 options.');
      return;
    }
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx);
    setQuestions(updated);
  };

  // Step 1 Validation
  const canProceedStep1 = basicInfo.title.trim() && basicInfo.durationMinutes > 0;

  // Step 2 Validation
  const canProceedStep2 =
    questions.length > 0 &&
    questions.every(
      (q) =>
        q.questionText.trim() &&
        q.options.length >= 2 &&
        q.options.every((opt) => opt.text.trim()) &&
        q.options.some((opt) => opt.isCorrect)
    );

  // Final Submit
  const handleCreateQuiz = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        title: basicInfo.title.trim(),
        description: basicInfo.description.trim(),
        durationMinutes: Number(basicInfo.durationMinutes),
        instructions: basicInfo.instructions.trim(),
        questions: questions.map((q) => ({
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          marks: Number(q.marks) || 1,
          negativeMarks: Number(q.negativeMarks) || 0,
          options: q.options.map((opt) => ({
            optionId: opt.optionId,
            text: opt.text.trim(),
            isCorrect: Boolean(opt.isCorrect),
          })),
        })),
        quizSettings,
      };

      const res = await quizService.createQuiz(payload);
      setCreatedResult(res.data);
      setStep(4);
      if (onCreated) onCreated(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCalculatedMarks = questions.reduce(
    (sum, q) => sum + (Number(q.marks) || 1),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 4 ? 'Quiz Created Successfully!' : 'Create Simple Quiz'}
      maxWidth="max-w-3xl"
    >
      {/* Wizard Steps Tracker */}
      {step < 4 && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: `Questions (${questions.length})` },
            { num: 3, label: 'Student Details' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 text-xs font-bold ${
                step === s.num
                  ? 'text-brand-primary'
                  : step > s.num
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === s.num
                    ? 'bg-brand-primary text-white shadow-xs'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: BASIC INFORMATION */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Quiz Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CS101 Midterm Quiz: Data Structures"
              value={basicInfo.title}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, title: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Short description for students..."
              value={basicInfo.description}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, description: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={basicInfo.durationMinutes}
                onChange={(e) =>
                  setBasicInfo({
                    ...basicInfo,
                    durationMinutes: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Calculated Total Marks
              </label>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-black text-navy border border-slate-200">
                {totalCalculatedMarks} Marks
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Instructions for Students (Optional)
            </label>
            <textarea
              rows={2}
              value={basicInfo.instructions}
              onChange={(e) =>
                setBasicInfo({ ...basicInfo, instructions: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              size="md"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              icon={ArrowRight}
            >
              Next: Add Questions
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: ADD QUESTIONS */}
      {step === 2 && (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-navy">
              Questions ({questions.length}) • Total Marks: {totalCalculatedMarks}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
              icon={Plus}
            >
              Add Question
            </Button>
          </div>

          {questions.map((q, qIdx) => (
            <div
              key={q.id || qIdx}
              className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-navy text-white text-xs font-bold flex items-center justify-center">
                    {qIdx + 1}
                  </span>
                  <select
                    value={q.questionType}
                    onChange={(e) =>
                      updateQuestion(qIdx, 'questionType', e.target.value)
                    }
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1"
                  >
                    <option value="MCQ_SINGLE">Single Choice (MCQ)</option>
                    <option value="MCQ_MULTIPLE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={qIdx === 0}
                    onClick={() => handleMoveQuestion(qIdx, -1)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={qIdx === questions.length - 1}
                    onClick={() => handleMoveQuestion(qIdx, 1)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-1 hover:bg-rose-100 text-rose-500 rounded ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <input
                type="text"
                placeholder="Enter question statement..."
                value={q.questionText}
                onChange={(e) =>
                  updateQuestion(qIdx, 'questionText', e.target.value)
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />

              {/* Options */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Options (Check the circle/box for correct answer):
                </span>
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleOptionCorrect(qIdx, optIdx)}
                      className={`w-6 h-6 rounded-${
                        q.questionType === 'MCQ_MULTIPLE' ? 'md' : 'full'
                      } border flex items-center justify-center shrink-0 transition-all ${
                        opt.isCorrect
                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      title={opt.isCorrect ? 'Correct Answer' : 'Click to mark as correct'}
                    >
                      {opt.isCorrect && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      value={opt.text}
                      onChange={(e) =>
                        handleOptionChange(qIdx, optIdx, e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                    {q.questionType !== 'TRUE_FALSE' && q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(qIdx, optIdx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {q.questionType !== 'TRUE_FALSE' && (
                  <button
                    type="button"
                    onClick={() => handleAddOption(qIdx)}
                    className="text-xs text-brand-primary font-semibold hover:underline flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Another Option</span>
                  </button>
                )}
              </div>

              {/* Marks & Negative Marks */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">Marks:</span>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={q.marks}
                    onChange={(e) =>
                      updateQuestion(
                        qIdx,
                        'marks',
                        parseFloat(e.target.value) || 1
                      )
                    }
                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">
                    Negative Marks:
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={q.negativeMarks}
                    onChange={(e) =>
                      updateQuestion(
                        qIdx,
                        'negativeMarks',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(1)}
              icon={ArrowLeft}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              icon={ArrowRight}
            >
              Next: Student Details
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: STUDENT DETAILS & SETTINGS */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-navy mb-1">
              Configure Student Participation Form
            </h4>
            <p className="text-xs text-slate-500">
              Students do not need an account to join. Select the information they must enter before starting:
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Full Name</span>
              <Badge variant="navy" size="sm">
                Required (Always)
              </Badge>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Email Address</span>
              <Badge variant="navy" size="sm">
                Required (Always)
              </Badge>
            </div>

            <label className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50">
              <span className="font-semibold text-slate-700">
                Roll Number / Student ID
              </span>
              <input
                type="checkbox"
                checked={quizSettings.requireRollNumber}
                onChange={(e) =>
                  setQuizSettings({
                    ...quizSettings,
                    requireRollNumber: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-primary rounded"
              />
            </label>

            <label className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50">
              <span className="font-semibold text-slate-700">
                College / Institution Name
              </span>
              <input
                type="checkbox"
                checked={quizSettings.requireCollege}
                onChange={(e) =>
                  setQuizSettings({
                    ...quizSettings,
                    requireCollege: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-primary rounded"
              />
            </label>

            <label className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50">
              <span className="font-semibold text-slate-700">
                Department / Branch
              </span>
              <input
                type="checkbox"
                checked={quizSettings.requireDepartment}
                onChange={(e) =>
                  setQuizSettings({
                    ...quizSettings,
                    requireDepartment: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-primary rounded"
              />
            </label>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-sm font-bold text-navy">Results & Leaderboard Options</h4>

            <label className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-semibold text-slate-700 block">
                  Show Score Immediately on Submission
                </span>
                <span className="text-[11px] text-slate-400">
                  Students see their score and percentage as soon as they finish.
                </span>
              </div>
              <input
                type="checkbox"
                checked={quizSettings.showResultsImmediately}
                onChange={(e) =>
                  setQuizSettings({
                    ...quizSettings,
                    showResultsImmediately: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-primary rounded"
              />
            </label>

            <label className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-semibold text-slate-700 block">
                  Enable Public Leaderboard
                </span>
                <span className="text-[11px] text-slate-400">
                  Allows students to view live ranks (emails are kept private).
                </span>
              </div>
              <input
                type="checkbox"
                checked={quizSettings.publicLeaderboard}
                onChange={(e) =>
                  setQuizSettings({
                    ...quizSettings,
                    publicLeaderboard: e.target.checked,
                  })
                }
                className="w-4 h-4 text-brand-primary rounded"
              />
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(2)}
              icon={ArrowLeft}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={submitting}
              onClick={handleCreateQuiz}
              className="bg-emerald-600 hover:bg-emerald-700"
              icon={Sparkles}
            >
              {submitting ? 'Creating Quiz...' : 'Create & Save Quiz'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: QUIZ CREATED SUCCESS */}
      {step === 4 && (
        <div className="text-center space-y-5 py-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-navy">{basicInfo.title}</h3>
            <p className="text-xs text-slate-500">
              Your quiz is ready in <strong>Draft</strong> status. You can now start it and share the link with students.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-w-md mx-auto">
            <span className="text-xs font-semibold text-slate-500 block">
              Public Quiz Link:
            </span>
            <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs text-brand-primary font-bold truncate">
              {window.location.origin}/quiz/{createdResult?.publicQuizId}
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onClose();
              }}
            >
              Go to Quiz Management
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CreateQuizModal;
