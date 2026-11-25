import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { questionService } from '../../services/questionService';

const QUESTION_TYPES = [
  { id: 'MCQ_SINGLE', label: 'Single-Choice MCQ', description: 'One correct option out of many' },
  { id: 'MCQ_MULTIPLE', label: 'Multiple-Choice MCQ', description: 'One or more correct options' },
  { id: 'TRUE_FALSE', label: 'True / False', description: 'Binary choice statement' },
  { id: 'DESCRIPTIVE', label: 'Descriptive', description: 'Open-ended written response' },
];

export const QuestionEditorModal = ({
  isOpen,
  onClose,
  initialData = null,
  onSuccess,
}) => {
  const isEditing = Boolean(initialData?._id);

  const [formData, setFormData] = useState({
    questionType: 'MCQ_SINGLE',
    statement: '',
    subject: '',
    topic: '',
    subtopic: '',
    difficulty: 'MEDIUM',
    marks: 2,
    negativeMarks: 0,
    explanation: '',
    evaluationGuidance: '',
    tags: '',
    options: [
      { optionId: '1', text: '', isCorrect: true },
      { optionId: '2', text: '', isCorrect: false },
      { optionId: '3', text: '', isCorrect: false },
      { optionId: '4', text: '', isCorrect: false },
    ],
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        questionType: initialData.questionType || 'MCQ_SINGLE',
        statement: initialData.statement || '',
        subject: initialData.subject || '',
        topic: initialData.topic || '',
        subtopic: initialData.subtopic || '',
        difficulty: initialData.difficulty || 'MEDIUM',
        marks: initialData.marks || 2,
        negativeMarks: initialData.negativeMarks || 0,
        explanation: initialData.explanation || '',
        evaluationGuidance: initialData.evaluationGuidance || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '',
        options:
          initialData.options && initialData.options.length > 0
            ? initialData.options.map((opt, i) => ({
                optionId: opt.optionId || String(i + 1),
                text: opt.text || '',
                isCorrect: Boolean(opt.isCorrect),
              }))
            : [
                { optionId: '1', text: '', isCorrect: true },
                { optionId: '2', text: '', isCorrect: false },
              ],
      });
    } else {
      setFormData({
        questionType: 'MCQ_SINGLE',
        statement: '',
        subject: '',
        topic: '',
        subtopic: '',
        difficulty: 'MEDIUM',
        marks: 2,
        negativeMarks: 0,
        explanation: '',
        evaluationGuidance: '',
        tags: '',
        options: [
          { optionId: '1', text: '', isCorrect: true },
          { optionId: '2', text: '', isCorrect: false },
          { optionId: '3', text: '', isCorrect: false },
          { optionId: '4', text: '', isCorrect: false },
        ],
      });
    }
    setErrorMessage(null);
  }, [initialData, isOpen]);

  // Handle Question Type Change
  const handleTypeChange = (newType) => {
    let updatedOptions = formData.options;
    if (newType === 'TRUE_FALSE') {
      updatedOptions = [
        { optionId: 'tf_true', text: 'True', isCorrect: true },
        { optionId: 'tf_false', text: 'False', isCorrect: false },
      ];
    } else if (newType === 'DESCRIPTIVE') {
      updatedOptions = [];
    } else if (updatedOptions.length < 2) {
      updatedOptions = [
        { optionId: '1', text: '', isCorrect: true },
        { optionId: '2', text: '', isCorrect: false },
      ];
    }

    setFormData({
      ...formData,
      questionType: newType,
      options: updatedOptions,
    });
  };

  // Options Helpers
  const handleOptionTextChange = (index, text) => {
    const updated = [...formData.options];
    updated[index].text = text;
    setFormData({ ...formData, options: updated });
  };

  const handleOptionCorrectToggle = (index) => {
    const updated = [...formData.options];
    if (formData.questionType === 'MCQ_SINGLE' || formData.questionType === 'TRUE_FALSE') {
      // Radio mode: only one correct
      updated.forEach((opt, idx) => {
        opt.isCorrect = idx === index;
      });
    } else if (formData.questionType === 'MCQ_MULTIPLE') {
      // Checkbox mode
      updated[index].isCorrect = !updated[index].isCorrect;
    }
    setFormData({ ...formData, options: updated });
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        { optionId: String(Date.now()), text: '', isCorrect: false },
      ],
    });
  };

  const handleRemoveOption = (index) => {
    if (formData.options.length <= 2) {
      setErrorMessage('Questions must contain at least 2 options.');
      return;
    }
    const updated = formData.options.filter((_, idx) => idx !== index);
    // Ensure at least one option remains marked as correct if possible
    if (!updated.some((opt) => opt.isCorrect) && updated.length > 0) {
      updated[0].isCorrect = true;
    }
    setFormData({ ...formData, options: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Validation
    if (!formData.statement.trim()) {
      setErrorMessage('Question statement is required.');
      return;
    }
    if (!formData.subject.trim() || !formData.topic.trim()) {
      setErrorMessage('Subject and Topic are required.');
      return;
    }
    if (Number(formData.marks) <= 0) {
      setErrorMessage('Marks must be greater than 0.');
      return;
    }
    if (Number(formData.negativeMarks) < 0) {
      setErrorMessage('Negative marks cannot be negative.');
      return;
    }
    if (Number(formData.negativeMarks) > Number(formData.marks)) {
      setErrorMessage('Negative marks cannot exceed total marks for the question.');
      return;
    }

    // Type-specific validations
    if (formData.questionType === 'MCQ_SINGLE') {
      if (formData.options.length < 2) {
        setErrorMessage('MCQ requires at least 2 options.');
        return;
      }
      const correctCount = formData.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        setErrorMessage('Single-Choice MCQ must have exactly one correct option.');
        return;
      }
      if (formData.options.some((o) => !o.text.trim())) {
        setErrorMessage('All options must have text content.');
        return;
      }
    } else if (formData.questionType === 'MCQ_MULTIPLE') {
      if (formData.options.length < 2) {
        setErrorMessage('MCQ requires at least 2 options.');
        return;
      }
      const correctCount = formData.options.filter((o) => o.isCorrect).length;
      if (correctCount < 1) {
        setErrorMessage('Multiple-Choice MCQ must have at least one correct option.');
        return;
      }
      if (formData.options.some((o) => !o.text.trim())) {
        setErrorMessage('All options must have text content.');
        return;
      }
    } else if (formData.questionType === 'TRUE_FALSE') {
      if (formData.options.length !== 2) {
        setErrorMessage('True/False must have exactly 2 options.');
        return;
      }
      const correctCount = formData.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        setErrorMessage('True/False must have exactly one correct option.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        questionType: formData.questionType,
        statement: formData.statement.trim(),
        subject: formData.subject.trim(),
        topic: formData.topic.trim(),
        subtopic: formData.subtopic.trim(),
        difficulty: formData.difficulty,
        marks: Number(formData.marks),
        negativeMarks: Number(formData.negativeMarks) || 0,
        explanation: formData.explanation.trim(),
        evaluationGuidance: formData.evaluationGuidance.trim(),
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        options:
          formData.questionType === 'DESCRIPTIVE'
            ? []
            : formData.options.map((opt) => ({
                optionId: opt.optionId,
                text: opt.text.trim(),
                isCorrect: opt.isCorrect,
              })),
      };

      let result;
      if (isEditing) {
        result = await questionService.updateQuestion(initialData._id, payload);
      } else {
        result = await questionService.createQuestion(payload);
      }

      onSuccess(result.data);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Question' : 'Create New Question'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Question Type Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Question Format
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                type="button"
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  formData.questionType === type.id
                    ? 'border-brand-primary bg-blue-50/50 text-brand-primary font-semibold ring-1 ring-brand-primary'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{type.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Taxonomy (Subject, Topic, Difficulty) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Subject"
            placeholder="e.g. Computer Science"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />

          <Input
            label="Topic"
            placeholder="e.g. Data Structures"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        {/* 3. Statement */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Question Statement <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows="3"
            placeholder="Enter the complete question prompt..."
            value={formData.statement}
            onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
            className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
            required
          />
        </div>

        {/* 4. Options Editor for MCQ / True False */}
        {formData.questionType !== 'DESCRIPTIVE' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Options & Correct Answer(s)
              </label>
              {formData.questionType !== 'TRUE_FALSE' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={handleAddOption}
                >
                  Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {formData.options.map((opt, idx) => (
                <div key={opt.optionId || idx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOptionCorrectToggle(idx)}
                    title={opt.isCorrect ? 'Correct Option' : 'Mark as Correct'}
                    className={`p-1.5 rounded-lg border transition-all ${
                      opt.isCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                        : 'bg-white border-slate-200 text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {opt.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <span className="text-xs font-bold text-slate-400 w-4 text-center">
                    {String.fromCharCode(65 + idx)}
                  </span>

                  <input
                    type="text"
                    placeholder={`Option ${idx + 1} text...`}
                    value={opt.text}
                    disabled={formData.questionType === 'TRUE_FALSE'}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />

                  {formData.questionType !== 'TRUE_FALSE' && formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Click the checkmark circle to mark which option is correct.
            </p>
          </div>
        )}

        {/* 5. Marks & Negative Marking */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Positive Marks"
            type="number"
            step="0.25"
            min="0.25"
            value={formData.marks}
            onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
            required
          />

          <Input
            label="Negative Marks (Deduction)"
            type="number"
            step="0.25"
            min="0"
            value={formData.negativeMarks}
            onChange={(e) => setFormData({ ...formData, negativeMarks: e.target.value })}
            helperText="Marks deducted if candidate answers incorrectly"
          />
        </div>

        {/* 6. Explanation & Optional Guidance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Explanation (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="Rationale displayed upon result release..."
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Evaluation Guidance (Faculty Only)
            </label>
            <textarea
              rows="2"
              placeholder="Rubrics and notes for manual scoring..."
              value={formData.evaluationGuidance}
              onChange={(e) =>
                setFormData({ ...formData, evaluationGuidance: e.target.value })
              }
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Tags */}
        <Input
          label="Tags (comma separated)"
          placeholder="e.g. algorithms, binary-search, core-cs"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Saving Question...' : isEditing ? 'Update Question' : 'Save to Question Bank'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default QuestionEditorModal;
