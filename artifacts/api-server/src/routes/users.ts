import { Router, type Request } from "express";
import { db, usersTable, kaneTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/me", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { firstName, lastName, phone } = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  const updates: Record<string, unknown> = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (phone !== undefined) updates.phone = phone;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    phone: updated.phone ?? null,
    role: updated.role,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
