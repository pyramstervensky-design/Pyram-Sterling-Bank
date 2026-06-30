import { Router, type Request } from "express";
import { db, usersTable, kaneTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

function formatKane(k: typeof kaneTable.$inferSelect) {
  return {
    id: k.id,
    userId: k.userId,
    accountNumber: k.accountNumber,
    cardNumber: k.cardNumber,
    cardExpiry: k.cardExpiry,
    cardCvv: k.cardCvv,
    balance: parseFloat(k.balance),
    creditScore: k.creditScore,
    createdAt: k.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(404).json({ error: "Kanè not found" });
    return;
  }
  res.json(formatKane(kane));
});

export default router;
