import { mysqlTable, text, serial, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = mysqlTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("sell"), // sell | buy
  price: int("price").notNull().default(0),
  currency: text("currency").notNull().default("RUB"),
  category: text("category"),
  condition: text("condition"),
  imageUrl: text("image_url"),
  imagesJson: text("images_json"),
  secretData: text("secret_data"),
  secretType: text("secret_type").default("credentials"), // JSON array of image URLs (up to 10)
  status: text("status").notNull().default("pending"), // pending | active | sold | closed | rejected
  city: text("city"),
  views: int("views").notNull().default(0),
  sellerId: text("seller_id").notNull(), // clerk user id
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).$onUpdate(() => new Date()),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true, updatedAt: true, views: true });
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
