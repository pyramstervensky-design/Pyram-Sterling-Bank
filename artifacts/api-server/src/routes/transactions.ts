import { Router, type Request } from "express";
import { db, usersTable, kaneTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

function formatTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId,
    type: t.type,
    amount: parseFloat(t.amount),
    description: t.description,
    status: t.status,
    recipientAccount: t.recipientAccount ?? null,
    recipientName: t.recipientName ?? null,
    senderAccount: t.senderAccount ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const limit = Number(req.query.limit ?? 20);
  const offset = Number(req.query.offset ?? 0);
  const type = req.query.type as string | undefined;

  let query = db
    .select()
    .from(transactionsTable)
    .where(
      type
        ? and(
            eq(transactionsTable.userId, user.id),
            eq(transactionsTable.type, type as typeof transactionsTable.$inferSelect["type"]),
          )
        : eq(transactionsTable.userId, user.id),
    )
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const txs = await query;
  res.json(txs.map(formatTx));
});

router.get("/summary", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, user.id));

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalTransfers = 0;

  for (const tx of txs) {
    if (tx.type === "deposit" || tx.type === "loan_disbursement") totalDeposits += parseFloat(tx.amount);
    else if (tx.type === "withdrawal") totalWithdrawals += parseFloat(tx.amount);
    else if (tx.type === "transfer" || tx.type === "partner_payment") totalTransfers += parseFloat(tx.amount);
  }

  res.json({
    totalDeposits,
    totalWithdrawals,
    totalTransfers,
    balance: kane ? parseFloat(kane.balance) : 0,
    transactionCount: txs.length,
  });
});

router.post("/deposit", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { amount, description } = req.body as { amount: number; description?: string };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(404).json({ error: "Kane not found" });
    return;
  }

  const newBalance = parseFloat(kane.balance) + amount;

  await db
    .update(kaneTable)
    .set({ balance: String(newBalance.toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "deposit",
      amount: String(amount.toFixed(2)),
      description: description ?? "Deposit",
      status: "completed",
    })
    .returning();

  res.status(201).json(formatTx(tx));
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { amount, description } = req.body as { amount: number; description?: string };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(404).json({ error: "Kane not found" });
    return;
  }

  const currentBalance = parseFloat(kane.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  await db
    .update(kaneTable)
    .set({ balance: String((currentBalance - amount).toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "withdrawal",
      amount: String(amount.toFixed(2)),
      description: description ?? "Withdrawal",
      status: "completed",
    })
    .returning();

  res.status(201).json(formatTx(tx));
});

router.post("/transfer", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { amount, recipientAccount, description } = req.body as {
    amount: number;
    recipientAccount: string;
    description?: string;
  };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (!recipientAccount) {
    res.status(400).json({ error: "Recipient account required" });
    return;
  }

  const [senderKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!senderKane) {
    res.status(404).json({ error: "Sender Kane not found" });
    return;
  }

  if (senderKane.accountNumber === recipientAccount) {
    res.status(400).json({ error: "Cannot transfer to own account" });
    return;
  }

  const currentBalance = parseFloat(senderKane.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const [recipientKane] = await db
    .select()
    .from(kaneTable)
    .where(eq(kaneTable.accountNumber, recipientAccount));

  if (!recipientKane) {
    res.status(404).json({ error: "Recipient account not found" });
    return;
  }

  const [recipientUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, recipientKane.userId));

  await db
    .update(kaneTable)
    .set({ balance: String((currentBalance - amount).toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  await db
    .update(kaneTable)
    .set({ balance: String((parseFloat(recipientKane.balance) + amount).toFixed(2)) })
    .where(eq(kaneTable.userId, recipientKane.userId));

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "transfer",
      amount: String(amount.toFixed(2)),
      description: description ?? `Transfer to ${recipientAccount}`,
      status: "completed",
      recipientAccount,
      recipientName: recipientUser ? `${recipientUser.firstName} ${recipientUser.lastName}` : null,
      senderAccount: senderKane.accountNumber,
    })
    .returning();

  await db.insert(transactionsTable).values({
    userId: recipientKane.userId,
    type: "deposit",
    amount: String(amount.toFixed(2)),
    description: `Transfer from ${senderKane.accountNumber}`,
    status: "completed",
    senderAccount: senderKane.accountNumber,
    recipientAccount,
  });

  res.status(201).json(formatTx(tx));
});

export default router;
