import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentReceiptsTable = pgTable("payment_receipts", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  amount: integer("amount").notNull(),
  receiptImageUrl: text("receipt_image_url").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentReceiptSchema = createInsertSchema(paymentReceiptsTable).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true });
export type InsertPaymentReceipt = z.infer<typeof insertPaymentReceiptSchema>;
export type PaymentReceipt = typeof paymentReceiptsTable.$inferSelect;

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  amount: integer("amount").notNull(),
  fee: integer("fee").notNull(),
  netAmount: integer("net_amount").notNull(),
  cardNumber: text("card_number").notNull(),
  cardBank: text("card_bank").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  processedBy: text("processed_by"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequestsTable).omit({ id: true, createdAt: true, updatedAt: true, processedAt: true });
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;