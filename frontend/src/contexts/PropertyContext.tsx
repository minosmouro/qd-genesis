import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { PropertyFormData, validatePropertyData } from '@/schemas/property.schema';

// Context para dados apenas
interface PropertyDataContextType {
  propertyData: Partial<PropertyFormData>;
  updateField: (field: keyof PropertyFormData, value: any) => void;
  updateData: (data: Partial<PropertyFormData>) => void;
  resetData: () => void;
}

// Context para navegação apenas  
interface PropertyNavigationContextType {
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canAdvanceToStep: (step: number) => boolean;
}

// Context para validação apenas
interface PropertyValidationContextType {
  validation: {
    isValid: boolean;
    errors: string[];
    fieldErrors: Record<string, string>;
  };
  validateStep: (step: number) => boolean;
  canPublish: boolean;
}

const PropertyDataContext = createContext<PropertyDataContextType | undefined>(undefined);
const PropertyNavigationContext = createContext<PropertyNavigationContextType | undefined>(undefined);
const PropertyValidationContext = createContext<PropertyValidationContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: React.ReactNode;
  totalSteps: number;
  initialData?: Partial<PropertyFormData>;
}

export const PropertyProvider: React.FC<PropertyProviderProps> = ({
  children,
  totalSteps,
  initialData = {},
}) => {
  const [propertyData, setPropertyData] = useState<Partial<PropertyFormData>>(initialData);
  const [currentStep, setCurrentStep] = useState(1);

  // Data Context Methods
  const updateField = useCallback((field: keyof PropertyFormData, value: any) => {
    setPropertyData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateData = useCallback((data: Partial<PropertyFormData>) => {
    setPropertyData(prev => ({ ...prev, ...data }));
  }, []);

  const resetData = useCallback(() => {
    setPropertyData(initialData);
  }, [initialData]);

  // Navigation Context Methods
  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const canAdvanceToStep = useCallback((step: number) => {
    // Step validation logic here
    if (step <= currentStep + 1) return true;
    
    // Check if all previous steps are valid
    for (let i = 1; i < step; i++) {
      if (!validateStepData(i, propertyData)) {
        return false;
      }
    }
    return true;
  }, [currentStep, propertyData]);

  // Validation Logic
  const validation = useMemo(() => {
    const result = validatePropertyData(propertyData);
    return {
      isValid: result.isValid,
      errors: result.errors,
      fieldErrors: {}, // TODO: Map field-specific errors
    };
  }, [propertyData]);

  const validateStep = useCallback((step: number) => {
    return validateStepData(step, propertyData);
  }, [propertyData]);

  const canPublish = useMemo(() => {
    return validation.isValid;
  }, [validation.isValid]);

  // Context Values (memoized for performance)
  const dataContextValue = useMemo(() => ({
    propertyData,
    updateField,
    updateData,
    resetData,
  }), [propertyData, updateField, updateData, resetData]);

  const navigationContextValue = useMemo(() => ({
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === totalSteps,
    canAdvanceToStep,
  }), [currentStep, totalSteps, nextStep, prevStep, goToStep, canAdvanceToStep]);

  const validationContextValue = useMemo(() => ({
    validation,
    validateStep,
    canPublish,
  }), [validation, validateStep, canPublish]);

  return (
    <PropertyDataContext.Provider value={dataContextValue}>
      <PropertyNavigationContext.Provider value={navigationContextValue}>
        <PropertyValidationContext.Provider value={validationContextValue}>
          {children}
        </PropertyValidationContext.Provider>
      </PropertyNavigationContext.Provider>
    </PropertyDataContext.Provider>
  );
};

// Helper function for step validation
function validateStepData(step: number, data: Partial<PropertyFormData>): boolean {
  switch (step) {
    case 1:
      return !!(data.usage_type && data.property_type && data.business_type);
    case 2:
      // Condo step only required for certain property types
      const needsCondo = ['APARTMENT', 'FLAT', 'COBERTURA', 'LOFT', 'STUDIO', 'CASA_CONDOMINIO'].includes(data.property_type || '');
      return !needsCondo || !!(data as any).building_name;
    case 3:
      return !!(data.address?.street && data.address?.city && data.address?.zip_code);
    case 4:
      // Values validation
      if (data.business_type === 'SALE' || data.business_type === 'SALE_RENTAL') {
        if (!data.price_sale || data.price_sale <= 0) return false;
      }
      if (data.business_type === 'RENTAL' || data.business_type === 'SALE_RENTAL') {
        if (!data.price_rent || data.price_rent <= 0) return false;
      }
      return true;
    case 5:
      // Photos optional but recommended
      return true;
    case 6:
      return !!data.title;
    case 7:
      return validatePropertyData(data).isValid;
    default:
      return true;
  }
}

// Custom Hooks
export const usePropertyData = () => {
  const context = useContext(PropertyDataContext);
  if (!context) {
    throw new Error('usePropertyData must be used within PropertyProvider');
  }
  return context;
};

export const usePropertyNavigation = () => {
  const context = useContext(PropertyNavigationContext);
  if (!context) {
    throw new Error('usePropertyNavigation must be used within PropertyProvider');
  }
  return context;
};

export const usePropertyValidation = () => {
  const context = useContext(PropertyValidationContext);
  if (!context) {
    throw new Error('usePropertyValidation must be used within PropertyProvider');
  }
  return context;
};

// Combined hook for backward compatibility
export const useProperty = () => {
  const data = usePropertyData();
  const navigation = usePropertyNavigation();
  const validation = usePropertyValidation();
  
  return {
    ...data,
    ...navigation,
    ...validation,
  };
};
