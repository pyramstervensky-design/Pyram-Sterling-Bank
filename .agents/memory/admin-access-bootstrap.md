---
name: Admin access bootstrap & enforcement
description: How admin role is granted, where admin access is actually enforced (API vs UI), and the cross-environment "first user = admin" lockout.
---

# Admin access bootstrap & enforcement

Admin is a DB `users.role` value, not Clerk metadata. Two ways to become admin:
1. **First user rule** — the very first user ever provisioned in an environment gets `role='admin'` (and an immediate Kanè).
2. **ADMIN_EMAILS allowlist** — comma-separated emails in the `ADMIN_EMAILS` env var (shared) are granted admin on login, on BOTH the new-user insert path and the existing-user update path in `requireAuth`. Empty/unset allowlist grants nobody (safe).

## Where enforcement actually lives (defense in depth)
- **Real boundary = the API.** All `/api/admin/*` endpoints are guarded by `router.use(requireAuth, requireAdmin)` applied ONCE at the top of the admin router, before any route handler. `requireAdmin` returns 403 if `dbUser.role !== 'admin'`. This means typing the `/admin` URL can never leak admin data — the data calls 403.
  - **Invariant:** never define an admin route handler above that `router.use(...)` guard line, or it becomes unauthenticated. Keep the guard first.
- **Frontend = UX only, not security.** `AdminRoute`/`AdminRouteInner` gate the client routes: signed-out → redirect to `/`; signed-in non-admin → render the AccessDenied ("Aksè Refize") page; while the profile loads → show a spinner (do NOT return null, that flashes blank). A silent redirect to `/dashboard` looks like the guard is missing — prefer an explicit denied screen.

## The cross-environment lockout (why the allowlist exists)
Dev and production have SEPARATE databases, so the "first user" differs per environment. In production the first-user-admin slot was taken by a stale/incomplete account (empty email, a different Clerk identity) that the owner does not log in with, so the owner's real account was a plain `user` and a valid pending application looked "missing" — it was just unreachable without admin access. The prod DB is a read-only replica from tooling here, so the role can't be UPDATEd directly; the allowlist is the durable, deploy-safe way to grant/recover admin per environment.

## How to apply
- Grant/recover admin: set `ADMIN_EMAILS` (shared) to the email and redeploy; role applies on next login. Promote-only; does NOT create a duplicate Kanè (only the first-user path creates one).
- Before assuming customer data is "missing" from an admin view, verify the viewer actually has admin role in that environment — an empty admin list is often an access problem, not a data problem.
