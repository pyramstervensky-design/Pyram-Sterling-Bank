import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const loanStatusEnum = pgEnum("loan_status", ["pending", "approved", "rejected", "repaid", "late", "defaulted"]);

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  status: loanStatusEnum("status").notNull().default("pending"),
  amountRepaid: numeric("amount_repaid", { precision: 15, scale: 2 }).notNull().default("0.00"),
  interestRate: numeric("interest_rate", { precision: 5, scale: 4 }).notNull().default("0.05"),
  totalRepaymentAmount: numeric("total_repayment_amount", { precision: 15, scale: 2 }),
  weeklyPaymentAmount: numeric("weekly_payment_amount", { precision: 15, scale: 2 }),
  durationWeeks: integer("duration_weeks").notNull().default(12),
  nextPaymentDue: timestamp("next_payment_due", { withTimezone: true }),
  latePayments: integer("late_payments").notNull().default(0),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
