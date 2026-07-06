import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Insert a notification for every admin user so new customer actions surface
 * immediately in the admin panel (via the shared per-user notifications feed).
 *
 * Best-effort: admin notification must never fail the underlying customer
 * action, so all errors are swallowed and logged instead of thrown.
 */
export async function notifyAdmins(input: { title: string; message: string; type?: string }) {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if (admins.length === 0) return;

    await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        title: input.title,
        message: input.message,
        type: input.type ?? "info",
        isRead: false,
      })),
    );
  } catch (err) {
    logger.error({ err }, "notifyAdmins failed");
  }
}
