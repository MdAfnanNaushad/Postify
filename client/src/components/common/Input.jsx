import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  name,
  id,
  required = false,
  className = '',
  disabled = false,
  showPasswordToggle = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

  const resolvedType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--portal-meta)] px-1"
        >
          {label} {required && <span className="text-[#007aff]">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <input
          id={inputId}
          name={name}
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`w-full bg-[var(--portal-input)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] px-4 py-3 rounded-xl border transition-all duration-200 outline-none text-sm
            ${
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-[var(--portal-input-border)] focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/15'
            }
            ${disabled ? 'bg-black/5 dark:bg-white/5 opacity-60 cursor-not-allowed' : ''}
          `}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)] hover:text-[var(--portal-heading)] p-1 focus:outline-none cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500 px-1 font-medium">{error}</span>}
    </div>
  );
};
