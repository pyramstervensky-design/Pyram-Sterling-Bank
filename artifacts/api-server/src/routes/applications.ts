import { Router, type Request } from "express";
import { db, usersTable, kaneTable, notificationsTable, accountApplicationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, generateAccountNumber, generateCardNumber, generateCardExpiry, generateCvv } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

function formatApplication(a: typeof accountApplicationsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId ?? null,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phone,
    nationalId: a.nationalId,
    appointmentDate: a.appointmentDate,
    appointmentTime: a.appointmentTime,
    status: a.status,
    notes: a.notes ?? null,
    rejectionReason: a.rejectionReason ?? null,
    createdAt: a.createdAt.toISOString(),
    approvedAt: a.approvedAt?.toISOString() ?? null,
    rejectedAt: a.rejectedAt?.toISOString() ?? null,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    rescheduledAt: a.rescheduledAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const [app] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.userId, user.id))
    .orderBy(desc(accountApplicationsTable.createdAt))
    .limit(1);
  if (!app) {
    res.status(404).json({ error: "Okenn aplikasyon jwenn" });
    return;
  }
  res.json(formatApplication(app));
});

router.post("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;

  const [existingKane] = await db.select().from(kaneTable).where(eq(kaneTable.userId, user.id));
  if (existingKane) {
    res.status(400).json({ error: "Ou deja gen yon kont Kanè aktif" });
    return;
  }

  const [existingApp] = await db
    .select()
    .from(accountApplicationsTable)
    .where(eq(accountApplicationsTable.userId, user.id))
    .orderBy(desc(accountApplicationsTable.createdAt))
    .limit(1);

  const openStatuses = ["pending", "confirmed", "rescheduled"];
  if (existingApp && openStatuses.includes(existingApp.status)) {
    res.status(400).json({ error: "Ou deja gen yon randevou an kou" });
    return;
  }

  const { firstName, lastName, phone, nationalId, appointmentDate, appointmentTime } = req.body as {
    firstName: string;
    lastName: string;
    phone: string;
    nationalId: string;
    appointmentDate: string;
    appointmentTime: string;
  };

  if (!firstName || !lastName || !phone || !nationalId || !appointmentDate || !appointmentTime) {
    res.status(400).json({ error: "Tout chan obligatwa dwe ranpli" });
    return;
  }

  const [app] = await db
    .insert(accountApplicationsTable)
    .values({ userId: user.id, firstName, lastName, phone, nationalId, appointmentDate, appointmentTime })
    .returning();

  res.status(201).json(formatApplication(app));
});

export default router;
