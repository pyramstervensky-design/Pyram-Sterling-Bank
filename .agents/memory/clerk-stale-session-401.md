---
name: Clerk stale-session 401 on web (dev)
description: Why every authed API call 401s in the preview while a fresh browser context works, and the correct fix
---

Symptom: in the dev preview, EVERY authenticated call (`/api/users/me`, `/api/notifications`, …) returns 401, yet a brand-new browser context (e.g. the runTest harness) signs in and gets 200s with no code change.

Root cause: the browser holds **stale/duplicate Clerk cookies from a previous Clerk instance** on the same `.replit.dev` domain. The request cookie header shows each of `__session`, `__client_uat`, `__clerk_db_jwt` present TWICE — both unsuffixed and instance-suffixed (e.g. `__session` AND `__session_<suffix>`). Clerk's client optimistically reports "signed in" from `__client_uat`, so the SPA fires authed queries, but the `__session` JWT it sends fails server verification against the current instance's JWKS → `getAuth(req)` has no userId → 401.

**Why this is NOT a server bug:** requireAuth/clerkMiddleware wiring is correct — proven by a fresh context returning 200. Do not weaken auth, add `getToken()`/`setAuthTokenGetter`/Bearer to web calls, or touch Clerk secrets/cookies directly.

**Fix (client-side recovery):** a global guard subscribes to the React Query cache and, on any query error with `status === 401`, calls Clerk `signOut({ redirectUrl: home })` once (ref-guarded). This clears the broken cookies and drops the user on the landing page to re-authenticate cleanly, instead of trapping them on a "couldn't load your account" retry screen. A 401 from requireAuth always means "no valid session" (transient/server failures are 5xx), so signing out on 401 is safe and won't loop — signed-out users make no authed calls.

**How to apply:** if a user reports "can't load my account" / repeated 401s but a fresh incognito login works, it's stale cookies. The recovery guard handles it automatically; otherwise clearing site cookies or re-signing-in also resolves it.
