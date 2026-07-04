import { Router, type Request } from "express";
import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthReq = Request & { dbUser: typeof usersTable.$inferSelect };

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    type: n.type,
    createdAt: n.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt));
  res.json(notifications.map(formatNotification));
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  const id = parseInt(req.params["id"] as string);

  const [notif] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, id));

  if (!notif || notif.userId !== user.id) {
    res.status(404).json({ error: "Notifikasyon pa jwenn" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, id))
    .returning();

  res.json(formatNotification(updated));
});

router.post("/read-all", requireAuth, async (req, res) => {
  const user = (req as AuthReq).dbUser;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ success: true });
});

export default router;
