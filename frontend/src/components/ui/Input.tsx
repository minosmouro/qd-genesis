import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, icon, iconPosition = 'left', helperText, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const baseClasses =
      'flex h-12 w-full rounded-lg border-2 border-border bg-background px-4 py-2 text-sm text-text-primary file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200';

    const errorClasses = error ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/10' : '';
    const iconPaddingClasses = icon ? (iconPosition === 'left' ? 'pl-11' : 'pr-11') : '';

    const classes = cn(baseClasses, errorClasses, iconPaddingClasses, className);


    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 text-text-secondary transition-colors',
                iconPosition === 'left' ? 'left-4' : 'right-4',
                isFocused && 'text-primary'
              )}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={classes}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-secondary">{helperText}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-danger flex items-center gap-1" role="alert">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
