---
name: Pending money-request approval flow
description: How customer money actions become admin-approved and why approval must be atomic/idempotent.
---

# Pending money-request approval

Customer deposit/withdraw/transfer insert a transaction with status `pending` and move **no** balance at request time. Balance only moves when an admin approves via `POST /api/admin/transactions/:id/approve`; reject marks `failed`. Loans/applications/partners have their own existing approval endpoints — money movement lives on approval, never on request.

**Why atomic + idempotent matters:** this is a bank. Approval moves real balances across multiple rows (transfer = debit sender + credit recipient + insert recipient ledger row). Without protection, two concurrent approve clicks both pass a naive `status === 'pending'` check and settle twice (double credit/debit).

**How to apply — any new money-settlement endpoint MUST:**
- Run the whole settlement inside `db.transaction(async (txDb) => ...)` so partial failures roll back together (never leave balance changed while the source tx stays pending).
- Lock the source row with `.for("update")` (SELECT FOR UPDATE) at the top of the txn, then re-check `status === 'pending'` inside the lock. The second concurrent caller blocks, then sees non-pending and bails. Reject uses a conditional `UPDATE ... WHERE id=? AND status='pending' RETURNING *` for the same effect.
- Re-validate funds/recipient existence inside the txn at approval time (balances may have changed since request).

**notifyAdmins is best-effort:** `notify.ts` wraps its inserts in try/catch and logs — an admin-notification failure must never fail the customer's underlying action. Any new call that notifies as a side effect of a user action must not let the notification throw into the request path.

Note: `transactionStatusEnum` is only `pending | completed | failed` — there is no `processing` state, so don't introduce an intermediate status without a DB migration; use row locking instead.
