---
name: Clerk JWT email claims missing in production
description: Why relying on sessionClaims.email breaks user provisioning in production, and the required fallback.
---

# Clerk JWT does not embed email/name in production session claims

Clerk's default production JWT does **not** include `email`, `first_name`, or `last_name`
in `sessionClaims`. In development the keys/config often do include them, so the bug is
invisible locally and only appears after Publish.

**Why:** relying on `sessionClaims.email` yields `""` in production. Any user table with a
`UNIQUE(email)` constraint then lets the FIRST auto-provisioned user insert (`email=""`)
succeed, but EVERY subsequent user hits the unique-constraint violation → 500 on every
authenticated request. Symptom in logs: `Failed query: insert into "users" ...` with
`params: <clerk_id>,,,,user` (empty email/name fields).

**How to apply:** in the auth middleware that auto-provisions users, when
`sessionClaims.email` is empty, fall back to the Clerk Backend API:
`clerkClient.users.getUser(userId)` → `emailAddresses[0]?.emailAddress`, `firstName`,
`lastName`. Only call the API when claims are empty (avoids per-request overhead).
Also add a hard guard: if email is still empty after the fallback, return an error
instead of inserting an empty-email row (prevents recreating the collision).
Existing corrupted `email=''` rows self-heal on next login via the profile-sync update path.

**Note:** production schema changes go through the Publish flow (dev→prod diff). Never run
DDL or migration scripts against production directly. This bug was NOT a schema problem —
prod had all correct columns/enums.
