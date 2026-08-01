import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("sell"),
  price: integer("price").notNull().default(0),
  currency: text("currency").notNull().default("RUB"),
  category: text("category"),
  condition: text("condition"),
  imageUrl: text("image_url"),
  imagesJson: text("images_json"),
  secretData: text("secret_data"),
  secretType: text("secret_type").default("credentials"),
  status: text("status").notNull().default("pending"),
  city: text("city"),
  views: integer("views").notNull().default(0),
  sellerId: text("seller_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true, views: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;