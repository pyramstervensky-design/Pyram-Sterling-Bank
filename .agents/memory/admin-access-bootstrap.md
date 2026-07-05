---
name: Admin access bootstrap & enforcement
description: How admin role is granted, where admin access is actually enforced (API vs UI), and the cross-environment "first user = admin" lockout.
---

# Admin access bootstrap & enforcement

Admin is a DB `users.role` value, not Clerk metadata. Two ways to become admin:
1. **First user rule** — the very first user ever provisioned in an environment gets `role='admin'` (and an immediate Kanè).
2. **ADMIN_EMAILS allowlist (authoritative when set)** — comma-separated emails in the `ADMIN_EMAILS` env var (shared). When NON-empty, the allowlist is the single source of truth: on login, `requireAuth` sets role=admin for listed emails and role=user for everyone else — this DEMOTES stale admins UNCONDITIONALLY (persisted to DB), on BOTH the new-user insert path and the existing-user update path. Emails compared case-insensitively. When the allowlist is EMPTY, roles are left untouched and the "first user = admin" bootstrap applies — this deliberate fallback prevents a cleared/misconfigured var from mass-demoting every admin and locking everyone out.
   - **Why:** the old logic only ever promoted, never demoted, so extra/stale admins accumulated and a DB demotion was silently reverted on next login by the allowlist. Making the allowlist authoritative self-heals both dev AND prod (prod DB is a read-only replica here, so demotion-on-login is the only way to fix prod).
   - **DO NOT re-add a "live admin exists" guard on the demotion branch.** A prior version skipped demotion unless some existing row matched the allowlist, to avoid lockout. This permanently BROKE prod self-heal: the intended allowlisted admin had never logged in, so no matching row existed, so a real customer account that had wrongly become admin never demoted. Demotion must be unconditional when the allowlist is non-empty. Lockout from a bad env var is recoverable — fix `ADMIN_EMAILS` and log in.
   - **How to apply:** to change who is admin, edit `ADMIN_EMAILS` (shared) and restart the API server — do NOT rely on DB role edits alone; a non-listed account is demoted on its next request. Never leave `ADMIN_EMAILS` empty in an environment that has admins unless you intend the first-user fallback.

## Where enforcement actually lives (defense in depth)
- **Real boundary = the API.** All `/api/admin/*` endpoints are guarded by `router.use(requireAuth, requireAdmin)` applied ONCE at the top of the admin router, before any route handler. `requireAdmin` returns 403 if `dbUser.role !== 'admin'`. This means typing the `/admin` URL can never leak admin data — the data calls 403.
  - **Invariant:** never define an admin route handler above that `router.use(...)` guard line, or it becomes unauthenticated. Keep the guard first.
- **Frontend = UX only, not security.** `AdminRoute`/`AdminRouteInner` gate the client routes: signed-out → redirect to `/`; signed-in non-admin → render the AccessDenied ("Aksè Refize") page; while the profile loads → show a spinner (do NOT return null, that flashes blank). A silent redirect to `/dashboard` looks like the guard is missing — prefer an explicit denied screen.

## The cross-environment lockout (why the allowlist exists)
Dev and production have SEPARATE databases, so the "first user" differs per environment. In production the first-user-admin slot was taken by a stale/incomplete account (empty email, a different Clerk identity) that the owner does not log in with, so the owner's real account was a plain `user` and a valid pending application looked "missing" — it was just unreachable without admin access. The prod DB is a read-only replica from tooling here, so the role can't be UPDATEd directly; the allowlist is the durable, deploy-safe way to grant/recover admin per environment.

## How to apply
- Grant/recover admin: set `ADMIN_EMAILS` (shared) to the email(s) and redeploy; role applies on next login. When the allowlist is non-empty it is authoritative — listed emails are promoted and every unlisted account is demoted on its next request (NOT promote-only). Granting admin does NOT create a duplicate Kanè (only the first-user path creates one).
- Before assuming customer data is "missing" from an admin view, verify the viewer actually has admin role in that environment — an empty admin list is often an access problem, not a data problem.
