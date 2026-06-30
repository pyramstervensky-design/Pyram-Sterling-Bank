# Pyram Sterling Bank

A premium digital banking platform with a personal user app and full admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/bank-app run dev` — run the frontend (port 24196)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit-managed Clerk (email + Google SSO)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + TailwindCSS + shadcn/ui + Framer Motion

## Where things live

- `lib/api-spec/openapi.yaml` — API contracts (source of truth)
- `lib/db/src/schema/` — Drizzle ORM table schemas
  - `users.ts` — user accounts with roles
  - `kane.ts` — Bank Account Ledger (Kanè) with virtual card and balance
  - `transactions.ts` — all financial transactions
  - `loans.ts` — loan requests and repayments
  - `partners.ts` — partner/business applications
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — Clerk middleware + auto user provisioning
- `artifacts/bank-app/src/pages/` — React pages

## Architecture decisions

- **First user = Admin**: The first user to register automatically receives admin role and full system visibility.
- **Kanè auto-provisioned**: Every new user automatically gets a Kanè (Bank Account Ledger) with a unique account number, virtual card, $1,000 starting balance, and 650 credit score.
- **Contract-first API**: OpenAPI spec gates codegen, which gates the frontend — spec is the single source of truth.
- **Clerk Proxy**: Clerk auth flows through the Express API server via proxy middleware, enabling SSO with the shared domain.
- **Admin via DB role**: Admin access is controlled by the `role` column in the `users` table — not Clerk metadata.

## Product

- **Personal Banking Dashboard**: Balance, virtual Pyram Sterling card, circular credit score indicator, transaction history
- **Instant Transfers**: Send money to other accounts by account number in real-time
- **Loan System**: Request loans, admin approves/rejects, track repayments
- **Partner System**: Apply to become a Pyram partner, pay approved partners
- **Admin Dashboard**: Global user list with Kanè details, transaction monitor, loan approval center, partner management, credit score management

## User preferences

- Premium blue/dark banking aesthetic — midnight blue with platinum/gold accents
- No emojis in the UI

## Gotchas

- Run `pnpm run typecheck:libs` after adding new schema files before typechecking api-server
- Admin loans route: approve funds disbursed to Kanè balance automatically on approval
- Clerk session claims don't always include name on first login — names sync from Clerk on first API call
- Partner GET /api/partners only returns `approved` partners; use admin endpoints for all

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk integration details
