import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export const useAutoSave = ({ onSave, delay = 30000, enabled = true }: UseAutoSaveOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<any>(null);

  const triggerSave = useCallback(async () => {
    if (!enabled || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave();
      setLastSaved(new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erro ao salvar');
      console.error('Auto-save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, enabled, isSaving]);

  const scheduleAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        triggerSave();
      }, delay);
    }
  }, [delay, enabled, triggerSave]);

  const markDataChanged = useCallback((data: any) => {
    dataRef.current = data;
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    saveError,
    triggerSave,
    markDataChanged,
  };
};