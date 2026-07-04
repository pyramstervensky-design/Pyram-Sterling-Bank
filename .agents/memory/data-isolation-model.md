---
name: Per-user data isolation model
description: How horizontal access control (IDOR protection) is enforced across the API, and the invariant any new endpoint must follow.
---

# Per-user data isolation model

There is NO global row-level security or tenant filter. Isolation is enforced **per endpoint, by hand**, using the authenticated user's DB id (`req.dbUser.id`, set by `requireAuth`). This was audited across all user-facing routers (kane, transactions, loans, partners, notifications, users, applications) and verified secure with a two-user e2e isolation test.

Two enforcement patterns in use:
1. **Scoped queries** — every list/read/mutation filters with `eq(table.userId, user.id)` (e.g. GET /kane, /transactions, /users/me, /loans, /notifications, /applications/me). There are NO "fetch by arbitrary id" read endpoints for user data.
2. **Ownership re-check on path-param mutations** — when a handler takes an `:id` (loans `/:loanId/repay`, notifications `/:id/read`), it loads the row then returns 404 if `row.userId !== user.id`. Never trust the path id alone.

Admin is the only full-access surface: `/api/admin/*` sits behind `router.use(requireAuth, requireAdmin)` (403 for non-admins).

Intentional, non-sensitive cross-user reads (not leaks): GET /partners exposes APPROVED partners' businessName + accountNumber (a merchant directory you pay into); transfer/partner-pay resolve a recipient by account number and echo back only the recipient's display name for the receipt.

**Invariant / how to apply:** any NEW user-facing endpoint must either scope its query by `req.dbUser.id` or, if it accepts an id/account param, load-then-check ownership and 404 on mismatch. Forgetting this silently creates an IDOR — there is no framework-level backstop.
