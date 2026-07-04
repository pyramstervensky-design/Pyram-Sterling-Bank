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
  // claims. When email is missing, fetch it from the Clerk Backend API so we always
  // store a real, unique email (prevents UNIQUE-constraint 500s on empty-string email).
  if (!email) {
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
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

    const [newUser] = await db
      .insert(usersTable)
      .values({ clerkId: userId, email, firstName, lastName, role: isFirstUser ? "admin" : "user" })
      .returning();
    user = newUser;

    // Admin (first user) gets Kanè immediately. Regular users apply first.
    if (isFirstUser) {
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
