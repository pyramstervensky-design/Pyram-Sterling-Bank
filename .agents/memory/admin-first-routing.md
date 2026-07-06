---
name: Admin-first routing & role-gated shell
description: How the signed-in home resolves by role and why role-unknown must never fall through to the customer view
---

The signed-in home (`/`) resolves the destination by account role: admins are redirected to `/admin`, everyone else to `/dashboard`. The shared app shell (sidebar) is role-scoped too — admins see ONLY the admin nav section; the customer banking sections (Bankè/Richès) are hidden for them. Customers see only the customer sections. Profile/Settings and Sign-out stay in the shell footer for both roles.

**Rule:** any redirect or shell decision that depends on `useGetMe()` role must handle three states — loading, error/undefined, and resolved — explicitly. On loading show a spinner; on error/undefined show a retry screen; only redirect once `profile` is known. Do NOT let an errored/undefined profile fall through to the customer destination.
**Why:** the whole recurring "admin only sees the customer dashboard" complaint. A `profile?.role === "admin" ? "/admin" : "/dashboard"` shorthand silently misroutes an admin to the customer view on any transient `/api/users/me` failure (network blip, first-login provisioning race, stale session). The role is a gate, not a default.
**How to apply:** when adding role-based routing/layout, branch on `isLoading` and `isError || !profile` before reading `profile.role`. The backend still enforces `/admin*` via requireAdmin regardless of what the UI routes to.
