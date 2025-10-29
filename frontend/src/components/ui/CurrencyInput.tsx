import React, { useCallback } from 'react';
import Input from './Input';

interface CurrencyInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'onChange'> {
  onValueChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ onValueChange, ...props }, ref) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const numericValue = Number(value.replace(/\D/g, '')) / 100;
        onValueChange(numericValue);
      },
      [onValueChange]
    );

    const formatValue = (value: any) => {
      if (typeof value !== 'number') return '';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    return (
      <Input
        ref={ref}
        {...props}
        type="text"
        onChange={handleChange}
        value={formatValue(props.value)}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
