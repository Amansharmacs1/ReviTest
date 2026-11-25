import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import { scheduleService } from '../../services/scheduleService';
import { examService } from '../../services/examService';
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react';

export const ScheduleModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const isEditing = Boolean(initialData);

  const [publishedExams, setPublishedExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);

  const [formData, setFormData] = useState({
    examId: initialData?.examId?._id || initialData?.examId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    startTime: initialData?.startTime
      ? new Date(initialData.startTime).toISOString().slice(0, 16)
      : '',
    endTime: initialData?.endTime
      ? new Date(initialData.endTime).toISOString().slice(0, 16)
      : '',
    durationMinutes: initialData?.durationMinutes || 60,
    lateEntryGraceMinutes: initialData?.lateEntryGraceMinutes ?? 15,
    maxAttempts: initialData?.maxAttempts || 1,
    eligibilityType: initialData?.eligibilityType || 'ALL_CANDIDATES',
    targetBatch: initialData?.targetBatch || '',
    settings: {
      requireAcknowledgement: initialData?.settings?.requireAcknowledgement !== false,
      allowReview: initialData?.settings?.allowReview !== false,
      showResultsImmediately: initialData?.settings?.showResultsImmediately || false,
    },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load published exams
  useEffect(() => {
    if (!isOpen) return;
    const fetchExams = async () => {
      setExamsLoading(true);
      try {
        const res = await examService.getExams({ status: 'PUBLISHED', limit: 100 });
        setPublishedExams(res.data?.exams || []);
      } catch (err) {
        setError(err.message || 'Failed to load published examinations');
      } finally {
        setExamsLoading(false);
      }
    };
    fetchExams();
  }, [isOpen]);

  // Handle Exam Selection to autofill duration
  const handleExamChange = (e) => {
    const selectedId = e.target.value;
    const selectedExam = publishedExams.find((ex) => ex._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      examId: selectedId,
      title: prev.title || (selectedExam ? `${selectedExam.title} - Session` : ''),
      durationMinutes: selectedExam?.durationMinutes || prev.durationMinutes,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.examId) {
      setError('Please select a published examination to schedule.');
      return;
    }
    if (!formData.title.trim()) {
      setError('Schedule title is required.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Start date/time and end date/time are both required.');
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);

    if (startDate >= endDate) {
      setError('Start time must be strictly before end time.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        examId: formData.examId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes: parseInt(formData.durationMinutes, 10),
        lateEntryGraceMinutes: parseInt(formData.lateEntryGraceMinutes, 10),
        maxAttempts: parseInt(formData.maxAttempts, 10),
        eligibilityType: formData.eligibilityType,
        targetBatch:
          formData.eligibilityType === 'BATCH' ? formData.targetBatch.trim() : undefined,
        settings: formData.settings,
      };

      if (isEditing) {
        await scheduleService.updateSchedule(initialData._id, payload);
      } else {
        await scheduleService.createSchedule(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save examination schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Examination Schedule' : 'Schedule Examination Assessment'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Exam Selection */}
        <div>
          <label className="block text-xs font-semibold text-navy mb-1">
            Published Examination <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.examId}
            onChange={handleExamChange}
            disabled={isEditing || examsLoading}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">
              {examsLoading ? 'Loading published exams...' : '-- Select a Published Exam --'}
            </option>
            {publishedExams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.title} ({ex.subject} • {ex.durationMinutes} mins • {ex.totalMarks} marks)
              </option>
            ))}
          </select>
          {publishedExams.length === 0 && !examsLoading && (
            <p className="text-[11px] text-amber-600 mt-1">
              No published exams available. Please publish an exam in the Examinations tab first.
            </p>
          )}
        </div>

        {/* 2. Schedule Title & Description */}
        <div className="grid grid-cols-1 gap-3">
          <Input
            label="Schedule Title *"
            placeholder="e.g. Computer Networks - Midterm 2026"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Session Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions or batch details for candidates..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* 3. Time Window (Start and End) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-primary" />
              <span>Start Date & Time (UTC/Local) *</span>
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-brand-primary" />
              <span>End Date & Time (UTC/Local) *</span>
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              required
            />
          </div>
        </div>

        {/* 4. Duration, Grace Period, Attempts */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Duration (Mins) *"
            type="number"
            min="1"
            max="720"
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
            required
          />

          <Input
            label="Late Entry Grace (Mins)"
            type="number"
            min="0"
            max="180"
            value={formData.lateEntryGraceMinutes}
            onChange={(e) => setFormData({ ...formData, lateEntryGraceMinutes: e.target.value })}
          />

          <Input
            label="Max Attempts"
            type="number"
            min="1"
            max="10"
            value={formData.maxAttempts}
            onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
            required
          />
        </div>

        {/* 5. Eligibility Type */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-navy">
            <Users className="w-4 h-4 text-brand-primary" />
            <span>Candidate Assignment Eligibility</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { id: 'ALL_CANDIDATES', label: 'All Candidates' },
              { id: 'BATCH', label: 'Department / Batch' },
              { id: 'SELECTED_CANDIDATES', label: 'Manual Selection' },
            ].map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                  formData.eligibilityType === option.id
                    ? 'bg-blue-50/70 border-brand-primary text-brand-primary font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="eligibilityType"
                  value={option.id}
                  checked={formData.eligibilityType === option.id}
                  onChange={(e) => setFormData({ ...formData, eligibilityType: e.target.value })}
                  className="w-3.5 h-3.5 text-brand-primary"
                />
                <span className="truncate">{option.label}</span>
              </label>
            ))}
          </div>

          {formData.eligibilityType === 'BATCH' && (
            <div className="pt-2">
              <Input
                label="Target Department / Batch Name *"
                placeholder="e.g. Computer Science or CS-2026"
                value={formData.targetBatch}
                onChange={(e) => setFormData({ ...formData, targetBatch: e.target.value })}
                required
              />
            </div>
          )}

          {formData.eligibilityType === 'SELECTED_CANDIDATES' && (
            <p className="text-[11px] text-slate-500">
              You can assign specific individual candidates after creating this schedule via the candidate roster management tool.
            </p>
          )}
        </div>

        {/* 6. Settings */}
        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={formData.settings.requireAcknowledgement}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    requireAcknowledgement: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-brand-primary rounded border-slate-300"
            />
            <span>Require candidate rules & integrity acknowledgement before entering</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
            <input
              type="checkbox"
              checked={formData.settings.showResultsImmediately}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    showResultsImmediately: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-brand-primary rounded border-slate-300"
            />
            <span>Release results immediately upon exam submission</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={saving || (!isEditing && publishedExams.length === 0)}
          >
            {saving ? 'Saving Schedule...' : isEditing ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleModal;
