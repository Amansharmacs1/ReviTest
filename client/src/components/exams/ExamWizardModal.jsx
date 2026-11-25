import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Layers,
  Sliders,
  Check,
  Eye,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { questionService } from '../../services/questionService';
import { examService } from '../../services/examService';
import QuestionEditorModal from '../questions/QuestionEditorModal';

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Title, Subject & Duration' },
  { id: 2, title: 'Select Questions', description: 'Choose from Question Bank' },
  { id: 3, title: 'Sections', description: 'Organize into Sections' },
  { id: 4, title: 'Settings', description: 'Delivery & Security Rules' },
  { id: 5, title: 'Review & Publish', description: 'Validate & Finalize' },
];

export const ExamWizardModal = ({
  isOpen,
  onClose,
  initialExam = null,
  organization,
  onSuccess,
}) => {
  const isEditing = Boolean(initialExam?._id);
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    category: 'General',
    instructions: '',
    durationMinutes: 60,
    passingMarks: 0,
    settings: {
      allowQuestionNavigation: true,
      allowMarkForReview: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      showQuestionMarks: true,
      allowNegativeMarking: false,
      resultVisibility: 'AFTER_WINDOW',
    },
    sections: [
      {
        sectionId: 'sec_1',
        title: 'Section A - General',
        description: '',
        instructions: '',
        order: 1,
        questions: [],
        sectionMarks: 0,
      },
    ],
  });

  // Question Bank Browsing in Step 2
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubject, _setBankSubject] = useState('');
  const [bankDifficulty, setBankDifficulty] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

  // Inline Question Creation
  const [inlineCreateOpen, setInlineCreateOpen] = useState(false);

  // Validation Report in Step 5
  const [validationReport, setValidationReport] = useState(null);
  const [validating, setValidating] = useState(false);

  // General Loading & Feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Populate Initial Data
  useEffect(() => {
    if (initialExam) {
      const qIds = new Set();
      const loadedSections = initialExam.sections && initialExam.sections.length > 0
        ? initialExam.sections.map((sec, idx) => ({
            sectionId: sec.sectionId || `sec_${idx + 1}`,
            title: sec.title || `Section ${idx + 1}`,
            description: sec.description || '',
            instructions: sec.instructions || '',
            order: sec.order || idx + 1,
            sectionMarks: sec.sectionMarks || 0,
            questions: (sec.questions || []).map((qRef, qIdx) => {
              const qIdStr = qRef.questionId?._id || qRef.questionId?.toString() || qRef.toString();
              qIds.add(qIdStr);
              return {
                questionId: qIdStr,
                order: qRef.order || qIdx + 1,
                marks: qRef.marks !== undefined ? qRef.marks : 2,
                negativeMarks: qRef.negativeMarks || 0,
                statement: qRef.questionId?.statement || '',
                questionType: qRef.questionId?.questionType || 'MCQ_SINGLE',
              };
            }),
          }))
        : [
            {
              sectionId: 'sec_1',
              title: 'Section A - General',
              description: '',
              instructions: '',
              order: 1,
              questions: [],
              sectionMarks: 0,
            },
          ];

      setFormData({
        title: initialExam.title || '',
        description: initialExam.description || '',
        subject: initialExam.subject || '',
        category: initialExam.category || 'General',
        instructions: initialExam.instructions || '',
        durationMinutes: initialExam.durationMinutes || 60,
        passingMarks: initialExam.passingMarks || 0,
        settings: {
          allowQuestionNavigation: initialExam.settings?.allowQuestionNavigation ?? true,
          allowMarkForReview: initialExam.settings?.allowMarkForReview ?? true,
          shuffleQuestions: initialExam.settings?.shuffleQuestions ?? false,
          shuffleOptions: initialExam.settings?.shuffleOptions ?? false,
          showQuestionMarks: initialExam.settings?.showQuestionMarks ?? true,
          allowNegativeMarking: initialExam.settings?.allowNegativeMarking ?? false,
          resultVisibility: initialExam.settings?.resultVisibility || 'AFTER_WINDOW',
        },
        sections: loadedSections,
      });
      setSelectedQuestionIds(qIds);
    } else {
      setFormData({
        title: '',
        description: '',
        subject: '',
        category: 'General',
        instructions: '',
        durationMinutes: organization?.settings?.defaultExamDurationMinutes || 60,
        passingMarks: 0,
        settings: {
          allowQuestionNavigation: true,
          allowMarkForReview: true,
          shuffleQuestions: false,
          shuffleOptions: false,
          showQuestionMarks: true,
          allowNegativeMarking: false,
          resultVisibility: 'AFTER_WINDOW',
        },
        sections: [
          {
            sectionId: 'sec_1',
            title: 'Section A - General',
            description: '',
            instructions: '',
            order: 1,
            questions: [],
            sectionMarks: 0,
          },
        ],
      });
      setSelectedQuestionIds(new Set());
    }
    setCurrentStep(1);
    setValidationReport(null);
    setFeedback(null);
  }, [initialExam, isOpen, organization]);

  // Load Question Bank Questions for Step 2
  const loadBankQuestions = useCallback(async () => {
    setBankLoading(true);
    try {
      const res = await questionService.getQuestions({
        limit: 100,
        search: bankSearch || undefined,
        subject: bankSubject || undefined,
        difficulty: bankDifficulty || undefined,
        status: 'ACTIVE',
      });
      setBankQuestions(res.data.questions || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load question bank.' });
    } finally {
      setBankLoading(false);
    }
  }, [bankSearch, bankSubject, bankDifficulty]);

  useEffect(() => {
    if (isOpen && currentStep === 2) {
      loadBankQuestions();
    }
  }, [isOpen, currentStep, loadBankQuestions]);

  // Question Selection Toggle in Step 2
  const handleToggleQuestionSelection = (question) => {
    const qId = question._id;
    const newSelected = new Set(selectedQuestionIds);

    const updatedSections = [...formData.sections];
    // Put questions in the first section by default
    const primarySection = updatedSections[0];

    if (newSelected.has(qId)) {
      newSelected.delete(qId);
      // Remove from all sections
      updatedSections.forEach((sec) => {
        sec.questions = sec.questions.filter((q) => q.questionId !== qId);
      });
    } else {
      newSelected.add(qId);
      // Add to primary section
      primarySection.questions.push({
        questionId: qId,
        order: primarySection.questions.length + 1,
        marks: question.marks || 2,
        negativeMarks: question.negativeMarks || 0,
        statement: question.statement,
        questionType: question.questionType,
      });
    }

    setSelectedQuestionIds(newSelected);
    setFormData({ ...formData, sections: updatedSections });
  };

  // Section Management in Step 3
  const handleAddSection = () => {
    const nextOrder = formData.sections.length + 1;
    const newSection = {
      sectionId: `sec_${Date.now()}`,
      title: `Section ${String.fromCharCode(64 + nextOrder)} - Additional`,
      description: '',
      instructions: '',
      order: nextOrder,
      questions: [],
      sectionMarks: 0,
    };
    setFormData({ ...formData, sections: [...formData.sections, newSection] });
  };

  const handleRemoveSection = (sectionIndex) => {
    if (formData.sections.length <= 1) {
      setFeedback({ type: 'error', message: 'Exam must have at least one section.' });
      return;
    }
    // Re-assign orphaned questions to the first section
    const removedQuestions = formData.sections[sectionIndex].questions;
    const updatedSections = formData.sections.filter((_, idx) => idx !== sectionIndex);
    if (removedQuestions && removedQuestions.length > 0) {
      updatedSections[0].questions = [...updatedSections[0].questions, ...removedQuestions];
    }
    setFormData({ ...formData, sections: updatedSections });
  };

  const handleMoveQuestionToSection = (fromSecIdx, qIdx, targetSecIdx) => {
    if (fromSecIdx === targetSecIdx) return;
    const updated = [...formData.sections];
    const [movedQ] = updated[fromSecIdx].questions.splice(qIdx, 1);
    updated[targetSecIdx].questions.push(movedQ);
    setFormData({ ...formData, sections: updated });
  };

  const handleUpdateQuestionMarks = (secIdx, qIdx, newMarks, newNegMarks) => {
    const updated = [...formData.sections];
    if (newMarks !== undefined) updated[secIdx].questions[qIdx].marks = Number(newMarks);
    if (newNegMarks !== undefined) updated[secIdx].questions[qIdx].negativeMarks = Number(newNegMarks);
    setFormData({ ...formData, sections: updated });
  };

  // Step 5 Validation Trigger
  const handleValidateExam = async () => {
    setValidating(true);
    setFeedback(null);
    try {
      // First save or update draft to get authoritative calculation
      const payload = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        category: formData.category,
        instructions: formData.instructions,
        durationMinutes: Number(formData.durationMinutes),
        passingMarks: Number(formData.passingMarks),
        settings: formData.settings,
        sections: formData.sections.map((sec, idx) => ({
          sectionId: sec.sectionId,
          title: sec.title,
          description: sec.description,
          instructions: sec.instructions,
          order: idx + 1,
          questions: sec.questions.map((q, qIdx) => ({
            questionId: q.questionId,
            order: qIdx + 1,
            marks: Number(q.marks) || 2,
            negativeMarks: Number(q.negativeMarks) || 0,
          })),
        })),
      };

      let activeExamId = initialExam?._id;
      if (!activeExamId) {
        const createRes = await examService.createExam(payload);
        activeExamId = createRes.data._id;
      } else {
        await examService.updateExam(activeExamId, payload);
      }

      const valRes = await examService.validateExam(activeExamId);
      setValidationReport(valRes.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Validation failed.' });
    } finally {
      setValidating(false);
    }
  };

  // Next Step Navigator
  const handleNextStep = () => {
    setFeedback(null);
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setFeedback({ type: 'error', message: 'Exam title is required.' });
        return;
      }
      if (!formData.subject.trim()) {
        setFeedback({ type: 'error', message: 'Exam subject is required.' });
        return;
      }
      if (Number(formData.durationMinutes) < 1) {
        setFeedback({ type: 'error', message: 'Duration must be at least 1 minute.' });
        return;
      }
    } else if (currentStep === 2) {
      if (selectedQuestionIds.size === 0) {
        setFeedback({
          type: 'error',
          message: 'Please select at least one question from the Question Bank.',
        });
        return;
      }
    } else if (currentStep === 4) {
      // Transitioning to step 5: automatically run pre-flight validation
      handleValidateExam();
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setFeedback(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        category: formData.category,
        instructions: formData.instructions,
        durationMinutes: Number(formData.durationMinutes),
        passingMarks: Number(formData.passingMarks),
        settings: formData.settings,
        sections: formData.sections.map((sec, idx) => ({
          sectionId: sec.sectionId,
          title: sec.title,
          description: sec.description,
          instructions: sec.instructions,
          order: idx + 1,
          questions: sec.questions.map((q, qIdx) => ({
            questionId: q.questionId,
            order: qIdx + 1,
            marks: Number(q.marks) || 2,
            negativeMarks: Number(q.negativeMarks) || 0,
          })),
        })),
      };

      let res;
      if (isEditing) {
        res = await examService.updateExam(initialExam._id, payload);
      } else {
        res = await examService.createExam(payload);
      }

      onSuccess(res.data.exam || res.data);
      onClose();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save draft exam.' });
    } finally {
      setSaving(false);
    }
  };

  // Publish Exam
  const handlePublishExam = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // Ensure draft is saved first
      const payload = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        category: formData.category,
        instructions: formData.instructions,
        durationMinutes: Number(formData.durationMinutes),
        passingMarks: Number(formData.passingMarks),
        settings: formData.settings,
        sections: formData.sections.map((sec, idx) => ({
          sectionId: sec.sectionId,
          title: sec.title,
          description: sec.description,
          instructions: sec.instructions,
          order: idx + 1,
          questions: sec.questions.map((q, qIdx) => ({
            questionId: q.questionId,
            order: qIdx + 1,
            marks: Number(q.marks) || 2,
            negativeMarks: Number(q.negativeMarks) || 0,
          })),
        })),
      };

      let examId = initialExam?._id;
      if (!examId) {
        const createRes = await examService.createExam(payload);
        examId = createRes.data._id;
      } else {
        await examService.updateExam(examId, payload);
      }

      // Publish call creates immutable snapshot
      const publishRes = await examService.publishExam(examId);

      onSuccess(publishRes.data.exam);
      onClose();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to publish exam.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Draft Exam: ${formData.title || 'Untitled'}` : 'Examination Authoring Wizard'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-xs sm:text-sm">
        {/* Step Progress Bar */}
        <div className="border-b border-slate-200 pb-4">
          <div className="grid grid-cols-5 gap-2 text-center">
            {STEPS.map((step) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-blue-50/80 text-brand-primary font-bold'
                      : isPast
                        ? 'text-emerald-700 font-semibold'
                        : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-brand-primary text-white shadow-sm'
                        : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="text-[11px] hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-medium animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="font-bold underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STEP 1: BASIC INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Input
              label="Exam Title"
              placeholder="e.g. Midterm Examination: Data Structures & Algorithms"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Academic Subject"
                placeholder="e.g. Computer Science"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />

              <Input
                label="Category / Tag"
                placeholder="e.g. Undergraduate / Year 2"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />

              <Input
                label="Duration (minutes)"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: e.target.value })
                }
                required
              />

              <Input
                label="Passing Marks Requirement"
                type="number"
                min="0"
                value={formData.passingMarks}
                onChange={(e) =>
                  setFormData({ ...formData, passingMarks: e.target.value })
                }
                helperText="Minimum score required to qualify"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Exam Description
              </label>
              <textarea
                rows="2"
                placeholder="Brief summary of exam syllabus and scope..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Examinee Instructions
              </label>
              <textarea
                rows="3"
                placeholder="Instructions displayed to candidate prior to starting exam..."
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
                className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* STEP 2: SELECT QUESTIONS FROM QUESTION BANK */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-navy text-sm">
                  Select Assessment Questions ({selectedQuestionIds.size} Selected)
                </h4>
                <p className="text-xs text-slate-500">
                  Select questions from your organization&apos;s bank to include in this examination.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setInlineCreateOpen(true)}
              >
                Create Question Inline
              </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions by statement or topic..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <select
                value={bankDifficulty}
                onChange={(e) => setBankDifficulty(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Questions Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-subtle">
              {bankLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading Question Bank...
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No questions match your criteria. Click &apos;Create Question Inline&apos; to add one.
                </div>
              ) : (
                bankQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.has(q._id);
                  return (
                    <div
                      key={q._id}
                      onClick={() => handleToggleQuestionSelection(q)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent container click
                        className="mt-1 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                      />
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-navy text-xs leading-snug">
                          {q.statement}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <Badge variant="navy" size="sm">
                            {q.questionType}
                          </Badge>
                          <Badge
                            variant={
                              q.difficulty === 'EASY'
                                ? 'success'
                                : q.difficulty === 'HARD'
                                  ? 'error'
                                  : 'warning'
                            }
                            size="sm"
                          >
                            {q.difficulty}
                          </Badge>
                          <span className="text-slate-400">
                            {q.subject} / {q.topic}
                          </span>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs font-semibold text-emerald-700 shrink-0">
                        +{q.marks} Marks
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: ORGANIZE SECTIONS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-navy text-sm">Organize Examination Sections</h4>
                <p className="text-xs text-slate-500">
                  Distribute questions across timed or thematic sections and adjust marks.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddSection}
              >
                Add Section
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {formData.sections.map((section, sIdx) => (
                <div
                  key={section.sectionId || sIdx}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-subtle"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {sIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          const updated = [...formData.sections];
                          updated[sIdx].title = e.target.value;
                          setFormData({ ...formData, sections: updated });
                        }}
                        className="font-bold text-sm text-navy bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-primary focus:outline-none px-1"
                        placeholder="Section Title"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {section.questions.length} Questions
                      </span>
                      {formData.sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(sIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Questions */}
                  <div className="space-y-1.5 pt-1">
                    {section.questions.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                        No questions in this section yet.
                      </div>
                    ) : (
                      section.questions.map((q, qIdx) => (
                        <div
                          key={q.questionId}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1 truncate">
                            <span className="font-mono text-slate-400 text-[11px]">
                              Q{qIdx + 1}.
                            </span>
                            <span className="font-medium text-navy truncate">
                              {q.statement || `Question ${q.questionId}`}
                            </span>
                            <Badge variant="neutral" size="sm">
                              {q.questionType}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 font-mono text-xs">
                              <span className="text-[10px] text-slate-400">Marks:</span>
                              <input
                                type="number"
                                min="0.25"
                                step="0.25"
                                value={q.marks}
                                onChange={(e) =>
                                  handleUpdateQuestionMarks(sIdx, qIdx, e.target.value, undefined)
                                }
                                className="w-14 px-1.5 py-0.5 border rounded text-xs bg-white text-center font-bold"
                              />
                            </div>

                            {/* Section Switcher dropdown if multiple sections exist */}
                            {formData.sections.length > 1 && (
                              <select
                                value={sIdx}
                                onChange={(e) =>
                                  handleMoveQuestionToSection(sIdx, qIdx, Number(e.target.value))
                                }
                                className="px-2 py-0.5 text-[10px] border rounded bg-white"
                              >
                                {formData.sections.map((targetSec, tIdx) => (
                                  <option key={targetSec.sectionId || tIdx} value={tIdx}>
                                    Move to {targetSec.title}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: EXAM SETTINGS */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-navy text-sm">Examination Delivery Settings</h4>
              <p className="text-xs text-slate-500">
                Configure candidate navigation, proctoring, and security policies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.settings.allowQuestionNavigation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        allowQuestionNavigation: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded"
                />
                <div>
                  <span className="font-bold text-navy block text-xs">Free Navigation</span>
                  <span className="text-[11px] text-slate-500">
                    Candidates can skip forward and backward between questions.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.settings.allowMarkForReview}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        allowMarkForReview: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded"
                />
                <div>
                  <span className="font-bold text-navy block text-xs">Mark for Review</span>
                  <span className="text-[11px] text-slate-500">
                    Allows flagging questions to revisit before final submission.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.settings.shuffleQuestions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        shuffleQuestions: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded"
                />
                <div>
                  <span className="font-bold text-navy block text-xs">Shuffle Questions</span>
                  <span className="text-[11px] text-slate-500">
                    Randomizes question sequence for each candidate.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.settings.shuffleOptions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        shuffleOptions: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded"
                />
                <div>
                  <span className="font-bold text-navy block text-xs">Shuffle Options</span>
                  <span className="text-[11px] text-slate-500">
                    Randomizes MCQ option choices (A, B, C, D) per candidate.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.settings.allowNegativeMarking}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        allowNegativeMarking: e.target.checked,
                      },
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-brand-primary rounded"
                />
                <div>
                  <span className="font-bold text-navy block text-xs">Enforce Negative Marking</span>
                  <span className="text-[11px] text-slate-500">
                    Deducts marks for incorrect selections as defined per question.
                  </span>
                </div>
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <label className="font-bold text-navy block text-xs">Result Visibility</label>
                <select
                  value={formData.settings.resultVisibility}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: {
                        ...formData.settings,
                        resultVisibility: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="AFTER_WINDOW">After Exam Window Closes</option>
                  <option value="IMMEDIATE">Immediately Upon Submission</option>
                  <option value="MANUAL">Manual Faculty Release</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & PUBLISH */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-navy text-sm">Review & Publication Validation</h4>
              <p className="text-xs text-slate-500">
                Verify assessment structure before publishing. Published versions create an immutable snapshot.
              </p>
            </div>

            {validating ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Running pre-flight validation checks...
              </div>
            ) : validationReport ? (
              <div className="space-y-4">
                {/* Status Callout */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    validationReport.isValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {validationReport.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span className="font-bold text-xs">
                    {validationReport.isValid
                      ? 'All validation checks passed! Ready to publish.'
                      : `${validationReport.errors.length} validation issues detected.`}
                  </span>
                </div>

                {/* Errors */}
                {validationReport.errors?.length > 0 && (
                  <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1">
                    {validationReport.errors.map((err, i) => (
                      <p key={i} className="text-rose-800 text-xs">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                {validationReport.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">
                        Questions
                      </span>
                      <strong className="text-lg text-navy">
                        {validationReport.summary.totalQuestions}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">
                        Total Marks
                      </span>
                      <strong className="text-lg text-brand-primary">
                        {validationReport.summary.totalMarks}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">
                        Duration
                      </span>
                      <strong className="text-lg text-navy">
                        {validationReport.summary.durationMinutes}m
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">
                        Passing Marks
                      </span>
                      <strong className="text-lg text-emerald-700">
                        {validationReport.summary.passingMarks}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                onClick={handlePrevStep}
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>

            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="sm"
                icon={ChevronRight}
                iconPosition="right"
                onClick={handleNextStep}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublishExam}
                disabled={saving || (validationReport && !validationReport.isValid)}
              >
                {saving ? 'Publishing...' : 'Publish Examination'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Question Creation Modal */}
      {inlineCreateOpen && (
        <QuestionEditorModal
          isOpen={inlineCreateOpen}
          onClose={() => setInlineCreateOpen(false)}
          onSuccess={(newQ) => {
            loadBankQuestions();
            // Automatically select the newly created question
            handleToggleQuestionSelection(newQ);
            setInlineCreateOpen(false);
          }}
        />
      )}
    </Modal>
  );
};

export default ExamWizardModal;
