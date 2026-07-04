---
name: Appointment (account application) lifecycle
description: State machine for account_applications and when the Kanè bank account is created
---

# Appointment lifecycle

`account_applications` = account-opening appointments. The admin dashboard manages them through a state machine.

States: `pending` → `confirmed` (Accept) / `rescheduled` (new date+time) → `completed` (creates Kanè) or `rejected`. Legacy `approved` is treated as terminal/equivalent to `completed`.

**Rule: the Kanè bank account is created ONLY on Complete, never on Accept/Confirm.**
**Why:** the user explicitly clarified Accept just confirms the meeting happened; the account is provisioned when the appointment is actually completed. Earlier the code created the account at approve — this was wrong.

**How to apply:**
- Complete is allowed only from `confirmed`/`rescheduled` (must be accepted first), requires a linked `userId`, and runs in a DB transaction. `kane.userId` has a UNIQUE constraint to prevent double-provisioning under races.
- Confirm/Reschedule/Reject are blocked once a record is terminal (`completed`/`approved`/`rejected`).
- User-facing submit blocks a new application while an existing one is in an open state (`pending`/`confirmed`/`rescheduled`).
- Enum changes were kept purely additive so prod migration stays safe (kept legacy `approved`).
