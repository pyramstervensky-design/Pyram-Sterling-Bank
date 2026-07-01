import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const creditScoreHistoryTable = pgTable("credit_score_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  previousScore: integer("previous_score").notNull(),
  newScore: integer("new_score").notNull(),
  change: integer("change").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreditScoreHistory = typeof creditScoreHistoryTable.$inferSelect;
