import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  usersTable,
  listingsTable,
  paymentReceiptsTable,
  withdrawalRequestsTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "./users";

const router: IRouter = Router();

// ── Multer for receipt uploads ──────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads", "receipts");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ── Admin middleware ─────────────────────────────────────────────────────────
export async function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Check env override (bootstrap / owner override)
  const adminIds = (process.env.ADMIN_CLERK_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (adminIds.includes(req.userId)) {
    next();
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId)).limit(1);
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  next();
}

// ── Bootstrap: first admin setup ────────────────────────────────────────────
// POST /admin/bootstrap  { secret: string }
router.post("/admin/bootstrap", requireAuth, async (req: any, res): Promise<void> => {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!secret || req.body?.secret !== secret) {
    res.status(403).json({ error: "Invalid secret" });
    return;
  }
  // Only if no admins yet
  const [existingAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.isAdmin, true))
    .limit(1);
  if (existingAdmin) {
    res.status(409).json({ error: "Admin already exists. Use Telegram bot to grant access." });
    return;
  }
  const user = await ensureUser(req.userId);
  await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.clerkId, req.userId));
  res.json({ ok: true, userId: user.clerkId, message: "You are now admin!" });
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const [users] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [listings] = await db.select({ count: sql<number>`count(*)` }).from(listingsTable);
  const [pendingReceipts] = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentReceiptsTable)
    .where(eq(paymentReceiptsTable.status, "pending"));
  const [pendingWithdrawals] = await db
    .select({ count: sql<number>`count(*)` })
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.status, "pending"));
  const [totalBalanceResult] = await db
    .select({ total: sql<number>`coalesce(sum(balance), 0)` })
    .from(usersTable);

  res.json({
    totalUsers: users.count,
    totalListings: listings.count,
    pendingReceipts: pendingReceipts.count,
    pendingWithdrawals: pendingWithdrawals.count,
    totalBalanceKopecks: totalBalanceResult.total,
  });
});

// ── Receipts ─────────────────────────────────────────────────────────────────
router.get("/admin/receipts", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const status = (req.query.status as string) ?? "pending";
  const page = parseInt(req.query.page as string ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = status === "all" ? undefined : eq(paymentReceiptsTable.status, status);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentReceiptsTable)
    .where(where);

  const rows = await db
    .select()
    .from(paymentReceiptsTable)
    .where(where)
    .orderBy(desc(paymentReceiptsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with user info
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.clerkId)).limit(1);
      return {
        ...r,
        username: user?.username ?? r.clerkId,
        displayName: user?.displayName ?? null,
      };
    }),
  );

  res.json({ items: enriched, total: count, page, limit });
});

// PATCH /admin/receipts/:id — approve or reject
router.patch("/admin/receipts/:id", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { action, adminNote } = req.body as { action: "approve" | "reject"; adminNote?: string };

  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be approve or reject" });
    return;
  }

  const [receipt] = await db.select().from(paymentReceiptsTable).where(eq(paymentReceiptsTable.id, id)).limit(1);
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  if (receipt.status !== "pending") {
    res.status(409).json({ error: "Already processed" });
    return;
  }

  await db
    .update(paymentReceiptsTable)
    .set({
      status: action === "approve" ? "approved" : "rejected",
      adminNote: adminNote ?? null,
      reviewedBy: req.userId,
      reviewedAt: new Date(),
    })
    .where(eq(paymentReceiptsTable.id, id));

  if (action === "approve") {
    await db
      .update(usersTable)
      .set({ balance: sql`balance + ${receipt.amount}` })
      .where(eq(usersTable.clerkId, receipt.clerkId));
  }

  res.json({ ok: true });
});

// ── Withdrawal Requests ───────────────────────────────────────────────────────
router.get("/admin/withdrawals", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const status = (req.query.status as string) ?? "pending";
  const page = parseInt(req.query.page as string ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = status === "all" ? undefined : eq(withdrawalRequestsTable.status, status);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(withdrawalRequestsTable)
    .where(where);

  const rows = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(where)
    .orderBy(desc(withdrawalRequestsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, r.clerkId)).limit(1);
      return { ...r, username: user?.username ?? r.clerkId, displayName: user?.displayName ?? null };
    }),
  );

  res.json({ items: enriched, total: count, page, limit });
});

// PATCH /admin/withdrawals/:id
router.patch("/admin/withdrawals/:id", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { action, adminNote } = req.body as { action: "complete" | "reject"; adminNote?: string };

  if (!["complete", "reject"].includes(action)) {
    res.status(400).json({ error: "action must be complete or reject" });
    return;
  }

  const [wr] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id)).limit(1);
  if (!wr) { res.status(404).json({ error: "Not found" }); return; }
  if (!["pending", "processing"].includes(wr.status)) {
    res.status(409).json({ error: "Already finalized" });
    return;
  }

  if (action === "reject") {
    // Refund the amount back to user balance
    await db
      .update(usersTable)
      .set({ balance: sql`balance + ${wr.amount}` })
      .where(eq(usersTable.clerkId, wr.clerkId));
  }

  await db
    .update(withdrawalRequestsTable)
    .set({
      status: action === "complete" ? "completed" : "rejected",
      adminNote: adminNote ?? null,
      processedBy: req.userId,
      processedAt: new Date(),
    })
    .where(eq(withdrawalRequestsTable.id, id));

  res.json({ ok: true });
});

// ── Users management ─────────────────────────────────────────────────────────
router.get("/admin/users", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const page = parseInt(req.query.page as string ?? "1");
  const q = req.query.q as string | undefined;
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = q
    ? sql`username ILIKE ${"%" + q + "%"} OR display_name ILIKE ${"%" + q + "%"}`
    : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(where);

  const rows = await db
    .select()
    .from(usersTable)
    .where(where)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ items: rows, total: count, page, limit });
});

// PATCH /admin/users/:clerkId
router.patch("/admin/users/:clerkId", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const { clerkId } = req.params;
  const { action } = req.body as { action: "ban" | "unban" | "grant_admin" | "revoke_admin" };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (action === "ban") updates.isBanned = true;
  else if (action === "unban") updates.isBanned = false;
  else if (action === "grant_admin") updates.isAdmin = true;
  else if (action === "revoke_admin") updates.isAdmin = false;
  else { res.status(400).json({ error: "Invalid action" }); return; }

  await db.update(usersTable).set(updates).where(eq(usersTable.clerkId, clerkId));
  res.json({ ok: true });
});

// ── Listings management ───────────────────────────────────────────────────────
router.get("/admin/listings", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const page = parseInt(req.query.page as string ?? "1");
  const status = (req.query.status as string) || "pending";
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = status === "all" ? undefined : eq(listingsTable.status, status);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listingsTable)
    .where(where);

  const rows = await db
    .select()
    .from(listingsTable)
    .where(where)
    .orderBy(desc(listingsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with seller info
  const items = await Promise.all(
    rows.map(async (l) => {
      const [seller] = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
        .from(usersTable)
        .where(eq(usersTable.clerkId, l.sellerId))
        .limit(1);
      return { ...l, sellerName: seller?.displayName ?? seller?.username ?? null, sellerAvatarUrl: seller?.avatarUrl ?? null, secretData: l.secretData ?? null };
    })
  );

  res.json({ items, total: count, page, limit });
});

// PATCH /admin/listings/:id — approve or reject
router.patch("/admin/listings/:id", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { action } = req.body as { action: "approve" | "reject" };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }

  const newStatus = action === "approve" ? "active" : "rejected";
  await db.update(listingsTable).set({ status: newStatus }).where(eq(listingsTable.id, id));
  res.json({ ok: true, status: newStatus });
});

router.delete("/admin/listings/:id", requireAuth, requireAdmin, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.update(listingsTable).set({ status: "closed" }).where(eq(listingsTable.id, id));
  res.json({ ok: true });
});

export default router;
