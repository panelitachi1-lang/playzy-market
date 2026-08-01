import { Router, type IRouter } from "express";
import { eq, desc, or, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  db,
  usersTable,
  paymentReceiptsTable,
  withdrawalRequestsTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "./users";

const router: IRouter = Router();

const WITHDRAWAL_FEE_PERCENT = 6;
const MIN_WITHDRAWAL_KOPECKS = 20_000; // 200 RUB minimum

// ── Multer for receipt image uploads ────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), "uploads", "receipts");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /balance — current user's balance info
router.get("/balance", requireAuth, async (req: any, res): Promise<void> => {
  const user = await ensureUser(req.userId);
  const platformCards = [
    { bank: "Озон Банк", number: process.env.PLATFORM_CARD_OZON ?? "" },
    { bank: "Monobank", number: process.env.PLATFORM_CARD_MONO ?? "" },
  ].filter((c) => c.number);

  res.json({
    balance: user.balance,
    balanceRub: (user.balance / 100).toFixed(2),
    platformCards,
    withdrawalFeePercent: WITHDRAWAL_FEE_PERCENT,
    minWithdrawalKopecks: MIN_WITHDRAWAL_KOPECKS,
  });
});

// GET /balance/history — receipts + withdrawals for current user
router.get("/balance/history", requireAuth, async (req: any, res): Promise<void> => {
  const receipts = await db
    .select()
    .from(paymentReceiptsTable)
    .where(eq(paymentReceiptsTable.clerkId, req.userId))
    .orderBy(desc(paymentReceiptsTable.createdAt))
    .limit(50);

  const withdrawals = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.clerkId, req.userId))
    .orderBy(desc(withdrawalRequestsTable.createdAt))
    .limit(50);

  res.json({ receipts, withdrawals });
});

// POST /balance/deposit — upload receipt for balance top-up
router.post(
  "/balance/deposit",
  requireAuth,
  upload.single("receipt"),
  async (req: any, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Receipt image required" });
      return;
    }

    const amount = parseInt(req.body.amount);
    if (!amount || amount < 1000) {
      // Delete uploaded file
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: "Minimum deposit is 10 RUB (1000 kopecks)" });
      return;
    }

    // Check for duplicate pending receipt (spam protection)
    const [existing] = await db
      .select()
      .from(paymentReceiptsTable)
      .where(
        eq(paymentReceiptsTable.clerkId, req.userId),
      )
      .orderBy(desc(paymentReceiptsTable.createdAt))
      .limit(1);

    if (existing && existing.status === "pending") {
      const ageMs = Date.now() - existing.createdAt.getTime();
      if (ageMs < 30 * 60 * 1000) {
        // 30 min cooldown
        fs.unlink(req.file.path, () => {});
        res.status(429).json({ error: "You already have a pending receipt. Please wait for it to be reviewed." });
        return;
      }
    }

    const receiptImageUrl = `/api/uploads/receipts/${req.file.filename}`;

    const [receipt] = await db
      .insert(paymentReceiptsTable)
      .values({ clerkId: req.userId, amount, receiptImageUrl, status: "pending" })
      .returning();

    res.status(201).json(receipt);
  },
);

// POST /balance/withdraw — request withdrawal
router.post("/balance/withdraw", requireAuth, async (req: any, res): Promise<void> => {
  const { amount, cardNumber, cardBank } = req.body as {
    amount: number;
    cardNumber: string;
    cardBank: string;
  };

  if (!amount || !cardNumber || !cardBank) {
    res.status(400).json({ error: "amount, cardNumber and cardBank are required" });
    return;
  }

  if (amount < MIN_WITHDRAWAL_KOPECKS) {
    res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL_KOPECKS / 100} RUB` });
    return;
  }

  const user = await ensureUser(req.userId);
  if (user.balance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Check no pending withdrawal
  const [pendingWr] = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(
      eq(withdrawalRequestsTable.clerkId, req.userId),
    )
    .orderBy(desc(withdrawalRequestsTable.createdAt))
    .limit(1);

  if (pendingWr && ["pending", "processing"].includes(pendingWr.status)) {
    res.status(429).json({ error: "You already have a pending withdrawal request." });
    return;
  }

  const fee = Math.ceil(amount * WITHDRAWAL_FEE_PERCENT / 100);
  const netAmount = amount - fee;

  // Deduct balance immediately
  await db
    .update(usersTable)
    .set({ balance: sql`balance - ${amount}` })
    .where(eq(usersTable.clerkId, req.userId));

  const [wr] = await db
    .insert(withdrawalRequestsTable)
    .values({
      clerkId: req.userId,
      amount,
      fee,
      netAmount,
      cardNumber: cardNumber.replace(/\s/g, ""),
      cardBank,
      status: "pending",
    })
    .returning();

  res.status(201).json(wr);
});

export default router;
