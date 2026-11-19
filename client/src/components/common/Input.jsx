import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      type = 'text',
      className = '',
      id,
      name,
      required,
      ...props
    },
    ref
  ) => {
    const inputId =
      id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            required={required}
            className={`w-full text-xs sm:text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all placeholder:text-slate-400 py-2 ${
              Icon ? 'pl-9 pr-3' : 'px-3'
            } ${
              error
                ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                : 'border-slate-200'
            } ${className}`}
            {...props}
          />
        </div>

        {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-[11px] text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
