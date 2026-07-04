---
name: Admin access bootstrap
description: How admin role is granted, and the cross-environment "first user = admin" lockout that can strand production without a reachable admin.
---

# Admin access bootstrap

Admin is a DB `users.role` value, not Clerk metadata. Two ways to become admin:
1. **First user rule** — the very first user ever provisioned in an environment gets `role='admin'` (and an immediate Kanè).
2. **ADMIN_EMAILS allowlist** — comma-separated emails in the `ADMIN_EMAILS` env var (shared) are granted admin on login, on BOTH the new-user insert path and the existing-user update path in `requireAuth`. Empty/unset allowlist grants nobody (safe).

**Why the allowlist exists:** dev and production have SEPARATE databases, so the "first user" is different per environment. In production the first-user-admin slot was taken by a stale/incomplete account (empty email, a different Clerk identity) that the owner does not log in with. The owner's real account was therefore a plain `user`, could not reach the admin dashboard, and a valid pending account application looked "missing" — it was just unreachable without admin access. The production DB is a read-only replica from the tooling here, so the role cannot be UPDATEd directly; the allowlist is the durable, deploy-safe way to grant/recover admin per environment.

**How to apply:**
- To grant/recover admin in an environment, set `ADMIN_EMAILS` (shared env var) to the account's email and redeploy (production picks it up on publish). The role is applied on next login.
- Allowlist promotion is promote-only and does NOT create a Kanè (only the first-user path does), so promoting an existing customer never duplicates their Kanè.
- Before assuming customer data is "missing" from an admin view, verify the viewer actually has admin role in that environment — an empty admin list is often an access problem, not a data problem.
