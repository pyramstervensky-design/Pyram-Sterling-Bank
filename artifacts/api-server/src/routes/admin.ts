import { Router, type Request } from "express";
import {
  db, usersTable, kaneTable, loansTable, transactionsTable, partnersTable,
  accountApplicationsTable, notificationsTable, creditScoreHistoryTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, generateAccountNumber, generateCardNumber, generateCardExpiry, generateCvv } from "../lib/auth";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id, clerkId: u.clerkId, email: u.email,
    firstName: u.firstName, lastName: u.lastName, role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

function formatKane(k: typeof kaneTable.$inferSelect) {
  return {
    id: k.id, userId: k.userId, accountNumber: k.accountNumber,
    cardNumber: k.cardNumber, cardExpiry: k.cardExpiry, cardCvv: k.cardCvv,
    balance: parseFloat(k.balance), creditScore: k.creditScore,
    createdAt: k.createdAt.toISOString(),
  };
}

function formatLoan(l: typeof loansTable.$inferSelect, u?: typeof usersTable.$inferSelect) {
  return {
    id: l.id, userId: l.userId,
    amount: parseFloat(l.amount), purpose: l.purpose, status: l.status,
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

function formatPartner(p: typeof partnersTable.$inferSelect, accountNumber?: string | null) {
  return {
    id: p.id, userId: p.userId, businessName: p.businessName, businessType: p.businessType,
    description: p.description ?? null, status: p.status,
    onboardingFee: parseFloat(p.onboardingFee),
    createdAt: p.createdAt.toISOString(), accountNumber: accountNumber ?? null,
  };
}

function formatApplication(a: typeof accountApplicationsTable.$inferSelect) {
  return {
    id: a.id, userId: a.userId ?? null,
    firstName: a.firstName, lastName: a.lastName, phone: a.phone, nationalId: a.nationalId,
    appointmentDate: a.appointmentDate, appointmentTime: a.appointmentTime,
    status: a.status, notes: a.notes ?? null,
    rejectionReason: a.rejectionReason ?? null,
    createdAt: a.createdAt.toISOString(),
    approvedAt: a.approvedAt?.toISOString() ?? null,
    rejectedAt: a.rejectedAt?.toISOString() ?? null,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    rescheduledAt: a.rescheduledAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
  };
}

function getLoanEligibility(creditScore: number, activeLoansCount: number) {
  if (activeLoansCount > 0) {
    return { eligible: false, maxAmount: 0, riskLevel: "Prè aktif egziste", reason: "Kliyan an gen yon prè aktif" };
  }
  if (creditScore < 500) {
    return { eligible: false, maxAmount: 0, riskLevel: "Twò wo", reason: "Pwen kredi twò ba (< 500)" };
  }
  if (creditScore < 600) {
    return { eligible: true, maxAmount: 5000, riskLevel: "Wo", reason: "Pwen kredi ba (500-599)" };
  }
  if (creditScore < 700) {
    return { eligible: true, maxAmount: 15000, riskLevel: "Mwayen", reason: "Pwen kredi mwayen (600-699)" };
  }
  if (creditScore < 750) {
    return { eligible: true, maxAmount: 30000, riskLevel: "Ba", reason: "Bon pwen kredi (700-749)" };
  }
  return { eligible: true, maxAmount: 50000, riskLevel: "Trè ba", reason: "Ekselan pwen kredi (750+)" };
}

router.use(requireAuth, requireAdmin);

// ── Applications ─────────────────────────────────────────────────────────────

router.get("/applications", async (_req, res) => {
  const apps = await db
    .select()
    .from(accountApplicationsTable)
    .orderBy(desc(accountApplicationsTable.createdAt));

  const results = await Promise.all(
    apps.map(async (a) => {
      let userInfo = null;
      if (a.userId) {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId));
        if (u) userInfo = { email: u.email, clerkId: u.clerkId };
      }
      return { ...formatApplication(a), userInfo };
    })
  );

  res.json(results);
});

// Terminal (closed) states — no further transitions allowed.
// Legacy "approved" is treated as equivalent to "completed".
const TERMINAL_STATUSES = ["completed", "approved", "rejected"] as const;
const isTerminal = (status: string) => TERMINAL_STATUSES.includes(status as never);

// Accept / Confirm an appointment (no account creation yet)
router.post("/applications/:id/confirm", async (req, res) => {
  const appId = parseInt(req.params.id);
  const { notes } = req.body as { notes?: string };

  const [app] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.id, appId));

  if (!app) {
    res.status(404).json({ error: "Randevou pa jwenn" });
    return;
  }
  if (isTerminal(app.status)) {
    res.status(400).json({ error: "Randevou sa a deja fèmen" });
    return;
  }

  const [updated] = await db
    .update(accountApplicationsTable)
    .set({ status: "confirmed", confirmedAt: new Date(), notes: notes ?? app.notes })
    .where(eq(accountApplicationsTable.id, appId))
    .returning();

  if (app.userId) {
    await db.insert(notificationsTable).values({
      userId: app.userId,
      title: "Randevou ou konfime",
      message: `Bonjou ${app.firstName}! Randevou ou pou ouvèti kont Pyram Sterling Bank la konfime pou ${app.appointmentDate} a ${app.appointmentTime}. Nap tann ou.${notes ? " Nòt: " + notes : ""}`,
      isRead: false,
      type: "success",
    });
  }

  res.json(formatApplication(updated));
});

// Reschedule an appointment (new date/time)
router.post("/applications/:id/reschedule", async (req, res) => {
  const appId = parseInt(req.params.id);
  const { appointmentDate, appointmentTime } = req.body as {
    appointmentDate?: string;
    appointmentTime?: string;
  };

  if (!appointmentDate || !appointmentTime) {
    res.status(400).json({ error: "Dat ak lè nouvo randevou obligatwa" });
    return;
  }

  const [app] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.id, appId));

  if (!app) {
    res.status(404).json({ error: "Randevou pa jwenn" });
    return;
  }
  if (isTerminal(app.status)) {
    res.status(400).json({ error: "Randevou sa a deja fèmen" });
    return;
  }

  const [updated] = await db
    .update(accountApplicationsTable)
    .set({ status: "rescheduled", rescheduledAt: new Date(), appointmentDate, appointmentTime })
    .where(eq(accountApplicationsTable.id, appId))
    .returning();

  if (app.userId) {
    await db.insert(notificationsTable).values({
      userId: app.userId,
      title: "Randevou ou chanje",
      message: `Bonjou ${app.firstName}! Randevou ou pou ouvèti kont Pyram Sterling Bank la deplase pou ${appointmentDate} a ${appointmentTime}. Tanpri konfime disponibilite ou.`,
      isRead: false,
      type: "info",
    });
  }

  res.json(formatApplication(updated));
});

// Complete an appointment — creates the Kanè account
router.post("/applications/:id/complete", async (req, res) => {
  const appId = parseInt(req.params.id);
  const { notes } = req.body as { notes?: string };

  const [app] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.id, appId));

  if (!app) {
    res.status(404).json({ error: "Randevou pa jwenn" });
    return;
  }
  // A meeting must be accepted (confirmed/rescheduled) before it can be completed.
  if (app.status !== "confirmed" && app.status !== "rescheduled") {
    res.status(400).json({
      error: "Ou dwe aksepte randevou a anvan ou konplete li",
    });
    return;
  }
  if (!app.userId) {
    res.status(400).json({ error: "Itilizatè poko konekte. Mande kliyan an konekte premye." });
    return;
  }

  const [existingKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, app.userId));
  if (existingKane) {
    res.status(400).json({ error: "Itilizatè a deja gen yon kont Kanè" });
    return;
  }

  const userId = app.userId;
  const accountNumber = generateAccountNumber();
  const cardNumber = generateCardNumber();

  let kane;
  let updatedApp;
  try {
    ({ kane, updatedApp } = await db.transaction(async (tx) => {
      const [createdKane] = await tx
        .insert(kaneTable)
        .values({
          userId,
          accountNumber,
          cardNumber,
          cardExpiry: generateCardExpiry(),
          cardCvv: generateCvv(),
          balance: "250.00",
          creditScore: 300,
        })
        .returning();

      const [updated] = await tx
        .update(accountApplicationsTable)
        .set({ status: "completed", completedAt: new Date(), approvedAt: new Date(), notes: notes ?? app.notes })
        .where(eq(accountApplicationsTable.id, appId))
        .returning();

      return { kane: createdKane, updatedApp: updated };
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to complete application and create Kanè");
    res.status(400).json({ error: "Itilizatè a deja gen yon kont Kanè" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const fullName = user
    ? `${user.firstName || app.firstName} ${user.lastName || app.lastName}`
    : `${app.firstName} ${app.lastName}`;

  await db.insert(notificationsTable).values({
    userId,
    title: "Kont ou a aktive!",
    message: `Felisitasyon, ${fullName}! Kont Pyram Sterling Bank ou a aktive avèk siksè. Nimewo kont ou: ${accountNumber}. Balans inisyal: G 250.00. Pwen kredi inisyal: 300. Akeyi nan Pyram Sterling Bank!`,
    isRead: false,
    type: "success",
  });

  res.json(formatApplication(updatedApp));
});

router.post("/applications/:id/reject", async (req, res) => {
  const appId = parseInt(req.params.id);
  const { reason } = req.body as { reason?: string };

  const [app] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.id, appId));

  if (!app) {
    res.status(404).json({ error: "Randevou pa jwenn" });
    return;
  }
  if (isTerminal(app.status)) {
    res.status(400).json({ error: "Randevou sa a deja fèmen" });
    return;
  }

  const [updated] = await db
    .update(accountApplicationsTable)
    .set({ status: "rejected", rejectedAt: new Date(), rejectionReason: reason ?? null })
    .where(eq(accountApplicationsTable.id, appId))
    .returning();

  if (app.userId) {
    await db.insert(notificationsTable).values({
      userId: app.userId,
      title: "Randevou rejte",
      message: `Nou regret enfòme ou ke randevou pou ouvèti kont Pyram Sterling Bank ou a te rejte.${reason ? " Rezon: " + reason : " Kontakte nou pou plis enfòmasyon."}`,
      isRead: false,
      type: "error",
    });
  }

  res.json(formatApplication(updated));
});

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/users", async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  const results = await Promise.all(
    users.map(async (u) => {
      const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, u.id));
      const activeLoans = await db.select().from(loansTable).where(eq(loansTable.userId, u.id));
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
  if (!user) { res.status(404).json({ error: "Itilizatè pa jwenn" }); return; }
  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  const loans = await db.select().from(loansTable).where(eq(loansTable.userId, user.id));
  res.json({
    ...formatUser(user),
    kane: kane ? formatKane(kane) : null,
    activeLoans: loans.map((l) => formatLoan(l, user)),
  });
});

// ── Transactions ──────────────────────────────────────────────────────────────

router.get("/transactions", async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);
  const userId = req.query.userId as string | undefined;
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;

  let txs: typeof transactionsTable.$inferSelect[];
  if (userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.json([]); return; }
    txs = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset);
  } else {
    txs = await db.select().from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt)).limit(limit).offset(offset);
  }

  let filtered = txs;
  if (status) filtered = filtered.filter((t) => t.status === status);
  if (type) filtered = filtered.filter((t) => t.type === type);

  res.json(filtered.map(formatAdminTx));
});

function formatAdminTx(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id, userId: t.userId, type: t.type, amount: parseFloat(t.amount),
    description: t.description, status: t.status,
    recipientAccount: t.recipientAccount ?? null, recipientName: t.recipientName ?? null,
    senderAccount: t.senderAccount ?? null, createdAt: t.createdAt.toISOString(),
  };
}

// Approve a pending money-movement request (deposit / withdrawal / transfer):
// balance is moved here — never at request time.
router.post("/transactions/:transactionId/approve", async (req, res) => {
  const transactionId = parseInt(req.params.transactionId);

  type Outcome =
    | { kind: "ok"; tx: typeof transactionsTable.$inferSelect }
    | { kind: "error"; code: number; error: string };

  const outcome = await db.transaction<Outcome>(async (txDb) => {
    // Row lock: FOR UPDATE serializes concurrent approvals of the same tx.
    // The second caller blocks until the first commits, then sees a non-pending
    // status and bails — so money is only ever moved once.
    const [tx] = await txDb
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .for("update");

    if (!tx) return { kind: "error", code: 404, error: "Tranzaksyon pa jwenn" };
    if (tx.status !== "pending") return { kind: "error", code: 400, error: "Tranzaksyon pa an atant" };

    const amount = parseFloat(tx.amount);
    const [kane] = await txDb.select().from(kaneTable).where(eq(kaneTable.userId, tx.userId));
    if (!kane) return { kind: "error", code: 404, error: "Kont kliyan pa jwenn" };

    if (tx.type === "deposit") {
      const newBalance = parseFloat(kane.balance) + amount;
      await txDb.update(kaneTable).set({ balance: String(newBalance.toFixed(2)) }).where(eq(kaneTable.userId, tx.userId));
      await txDb.insert(notificationsTable).values({
        userId: tx.userId,
        title: "Depo apwouve",
        message: `Depo ou a nan valè G ${amount.toFixed(2)} apwouve. Nouvo balans: G ${newBalance.toFixed(2)}.`,
        type: "success",
        isRead: false,
      });
    } else if (tx.type === "withdrawal") {
      if (parseFloat(kane.balance) < amount) {
        return { kind: "error", code: 400, error: "Kliyan an pa gen ase lajan. Rejte demann lan." };
      }
      const newBalance = parseFloat(kane.balance) - amount;
      await txDb.update(kaneTable).set({ balance: String(newBalance.toFixed(2)) }).where(eq(kaneTable.userId, tx.userId));
      await txDb.insert(notificationsTable).values({
        userId: tx.userId,
        title: "Retrè apwouve",
        message: `Retrè ou a nan valè G ${amount.toFixed(2)} apwouve. Nouvo balans: G ${newBalance.toFixed(2)}.`,
        type: "success",
        isRead: false,
      });
    } else if (tx.type === "transfer") {
      if (parseFloat(kane.balance) < amount) {
        return { kind: "error", code: 400, error: "Ekspeditè a pa gen ase lajan. Rejte demann lan." };
      }
      if (!tx.recipientAccount) return { kind: "error", code: 400, error: "Kont destinatè manke" };
      const [recipientKane] = await txDb.select().from(kaneTable).where(eq(kaneTable.accountNumber, tx.recipientAccount));
      if (!recipientKane) return { kind: "error", code: 404, error: "Kont destinatè pa jwenn ankò. Rejte demann lan." };

      const senderNewBalance = parseFloat(kane.balance) - amount;
      const recipientNewBalance = parseFloat(recipientKane.balance) + amount;
      await txDb.update(kaneTable).set({ balance: String(senderNewBalance.toFixed(2)) }).where(eq(kaneTable.userId, tx.userId));
      await txDb.update(kaneTable).set({ balance: String(recipientNewBalance.toFixed(2)) }).where(eq(kaneTable.userId, recipientKane.userId));

      await txDb.insert(transactionsTable).values({
        userId: recipientKane.userId,
        type: "deposit",
        amount: tx.amount,
        description: tx.senderAccount ? `Transfè soti nan ${tx.senderAccount}` : "Transfè resevwa",
        status: "completed",
        senderAccount: tx.senderAccount ?? null,
        recipientAccount: tx.recipientAccount,
      });

      await txDb.insert(notificationsTable).values({
        userId: tx.userId,
        title: "Transfè apwouve",
        message: `Transfè ou a nan valè G ${amount.toFixed(2)} bay ${tx.recipientName ?? tx.recipientAccount} apwouve. Nouvo balans: G ${senderNewBalance.toFixed(2)}.`,
        type: "success",
        isRead: false,
      });
      await txDb.insert(notificationsTable).values({
        userId: recipientKane.userId,
        title: "Ou resevwa lajan",
        message: `Ou resevwa G ${amount.toFixed(2)}${tx.senderAccount ? ` soti nan ${tx.senderAccount}` : ""}. Nouvo balans: G ${recipientNewBalance.toFixed(2)}.`,
        type: "success",
        isRead: false,
      });
    } else {
      return { kind: "error", code: 400, error: "Tip tranzaksyon sa a pa mande apwobasyon" };
    }

    const [updated] = await txDb.update(transactionsTable)
      .set({ status: "completed" })
      .where(eq(transactionsTable.id, transactionId))
      .returning();

    return { kind: "ok", tx: updated };
  });

  if (outcome.kind === "error") {
    res.status(outcome.code).json({ error: outcome.error });
    return;
  }
  res.json(formatAdminTx(outcome.tx));
});

router.post("/transactions/:transactionId/reject", async (req, res) => {
  const transactionId = parseInt(req.params.transactionId);

  // Conditional transition: only flips pending -> failed once, so a concurrent
  // approve/reject race can never double-process the request.
  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "failed" })
    .where(and(eq(transactionsTable.id, transactionId), eq(transactionsTable.status, "pending")))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, transactionId));
    if (!existing) { res.status(404).json({ error: "Tranzaksyon pa jwenn" }); return; }
    res.status(400).json({ error: "Tranzaksyon pa an atant" });
    return;
  }

  const typeLabel = updated.type === "deposit" ? "Depo" : updated.type === "withdrawal" ? "Retrè" : "Transfè";
  await db.insert(notificationsTable).values({
    userId: updated.userId,
    title: `${typeLabel} rejte`,
    message: `Demann ${typeLabel.toLowerCase()} ou a nan valè G ${parseFloat(updated.amount).toFixed(2)} te rejte pa admin.`,
    type: "error",
    isRead: false,
  });

  res.json(formatAdminTx(updated));
});

// ── Loans ─────────────────────────────────────────────────────────────────────

router.get("/loans", async (req, res) => {
  const status = req.query.status as string | undefined;
  const loans = await db.select().from(loansTable).orderBy(desc(loansTable.createdAt));
  const filtered = status ? loans.filter((l) => l.status === status) : loans;

  const results = await Promise.all(
    filtered.map(async (l) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, l.userId));
      const [kane] = user
        ? await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id))
        : [null];
      const activeLoansCount = loans.filter(
        (x) => x.userId === l.userId && (x.status === "approved" || x.status === "late") && x.id !== l.id
      ).length;
      const creditScore = kane?.creditScore ?? 300;
      return {
        ...formatLoan(l, user),
        eligibility: getLoanEligibility(creditScore, activeLoansCount),
      };
    })
  );
  res.json(results);
});

router.post("/loans/:loanId/approve", async (req, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan) { res.status(404).json({ error: "Prè pa jwenn" }); return; }
  if (loan.status !== "pending") { res.status(400).json({ error: "Prè pa an atant" }); return; }

  const interestRate = 0.05;
  const totalRepayment = parseFloat(loan.amount) * (1 + interestRate);
  const weeklyPayment = totalRepayment / loan.durationWeeks;
  const nextPaymentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [updatedLoan] = await db
    .update(loansTable)
    .set({
      status: "approved",
      approvedAt: new Date(),
      totalRepaymentAmount: String(totalRepayment.toFixed(2)),
      weeklyPaymentAmount: String(weeklyPayment.toFixed(2)),
      nextPaymentDue,
    })
    .where(eq(loansTable.id, loanId))
    .returning();

  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, loan.userId));
  if (kane) {
    const newBalance = parseFloat(kane.balance) + parseFloat(loan.amount);
    await db.update(kaneTable)
      .set({ balance: String(newBalance.toFixed(2)) })
      .where(eq(kaneTable.userId, loan.userId));
  }

  await db.insert(transactionsTable).values({
    userId: loan.userId,
    type: "loan_disbursement",
    amount: loan.amount,
    description: `Prè #${loanId} apwouve epi dekese`,
    status: "completed",
  });

  await db.insert(notificationsTable).values({
    userId: loan.userId,
    title: "Prè apwouve!",
    message: `Prè ou a nan valè G ${parseFloat(loan.amount).toFixed(2)} apwouve. Total pou ranbouse: G ${totalRepayment.toFixed(2)}. Pèman chak semèn: G ${weeklyPayment.toFixed(2)} pou ${loan.durationWeeks} semèn.`,
    isRead: false,
    type: "success",
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId));
  res.json(formatLoan(updatedLoan, user));
});

router.post("/loans/:loanId/reject", async (req, res) => {
  const loanId = parseInt(req.params.loanId);
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan) { res.status(404).json({ error: "Prè pa jwenn" }); return; }

  const [updatedLoan] = await db
    .update(loansTable)
    .set({ status: "rejected", rejectedAt: new Date() })
    .where(eq(loansTable.id, loanId))
    .returning();

  await db.insert(notificationsTable).values({
    userId: loan.userId,
    title: "Prè rejte",
    message: `Demann prè ou a nan valè G ${parseFloat(loan.amount).toFixed(2)} te rejte.`,
    isRead: false,
    type: "error",
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, loan.userId));
  res.json(formatLoan(updatedLoan, user));
});

// ── Partners ──────────────────────────────────────────────────────────────────

router.post("/partners/:partnerId/approve", async (req, res) => {
  const partnerId = parseInt(req.params.partnerId);
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!partner) { res.status(404).json({ error: "Patnè pa jwenn" }); return; }
  const [updated] = await db.update(partnersTable).set({ status: "approved" })
    .where(eq(partnersTable.id, partnerId)).returning();
  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, partner.userId));
  res.json(formatPartner(updated, kane?.accountNumber));
});

router.post("/partners/:partnerId/reject", async (req, res) => {
  const partnerId = parseInt(req.params.partnerId);
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, partnerId));
  if (!partner) { res.status(404).json({ error: "Patnè pa jwenn" }); return; }
  const [updated] = await db.update(partnersTable).set({ status: "rejected" })
    .where(eq(partnersTable.id, partnerId)).returning();
  const [kane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, partner.userId));
  res.json(formatPartner(updated, kane?.accountNumber));
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get("/stats", async (_req, res) => {
  const users = await db.select().from(usersTable);
  const kanes = await db.select().from(kaneTable);
  const txs = await db.select().from(transactionsTable);
  const loans = await db.select().from(loansTable);
  const partners = await db.select().from(partnersTable);
  const apps = await db.select().from(accountApplicationsTable);

  const totalBalance = kanes.reduce((sum, k) => sum + parseFloat(k.balance), 0);
  const pendingLoans = loans.filter((l) => l.status === "pending").length;
  const activeLoans = loans.filter((l) => l.status === "approved" || l.status === "late").length;
  const totalLoansIssued = loans
    .filter((l) => ["approved", "late", "repaid"].includes(l.status))
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const totalPartnersApproved = partners.filter((p) => p.status === "approved").length;
  const pendingApplications = apps.filter((a) => a.status === "pending").length;
  const pendingTransactions = txs.filter(
    (t) => t.status === "pending" && ["deposit", "withdrawal", "transfer"].includes(t.type),
  ).length;

  res.json({
    totalUsers: users.length,
    totalBalance,
    totalTransactions: txs.length,
    pendingLoans,
    activeLoans,
    totalLoansIssued,
    totalPartnersApproved,
    pendingApplications,
    pendingTransactions,
  });
});

// ── Credit Score ──────────────────────────────────────────────────────────────

router.patch("/users/:userId/credit-score", async (req, res) => {
  const clerkId = req.params.userId;
  const { creditScore } = req.body as { creditScore: number };

  if (!creditScore || creditScore < 300 || creditScore > 850) {
    res.status(400).json({ error: "Pwen kredi dwe ant 300 ak 850" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(404).json({ error: "Itilizatè pa jwenn" }); return; }

  const [current] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (!current) { res.status(404).json({ error: "Kanè pa jwenn" }); return; }

  await db.insert(creditScoreHistoryTable).values({
    userId: user.id,
    previousScore: current.creditScore,
    newScore: creditScore,
    change: creditScore - current.creditScore,
    reason: "Ajisteman manyal pa admin",
  });

  const [updated] = await db
    .update(kaneTable)
    .set({ creditScore })
    .where(eq(kaneTable.userId, user.id))
    .returning();

  res.json(formatKane(updated));
});

export default router;
