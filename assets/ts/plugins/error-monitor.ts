import * as Sentry from '@sentry/browser';

declare global {
  interface Window {
    BISCOON_SENTRY_DSN?: string;
    BiscoonErrorMonitor?: { capture: (error: unknown, context?: Record<string, unknown>) => void };
  }
}

function configuredDsn(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="biscoon-sentry-dsn"]');
  return window.BISCOON_SENTRY_DSN || meta?.content || '';
}

function capture(error: unknown, context: Record<string, unknown> = {}): void {
  if (configuredDsn()) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error(error, context);
  }
}

function start(): void {
  const dsn = configuredDsn();
  if (dsn) {
    Sentry.init({
      dsn,
      environment: document.documentElement.dataset.env || 'browser',
      tracesSampleRate: 0.05,
    });
  }
  window.BiscoonErrorMonitor = { capture };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
