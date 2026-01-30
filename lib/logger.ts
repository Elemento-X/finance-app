// Simple logger utility - logs only in development mode
// Production errors are always logged for debugging

const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

function createLogger(prefix: string): Logger {
  const format = (level: LogLevel, message: string) => `[${prefix}] ${message}`

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDev) console.debug(format('debug', message), ...args)
    },
    info: (message: string, ...args: unknown[]) => {
      if (isDev) console.info(format('info', message), ...args)
    },
    warn: (message: string, ...args: unknown[]) => {
      if (isDev) console.warn(format('warn', message), ...args)
    },
    // Errors are always logged (useful for production debugging)
    error: (message: string, ...args: unknown[]) => {
      console.error(format('error', message), ...args)
    },
  }
}

// Pre-configured loggers for each service
export const logger = {
  sync: createLogger('Sync'),
  brapi: createLogger('Brapi'),
  marketData: createLogger('MarketData'),
  supabase: createLogger('Supabase'),
  telegram: createLogger('Telegram'),
  cron: createLogger('Cron'),
  migrations: createLogger('Migrations'),
  app: createLogger('App'),
}

export { createLogger }
