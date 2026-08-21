# Technical Analysis — Quralyst Frontend

## Inspection scope

The uploaded ZIP was extracted with zip-slip path validation and every original project file was inventoried. The source contains **917 files**: **852 UTF-8 text/source/config files** and **65 PNG binaries**. `FILE_INVENTORY.txt` records the relative path, byte size, SHA-256 digest, and PNG dimensions for the complete original tree.

## What the project actually is

- **Framework:** React **19.2.7** with React DOM **19.2.7**.
- **Language:** TypeScript **5.6.3**.
- **Bundler/dev server:** Vite **5.4.x** (`package-lock.json` resolves Vite 5.4.21; `package.json` declares `^5.4.11`).
- **Routing:** React Router DOM **6.28.0**, using `createBrowserRouter`, so this is a browser-history SPA rather than a hash-routed app.
- **Package manager:** npm. `package-lock.json` is lockfile version 3. There is no yarn or pnpm lockfile.
- **Node version:** the repository does not declare `engines`, `.nvmrc`, or `.node-version`. The committed Dockerfile explicitly uses `node:22-alpine`, and internal deployment notes also specify Node 22. Use **Node.js 22 LTS** for parity.
- **Development:** `npm run dev` → Vite on port 5173; `/api` is proxied to `http://localhost:8000`.
- **Build:** `npm run build` → `tsc --noEmit && vite build`.
- **Output:** `dist/`.
- **Preview:** `npm run preview` → Vite preview on port 4173 with the same `/api` proxy to port 8000.

## Direct dependencies

Runtime dependencies include React/React DOM, React Router, TanStack Query, Zustand, React Hook Form/Zod, Sentry, ApexCharts/Recharts, jsPDF/html2canvas, PptxGenJS, SheetJS `xlsx`, Bootstrap Icons/Bootswatch, local Fontsource packages, and Lucide icons. Development dependencies include TypeScript/Vite/Vitest, Testing Library/MSW, ESLint, Stylelint, Prettier, Husky/lint-staged, Secretlint, the React compiler Babel plugin, and the AWS SDK Secrets Manager client.

## Environment variables actually used

Client build-time variables: `VITE_API_BASE_URL`, `VITE_BACKEND_CONNECTION_TEST_URL`, `VITE_ERROR_REPORTING_DSN`, `VITE_LOG_SHIPPING`, `VITE_LOG_TO_TERMINAL`, `VITE_APP_VERSION`, `VITE_SECRETS_HEALTH_PROBE_A`, `VITE_SECRETS_HEALTH_PROBE_B`, and `VITE_SECRETS_LOADED_FROM_AWS`. The AWS bootstrap script also reads `AWS_SECRETS_ENABLED`, `AWS_SECRET_NAME`, `AWS_REGION`/`AWS_DEFAULT_REGION`.

Vite embeds `VITE_*` values into the browser bundle. They must be treated as **public client configuration, never secrets**.

## Existing deployment configuration

### `buildspec.yml` in the uploaded project

The original buildspec is a company/dev-style Docker deployment: it runs `npm ci`, lint, typecheck and tests; retrieves `quralyst/dev/frontend/env` from Secrets Manager in `us-west-1`; logs in to ECR; builds a Docker image; pushes it to ECR; and emits `imageDetail.json`. It requires `AWS_ACCOUNT_ID`, Docker/privileged build capability, ECR permissions, Secrets Manager permissions, and a pre-existing ECR repository named `quralyst-frontend-dev`.

### `appspec.yml` and CodeDeploy hooks

The original appspec deploys the packaged repository to `/home/ubuntu/Frontend/` and runs four CodeDeploy hooks. The hooks pull the ECR image, run it as container `quralyst-frontend` on host port 8080, and validate both the container and a host Nginx HTTPS proxy. This requires EC2, CodeDeploy Agent, Docker, AWS CLI, `jq`, an instance role able to pull ECR images, and host Nginx/SSL configuration.

### Docker

The committed multistage Dockerfile uses Node 22 Alpine to build and Nginx Alpine to serve `dist/`. `docs/nginx-docker.conf` provides SPA fallback, long-lived asset caching, gzip, and several headers.

### AWS-specific script

`scripts/load-aws-secrets.mjs` can fetch JSON from Secrets Manager and writes `VITE_*` keys to `.env.production` before a build. This is build-time configuration only; values become visible to users in the static frontend bundle.

### Infrastructure as Code

No Terraform, CloudFormation, CDK, or Serverless Framework files were found in the uploaded project.

## Important inconsistencies / risks

1. **Two deployment narratives exist.** Current root deployment files implement Docker + ECR + CodeDeploy/EC2, while internal documentation also records an older/direct `dist/` → `/var/www/quralyst` Nginx deployment. Treat the executable root files as the current code-level source of truth and the markdown history as operational context, not proof of the current live company environment.
2. **Hard-coded company AWS identifiers.** The original `buildspec.yml`, `appspec.yml`, scripts, and internal notes contain company-specific repository names, secret names, region, EC2 identifiers, domains, IP addresses, role/profile names, and artifact bucket names. They must not be reused in a personal account.
3. **Committed Sentry DSN in `.env.development` and `.env.production`.** A Sentry browser DSN is normally not a credential, but using it from a personal build can pollute company telemetry and consume quotas. The personal learning copy clears it.
4. **Backend dependency.** The production frontend is not a self-contained mock app. Blank `VITE_API_BASE_URL` means same-origin `/api`; an S3 website has no backend at `/api`, so API-backed pages/auth/data will fail unless you provide an independently reachable backend URL with compatible CORS/cookie/CSRF behavior.
5. **Browser-history SPA routing.** S3 website hosting can use `index.html` as the error document, but deep links still originate as 4xx responses. CloudFront with a custom error response/rewrite is the cleaner production pattern.
6. **Source map contradiction.** `vite.config.ts` enables source maps whenever the Sentry DSN is present, while project comments say maps should not be copied to the public web root. The Docker runtime copies the entire `dist/`, and Nginx explicitly caches `.map` files, so maps can become public. The personal buildspec deletes `.map` files as a guardrail.
7. **S3 website security tradeoff.** Native S3 website endpoints require public-readable objects and support HTTP only. This is acceptable only as an explicit short-lived learning setup. CloudFront + private S3/OAC is the secure hosting design.
8. **Node version is not enforced by package metadata.** Add an `engines` field or `.nvmrc` in a team-controlled change if consistent Node parity is important; the learning package documents Node 22 without modifying `package.json`.
9. **Broad Markdown ignore rule.** `.gitignore` contains `*.md`. The learning copy adds explicit exceptions so the generated README and learning docs can be committed.
10. **No personal account secrets should be stored in Git.** CodeBuild/CodePipeline use IAM service roles; do not put access keys in `.env`, buildspecs, source files, or GitHub secrets for this AWS-native flow.

## Personal learning changes

The learning copy intentionally replaces the default `buildspec.yml` with an S3-oriented buildspec and preserves the uploaded version as `buildspec.company-reference.yml`. It sanitizes development/production env defaults, keeps the original Docker/CodeDeploy files for study only, adds least-privilege IAM policy templates, and adds PowerShell helper scripts for the S3 learning website.
