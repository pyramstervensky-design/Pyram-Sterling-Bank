---
name: Pyram Sterling Bank
description: Key architecture decisions for the Pyram Sterling Bank fintech prototype
---

## Admin Promotion
The first user to register via Clerk automatically receives `role: "admin"` in the `users` table. Subsequent users get `role: "user"`. This is handled in `artifacts/api-server/src/lib/auth.ts` in the `requireAuth` middleware.

**Why:** No external admin seeding mechanism; clean for prototyping.

**How to apply:** If resetting dev DB, first signup = admin. For production, manually UPDATE users SET role = 'admin' WHERE clerk_id = '...'.

## Kanè Auto-Provisioning
Every new user gets a Kanè (Bank Account Ledger) automatically on first authenticated API call. Starting balance: $1,000. Starting credit score: 650. Account number format: `PSB{10 digits}`.

**Why:** Users must have a Kanè before any banking operation — auto-provision removes friction and ensures no orphaned users.

## Auth Pattern
`requireAuth` middleware in `lib/auth.ts`:
1. Gets Clerk userId via `getAuth(req)`
2. Looks up user in DB by clerkId
3. If not found: creates user + Kanè
4. If found: syncs name/email from Clerk session claims
5. Attaches `dbUser` to request for downstream handlers

**Why:** Single source of truth for user sync between Clerk and DB.

## Admin Role Check
Backend: checks `dbUser.role === 'admin'` via `requireAdmin` middleware.
Frontend: checks `useGetMe()` response `.role === 'admin'` to show admin nav/pages.
**Not** Clerk publicMetadata — role lives purely in the DB users table.

## Loan Approval Flow
When admin approves a loan: loan status → "approved", funds disbursed to Kanè balance, loan_disbursement transaction created. When user repays: Kanè debited, amountRepaid incremented, status → "repaid" when fully paid.
