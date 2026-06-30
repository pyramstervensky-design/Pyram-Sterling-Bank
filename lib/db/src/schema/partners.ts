import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const partnerStatusEnum = pgEnum("partner_status", ["pending", "approved", "rejected"]);

export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  description: text("description"),
  status: partnerStatusEnum("status").notNull().default("pending"),
  onboardingFee: numeric("onboarding_fee", { precision: 15, scale: 2 }).notNull().default("50.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPartnerSchema = createInsertSchema(partnersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partnersTable.$inferSelect;
