// Gera um external_id com prefixo 'QD-' seguido de 6 dígitos
// Usa crypto.getRandomValues quando disponível; caso contrário, Math.random
export function generateExternalId(prefix = 'QD'): string {
  const randomSix = (typeof crypto !== 'undefined' && typeof (crypto as any).getRandomValues === 'function')
    ? (() => {
        const buf = new Uint32Array(1);
        (crypto as any).getRandomValues(buf);
        return String(buf[0] % 1000000).padStart(6, '0');
      })()
    : String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `${prefix}-${randomSix}`;
}