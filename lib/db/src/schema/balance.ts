import { mysqlTable, text, serial, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Payment receipt — user tops up balance by sending money and uploading a receipt
export const paymentReceiptsTable = mysqlTable("payment_receipts", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  // Amount in kopecks
  amount: int("amount").notNull(),
  receiptImageUrl: text("receipt_image_url").notNull(),
  // pending | approved | rejected
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedBy: text("reviewed_by"), // clerk_id of admin
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).$onUpdate(() => new Date()),
});

export const insertPaymentReceiptSchema = createInsertSchema(paymentReceiptsTable).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true });
export type InsertPaymentReceipt = z.infer<typeof insertPaymentReceiptSchema>;
export type PaymentReceipt = typeof paymentReceiptsTable.$inferSelect;

// Withdrawal request — user requests to withdraw their balance to a bank card
export const withdrawalRequestsTable = mysqlTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull(),
  // Amount requested in kopecks
  amount: int("amount").notNull(),
  // 6% platform fee in kopecks
  fee: int("fee").notNull(),
  // Net amount user receives
  netAmount: int("net_amount").notNull(),
  cardNumber: text("card_number").notNull(),
  cardBank: text("card_bank").notNull(),
  // pending | processing | completed | rejected
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  processedBy: text("processed_by"), // clerk_id of admin
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().default(new Date()),
  updatedAt: timestamp("updated_at").notNull().default(new Date()).$onUpdate(() => new Date()),
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequestsTable).omit({ id: true, createdAt: true, updatedAt: true, processedAt: true });
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
