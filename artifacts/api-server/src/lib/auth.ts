import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable, kaneTable } from "@workspace/db";
import { eq } from "drizzle-orm";

function generateAccountNumber(): string {
  const prefix = "PSB";
  const digits = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${prefix}${digits}`;
}

function generateCardNumber(): string {
  const groups = Array.from({ length: 4 }, () =>
    String(Math.floor(Math.random() * 9000) + 1000)
  );
  return groups.join(" ");
}

function generateCardExpiry(): string {
  const now = new Date();
  const year = now.getFullYear() + 4;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${month}/${String(year).slice(2)}`;
}

function generateCvv(): string {
  return String(Math.floor(Math.random() * 900) + 100);
}

export { generateAccountNumber, generateCardNumber, generateCardExpiry, generateCvv };

// Admin allowlist: emails listed in the ADMIN_EMAILS env var (comma-separated).
// When the allowlist is non-empty it is the SINGLE SOURCE OF TRUTH for admin
// access: only listed emails are admin, and any account NOT on the list is
// (re)set to a regular user on login — this durably demotes stale admins across
// every environment without needing direct DB writes. If the allowlist is empty
// (unset/misconfigured), we never mass-change roles and fall back to the
// "first user = admin" bootstrap so the system is never left without an admin.
function getAdminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowlistedAdmin(email: string): boolean {
  if (!email) return false;
  return getAdminAllowlist().includes(email.trim().toLowerCase());
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Non otorize" });
    return;
  }

  const authObj = getAuth(req) as { userId: string; sessionClaims?: Record<string, unknown> };
  let email = (authObj.sessionClaims?.email as string) ?? "";
  let firstName = (authObj.sessionClaims?.first_name as string) ?? "";
  let lastName = (authObj.sessionClaims?.last_name as string) ?? "";

  // Production fallback: Clerk's default JWT does not embed email/name in session
  // claims. Fetch from the Clerk Backend API whenever ANY of email/first/last is
  // missing — not just email — so pre-existing users with empty names get them
  // backfilled on their next login (below), and we always store a real, unique
  // email (prevents UNIQUE-constraint 500s on empty-string email).
  if (!email || !firstName || !lastName) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      if (!email) email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      if (!firstName) firstName = clerkUser.firstName ?? "";
      if (!lastName) lastName = clerkUser.lastName ?? "";
    } catch (err) {
      req.log?.warn({ err, userId }, "Failed to fetch Clerk user; proceeding with session claims");
    }
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));

  if (!user) {
    // Never insert an empty email — it violates UNIQUE(email) for the 2nd+ user and
    // caused prior production 500s. If we still have no email, fail loudly instead.
    if (!email) {
      res.status(503).json({ error: "Nou pa ka jwenn imèl ou. Tanpri eseye ankò." });
      return;
    }

    const existingUsers = await db.select().from(usersTable);
    const isFirstUser = existingUsers.length === 0;
    const allowlistActive = getAdminAllowlist().length > 0;
    const role = allowlistActive
      ? (isAllowlistedAdmin(email) ? "admin" : "user")
      : (isFirstUser ? "admin" : "user");

    // First login is frequently concurrent: the SPA fires /api/users/me,
    // /api/kane, /api/notifications, etc. at once, so several requests reach
    // this branch before any row exists and race to INSERT the same user.
    // Without recovery the losers throw a UNIQUE violation and 500 (observed
    // in production). `users` has TWO unique constraints (clerk_id AND email),
    // so `ON CONFLICT (clerk_id)` alone is insufficient — a concurrent insert
    // can still collide on the email index. Instead: try the insert, and if it
    // fails because the race winner already created the row, re-select that row
    // by clerkId and continue. Only rethrow if no matching row exists (a
    // genuine error, e.g. a different user already owns this email).
    let insertedNewUser = false;
    try {
      const [newUser] = await db
        .insert(usersTable)
        .values({ clerkId: userId, email, firstName, lastName, role })
        .returning();
      user = newUser;
      insertedNewUser = true;
    } catch (insertErr) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, userId));
      if (!user) throw insertErr;
    }

    // Admin (first user) gets Kanè immediately. Regular users apply first.
    // Guarded on role so that under an active allowlist a non-admin first
    // registrant does NOT receive an unearned Kanè. Guarded on insertedNewUser
    // so only the request that actually created the row provisions the Kanè —
    // race losers that re-selected the row must not create a duplicate.
    if (insertedNewUser && isFirstUser && role === "admin") {
      const accountNumber = generateAccountNumber();
      const cardNumber = generateCardNumber();
      await db.insert(kaneTable).values({
        userId: user.id,
        accountNumber,
        cardNumber,
        cardExpiry: generateCardExpiry(),
        cardCvv: generateCvv(),
        balance: "250.00",
        creditScore: 300,
      });
    }
  } else {
    const updates: Record<string, unknown> = {};
    if (email && email !== user.email) updates.email = email;
    if (firstName && firstName !== user.firstName) updates.firstName = firstName;
    if (lastName && lastName !== user.lastName) updates.lastName = lastName;
    // ADMIN_EMAILS is authoritative when set: allowlisted emails are admin,
    // everyone else becomes a regular user. This DEMOTES stale admins that are
    // no longer on the list. When the allowlist is empty we leave the role
    // untouched so a cleared/misconfigured var can never mass-demote admins.
    if (getAdminAllowlist().length > 0) {
      // Allowlist is authoritative when non-empty: promote listed emails, and
      // DEMOTE every non-listed admin unconditionally. We do NOT guard demotion
      // on an allowlisted account already existing in this environment — that
      // guard permanently blocked demotion in prod (the intended admin had never
      // logged in, so no matching row existed) and let stale admins persist.
      // A misconfigured ADMIN_EMAILS is recoverable: fix the env var and log in.
      const desiredRole = isAllowlistedAdmin(email || user.email) ? "admin" : "user";
      if (desiredRole === "admin") {
        if (user.role !== "admin") updates.role = "admin";
      } else if (user.role === "admin") {
        updates.role = "user";
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      Object.assign(user, updates);
    }
  }

  (req as Request & { dbUser: typeof user }).dbUser = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const dbUser = (req as Request & { dbUser: { role: string } }).dbUser;
  if (!dbUser || dbUser.role !== "admin") {
    res.status(403).json({ error: "Entèdi: Aksè admin obligatwa" });
    return;
  }
  next();
}
