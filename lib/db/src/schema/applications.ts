import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "approved",
  "rejected",
  "confirmed",
  "rescheduled",
  "completed",
]);

export const accountApplicationsTable = pgTable("account_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  nationalId: text("national_id").notNull(),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  status: applicationStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  rescheduledAt: timestamp("rescheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertApplicationSchema = createInsertSchema(accountApplicationsTable).omit({
  id: true, createdAt: true, approvedAt: true, rejectedAt: true,
  confirmedAt: true, rescheduledAt: true, completedAt: true, rejectionReason: true,
});
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type AccountApplication = typeof accountApplicationsTable.$inferSelect;
