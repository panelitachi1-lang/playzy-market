import { Router, type IRouter } from "express";
import { eq, gt, and, sql } from "drizzle-orm";
import { db, usersTable, listingsTable, listingPinsTable, PIN_PRICES } from "@workspace/db";
import { requireAuth, ensureUser } from "./users";

const router: IRouter = Router();

// GET /pins/prices
router.get("/pins/prices", (_req, res): void => {
  const prices = Object.entries(PIN_PRICES).map(([hours, kopecks]) => ({
    hours: parseInt(hours),
    kopecks,
    rub: kopecks / 100,
    label: hours === "1" ? "1 час" : hours === "5" ? "5 часов" : hours === "10" ? "10 часов" : "24 часа",
  }));
  res.json(prices);
});

// POST /listings/:id/pin — pin a listing
router.post("/listings/:id/pin", requireAuth, async (req: any, res): Promise<void> => {
  const listingId = parseInt(req.params.id);
  const hours = parseInt(req.body.hours);

  const validHours = [1, 5, 10, 24];
  if (!validHours.includes(hours)) {
    res.status(400).json({ error: `hours must be one of: ${validHours.join(", ")}` });
    return;
  }

  const amountPaid = PIN_PRICES[hours];

  // Verify listing ownership
  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, listingId))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing.sellerId !== req.userId) {
    res.status(403).json({ error: "You can only pin your own listings" });
    return;
  }

  // Check if already pinned (active pin exists)
  const now = new Date();
  const [activePing] = await db
    .select()
    .from(listingPinsTable)
    .where(
      and(
        eq(listingPinsTable.listingId, listingId),
        gt(listingPinsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (activePing) {
    res.status(409).json({
      error: "Listing is already pinned",
      expiresAt: activePing.expiresAt.toISOString(),
    });
    return;
  }

  // Check user balance
  const user = await ensureUser(req.userId);
  if (user.balance < amountPaid) {
    res.status(400).json({
      error: "Insufficient balance",
      required: amountPaid,
      balance: user.balance,
    });
    return;
  }

  // Deduct balance
  await db
    .update(usersTable)
    .set({ balance: sql`balance - ${amountPaid}` })
    .where(eq(usersTable.clerkId, req.userId));

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const [pin] = await db
    .insert(listingPinsTable)
    .values({ listingId, clerkId: req.userId, hours, amountPaid, expiresAt })
    .returning();

  res.status(201).json({
    ...pin,
    expiresAt: pin.expiresAt.toISOString(),
  });
});

// GET /listings/:id/pin — check if listing is pinned
router.get("/listings/:id/pin", async (req, res): Promise<void> => {
  const listingId = parseInt(req.params.id);
  const now = new Date();

  const [pin] = await db
    .select()
    .from(listingPinsTable)
    .where(
      and(
        eq(listingPinsTable.listingId, listingId),
        gt(listingPinsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!pin) {
    res.json({ pinned: false });
    return;
  }

  res.json({ pinned: true, expiresAt: pin.expiresAt.toISOString(), hours: pin.hours });
});

export default router;
