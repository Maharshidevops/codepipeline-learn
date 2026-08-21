import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { formatClientLog } from './src/lib/clientLogFormat';

// Content Security Policy (Phase 31) — injected into the BUILT index.html only (`apply: 'build'`):
// the dev server needs Vite's inline react-refresh preamble, which a static policy would block.
// Near-'self'-only since Phase 30 self-hosted all vendor assets. The sha256 hash allows exactly the
// inline no-FOUC theme script in index.html — if that script changes, recompute:
//   node -e "const f=require('fs').readFileSync('index.html','utf8');const m=f.match(/<script>([\s\S]*?)<\/script>/);console.log('sha256-'+require('crypto').createHash('sha256').update(m[1],'utf8').digest('base64'))"
// style-src 'unsafe-inline' is deliberate (React style={{}} attributes + ApexCharts runtime <style>).
// frame-src Stripe entries are future-proofing for embedded elements (checkout is redirect-based today).
// Header-only directives (HSTS, frame-ancestors, nosniff) are parked for the serving layer — see
// Phases/BACKEND-INTEGRATION.md.
const NO_FOUC_SCRIPT_HASH = 'sha256-TfoIFkZYQauLd2wqYBfJfTenY/mfG3Lt5wHhNYjkk9M=';

// Speculation Rules (Phase 36) — Chromium-only free enhancement: prerender the most likely next
// ROUTES (never hashed assets) so first navigation is instant. Injected build-only alongside the
// CSP, whose script-src carries this block's hash (computed below from the exact JSON text).
const SPECULATION_RULES = JSON.stringify({
  prerender: [{ urls: ['/previous-results', '/process-preference'], eagerness: 'moderate' }],
});
const SPECULATION_RULES_HASH = `sha256-${createHash('sha256')
  .update(SPECULATION_RULES, 'utf8')
  .digest('base64')}`;

// Phase 40 — dev-only bridge: the browser POSTs client logs (warnings, errors, and every API
// request/response) to /__client-log and this middleware prints them to the terminal running
// `npm run dev`, so frontend errors/popups and API traffic are visible where you develop — not only
// in the browser devtools. `apply: 'serve'` keeps it entirely out of production builds.
function clientLogToTerminal(): Plugin {
  const MAX_BODY_BYTES = 100_000;
  return {
    name: 'client-log-to-terminal',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__client-log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let raw = '';
        let aborted = false;
        req.on('data', (chunk: Buffer) => {
          raw += chunk;
          if (raw.length > MAX_BODY_BYTES) {
            aborted = true;
            req.destroy();
          }
        });
        req.on('end', () => {
          if (!aborted) {
            try {
              const entry = JSON.parse(raw);
              const line = formatClientLog(entry);
              const level = String(entry?.level ?? 'info');
              if (level === 'error') server.config.logger.error(line, { timestamp: true });
              else if (level === 'warn') server.config.logger.warn(line, { timestamp: true });
              else server.config.logger.info(line, { timestamp: true });
            } catch {
              // Malformed payloads must never break the dev server.
            }
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

function injectCsp(cspPolicy: string): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: cspPolicy },
            // head-prepend: the policy must precede the inline theme script it hashes.
            injectTo: 'head-prepend',
          },
          {
            tag: 'script',
            attrs: { type: 'speculationrules' },
            children: SPECULATION_RULES,
            injectTo: 'head',
          },
        ],
      };
    },
  };
}

// Vite config — see PHASE-0-SCAFFOLD.md §2.
// The dev server proxies every backend path prefix to FastAPI on :8000 (see server.proxy below);
// the app is real-backend-only (no MSW runtime — MSW survives for tests under src/test/mocks/).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Source maps (Phase 33) — keyed off the error-reporting DSN. Maps let anyone reconstruct
  // readable source if deployed publicly, but without them Sentry stacks are useless: generate
  // them only when reporting is on, upload to Sentry in the build step, and NEVER copy .map files
  // to the public web root (see BACKEND-INTEGRATION.md deploy checklist). Reporting off → false.
  const sourcemap = Boolean(env.VITE_ERROR_REPORTING_DSN);

  // CSP (Phase 14/33): the Sentry ingest origin MUST be in connect-src or the browser blocks
  // error/trace delivery from the built app. Derived from the configured DSN so it tracks the env
  // (empty/malformed DSN -> connect-src stays 'self'-only).
  let sentryConnectSrc = '';
  if (env.VITE_ERROR_REPORTING_DSN) {
    try {
      sentryConnectSrc = ` ${new URL(env.VITE_ERROR_REPORTING_DSN).origin}`;
    } catch {
      /* malformed DSN -> no connect-src addition */
    }
  }
  const cspPolicy = [
    `default-src 'self'`,
    `script-src 'self' '${NO_FOUC_SCRIPT_HASH}' '${SPECULATION_RULES_HASH}'`,
    `style-src 'self' 'unsafe-inline'`,
    // Google account avatars (post-OAuth profile photo) are served from lh3-6.googleusercontent.com.
    `img-src 'self' data: https://*.googleusercontent.com`,
    `font-src 'self' data:`,
    `connect-src 'self'${sentryConnectSrc}`,
    `frame-src https://js.stripe.com https://checkout.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  return {
    plugins: [
      // React Compiler (Phase 36): auto-memoizes components (free re-render performance on the
      // result-table-heavy screens; most manual useMemo/useCallback become redundant). If it
      // misbehaves, this one line is the rollback — React 19 ships fine without it.
      react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
      // Dev-only (apply: 'serve'); inert in production builds.
      clientLogToTerminal(),
      injectCsp(cspPolicy),
      // Bundle observability (Phase 35): `npm run build:analyze` emits stats.html (treemap +
      // gzip/brotli sizes) — on demand only, never on a normal build.
      ...(mode === 'analyze'
        ? [visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true })]
        : []),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    css: {
      postcss: {
        plugins: [
          // Phase 30 (zero third-party origins): Bootswatch Flatly ships an
          // `@import url(https://fonts.googleapis.com/...Lato...)` at the top of its CSS. We
          // self-host Lato via @fontsource/lato (imported in main.tsx), so strip every remote
          // font @import here — applies in dev and build alike.
          {
            postcssPlugin: 'strip-remote-font-imports',
            AtRule: {
              import(atRule: { params: string; remove: () => void }) {
                if (atRule.params.includes('fonts.googleapis.com')) atRule.remove();
              },
            },
          },
        ],
      },
    },
    build: {
      sourcemap,
      rollupOptions: {
        output: {
          // Long-term-cache chunking (Phase 19): isolate ApexCharts (only the lazy SummaryPage pulls
          // it, so it stays off every other route) and pin a stable `vendor` chunk for the core libs
          // so app-code changes don't bust their cache.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('apexcharts')) return 'apexcharts'; // apexcharts + react-apexcharts
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|@tanstack)[\\/]/.test(
                id,
              )
            ) {
              return 'vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 5173,
      // Real-backend dev (Phase 9): EVERY backend endpoint is under `/api`, and `/api/*` is never
      // an SPA route — so the proxy is a single rule with no Accept-sniffing `bypass`. The session
      // cookie + CSRF double-submit + SSE + OAuth all "just work" same-origin: a full-page nav to
      // `/api/auth/login/google` is proxied → 302 Google → `/api/auth/google/callback` → sets the
      // cookie → 302 to the SPA route. (See Phases/DEPLOYMENT.md §Local dev in the backend repo.)
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    // `vite preview` serves the production build locally; mirror the dev proxy so a prod-mode test
    // reaches FastAPI on :8000 same-origin (exercising the real built assets + CSP).
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
