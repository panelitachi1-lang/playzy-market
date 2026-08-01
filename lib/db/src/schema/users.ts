import { mysqlTable, text, serial, int, real, boolean, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = mysqlTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  city: text("city"),
  rating: real("rating"),
  totalSales: int("total_sales").notNull().default(0),
  totalPurchases: int("total_purchases").notNull().default(0),
  balance: int("balance").notNull().default(0),
  isBanned: boolean("is_banned").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
