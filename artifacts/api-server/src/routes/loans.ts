import { Router, type Request } from "express";
import { db, usersTable, kaneTable, loansTable, transactionsTable, creditScoreHistoryTable } from "@workspace/db";
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
    interestRate: parseFloat(l.interestRate),
    totalRepaymentAmount: l.totalRepaymentAmount ? parseFloat(l.totalRepaymentAmount) : null,
    weeklyPaymentAmount: l.weeklyPaymentAmount ? parseFloat(l.weeklyPaymentAmount) : null,
    durationWeeks: l.durationWeeks,
    nextPaymentDue: l.nextPaymentDue?.toISOString() ?? null,
    latePayments: l.latePayments,
    approvedAt: l.approvedAt?.toISOString() ?? null,
    rejectedAt: l.rejectedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    userName: u ? `${u.firstName} ${u.lastName}` : null,
    userEmail: u?.email ?? null,
  };
}

function clampScore(score: number): number {
  return Math.max(300, Math.min(850, score));
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
    res.status(400).json({ error: "Montan minimòm prè se 100 HTG" });
    return;
  }
  if (!purpose || purpose.length < 5) {
    res.status(400).json({ error: "Bi a dwe gen omwen 5 karaktè" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane) {
    res.status(403).json({ error: "Kont Kanè pa jwenn. Ou bezwen aplike pou yon kont dabò." });
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
    res.status(400).json({ error: "Montan pèman pa valid" });
    return;
  }

  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan || loan.userId !== user.id) {
    res.status(404).json({ error: "Prè pa jwenn" });
    return;
  }

  if (loan.status !== "approved" && loan.status !== "late") {
    res.status(400).json({ error: "Prè a pa aktif" });
    return;
  }

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!kane || parseFloat(kane.balance) < amount) {
    res.status(400).json({ error: "Pa gen ase lajan" });
    return;
  }

  const now = new Date();
  const isLate = loan.nextPaymentDue != null && now > loan.nextPaymentDue;

  const totalRepayment = loan.totalRepaymentAmount
    ? parseFloat(loan.totalRepaymentAmount)
    : parseFloat(loan.amount);
  const newAmountRepaid = parseFloat(loan.amountRepaid) + amount;
  const isFullyRepaid = newAmountRepaid >= totalRepayment;

  let scoreChange = isLate ? -30 : 5;
  let scoreReason = isLate ? "Pèman an reta pou prè #" + loanId : "Pèman nan tan pou prè #" + loanId;
  if (isFullyRepaid) {
    scoreChange += 30;
    scoreReason = "Prè #" + loanId + " ranmase konplètman";
  }

  const prevScore = kane.creditScore;
  const newScore = clampScore(prevScore + scoreChange);

  await db.insert(creditScoreHistoryTable).values({
    userId: user.id,
    previousScore: prevScore,
    newScore,
    change: newScore - prevScore,
    reason: scoreReason,
  });

  await db
    .update(kaneTable)
    .set({
      balance: String((parseFloat(kane.balance) - amount).toFixed(2)),
      creditScore: newScore,
    })
    .where(eq(kaneTable.userId, user.id));

  const nextDue = loan.nextPaymentDue
    ? new Date(loan.nextPaymentDue.getTime() + 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const newStatus = isFullyRepaid ? "repaid" : isLate ? "late" : "approved";

  const [updatedLoan] = await db
    .update(loansTable)
    .set({
      amountRepaid: String(newAmountRepaid.toFixed(2)),
      status: newStatus,
      latePayments: isLate ? loan.latePayments + 1 : loan.latePayments,
      nextPaymentDue: isFullyRepaid ? null : nextDue,
    })
    .where(eq(loansTable.id, loanId))
    .returning();

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "loan_repayment",
    amount: String(amount.toFixed(2)),
    description: `Ranbousman prè #${loanId}`,
    status: "completed",
  });

  res.json(formatLoan(updatedLoan));
});

export default router;
