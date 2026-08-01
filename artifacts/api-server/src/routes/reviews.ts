import { Router, type IRouter } from "express";
import { eq, desc, and, sql, avg } from "drizzle-orm";
import { db, reviewsTable, conversationsTable, usersTable } from "@workspace/db";
import { requireAuth, ensureUser } from "./users";

const router: IRouter = Router();

// GET /users/:userId/reviews
router.get("/users/:userId/reviews", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.reviewedUserId, req.params.userId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(50);

  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [reviewer] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, r.reviewerId))
        .limit(1);
      return {
        ...r,
        reviewerName: reviewer?.displayName ?? reviewer?.username ?? "Аноним",
        reviewerAvatarUrl: reviewer?.avatarUrl ?? null,
      };
    }),
  );

  const [ratingResult] = await db
    .select({ avg: sql<number>`round(avg(rating)::numeric, 1)` })
    .from(reviewsTable)
    .where(eq(reviewsTable.reviewedUserId, req.params.userId));

  res.json({ reviews: enriched, averageRating: ratingResult?.avg ?? null, total: rows.length });
});

// POST /reviews — create review (only after deal marked on conversation)
router.post("/reviews", requireAuth, async (req: any, res): Promise<void> => {
  const { conversationId, rating, comment, dealStatus } = req.body as {
    conversationId: number;
    rating: number;
    comment?: string;
    dealStatus: "success" | "fail";
  };

  if (!conversationId || !rating || !dealStatus) {
    res.status(400).json({ error: "conversationId, rating and dealStatus are required" });
    return;
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  // Verify the conversation exists and user is a participant
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const isBuyer = conv.buyerId === req.userId;
  const isSeller = conv.sellerId === req.userId;

  if (!isBuyer && !isSeller) {
    res.status(403).json({ error: "You are not a participant in this conversation" });
    return;
  }

  // Deal must be marked
  if (!conv.dealStatus) {
    res.status(400).json({ error: "Deal must be marked as completed or failed before leaving a review" });
    return;
  }

  // Determine who is being reviewed
  const reviewedUserId = isBuyer ? conv.sellerId : conv.buyerId;

  // Check if already reviewed
  const [existing] = await db
    .select()
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.reviewerId, req.userId),
        eq(reviewsTable.conversationId, conversationId),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "You already left a review for this deal" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      reviewerId: req.userId,
      reviewedUserId,
      conversationId,
      rating,
      comment: comment ?? null,
      dealStatus,
    })
    .returning();

  // Update user's average rating
  const [ratingResult] = await db
    .select({ avg: sql<number>`round(avg(rating)::numeric, 1)` })
    .from(reviewsTable)
    .where(eq(reviewsTable.reviewedUserId, reviewedUserId));

  if (ratingResult?.avg) {
    await db
      .update(usersTable)
      .set({ rating: ratingResult.avg })
      .where(eq(usersTable.clerkId, reviewedUserId));
  }

  res.status(201).json(review);
});

// PATCH /conversations/:id/deal — mark deal as completed or failed
router.patch("/conversations/:id/deal", requireAuth, async (req: any, res): Promise<void> => {
  const convId = parseInt(req.params.id);
  const { status } = req.body as { status: "completed" | "failed" };

  if (!["completed", "failed"].includes(status)) {
    res.status(400).json({ error: "status must be completed or failed" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  if (conv.buyerId !== req.userId && conv.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (conv.dealStatus) {
    res.status(409).json({ error: "Deal already marked" });
    return;
  }

  await db
    .update(conversationsTable)
    .set({ dealStatus: status, dealMarkedBy: req.userId, dealMarkedAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  res.json({ ok: true });
});

export default router;
