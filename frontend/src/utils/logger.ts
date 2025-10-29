/**
 * Utilitário de logging seguro
 * Logs DESABILITADOS para proteger dados sensíveis
 */

// 🔒 LOGS PERMANENTEMENTE DESABILITADOS POR SEGURANÇA
const isDevelopment = false

/**
 * Log seguro - DESABILITADO
 */
export const devLog = (..._args: any[]) => {
  // DESABILITADO - não loga dados sensíveis
}

/**
 * Log de erro - apenas erros críticos (sanitizados)
 */
export const errorLog = (message: string, error?: any) => {
  // Apenas em casos críticos, sanitizado
  if (isDevelopment) {
    const sanitized = sanitizeError(error)
    console.error(message, sanitized)
  }
}

/**
 * Log de warning - DESABILITADO
 */
export const warnLog = (..._args: any[]) => {
  // DESABILITADO - não loga dados sensíveis
}

/**
 * Sanitiza erros removendo dados sensíveis
 */
function sanitizeError(error: any): any {
  if (!error) return error
  
  const sanitized = { ...error }
  
  // Remover campos sensíveis
  const sensitiveFields = ['token', 'access_token', 'password', 'authorization', 'cookie']
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  // Sanitizar headers
  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers }
    if (sanitized.headers.Authorization) {
      sanitized.headers.Authorization = 'Bearer [REDACTED]'
    }
  }
  
  return sanitized
}

/**
 * Log para debug de performance - DESABILITADO
 */
export const perfLog = (_label: string, _startTime: number) => {
  // DESABILITADO - não loga informações de performance
}
