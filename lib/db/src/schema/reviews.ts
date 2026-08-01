import { mysqlTable, text, serial, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Review — can only be left after a deal is marked completed or failed
export const reviewsTable = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: text("reviewer_id").notNull(),   // clerk_id of the reviewer
  reviewedUserId: text("reviewed_user_id").notNull(), // clerk_id of the reviewed user
  conversationId: int("conversation_id").notNull(),
  // 1–5 stars
  rating: int("rating").notNull(),
  comment: text("comment"),
  // success | fail — outcome of the deal
  dealStatus: text("deal_status").notNull(),
  createdAt: timestamp("created_at").notNull().default(new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
