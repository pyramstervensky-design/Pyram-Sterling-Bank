import { Router, type Request } from "express";
import { db, usersTable, kaneTable, loansTable, transactionsTable, partnersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

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

function formatLoan(l: typeof loansTable.$inferSelect, u?: typeof usersTable.$inferSelect) {
  return {
    id: l.id,
    userId: l.userId,
    amount: parseFloat(l.amount),
    purpose: l.purpose,
    status: l.status,
    amountRepaid: parseFloat(l.amountRepaid),
    approvedAt: l.approvedAt?.toISOString() ?? null,
    rejectedAt: l.rejectedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    userName: u ? `${u.firstName} ${u.lastName}` : null,
    userEmail: u?.email ?? null,
  };
}

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

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const results = await Promise.all(
    users.map(async (u) => {
      const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, u.id));
      const activeLoans = await db
        .select()
        .from(loansTable)
        .where(eq(loansTable.userId, u.id));
      return {
        ...formatUser(u),
        kane: kane ? formatKane(kane) : null,
        activeLoans: activeLoans.map((l) => formatLoan(l, u)),
      };
    })
  );
  res.json(results);
});

router.get("/users/:userId", async (req, res) => {
  const clerkId = req.params.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  const loans = await db.select().from(loansTable).where(eq(loansTable.userId, user.id));
  res.json({
    ...formatUser(user),
    kane: kane ? formatKane(kane) : null,
    activeLoans: loans.map((l) => formatLoan(l, user)),
  });
});

router.get("/transactions", async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const userId = req.query.userId as string | undefined;

  let txs: typeof transactionsTable.$inferSelect[];

  if (userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.json([]);
      return;
    }
    txs = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    txs = await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  res.json(
    txs.map((t) => ({
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
    }))
  );
});

router.get("/loans", async (req, res) => {
  const status = req.query.status as string | undefined;
  const loans = await db
    .select()
    .from(loansTable)
    .orderBy(desc(loansTable.createdAt));

  const filtered = status ? loans.filter((l) => l.status === status) : loans;

  const results = await Promise.all(
    filtered.map(async (l) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId));
      return formatLoan(l, user);
    })
  );

  res.json(results);
});

router.post("/loans/:loanId/approve", async (req, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (loan.status !== "pending") {
    res.status(400).json({ error: "Loan is not pending" });
    return;
  }

  const [updatedLoan] = await db
    .update(loansTable)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(loansTable.id, loanId))
    .returning();

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, loan.userId));
  if (kane) {
    const newBalance = parseFloat(kane.balance) + parseFloat(loan.amount);
    await db
      .update(kaneTable)
      .set({ balance: String(newBalance.toFixed(2)) })
      .where(eq(kaneTable.userId, loan.userId));
  }

  await db.insert(transactionsTable).values({
    userId: loan.userId,
    type: "loan_disbursement",
    amount: loan.amount,
    description: `Loan #${loanId} approved and disbursed`,
    status: "completed",
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId));
  res.json(formatLoan(updatedLoan, user));
});

router.post("/loans/:loanId/reject", async (req, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  const [updatedLoan] = await db
    .update(loansTable)
    .set({ status: "rejected", rejectedAt: new Date() })
    .where(eq(loansTable.id, loanId))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId));
  res.json(formatLoan(updatedLoan, user));
});

router.post("/partners/:partnerId/approve", async (req, res) => {
  const partnerId = parseInt(req.params.partnerId);
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!partner) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }

  const [updated] = await db
    .update(partnersTable)
    .set({ status: "approved" })
    .where(eq(partnersTable.id, partnerId))
    .returning();

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, partner.userId));
  res.json(formatPartner(updated, kane?.accountNumber));
});

router.post("/partners/:partnerId/reject", async (req, res) => {
  const partnerId = parseInt(req.params.partnerId);
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!partner) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }

  const [updated] = await db
    .update(partnersTable)
    .set({ status: "rejected" })
    .where(eq(partnersTable.id, partnerId))
    .returning();

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, partner.userId));
  res.json(formatPartner(updated, kane?.accountNumber));
});

router.get("/stats", async (_req, res) => {
  const users = await db.select().from(usersTable);
  const kanes = await db.select().from(kaneTable);
  const txs = await db.select().from(transactionsTable);
  const loans = await db.select().from(loansTable);
  const partners = await db.select().from(partnersTable);

  const totalBalance = kanes.reduce((sum, k) => sum + parseFloat(k.balance), 0);
  const pendingLoans = loans.filter((l) => l.status === "pending").length;
  const activeLoans = loans.filter((l) => l.status === "approved").length;
  const totalLoansIssued = loans
    .filter((l) => l.status === "approved" || l.status === "repaid")
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const totalPartnersApproved = partners.filter((p) => p.status === "approved").length;

  res.json({
    totalUsers: users.length,
    totalBalance,
    totalTransactions: txs.length,
    pendingLoans,
    activeLoans,
    totalLoansIssued,
    totalPartnersApproved,
  });
});

router.patch("/users/:userId/credit-score", async (req, res) => {
  const clerkId = req.params.userId;
  const { creditScore } = req.body as { creditScore: number };

  if (!creditScore || creditScore < 300 || creditScore > 850) {
    res.status(400).json({ error: "Credit score must be between 300 and 850" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(kaneTable)
    .set({ creditScore })
    .where(eq(kaneTable.userId, user.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Kane not found" });
    return;
  }

  res.json({
    id: updated.id,
    userId: updated.userId,
    accountNumber: updated.accountNumber,
    cardNumber: updated.cardNumber,
    cardExpiry: updated.cardExpiry,
    cardCvv: updated.cardCvv,
    balance: parseFloat(updated.balance),
    creditScore: updated.creditScore,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
