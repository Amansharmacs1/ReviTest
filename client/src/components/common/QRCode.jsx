import React from 'react';

/**
 * Lightweight QR Code generator using an open SVG image service
 * or vector fallback for classroom display
 */
export const QRCode = ({ value, size = 180, className = '' }) => {
  if (!value) return null;

  // Use reliable HTTPS QR server endpoint for instant rendering
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}&margin=10`;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}
    >
      <img
        src={qrUrl}
        alt="Quiz QR Code"
        width={size}
        height={size}
        className="rounded-lg object-contain"
        loading="lazy"
      />
      <span className="text-[10px] text-slate-400 font-mono mt-1.5">
        Scan with mobile phone to join
      </span>
    </div>
  );
};

export default QRCode;
