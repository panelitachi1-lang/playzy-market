import { mysqlTable, text, serial, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = mysqlTable("conversations", {
  id: serial("id").primaryKey(),
  listingId: int("listing_id"),
  buyerId: text("buyer_id").notNull(), // clerk user id
  sellerId: text("seller_id").notNull(), // clerk user id
  // null | completed | failed — set by either party after the deal
  dealStatus: text("deal_status"),
  dealMarkedBy: text("deal_marked_by"), // clerk_id of who marked the deal
  dealMarkedAt: timestamp("deal_marked_at"),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).$onUpdate(() => new Date()),
});

export const messagesTable = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: int("conversation_id").notNull(),
  senderId: text("sender_id").notNull(), // clerk user id
  text: text("text").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().default(new Date()),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
