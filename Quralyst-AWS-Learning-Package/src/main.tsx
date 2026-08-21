import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted vendor assets (Phase 30 — replaces the CDN <link>s in index.html).
// ORDER IS LOAD-BEARING: Bootswatch must be imported BEFORE our core/components CSS so the
// !important overrides in core/buttons.css etc. keep winning the cascade, exactly as the CDN
// <link>s loading first did. Same pinned versions (Flatly 5.3.2, BI 1.11.3, Roboto 400/700).
import 'bootswatch/dist/flatly/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
// Lato is Flatly's own font stack — its Google-Fonts @import inside bootstrap.min.css is
// stripped by the strip-remote-font-imports PostCSS plugin (vite.config.ts); these provide
// the same faces (400 / 700 / 400-italic) locally.
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/lato/400-italic.css';

// Global CSS — import order mirrors base.html (vendor CSS above loads first):
// core (reset → colors → typography → buttons → forms → alerts) → components → app globals.
import '@/styles/core/index.css';
import '@/styles/components/index.css';
import '@/styles/globals.css';

import App from '@/App';
import { initErrorReporting } from '@/lib/reportError';
import { installGlobalErrorLogging } from '@/lib/globalErrorLogging';

// Uncaught error/rejection → logger (Phase 40): so they reach the dev terminal + shipping/Sentry.
installGlobalErrorLogging();

// Env-gated error reporting (Phase 33): no DSN → no-op, Sentry chunk never fetched.
void initErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
