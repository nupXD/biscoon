import * as Sentry from '@sentry/node';
import { NODE_ENV, SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from './env';

let monitoringEnabled = false;

function initMonitoring(): boolean {
  if (!SENTRY_DSN) return false;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE) ? SENTRY_TRACES_SAMPLE_RATE : 0.05,
  });
  monitoringEnabled = true;
  return true;
}

function captureException(error: unknown, context: Record<string, unknown> = {}): void {
  if (!monitoringEnabled) return;
  Sentry.captureException(error, { extra: context });
}

export {
  initMonitoring,
  captureException,
};
