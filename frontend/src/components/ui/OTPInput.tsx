import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [lastCompletedValue, setLastCompletedValue] = useState<string>('');

  useEffect(() => {
    // Auto-focus no primeiro input ao montar
    if (inputRefs.current[0] && !value) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Callback quando completo - executar APENAS UMA VEZ por valor completo
    if (value.length === length && onComplete && value !== lastCompletedValue) {
      setLastCompletedValue(value);
      onComplete(value);
    }
    // Resetar quando valor for limpo
    if (value.length === 0 && lastCompletedValue) {
      setLastCompletedValue('');
    }
  }, [value, length, onComplete, lastCompletedValue]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;

    // Permitir apenas números
    const sanitized = inputValue.replace(/[^0-9]/g, '');
    
    if (sanitized.length > 1) {
      // Paste: distribuir valores entre os inputs
      const chars = sanitized.slice(0, length).split('');
      const newValue = (value.split('').slice(0, index).join('') + chars.join('')).slice(0, length);
      onChange(newValue);
      
      // Focar no próximo input vazio ou último
      const nextIndex = Math.min(newValue.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single character
    const newValue = value.split('');
    newValue[index] = sanitized;
    const result = newValue.join('').slice(0, length);
    onChange(result);

    // Move to next input
    if (sanitized && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      
      if (newValue[index]) {
        // Clear current digit
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous and clear
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => {
        const hasValue = !!value[index];
        
        return (
          <motion.input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={cn(
              'w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-lg border-2 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              error
                ? 'border-danger bg-danger/5 text-danger focus:border-danger focus:ring-danger/20'
                : hasValue
                  ? 'border-primary bg-primary/5 text-primary focus:border-primary focus:ring-primary/20'
                  : 'border-border bg-surface text-text-primary focus:border-primary focus:ring-primary/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            initial={{ scale: 1 }}
            whileFocus={{ scale: 1.05 }}
            animate={error ? { x: [-2, 2, -2, 2, 0] } : {}}
            transition={{ duration: 0.3 }}
          />
        );
      })}
    </div>
  );
};

export default OTPInput;
