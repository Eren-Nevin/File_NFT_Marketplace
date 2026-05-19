import pino from 'pino';

export function createLogger(opts: { level: string }) {
  return pino({
    level: opts.level,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
