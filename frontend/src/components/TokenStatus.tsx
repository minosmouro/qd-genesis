import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { cn } from '@/utils/cn';

const EXPIRY_KEY = 'gandalf_token_expiry';

export interface TokenStatusProps {
  pollIntervalMs?: number; // 0 = no polling
}

const TokenStatus: React.FC<TokenStatusProps> = ({ pollIntervalMs = 0 }) => {
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  const readExpiry = (): number | null => {
    try {
      const v = localStorage.getItem(EXPIRY_KEY);
      if (!v) return null;
      const ts = Number(v);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  };

  const checkLocal = (): boolean | null => {
    const expiry = readExpiry();
    if (!expiry) return null;
    const remaining = Math.max(0, Math.round((expiry - Date.now()) / 1000));
    setRemainingSec(remaining);
    // buffer 30s
    if (remaining > 30) return true;
    if (remaining === 0) return false;
    return null; // undecided small window
  };

  const checkRemote = async () => {
    setLoading(true);
    try {
      const ok = await authService.validateGandalfCredentials();
      setValid(Boolean(ok));
      setLastChecked(new Date());
      // if backend returned token expiry metadata, authService should save it to localStorage
      // here we also update remaining based on local expiry if present
      const expiry = readExpiry();
      if (expiry)
        setRemainingSec(Math.max(0, Math.round((expiry - Date.now()) / 1000)));
    } catch {
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  const check = async () => {
    const local = checkLocal();
    if (local === true) {
      setValid(true);
      setLastChecked(new Date());
      return;
    }
    // if local says invalid or unknown, confirm with backend
    await checkRemote();
  };

  useEffect(() => {
    check();
    if (pollIntervalMs > 0) {
      intervalRef.current = window.setInterval(
        check,
        pollIntervalMs
      ) as unknown as number;
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [pollIntervalMs]);

  const colorClass =
    valid === null
      ? 'bg-border text-text-secondary'
      : valid
        ? 'bg-success/20 text-success'
        : 'bg-danger/20 text-danger';
  const dotClass =
    valid === null
      ? 'bg-text-secondary/50'
      : valid
        ? 'bg-success'
        : 'bg-danger';

  const onClick = () => {
    // manual refresh
    check();
    // navigate user to settings to re-link if invalid
    if (valid === false) {
      try {
        window.location.href = '/settings?open=gandalf';
      } catch {}
    }
  };

  return (
    <button
      onClick={onClick}
      title={
        lastChecked
          ? `Última verificação: ${lastChecked.toLocaleString()}`
          : 'Verificar token CanalPro'
      }
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border border-border focus:outline-none',
        colorClass
      )}
      aria-label={
        valid
          ? 'Token CanalPro válido'
          : valid === false
            ? 'Token CanalPro inválido'
            : 'Verificando token CanalPro'
      }
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span className="truncate max-w-[120px] text-xs">
        {valid === null
          ? 'Verificando'
          : valid
            ? remainingSec != null
              ? `CanalPro: OK (${remainingSec}s)`
              : 'CanalPro: OK'
            : 'CanalPro: Expirado'}
      </span>
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
};

export default TokenStatus;
