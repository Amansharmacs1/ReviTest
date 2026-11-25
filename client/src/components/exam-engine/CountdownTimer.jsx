import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export const CountdownTimer = ({ endsAt, onTimeExpired }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (!endsAt) return 0;
    const diff = Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const expiredRef = useRef(false);

  useEffect(() => {
    if (!endsAt) return;

    const calculateRemaining = () => {
      const now = Date.now();
      const target = new Date(endsAt).getTime();
      const diff = Math.floor((target - now) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsRemaining(remaining);

      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (onTimeExpired) {
          onTimeExpired();
        }
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [endsAt, onTimeExpired]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 60;
  const isWarning = secondsRemaining > 60 && secondsRemaining <= 300;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wide transition-colors ${
        isUrgent
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
          : isWarning
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
          : 'bg-slate-800 text-slate-100 border border-slate-700'
      }`}
      title="Remaining time authoritative on server"
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-brand-primary shrink-0" />
      )}
      <span>{formatTime(secondsRemaining)}</span>
    </div>
  );
};

export default CountdownTimer;
