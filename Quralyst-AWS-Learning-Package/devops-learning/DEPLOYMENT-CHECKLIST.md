# Deployment Checklist

Use the full checklist in `README.md` section 23. This short copy is for active lab use.

- [ ] MFA + non-root daily identity
- [ ] AWS Budget alert
- [ ] Git / Node 22 / AWS CLI / VS Code installed
- [ ] `aws sts get-caller-identity` verified
- [ ] Personal GitHub repository created
- [ ] `npm ci`, lint, typecheck, tests, build pass
- [ ] `dist/index.html` verified
- [ ] S3 website bucket created
- [ ] CodeBuild project uses `buildspec.yml`
- [ ] CloudWatch logs enabled
- [ ] GitHub CodeConnections source configured
- [ ] CodePipeline Source → Build → S3 Deploy created
- [ ] S3 Deploy `Extract` enabled
- [ ] Git push triggers pipeline
- [ ] Website opens from S3 website endpoint
- [ ] Expected backend/API limitations understood
- [ ] Deliberate failure exercises completed
- [ ] Resources deleted after learning
- [ ] Billing checked after cleanup
