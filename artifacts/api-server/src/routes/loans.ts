import { Router, type Request } from "express";
import { db, usersTable, kaneTable, loansTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

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

router.get("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const loans = await db
    .select()
    .from(loansTable)
    .where(eq(loansTable.userId, user.id))
    .orderBy(desc(loansTable.createdAt));
  res.json(loans.map((l) => formatLoan(l)));
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const { amount, purpose } = req.body as { amount: number; purpose: string };

  if (!amount || amount < 100) {
    res.status(400).json({ error: "Minimum loan amount is 100 HTG" });
    return;
  }
  if (!purpose || purpose.length < 5) {
    res.status(400).json({ error: "Purpose must be at least 5 characters" });
    return;
  }

  const [loan] = await db
    .insert(loansTable)
    .values({
      userId: user.id,
      amount: String(amount.toFixed(2)),
      purpose,
      status: "pending",
      amountRepaid: "0.00",
    })
    .returning();

  res.status(201).json(formatLoan(loan));
});

router.post("/:loanId/repay", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const loanId = parseInt(String(req.params.loanId));
  const { amount } = req.body as { amount: number };

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid repayment amount" });
    return;
  }

  const [loan] = await db
    .select()
    .from(loansTable)
    .where(eq(loansTable.id, loanId));

  if (!loan || loan.userId !== user.id) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  if (loan.status !== "approved") {
    res.status(400).json({ error: "Loan is not active" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane || parseFloat(kane.balance) < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const newAmountRepaid = parseFloat(loan.amountRepaid) + amount;
  const loanAmount = parseFloat(loan.amount);
  const newStatus = newAmountRepaid >= loanAmount ? "repaid" : "approved";

  const [updatedLoan] = await db
    .update(loansTable)
    .set({
      amountRepaid: String(newAmountRepaid.toFixed(2)),
      status: newStatus,
    })
    .where(eq(loansTable.id, loanId))
    .returning();

  await db
    .update(kaneTable)
    .set({ balance: String((parseFloat(kane.balance) - amount).toFixed(2)) })
    .where(eq(kaneTable.userId, user.id));

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "loan_repayment",
    amount: String(amount.toFixed(2)),
    description: `Loan repayment for loan #${loanId}`,
    status: "completed",
  });

  res.json(formatLoan(updatedLoan));
});

export default router;
