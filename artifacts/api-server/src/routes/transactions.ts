import { Router, type Request } from "express";
import { db, usersTable, kaneTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

const TRANSFER_LIMIT_HTG = 200_000;

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

function fmtAmount(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const limit = Number(req.query.limit ?? 20);
  const offset = Number(req.query.offset ?? 0);
  const type = req.query.type as string | undefined;

  const txs = await db
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
    res.status(400).json({ error: "Montan pa valid" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(404).json({ error: "Kont pa jwenn" });
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
      description: description ?? "Depo",
      status: "completed",
    })
    .returning();

  await db.insert(notificationsTable).values({
    userId: user.id,
    title: "Depo reyisi",
    message: `Ou depoze G ${fmtAmount(amount)} nan kont ou. Nouvo balans: G ${fmtAmount(newBalance)}.`,
    type: "success",
    isRead: false,
  });

  res.status(201).json(formatTx(tx));
});

router.post("/withdraw", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { amount, description } = req.body as { amount: number; description?: string };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Montan pa valid" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(404).json({ error: "Kont pa jwenn" });
    return;
  }

  const currentBalance = parseFloat(kane.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Pa gen ase lajan nan kont ou" });
    return;
  }

  const newBalance = currentBalance - amount;

  await db
    .update(kaneTable)
    .set({ balance: String(newBalance.toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "withdrawal",
      amount: String(amount.toFixed(2)),
      description: description ?? "Retrè",
      status: "completed",
    })
    .returning();

  await db.insert(notificationsTable).values({
    userId: user.id,
    title: "Retrè reyisi",
    message: `Ou retire G ${fmtAmount(amount)} nan kont ou. Nouvo balans: G ${fmtAmount(newBalance)}.`,
    type: "info",
    isRead: false,
  });

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
    res.status(400).json({ error: "Montan pa valid" });
    return;
  }
  if (!recipientAccount) {
    res.status(400).json({ error: "Nimewo kont destinatè obligatwa" });
    return;
  }
  if (amount > TRANSFER_LIMIT_HTG) {
    res.status(400).json({ error: `Transfè a depase limit maksimòm ${TRANSFER_LIMIT_HTG.toLocaleString()} HTG pa tranzaksyon` });
    return;
  }

  const [senderKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!senderKane) {
    res.status(404).json({ error: "Kont expéditè pa jwenn" });
    return;
  }

  if (senderKane.accountNumber === recipientAccount) {
    res.status(400).json({ error: "Pa ka transfere nan pwòp kont ou" });
    return;
  }

  const currentBalance = parseFloat(senderKane.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Pa gen ase lajan nan kont ou" });
    return;
  }

  const [recipientKane] = await db
    .select()
    .from(kaneTable)
    .where(eq(kaneTable.accountNumber, recipientAccount));

  if (!recipientKane) {
    res.status(404).json({ error: "Nimewo kont destinatè pa jwenn. Verifye li epi eseye ankò." });
    return;
  }

  const [recipientUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, recipientKane.userId));

  const senderNewBalance = currentBalance - amount;
  const recipientNewBalance = parseFloat(recipientKane.balance) + amount;

  await db
    .update(kaneTable)
    .set({ balance: String(senderNewBalance.toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  await db
    .update(kaneTable)
    .set({ balance: String(recipientNewBalance.toFixed(2)) })
    .where(eq(kaneTable.userId, recipientKane.userId));

  const recipientFullName = recipientUser
    ? `${recipientUser.firstName} ${recipientUser.lastName}`.trim()
    : recipientAccount;

  const senderFullName = `${user.firstName} ${user.lastName}`.trim();

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      userId: user.id,
      type: "transfer",
      amount: String(amount.toFixed(2)),
      description: description ?? `Transfè bay ${recipientFullName}`,
      status: "completed",
      recipientAccount,
      recipientName: recipientFullName,
      senderAccount: senderKane.accountNumber,
    })
    .returning();

  await db.insert(transactionsTable).values({
    userId: recipientKane.userId,
    type: "deposit",
    amount: String(amount.toFixed(2)),
    description: description ?? `Transfè soti nan ${senderFullName || senderKane.accountNumber}`,
    status: "completed",
    senderAccount: senderKane.accountNumber,
    recipientAccount,
  });

  await db.insert(notificationsTable).values({
    userId: user.id,
    title: "Transfè reyisi",
    message: `Ou voye G ${fmtAmount(amount)} bay ${recipientFullName} (${recipientAccount}). Nouvo balans: G ${fmtAmount(senderNewBalance)}.`,
    type: "success",
    isRead: false,
  });

  await db.insert(notificationsTable).values({
    userId: recipientKane.userId,
    title: "Ou resevwa lajan",
    message: `Ou resevwa G ${fmtAmount(amount)} soti nan ${senderFullName || senderKane.accountNumber}. Nouvo balans: G ${fmtAmount(recipientNewBalance)}.`,
    type: "success",
    isRead: false,
  });

  res.status(201).json(formatTx(tx));
});

export default router;
