---
name: Verifying Clerk-gated admin UI in the preview
description: How to visually confirm admin-only pages render, without the user's real credentials
---

The Replit preview runs the **development** Clerk instance + **development** database — a session there is fully separate from production. A user "not seeing admin" in the preview is almost always a sign-in-state problem (signed out, or signed in as a customer account), not a code/config bug. Check the dev DB for the account's role before assuming code is broken.

To visually prove an admin-gated page renders without handling the user's password (Google SSO cannot be driven anyway):
- Call `runTest({ testClerkAuth: true, testPlan })`.
- In the plan use a `[Clerk Auth] Sign in as {firstName, lastName, email}` step (see `.local/skills/testing/clerk-auth.md`). The email is provisioned/looked-up server-side; if it's on the admin allowlist it becomes admin on first API call.
- Then `[Browser] Navigate` to the gated route and `[Verify]` the content; ask the subagent to save a screenshot to a `/tmp/*.png` path and report it (the returned `screenshotPaths` array is often empty, so read the path from `testOutput` and copy the file into the repo to present).

**Why:** the static `screenshot` tool has no Clerk session, so it only ever shows the sign-in page for auth-gated routes. The testing subagent carries a programmatic session and can reach the real gated UI.
