import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Send,
  Shield,
} from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import Button from '../common/Button';

export const ExamHeader = ({
  examTitle,
  subject,
  candidateName,
  endsAt,
  saveStatus, // 'SAVED' | 'SAVING' | 'OFFLINE' | 'ERROR'
  onTimeExpired,
  onSubmitClick,
  currentIndex,
  totalQuestions,
}) => {
  const renderSaveBadge = () => {
    switch (saveStatus) {
      case 'SAVING':
        return (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Saving response...</span>
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <CloudOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline (queued)</span>
          </span>
        );
      case 'ERROR':
        return (
          <span className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync error - retrying</span>
          </span>
        );
      case 'SAVED':
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">All changes saved</span>
          </span>
        );
    }
  };

  return (
    <header className="h-16 bg-navy text-white px-4 sm:px-6 flex items-center justify-between border-b border-navy-border shadow-md select-none sticky top-0 z-30">
      {/* Left: Exam Branding & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center font-bold text-white shadow-sm shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold truncate text-white max-w-xs sm:max-w-md">
              {examTitle || 'Online Examination'}
            </h1>
            {subject && (
              <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {subject}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Examinee: <span className="text-slate-200 font-medium">{candidateName}</span>
            {totalQuestions > 0 && (
              <span className="ml-2 pl-2 border-l border-slate-700 text-slate-300">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Autosave Status, Server-Authoritative Timer & Submit Button */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Autosave Indicator */}
        <div className="shrink-0">{renderSaveBadge()}</div>

        {/* Server Authoritative Timer */}
        <div className="shrink-0">
          <CountdownTimer endsAt={endsAt} onTimeExpired={onTimeExpired} />
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          size="sm"
          icon={Send}
          onClick={onSubmitClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
        >
          <span className="hidden sm:inline">Submit Exam</span>
          <span className="sm:hidden">Submit</span>
        </Button>
      </div>
    </header>
  );
};

export default ExamHeader;
