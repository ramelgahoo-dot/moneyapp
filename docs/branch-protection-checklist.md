# Branch Protection Checklist

Use this checklist on your GitHub repository default branch (usually `main`).

## Required status checks

- Require status checks to pass before merging.
- Select required checks:
  - `CI / verify`
  - `Post Deploy Smoke / smoke` (if deployments are configured through GitHub Deployments)
- Require branches to be up to date before merging.

## Pull request rules

- Require a pull request before merging.
- Require at least 1 approval.
- Dismiss stale pull request approvals when new commits are pushed.
- Require review from code owners (optional but recommended).

## History and merge safety

- Require linear history.
- Block force pushes.
- Block branch deletion.
- Restrict who can push to matching branches (optional, for tighter control).

## Admin and bypass policy

- Apply rules to administrators.
- Disable bypass for pull request requirements, unless explicitly needed.

## Deployment safety

- In repository settings, connect environments used by deployments.
- Add required reviewers for production environment (optional but recommended).
- If using Vercel, ensure deployment statuses are sent to GitHub so `Post Deploy Smoke` runs automatically.

## Secrets and variables for automation

No production secrets are required for `CI / verify` or `Post Deploy Smoke` in current setup.

If you later add authenticated smoke tests, use repository or environment secrets rather than plaintext values.
