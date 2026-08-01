import { mysqlTable, text, serial, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Listing pin — user pays from balance to pin/feature their listing
export const listingPinsTable = mysqlTable("listing_pins", {
  id: serial("id").primaryKey(),
  listingId: int("listing_id").notNull(),
  clerkId: text("clerk_id").notNull(),
  // 1 | 5 | 10 | 24
  hours: int("hours").notNull(),
  // Amount paid in kopecks
  amountPaid: int("amount_paid").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(new Date()),
});

export const insertListingPinSchema = createInsertSchema(listingPinsTable).omit({ id: true, createdAt: true });
export type InsertListingPin = z.infer<typeof insertListingPinSchema>;
export type ListingPin = typeof listingPinsTable.$inferSelect;

// Pin price table (in kopecks)
export const PIN_PRICES: Record<number, number> = {
  1: 5_000,   // 50 RUB
  5: 15_000,  // 150 RUB
  10: 25_000, // 250 RUB
  24: 50_000, // 500 RUB
};
