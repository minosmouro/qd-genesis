import React from 'react';
import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onChange, checked, ...props }, ref) => {
    return (
      <label
        className={cn(
          'relative flex items-center justify-center w-5 h-5',
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          className="peer absolute w-full h-full opacity-0 cursor-pointer"
          checked={checked}
          onChange={e => onChange?.(e.target.checked)}
          {...props}
        />
        <span
          className={cn(
            'flex items-center justify-center w-full h-full rounded border-2 border-border bg-background transition-all',
            'peer-checked:bg-primary peer-checked:border-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface'
          )}
        >
          <Check className="w-3.5 h-3.5 text-background opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
