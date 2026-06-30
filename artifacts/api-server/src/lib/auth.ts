import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const authObj = getAuth(req) as { userId: string; sessionClaims?: Record<string, unknown> };
  const email = (authObj.sessionClaims?.email as string) ?? "";
  const firstName = (authObj.sessionClaims?.first_name as string) ?? "";
  const lastName = (authObj.sessionClaims?.last_name as string) ?? "";

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));

  if (!user) {
    const existingUsers = await db.select().from(usersTable);
    const isFirstUser = existingUsers.length === 0;

    const [newUser] = await db
      .insert(usersTable)
      .values({ clerkId: userId, email, firstName, lastName, role: isFirstUser ? "admin" : "user" })
      .returning();
    user = newUser;

    const accountNumber = generateAccountNumber();
    const cardNumber = generateCardNumber();
    await db.insert(kaneTable).values({
      userId: user.id,
      accountNumber,
      cardNumber,
      cardExpiry: generateCardExpiry(),
      cardCvv: generateCvv(),
      balance: "1000.00",
      creditScore: 650,
    });
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
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }
  next();
}
