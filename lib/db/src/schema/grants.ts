import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const grantsTable = pgTable("grants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  funder: text("funder").notNull(),
  amount: integer("amount"),
  deadline: text("deadline"),
  eligibility: text("eligibility").notNull(),
  focusArea: text("focus_area").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGrantSchema = createInsertSchema(grantsTable).omit({ id: true, createdAt: true });
export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grantsTable.$inferSelect;
