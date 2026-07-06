---
name: First-login user provisioning race (requireAuth)
description: Why concurrent first-login requests 500'd and how auto-provision + admin allowlist actually resolve
---

On first login the SPA fires several authenticated requests at once (/api/users/me, /api/kane, /api/notifications, ...). Each runs the auth middleware, which auto-provisions the `users` row. Several requests see "no row yet" simultaneously and all try to INSERT the same user — the losers hit a UNIQUE violation and return 500. In production this left the user with NO row: the customer shell still rendered (the customer route only checks the Clerk signed-in state, not the DB profile), while the admin route denied access (it needs role from the profile). Net symptom: "signed in but stuck as a customer, /admin denied."

**Rule:** the `users` table has TWO unique constraints (clerk_id AND email). `INSERT ... ON CONFLICT (clerk_id) DO NOTHING` is NOT enough — a concurrent insert can still collide on the email index and raise. Make first-login provisioning idempotent by attempting the insert and, on failure, re-selecting the row the race winner created (keyed by clerk_id); only rethrow if no row exists. Guard any one-time side effects (e.g. Kanè creation) on "did I actually insert", so race losers don't duplicate them.
**Why:** observed real 500s on `/api/users/me` first-login in production; the single-target ON CONFLICT still 500'd under the e2e first-login test.

**Admin provisioning model:** admin is granted at login time from the `ADMIN_EMAILS` allowlist (kept in the *shared* env scope so it reaches both dev and prod). There is no direct-write path to promote a user in production (prod DB is read-only to the agent), so an allowlisted account becomes admin only by authenticating against prod once — which requires the first-login insert to succeed.

**Allowlist is authoritative when non-empty:** on every login the existing-user branch promotes listed emails and DEMOTES every non-listed admin unconditionally (no "does an allowlisted row already exist here" safety valve — that valve permanently blocked prod demotion because the intended admin had never logged in). The ONLY intended admin is `pyramstervensky@gmail.com`; `pyramstervensky06@icloud.com` is a regular customer and must NOT be in `ADMIN_EMAILS`. A misconfigured allowlist is recovered by fixing the env var and logging in again.
**Why:** an earlier session note wrongly kept the icloud account in `ADMIN_EMAILS`; the task requires exactly one admin and self-heal of all stale admins. Set env vars with the environment-secrets tooling (`setEnvVars`), not by hand-editing `.replit`.

**Env separation gotcha:** the preview runs the development Clerk instance + dev DB; the published site runs the production Clerk instance + prod DB. They have independent user IDs. The prod `users` table was seeded from a dev snapshot, so some prod rows carry dev-era clerk_ids that no real prod Clerk user owns (e.g. an admin row with an empty email that never backfills). Don't assume a matching email/clerk_id row in one environment exists or is reachable in the other.
