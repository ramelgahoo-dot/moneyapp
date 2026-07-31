# Multi-User And Load Testing Checklist

## Goal
Validate that multiple accounts can safely use the app in parallel with acceptable latency and no data leakage.

## Pre-checks
1. Confirm production URL is live.
2. Create at least 5 test users (preferably 10).
3. Ensure each tester can sign in and reach the Test Lab page.

## User Isolation Test
1. User A creates sample records in cars, income, expenses, and investments.
2. User B signs in and verifies User A data is not visible.
3. Repeat with User C and User D.
4. Open Test Lab and compare row counts per user.

Pass criteria:
1. Zero cross-user data visibility.
2. CRUD operations only affect current user's rows.

## Concurrent Workflow Test (Manual)
1. Have 5-10 users simultaneously:
2. Add income.
3. Add general and car-specific expenses.
4. Mark one car as sold.
5. Refresh dashboard and reports.

Track:
1. Failed saves.
2. Delayed UI updates.
3. Any 4xx or 5xx errors.

Pass criteria:
1. Error rate under 2%.
2. No auth/session corruption.
3. No duplicate or missing records after refresh.

## Scripted Smoke Load
Run from repo root:

```bash
npm run test:load -- --url https://moneyapp-snowy.vercel.app --users 10 --rounds 10
```

Interpretation:
1. `PASS` means current profile is healthy.
2. `ATTENTION` means investigate before scaling.

Target thresholds:
1. p95 under 2500ms.
2. Failure rate under 2%.

## Next Scaling Step
If tests pass, run another round at double load:

```bash
npm run test:load -- --url https://moneyapp-snowy.vercel.app --users 20 --rounds 10
```
