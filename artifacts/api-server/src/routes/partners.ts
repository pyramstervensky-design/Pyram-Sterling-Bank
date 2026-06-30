import { Router, type Request } from "express";
import { db, usersTable, kaneTable, partnersTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

function formatPartner(p: typeof partnersTable.$inferSelect, accountNumber?: string | null) {
  return {
    id: p.id,
    userId: p.userId,
    businessName: p.businessName,
    businessType: p.businessType,
    description: p.description ?? null,
    status: p.status,
    onboardingFee: parseFloat(p.onboardingFee),
    createdAt: p.createdAt.toISOString(),
    accountNumber: accountNumber ?? null,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const approvedPartners = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.status, "approved"))
    .orderBy(desc(partnersTable.createdAt));

  const results = await Promise.all(
    approvedPartners.map(async (p) => {
      const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, p.userId));
      return formatPartner(p, kane?.accountNumber);
    })
  );

  res.json(results);
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.userId, user.id))
    .orderBy(desc(partnersTable.createdAt));

  if (!partner) {
    res.status(404).json({ error: "No partner profile found" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  res.json(formatPartner(partner, kane?.accountNumber));
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { businessName, businessType, description } = req.body as {
    businessName: string;
    businessType: string;
    description?: string;
  };

  if (!businessName || businessName.length < 2) {
    res.status(400).json({ error: "Business name must be at least 2 characters" });
    return;
  }

  const [existing] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.userId, user.id));

  if (existing) {
    res.status(400).json({ error: "You already have a partner application" });
    return;
  }

  const [partner] = await db
    .insert(partnersTable)
    .values({
      userId: user.id,
      businessName,
      businessType,
      description: description ?? null,
      status: "pending",
      onboardingFee: "50.00",
    })
    .returning();

  res.status(201).json(formatPartner(partner));
});

router.post("/:partnerId/pay", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const partnerId = parseInt(String(req.params.partnerId));
  const { amount, description } = req.body as { amount: number; description?: string };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.id, partnerId));

  if (!partner || partner.status !== "approved") {
    res.status(404).json({ error: "Partner not found or not approved" });
    return;
  }

  const [payerKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!payerKane || parseFloat(payerKane.balance) < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const [partnerKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, partner.userId));

  await db
    .update(kaneTable)
    .set({ balance: String((parseFloat(payerKane.balance) - amount).toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  if (partnerKane) {
    await db
      .update(kaneTable)
      .set({ balance: String((parseFloat(partnerKane.balance) + amount).toFixed(2)) })
      .where(eq(kaneTable.userId, partner.userId));
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "partner_payment",
      amount: String(amount.toFixed(2)),
      description: description ?? `Payment to ${partner.businessName}`,
      status: "completed",
      recipientName: partner.businessName,
    })
    .returning();

  if (partnerKane) {
    await db.insert(transactionsTable).values({
      userId: partner.userId,
      type: "deposit",
      amount: String(amount.toFixed(2)),
      description: `Payment from customer`,
      status: "completed",
    });
  }

  res.status(201).json({
    id: tx.id,
    userId: tx.userId,
    type: tx.type,
    amount: parseFloat(tx.amount),
    description: tx.description,
    status: tx.status,
    recipientAccount: tx.recipientAccount ?? null,
    recipientName: tx.recipientName ?? null,
    senderAccount: tx.senderAccount ?? null,
    createdAt: tx.createdAt.toISOString(),
  });
});

export default router;
