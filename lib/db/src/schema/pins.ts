import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingPinsTable = pgTable("listing_pins", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  clerkId: text("clerk_id").notNull(),
  hours: integer("hours").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertListingPinSchema = createInsertSchema(listingPinsTable).omit({ id: true, createdAt: true });
export type InsertListingPin = z.infer<typeof insertListingPinSchema>;
export type ListingPin = typeof listingPinsTable.$inferSelect;

export const PIN_PRICES: Record<number, number> = {
  1: 5_000,
  5: 15_000,
  10: 25_000,
  24: 50_000,
};