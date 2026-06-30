import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const kaneTable = pgTable("kane", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  accountNumber: text("account_number").notNull().unique(),
  cardNumber: text("card_number").notNull().unique(),
  cardExpiry: text("card_expiry").notNull(),
  cardCvv: text("card_cvv").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  creditScore: integer("credit_score").notNull().default(650),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKaneSchema = createInsertSchema(kaneTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKane = z.infer<typeof insertKaneSchema>;
export type Kane = typeof kaneTable.$inferSelect;
