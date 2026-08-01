import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, gte, lte, or, sql, gt } from "drizzle-orm";
import { db, listingsTable, usersTable, listingPinsTable } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  GetListingsQueryParams,
  CreateListingBody,
  GetListingParams,
  UpdateListingParams,
  UpdateListingBody,
  DeleteListingParams,
  GetUserListingsParams,
  GetTrendingListingsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, ensureUser } from "./users";

// ── Multer for listing images ─────────────────────────────────────────────────
const listingImagesDir = path.join(process.cwd(), "uploads", "listings");
fs.mkdirSync(listingImagesDir, { recursive: true });

const listingImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, listingImagesDir),
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only"));
  },
});

const router: IRouter = Router();

// POST /listings/upload-image
router.post("/listings/upload-image", requireAuth, listingImageUpload.single("image"), async (req: any, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({ imageUrl: `/api/uploads/listings/${req.file.filename}` });
});

async function enrichListing(listing: any) {
  const [seller] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, listing.sellerId))
    .limit(1);
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    price: listing.price,
    currency: listing.currency,
    category: listing.category,
    condition: listing.condition,
    imageUrl: listing.imageUrl,
    imagesJson: listing.imagesJson ? JSON.parse(listing.imagesJson) : [],
    status: listing.status,
    city: listing.city,
    views: listing.views,
    sellerId: listing.sellerId,
    sellerName: seller?.displayName ?? seller?.username ?? null,
    sellerAvatarUrl: seller?.avatarUrl ?? null,
    createdAt: listing.createdAt.toISOString(),
    secretData: listing.secretData ?? null,
    secretType: listing.secretType ?? null,
  };
}

// GET /listings
router.get("/listings", async (req, res): Promise<void> => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, category, q, minPrice, maxPrice, page = 1, limit = 20 } = parsed.data;

  const conditions = [];
  if (type && type !== "all") conditions.push(eq(listingsTable.type, type));
  if (category) conditions.push(eq(listingsTable.category, category));
  if (q) conditions.push(or(like(listingsTable.title, `%${q}%`), like(listingsTable.description ?? "", `%${q}%`)));
  if (minPrice != null) conditions.push(gte(listingsTable.price, minPrice));
  if (maxPrice != null) conditions.push(lte(listingsTable.price, maxPrice));
  conditions.push(eq(listingsTable.status, "active"));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listingsTable)
    .where(whereClause);

  const offset = ((page ?? 1) - 1) * (limit ?? 20);
  const rows = await db
    .select()
    .from(listingsTable)
    .where(whereClause)
    .orderBy(desc(listingsTable.createdAt))
    .limit(limit ?? 20)
    .offset(offset);

  // Attach pin info and sort pinned first
  const now = new Date();
  const enrichedWithPins = await Promise.all(
    rows.map(async (listing) => {
      const [pin] = await db
        .select()
        .from(listingPinsTable)
        .where(and(eq(listingPinsTable.listingId, listing.id), gt(listingPinsTable.expiresAt, now)))
        .limit(1);
      return { ...(await enrichListing(listing)), isPinned: !!pin, pinnedUntil: pin?.expiresAt?.toISOString() ?? null };
    }),
  );
  enrichedWithPins.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  res.json({ items: enrichedWithPins, total: countResult.count, page: page ?? 1, limit: limit ?? 20 });
});

// POST /listings
router.post("/listings", requireAuth, async (req: any, res): Promise<void> => {
  await ensureUser(req.userId);
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [listing] = await db
    .insert(listingsTable)
    .values({ ...parsed.data, sellerId: req.userId, status: "pending" })
    .returning();
  res.status(201).json(await enrichListing(listing));
});

// GET /listings/my — must be before /:id
router.get("/listings/my", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.sellerId, req.userId))
    .orderBy(desc(listingsTable.createdAt));
  const items = await Promise.all(rows.map(enrichListing));
  res.json(items);
});

// GET /listings/trending — must be before /:id
router.get("/listings/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingListingsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 12) : 12;
  const rows = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.status, "active"))
    .orderBy(desc(listingsTable.createdAt))
    .limit(limit);
  const items = await Promise.all(rows.map(enrichListing));
  res.json(items);
});

// GET /listings/categories — must be before /:id
router.get("/listings/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      name: listingsTable.category,
      count: sql<number>`count(*)`,
    })
    .from(listingsTable)
    .where(and(eq(listingsTable.status, "active"), sql`${listingsTable.category} IS NOT NULL`))
    .groupBy(listingsTable.category)
    .orderBy(desc(sql`count(*)`))
    .limit(20);
  res.json(rows.map((r) => ({ name: r.name ?? "", count: r.count })));
});

// GET /listings/user/:userId — must be before /:id
router.get("/listings/user/:userId", async (req, res): Promise<void> => {
  const parsed = GetUserListingsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.sellerId, parsed.data.userId), eq(listingsTable.status, "active")))
    .orderBy(desc(listingsTable.createdAt));
  const items = await Promise.all(rows.map(enrichListing));
  res.json(items);
});

// GET /listings/:id
router.get("/listings/:id", async (req, res): Promise<void> => {
  const parsed = GetListingParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, parsed.data.id))
    .limit(1);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  // Increment views
  await db
    .update(listingsTable)
    .set({ views: listing.views + 1 })
    .where(eq(listingsTable.id, listing.id));
  res.json(await enrichListing({ ...listing, views: listing.views + 1 }));
});

// PATCH /listings/:id
router.patch("/listings/:id", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdateListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (existing.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [updated] = await db
    .update(listingsTable)
    .set(parsed.data)
    .where(eq(listingsTable.id, params.data.id))
    .returning();
  res.json(await enrichListing(updated));
});

// DELETE /listings/:id
router.delete("/listings/:id", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = DeleteListingParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, parsed.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (existing.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(listingsTable).where(eq(listingsTable.id, parsed.data.id));
  res.sendStatus(204);
});

// POST /listings/:id/buy
router.post("/listings/:id/buy", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const buyer = await ensureUser(req.userId);
  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id)).limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing.status !== "active") { res.status(400).json({ error: "Listing is not available" }); return; }
  if (listing.sellerId === req.userId) { res.status(400).json({ error: "Cannot buy your own listing" }); return; }
  if (buyer.balance < listing.price) { res.status(400).json({ error: "Insufficient balance" }); return; }

  await db.update(usersTable).set({ balance: sql`${usersTable.balance} - ${listing.price}` }).where(eq(usersTable.clerkId, req.userId));
  await db.update(usersTable).set({ balance: sql`${usersTable.balance} + ${listing.price}` }).where(eq(usersTable.clerkId, listing.sellerId));
  await db.update(listingsTable).set({ status: "sold" }).where(eq(listingsTable.id, id));
  await db.execute(sql`INSERT INTO purchases (listing_id, buyer_id, seller_id, amount, status) VALUES (${id}, ${req.userId}, ${listing.sellerId}, ${listing.price}, 'completed')`);

  res.json({ ok: true, secretData: listing.secretData ?? null, secretType: listing.secretType ?? "credentials" });
});

export default router;