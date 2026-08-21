# Quralyst Frontend — Personal AWS CodePipeline Learning Lab

> This package is a **personal learning adaptation** of the uploaded Quralyst frontend. It is designed to teach the CI/CD flow using a low-cost architecture: **GitHub → AWS CodePipeline → AWS CodeBuild → S3 static website**. It does **not** claim that this is Quralyst's production architecture.

> **Company-code safety:** only copy Quralyst source/configuration into a personal Git repository or personal AWS account if Quralyst policy and your manager/security team explicitly allow it. If permission is granted, use a **private** repository, never a public repo, and remove company-only operational metadata you do not need. If permission is not granted, apply the same DevOps files and workflow to a small personal Vite/React clone instead.

## 1. Project overview

The uploaded project is a React **19.2.7** + TypeScript **5.6.3** single-page application built with Vite **5.4.x**. It uses npm, React Router's browser-history router, TanStack Query, Zustand, Sentry, chart/export libraries, Vitest, ESLint, Stylelint, Prettier, Husky, and Secretlint.

Commands already defined by the project:

```powershell
npm run dev          # Vite dev server, port 5173
npm run build        # tsc --noEmit && vite build
npm run preview      # preview dist/, port 4173
npm run lint
npm run typecheck
npm run test:run
```

Production build output is **`dist/`**.

The original repository already contains a company-oriented Docker/ECR/CodeDeploy configuration. In this learning copy, that buildspec is preserved as `buildspec.company-reference.yml`, while the default `buildspec.yml` is a safer S3 learning build.

### Critical backend limitation

This frontend expects a backend under `/api` by default. Local Vite proxies `/api` to `http://localhost:8000`. S3 cannot run that backend. Your static site can build and load, but authentication and API-backed screens will fail unless you set `VITE_API_BASE_URL` to a backend you are authorized to use and that is configured for browser CORS/cookies/CSRF. Do **not** point your personal learning deployment at a company backend unless your organization explicitly permits it.

## 2. Learning architecture

```text
Developer (Windows)
      |
      | git push
      v
GitHub repository
      |
      | AWS CodeConnections source event
      v
AWS CodePipeline
      |
      +--> Source artifact (ZIP stored in pipeline artifact S3 bucket)
      |
      v
AWS CodeBuild
      |  npm ci
      |  lint + typecheck + Vitest
      |  npm run build
      v
Build artifact: dist/**
      |
      v
CodePipeline S3 Deploy action (Extract = true)
      |
      v
S3 website bucket
      |
      v
Browser user
```

### Why each service exists

| Service | Purpose | Learning value |
|---|---|---|
| GitHub | Stores the source code and Git history | Learn source control and pipeline triggers |
| AWS CodeConnections | Securely links CodePipeline to GitHub using the GitHub App | Avoid personal access tokens in pipeline config |
| AWS CodePipeline | Orchestrates Source → Build → Deploy | Learn artifacts, stages, actions, retries, execution history |
| AWS CodeBuild | Creates an isolated Node 22 build environment | Learn reproducible CI builds and logs |
| Amazon S3 artifact bucket | Temporary pipeline artifact storage | Learn how stages pass immutable artifacts |
| Amazon S3 website bucket | Hosts the built static files | Cheapest/simple target for a static Vite SPA lab |
| CloudWatch Logs | Stores CodeBuild output | Learn failure diagnosis |
| IAM roles | Give AWS services only the permissions they require | Learn workload identity and least privilege |

## 3. What already existed vs what was added

### Already in the uploaded project

- React/TypeScript/Vite application and tests.
- npm scripts and `package-lock.json`.
- `.env.example`, `.env.development`, `.env.production`.
- Original `buildspec.yml` for CodeBuild + Secrets Manager + ECR Docker build.
- `appspec.yml` and CodeDeploy lifecycle scripts.
- Dockerfile + Nginx Docker configuration.
- AWS Secrets Manager loader script.
- Extensive project architecture/phase documentation.

### Added/changed only for this personal learning copy

- `buildspec.yml` — S3-oriented CodeBuild buildspec.
- `buildspec.company-reference.yml` — preserved uploaded company-oriented buildspec.
- Sanitized `.env.development` and `.env.production` so personal builds do not send telemetry to the committed company Sentry DSN.
- `TECHNICAL_ANALYSIS.md`.
- `FILE_INVENTORY.txt`.
- `devops-learning/iam/*.json.example` least-privilege policy templates.
- `devops-learning/scripts/create-s3-website.ps1`.
- `devops-learning/scripts/cleanup-s3-website.ps1`.
- `.gitignore` exceptions so the learning Markdown files can be committed.

### Production recommendations, not required for this lab

CloudFront + private S3/OAC, HTTPS and a custom domain, Route 53, WAF where justified, separate AWS accounts, protected branches, approval gates, dedicated environment roles, centralized logs/alerts, IaC, secret-management for true server-side secrets, deployment rollback/versioning, CSP/security-header validation, dependency/SAST scanning, and a real backend deployment.

## 4. Prerequisites — Windows

Use **PowerShell** for the commands below.

### Git

Why: clone, branch, commit and push the project that triggers CodePipeline.

Install from Git for Windows, then verify:

```powershell
git --version
```

Expected shape:

```text
git version 2.x.x.windows.x
```

### Node.js 22 LTS + npm

Why: the project Dockerfile uses Node 22, and local builds should match CI.

Install Node.js 22 LTS, then:

```powershell
node --version
npm --version
```

Expected: Node starts with `v22.` and npm prints a numeric version.

> The repository does not currently enforce Node with `engines`, `.nvmrc`, or `.node-version`; Node 22 is chosen from the committed Dockerfile/current deployment notes.

### AWS CLI v2

Why: inspect identity, create/test S3 resources, and practice AWS commands.

After installing the AWS CLI v2 MSI:

```powershell
aws --version
```

Expected shape:

```text
aws-cli/2.x.x Python/3.x Windows/...
```

### Visual Studio Code

Why: edit YAML/JSON/TypeScript and inspect Git changes. Verify from a terminal after enabling the shell command:

```powershell
code --version
```

### Optional tools

- **jq**: useful for JSON on Linux/CI, but not required on Windows for this S3 lab.
- **Docker Desktop**: optional only if you want to study the existing Dockerfile; not used in the personal S3 pipeline.
- **Terraform**: intentionally **not required** for the first two-day lab. The uploaded project has no Terraform and the main learning goal is to understand the AWS console/services before abstracting them into IaC.

## 5. Safe AWS account setup

1. Enable MFA on the AWS account root user and avoid using root for daily work.
2. Prefer **IAM Identity Center**/temporary credentials for your human login. If you intentionally use an IAM user for a small standalone lab, enable MFA and do not create root access keys.
3. Open **Billing and Cost Management → Budgets** and create a small monthly cost budget (for example, USD 3 or USD 5) with email thresholds such as 50%, 80% and 100%.
4. Choose one region and keep the lab in that region. For India, `ap-south-1` (Mumbai) is a natural default, but CodeConnections GitHub support varies by region. If the GitHub connection option is unavailable in your selected region, use a supported region such as `us-east-1` or another region listed by AWS.
5. Tag resources, for example `Project=QuralystLearning`, `Environment=personal`, `Owner=<your-name>`.

Check your CLI identity before doing anything destructive:

```powershell
aws sts get-caller-identity
aws configure get region
```

You should see your account/user-or-role identity and chosen default region.

### AWS CLI credentials

Preferred: configure CLI SSO with IAM Identity Center:

```powershell
aws configure sso
aws sso login --profile quralyst-learning
aws sts get-caller-identity --profile quralyst-learning
```

If you use `aws configure` with a long-lived IAM access key for learning, understand that it stores credentials under your user profile. Never commit those files or paste keys into Git, source code, `.env`, or buildspec files.

## 6. Local project setup

```powershell
git clone <YOUR-AUTHORIZED-PRIVATE-REPO-URL>
cd Quralyst-AWS-Learning-Package
npm ci
```

Why `npm ci`: it installs exactly from `package-lock.json`, fails when lockfile/package metadata disagree, and is the correct reproducible CI installation command.

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

For frontend-only learning, keep these values safe:

```dotenv
VITE_API_BASE_URL=
VITE_BACKEND_CONNECTION_TEST_URL=
VITE_ERROR_REPORTING_DSN=
VITE_LOG_SHIPPING=false
VITE_LOG_TO_TERMINAL=true
```

Run locally:

```powershell
npm run dev
```

Open `http://localhost:5173`.

Build locally:

```powershell
npm run lint
npm run typecheck
npm run test:run -- --maxWorkers=2 --minWorkers=1
npm run build
Get-ChildItem dist
```

Successful output should include `dist\index.html` and generated assets.

Preview the production build:

```powershell
npm run preview
```

## 7. Create the S3 website bucket

### Option A — helper script

Choose a globally unique lowercase bucket name:

```powershell
.\devops-learning\scripts\create-s3-website.ps1 `
  -BucketName "quralyst-learning-YOURNAME-2026" `
  -Region "ap-south-1"
```

### Option B — console

1. S3 → Create bucket.
2. Pick the same region as the rest of the lab.
3. Leave default encryption enabled.
4. Create it.
5. Properties → Static website hosting → Enable.
6. Index document: `index.html`.
7. Error document: `index.html` (SPA learning fallback).
8. Permissions → for this **learning-only** S3 website, disable bucket Block Public Access and add a bucket policy allowing public `s3:GetObject` on `arn:aws:s3:::YOUR_BUCKET/*`.

Security warning: an S3 website endpoint is **HTTP-only** and requires publicly readable website objects. Use CloudFront + private S3/OAC for a secure real deployment.

## 8. Understand `buildspec.yml`

The personal buildspec does four things:

1. Uses Node 22 and runs `npm ci`.
2. Runs lint, TypeScript validation, and Vitest. Set CodeBuild env `RUN_TESTS=false` only when you intentionally want a faster/cheaper practice iteration.
3. Creates a safe `.env.production` from CodeBuild environment variables and runs `npm run build`.
4. Publishes only `dist/**/*` as the CodePipeline build artifact.

It also deletes `.map` files as a guardrail.

## 9. Create the CodeBuild project

In **CodeBuild → Build projects → Create build project**:

- Project name: `quralyst-frontend-personal`
- Source provider: **CodePipeline**
- Environment: Managed image
- Operating system: Ubuntu
- Runtime: Standard
- Image: current standard image that supports Node 22
- Compute: smallest general-purpose option suitable for the build (`BUILD_GENERAL1_SMALL`)
- Privileged mode: **OFF** (no Docker in this lab)
- Service role: let CodeBuild create a new role for the first lab, then inspect/narrow it
- Buildspec: **Use a buildspec file** → `buildspec.yml`
- Artifacts: CodePipeline
- Logs: CloudWatch Logs enabled

Environment variables (all non-secret public frontend build configuration):

| Name | Suggested learning value |
|---|---|
| `VITE_API_BASE_URL` | blank unless you own an authorized backend |
| `VITE_BACKEND_CONNECTION_TEST_URL` | blank |
| `VITE_ERROR_REPORTING_DSN` | blank |
| `VITE_LOG_SHIPPING` | `false` |
| `RUN_TESTS` | `true` |

Do not add AWS access keys. CodeBuild receives temporary AWS credentials from its service role.

## 10. Create CodePipeline

1. CodePipeline → Create pipeline.
2. Name: `quralyst-frontend-personal-pipeline`.
3. Use a service role created for this pipeline.
4. Choose **GitHub (via GitHub App)** / AWS CodeConnections as source.
5. Create/connect the GitHub connection and grant repository access only to your personal repo.
6. Select your branch, e.g. `main` or `dev`.
7. Build provider: AWS CodeBuild → `quralyst-frontend-personal`.
8. Deploy provider: Amazon S3.
9. Select the website bucket.
10. **Enable “Extract file before deploy”** so CodePipeline unzips the CodeBuild artifact into the bucket.
11. Create the pipeline.

CodePipeline also uses an **artifact bucket**. This is separate from the website bucket. The source ZIP/build artifact moves through that bucket between stages.

### IAM model

- Your human identity creates/configures resources.
- CodePipeline service role can use the GitHub connection, start/read CodeBuild, read/write its artifact bucket, and write the website bucket.
- CodeBuild service role can write logs and access pipeline artifacts. It does not need ECR, EC2 or Secrets Manager in this lab.

Example policy templates are in `devops-learning/iam/`. Replace placeholders with exact ARNs before using them. For the first console exercise, allowing AWS to create service roles is simpler; inspect those generated policies and reduce them after the pipeline succeeds.

## 11. First pipeline run

Make a harmless source change:

```powershell
git checkout -b learning/first-pipeline
# edit a visible text string or this README
git add .
git status
git commit -m "test personal AWS pipeline"
git push -u origin learning/first-pipeline
```

If your pipeline watches `main`, merge the branch through GitHub, or temporarily configure the pipeline to watch your learning branch.

In CodePipeline, watch:

```text
Source: Succeeded
Build:  Succeeded
Deploy: Succeeded
```

Then verify S3:

```powershell
aws s3 ls s3://YOUR_WEBSITE_BUCKET/ --recursive
```

You should see `index.html` and `assets/...` files.

Open the bucket's **Static website hosting endpoint** from S3 → Properties.

## 12. Complete CI/CD flow — what happens internally

1. You push a Git commit.
2. GitHub notifies the AWS connection.
3. CodePipeline starts an execution and packages the source as an artifact.
4. CodeBuild receives that artifact in an isolated build container.
5. `npm ci` restores deterministic dependencies.
6. quality checks catch lint/type/test failures before deployment.
7. Vite transforms the React/TS source into browser assets in `dist/`.
8. CodeBuild returns a ZIP containing only `dist/**` to CodePipeline.
9. The S3 deploy action extracts the ZIP into the website bucket.
10. The browser requests `index.html` and hashed JS/CSS assets from S3.
11. React Router takes over after the initial HTML loads.

## 13. SPA routing behavior

The code uses `createBrowserRouter`, so `/previous-results` is a client-side route. Directly requesting that path from S3 does not correspond to a real object.

For the simple S3 lab, configure `index.html` as the error document. This displays the SPA for many deep links, although the initial HTTP response can still be 4xx.

For a production-like setup, put **CloudFront** in front of a private S3 origin and configure an SPA rewrite/custom error response to return `/index.html` with 200 for appropriate 403/404 cases. Be careful not to mask genuine missing static assets.

## 14. CloudFront — should you use it now?

**Day 1:** no. Learn CodePipeline/CodeBuild/S3 first.

**Day 2 optional extension:** yes. CloudFront adds HTTPS, CDN caching, a private S3 origin with Origin Access Control, custom error behavior for SPA routes, security headers, and custom domains/certificates.

CloudFront has substantial free usage allowances, but it is still a billable AWS service under pay-as-you-go rules beyond free allowances and some features (invalidations beyond free quantities, WAF, Route 53, logging, etc.) can create separate charges. Keep it optional until the S3 pipeline is understood.

## 15. Logs and troubleshooting

### Find CodeBuild logs

CodePipeline → failed Build action → Details → CodeBuild build → Logs, or CloudWatch → Log groups → `/aws/codebuild/quralyst-frontend-personal...`.

### Symptom → cause → investigate → fix

| Symptom | Possible cause | Investigate | Fix |
|---|---|---|---|
| `npm ci` fails | lockfile mismatch, network/npm registry issue, incompatible Node | CodeBuild install logs; `node -v`; `npm -v` | use Node 22; commit a correct `package-lock.json`; retry transient network errors |
| Node version mismatch | CodeBuild image/runtime not Node 22 | first build log lines | configure `runtime-versions: nodejs: 22` on a supported standard image |
| `npm run build` fails in TypeScript | real compile/type error | lines immediately before `tsc` exits | reproduce locally with `npm run typecheck`; fix code before redeploy |
| Vite build fails due env | malformed URL or required config | build log + generated env values (never print secrets) | set valid CodeBuild env vars; remember `VITE_*` is public config |
| buildspec parse error | YAML indentation/string syntax | CodeBuild `DOWNLOAD_SOURCE`/buildspec error | validate YAML; keep spaces, no tabs; compare to this package's file |
| tests consume too much build time | very large test suite | build duration in CodeBuild | for a deliberate quick lab set `RUN_TESTS=false`; restore tests for normal CI |
| Pipeline succeeds but website bucket is empty | wrong deploy bucket/artifact; deploy stage skipped | CodePipeline deploy action + bucket | confirm Build output artifact feeds Deploy; correct bucket |
| S3 contains a ZIP instead of files | Extract disabled | S3 object listing | edit deploy action and select **Extract file before deploy** |
| Site returns AccessDenied | public policy/BPA mismatch | S3 Permissions + website endpoint | for lab only, allow public website reads; for production use CloudFront/OAC |
| Site loads over HTTP only | native S3 website limitation | inspect URL | add CloudFront for HTTPS |
| SPA deep links 404 | BrowserRouter + object not found | request `/some-route` directly | S3 error document `index.html` for lab; CloudFront rewrite/custom errors for production |
| App shell loads but data/auth fails | no backend at S3 `/api` | Browser DevTools Network | deploy/use an authorized backend and set `VITE_API_BASE_URL`; solve CORS/cookie/CSRF intentionally |
| IAM `AccessDenied` | missing role action/resource | error gives action/ARN; inspect CloudTrail/IAM policy | add only the exact required action/resource to the service role |
| CodeBuild cannot access artifact S3 | CodeBuild role lacks artifact bucket access/KMS permissions | CodeBuild `DOWNLOAD_SOURCE` error | add bucket object/location permissions; if custom KMS key used, add required KMS permissions |
| Pipeline does not trigger | wrong branch, connection inactive, GitHub App repo not authorized | Source action and CodeConnections status | update branch/repository access, reconnect GitHub App |
| Environment variables missing | not configured in CodeBuild or overwritten | inspect CodeBuild project env configuration | define non-secret values in CodeBuild; do not rely on company `.env.production` |
| Old assets appear after deploy | browser/CDN cache | hard refresh, response cache headers | hashed Vite assets are safe; ensure `index.html` is not cached long; invalidate CloudFront only when needed |
| CodeBuild logs absent | logs disabled or IAM logs permission missing | CodeBuild project logs config | enable CloudWatch logs and `logs:CreateLogStream/PutLogEvents` |

## 16. Security observations from the uploaded project

- The original buildspec fetches company configuration from Secrets Manager and pushes Docker to ECR. Do not reuse its hard-coded company resource names in your account.
- The original env files included a Sentry browser DSN. It is not normally a secret, but a personal build should not generate company telemetry; this learning copy clears it.
- `VITE_*` variables are browser-visible. A secret placed there is exposed after build regardless of Secrets Manager.
- The original Vite config enables source maps when Sentry is enabled, while its deployment comments say public maps should be excluded. This learning build deletes `.map` files.
- The S3 website lab deliberately makes built assets public. Do not upload credentials, internal documents, source files, `.env`, or pipeline artifacts to that bucket.
- Use service roles instead of static AWS keys inside CodeBuild.

## 17. Cost-safety checklist

Before you start:

- Create an AWS Budget alert.
- Use one region.
- Use one pipeline and the smallest CodeBuild compute suitable for the project.
- Leave Docker privileged mode off.
- Do not create EC2, NAT Gateway, load balancer, ECR lifecycle, WAF, RDS, or Route 53 resources for the first lab.
- Keep the website small and private data out of it.
- Delete the lab when finished.

Current AWS pricing/free-tier rules can change. At the time this package was prepared, CodeBuild advertises 100 build minutes/month on eligible small on-demand compute, and CodePipeline advertises free allowances depending on pipeline type. S3, CloudWatch Logs, and CloudFront also have free-tier allowances, but usage beyond allowances is billable. Always verify the AWS pricing page in your own account/region before assuming $0.

## 18. Cleanup

Delete in roughly this order:

1. CodePipeline.
2. CodeBuild project and its CloudWatch log group if you do not need history.
3. GitHub CodeConnections connection if created only for this lab.
4. Website bucket contents and bucket.
5. CodePipeline artifact bucket contents and bucket.
6. IAM service roles/policies created only for the lab.
7. CloudFront distribution, Route 53 records/hosted zone, WAF, ACM resources if you added optional production-like features.

Website helper:

```powershell
.\devops-learning\scripts\cleanup-s3-website.ps1 -BucketName "YOUR_BUCKET"
```

Check Billing → Bills/Cost Explorer/Budgets after cleanup.

## 19. Two-day hands-on learning plan

### Day 1 — understand the application, build, S3 and CodeBuild

**Study:** Git artifact flow, Vite build lifecycle, `VITE_*` build-time configuration, S3 objects vs website hosting, IAM users vs service roles, CodeBuild phases/logs.

**Practice commands:**

```powershell
node --version
npm --version
npm ci
npm run lint
npm run typecheck
npm run test:run -- --maxWorkers=2 --minWorkers=1
npm run build
Get-ChildItem dist
aws sts get-caller-identity
aws s3 ls
```

**Tasks:** secure AWS login/MFA; create Budget; clone personal repo; run local app; inspect `dist`; create S3 site; manually upload `dist` once; create CodeBuild; run a build.

**Troubleshooting exercise:** intentionally set a wrong Node/runtime or introduce one TypeScript error, observe the CodeBuild failure, find the exact log line, then revert/fix it.

**Expected outcome:** you can explain why source code is not deployed directly, why `npm ci` is used, what `dist` contains, what a CodeBuild service role is, and how to find failed build logs.

**Questions you should answer:**

- What is the difference between source artifact and build artifact?
- Why is Node 22 selected?
- Why is `VITE_API_BASE_URL` not a secret?
- Why does S3 not run React/Node server code?
- What is the difference between an IAM human identity and a CodeBuild role?
- Why will API-backed screens fail without a backend?

### Day 2 — CodePipeline, triggers, permissions, failures and optional CloudFront

**Study:** CodeConnections, CodePipeline stages/actions, artifact bucket, S3 deploy Extract behavior, least privilege, SPA deep-link behavior, optional CloudFront/OAC/HTTPS.

**Practice:** commit/push changes; rerun/stop pipeline; inspect execution history; use `aws s3 ls s3://... --recursive`; inspect IAM role policies; use CloudWatch logs.

**Tasks:** create full Source → Build → Deploy pipeline; trigger from Git; verify updated S3 files; intentionally remove one S3 permission and diagnose `AccessDenied`; restore the minimum permission; optionally put CloudFront in front of S3.

**Troubleshooting exercise:** turn off “Extract before deploy” and observe the wrong S3 result, then correct it. Also test a direct SPA route and explain why it behaves differently from `/`.

**Expected outcome:** one Git commit automatically reaches the website through AWS-native CI/CD, and you can trace every artifact and role involved.

**Questions you should answer:**

- What triggers the pipeline?
- Where are intermediate artifacts stored?
- Which role performs the S3 deployment?
- Why does a successful build not guarantee a successful deployment?
- How do you diagnose `AccessDenied` without granting AdministratorAccess?
- Why does BrowserRouter need origin fallback/rewrite support?
- What security problem does CloudFront + OAC solve compared with a public S3 website?

## 20. Learning environment vs a real company production environment

| Area | Personal learning lab | Production-style environment |
|---|---|---|
| Accounts | one personal AWS account | separate dev/stage/prod accounts under Organizations/control boundaries |
| Source | personal GitHub repo | protected organization repo, branch protections, required reviews |
| Pipeline | simple Source → Build → S3 | tests/security scans, approvals, environment promotion, rollback strategy |
| Build identity | one CodeBuild role | narrowly scoped environment-specific roles, permission boundaries/guardrails |
| Hosting | public S3 website HTTP | CloudFront HTTPS + private S3/OAC or another approved hosting stack |
| DNS/TLS | S3 endpoint | Route 53/external DNS + ACM-managed TLS |
| Edge security | none | WAF/rate controls where threat model justifies it, security headers, DDoS protections |
| Secrets | avoid secrets entirely in static frontend | server-side secrets in Secrets Manager/Parameter Store; client config handled separately |
| Monitoring | CodeBuild CloudWatch logs | dashboards, alerts, centralized logs, Sentry/APM, audit trails, SLOs |
| Deployment | overwrite static files | controlled releases, immutable artifacts, versioning, cache strategy, rollback |
| IaC | console-first for learning | Terraform/CloudFormation/CDK with review/state/change control |
| Governance | manual cleanup/budget | tagging standards, SCPs, budgets, cost allocation, access reviews |

The uploaded files demonstrate that the project has previously/currently been engineered around AWS CodeBuild, ECR, CodeDeploy, EC2, Nginx, Docker and Secrets Manager. That does **not** establish what Quralyst production currently uses beyond what is encoded in the files; internal markdown contains historical/inconsistent architecture notes.

## 21. What to learn next

1. CloudFront + private S3 + Origin Access Control + HTTPS.
2. CloudFront SPA routing without masking genuine asset 404s.
3. IAM policy evaluation and CloudTrail.
4. Terraform: model S3, IAM, CodeBuild and CodePipeline after you can create/debug them manually.
5. Separate dev/stage/prod accounts and cross-account deployment roles.
6. Backend deployment patterns (ECS/Fargate, Lambda/API Gateway, or EC2) and how frontend CORS/cookies/CSRF change across origins.
7. GitHub branch protection, manual approval, artifact promotion, rollbacks.
8. Dependency/SAST/secret scanning and software supply-chain controls.

## 22. Final project structure

```text
Quralyst-AWS-Learning-Package/
├── .agent/                     # existing AI/tooling rules
├── .claude/                    # existing Claude tooling
├── .cursor/                    # existing Cursor tooling
├── Phases/                     # existing architecture/history docs
├── UI/                         # existing UI reference screenshots
├── docs/
│   └── nginx-docker.conf       # existing Docker runtime Nginx config
├── public/                     # static public assets
├── scripts/
│   ├── codedeploy/             # existing company-style EC2/CodeDeploy hooks
│   └── load-aws-secrets.mjs    # existing AWS Secrets Manager build-time loader
├── src/                        # React/TypeScript application
├── devops-learning/            # added personal learning assets
│   ├── iam/
│   │   ├── codebuild-policy.json.example
│   │   └── codepipeline-policy.json.example
│   └── scripts/
│       ├── create-s3-website.ps1
│       └── cleanup-s3-website.ps1
├── .env.example                # existing safe template
├── .env.development            # sanitized in personal learning copy
├── .env.production             # sanitized in personal learning copy
├── .gitignore                  # existing + learning-doc exceptions
├── appspec.yml                 # existing; reference only for this S3 lab
├── buildspec.yml               # added S3 learning buildspec (default)
├── buildspec.company-reference.yml # original uploaded Docker/ECR buildspec
├── Dockerfile                  # existing; not required by S3 lab
├── FILE_INVENTORY.txt          # generated inventory of every original file
├── package.json
├── package-lock.json
├── README.md                   # this hands-on deployment guide
├── TECHNICAL_ANALYSIS.md       # detailed source/deployment analysis
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 23. Zero-to-success checklist

- [ ] Enable MFA and stop using root for normal tasks.
- [ ] Create an AWS Budget alert.
- [ ] Pick one AWS region.
- [ ] Install Git, Node 22, AWS CLI v2 and VS Code.
- [ ] Verify `git --version`, `node --version`, `npm --version`, `aws --version`.
- [ ] Configure AWS CLI and verify `aws sts get-caller-identity`.
- [ ] Confirm company policy permits using this code in a personal account/repository; otherwise use a synthetic clone.
- [ ] If permitted, create a **private** personal GitHub repository; do not push company secrets/operational metadata.
- [ ] Run `npm ci` locally.
- [ ] Copy `.env.example` to `.env` and keep personal values safe.
- [ ] Run lint, typecheck, tests and local build.
- [ ] Confirm `dist/index.html` exists.
- [ ] Create a unique S3 website bucket.
- [ ] Enable S3 static website hosting with `index.html` index/error documents for the lab.
- [ ] Create CodeBuild project using Node 22 and `buildspec.yml`.
- [ ] Enable CloudWatch Logs.
- [ ] Create GitHub CodeConnections connection limited to your personal repo.
- [ ] Create CodePipeline Source → Build → S3 Deploy.
- [ ] Select **Extract file before deploy**.
- [ ] Push a Git change and watch all three stages.
- [ ] Verify S3 contains `index.html` and `assets/`.
- [ ] Open the S3 website endpoint.
- [ ] Confirm API-backed screens are expected to fail without a backend.
- [ ] Practice one deliberate CodeBuild failure and one IAM failure.
- [ ] Inspect CodeBuild logs and pipeline execution history.
- [ ] Optionally add CloudFront for HTTPS/private S3 and SPA fallback.
- [ ] Delete lab resources and verify billing afterward.

## 24. Notes about validation

The project metadata, configuration, source usage and deployment files were statically inspected across the complete uploaded tree. This package records the complete original-file inventory in `FILE_INVENTORY.txt`. A live `npm ci`/test/build execution could not be completed in the analysis sandbox because the package installation command was blocked by the execution environment; this is not evidence of a project failure. Run the local validation commands above on your machine and in CodeBuild, where the logs become part of the learning exercise.
