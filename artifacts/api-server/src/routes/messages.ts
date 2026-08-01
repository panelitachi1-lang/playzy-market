import { Router, type IRouter } from "express";
import { eq, or, and, desc, sql, isNull } from "drizzle-orm";
import { db, conversationsTable, messagesTable, listingsTable, usersTable } from "@workspace/db";
import {
  CreateConversationBody,
  GetMessagesParams,
  SendMessageParams,
  SendMessageBody,
  MarkConversationReadParams,
} from "@workspace/api-zod";
import { requireAuth } from "./users";

const router: IRouter = Router();

async function enrichConversation(conv: any, currentUserId: string) {
  const listing = conv.listingId
    ? await db.select().from(listingsTable).where(eq(listingsTable.id, conv.listingId)).limit(1).then(r => r[0])
    : null;

  const otherUserId = conv.buyerId === currentUserId ? conv.sellerId : conv.buyerId;
  const otherUser = await db.select().from(usersTable).where(eq(usersTable.clerkId, otherUserId)).limit(1).then(r => r[0]);

  const [lastMsg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  const [unreadResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, conv.id),
        isNull(messagesTable.readAt),
        sql`${messagesTable.senderId} != ${currentUserId}`
      )
    );

  return {
    id: conv.id,
    listingId: conv.listingId,
    buyerId: conv.buyerId,
    sellerId: conv.sellerId,
    listingTitle: listing?.title ?? null,
    listingImageUrl: listing?.imageUrl ?? null,
    otherUserName: otherUser?.displayName ?? otherUser?.username ?? null,
    otherUserAvatarUrl: otherUser?.avatarUrl ?? null,
    lastMessage: lastMsg?.text ?? null,
    lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
    unreadCount: unreadResult?.count ?? 0,
    createdAt: conv.createdAt.toISOString(),
  };
}

// GET /conversations
router.get("/conversations", requireAuth, async (req: any, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.buyerId, req.userId),
        eq(conversationsTable.sellerId, req.userId),
      )
    )
    .orderBy(desc(conversationsTable.updatedAt));

  const enriched = await Promise.all(rows.map((c) => enrichConversation(c, req.userId)));
  res.json(enriched);
});

// POST /conversations
router.post("/conversations", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { otherUserId, listingId } = parsed.data;

  // Find or create conversation
  const existing = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        listingId ? eq(conversationsTable.listingId, listingId) : isNull(conversationsTable.listingId),
        or(
          and(eq(conversationsTable.buyerId, req.userId), eq(conversationsTable.sellerId, otherUserId)),
          and(eq(conversationsTable.buyerId, otherUserId), eq(conversationsTable.sellerId, req.userId)),
        )
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(201).json(await enrichConversation(existing[0], req.userId));
    return;
  }

  const [created] = await db
    .insert(conversationsTable)
    .values({
      listingId: listingId ?? null,
      buyerId: req.userId,
      sellerId: otherUserId,
    })
    .returning();

  res.status(201).json(await enrichConversation(created, req.userId));
});

// GET /conversations/unread-count — must be before /:conversationId/
router.get("/conversations/unread-count", requireAuth, async (req: any, res): Promise<void> => {
  const myConvs = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.buyerId, req.userId),
        eq(conversationsTable.sellerId, req.userId),
      )
    );

  const convIds = myConvs.map((c) => c.id);
  if (convIds.length === 0) {
    res.json({ count: 0 });
    return;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messagesTable)
    .where(
      and(
        sql`${messagesTable.conversationId} = ANY(${sql`ARRAY[${sql.join(convIds.map(id => sql`${id}`), sql`, `)}][]`})`,
        isNull(messagesTable.readAt),
        sql`${messagesTable.senderId} != ${req.userId}`
      )
    );

  res.json({ count: result?.count ?? 0 });
});

// GET /conversations/:conversationId — single conversation detail (dealStatus etc.)
router.get("/conversations/:conversationId", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.conversationId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.buyerId !== req.userId && conv.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  res.json({
    id: conv.id,
    buyerId: conv.buyerId,
    sellerId: conv.sellerId,
    listingId: conv.listingId,
    dealStatus: conv.dealStatus ?? null,
    dealMarkedBy: conv.dealMarkedBy ?? null,
    dealMarkedAt: conv.dealMarkedAt ? conv.dealMarkedAt.toISOString() : null,
    createdAt: conv.createdAt.toISOString(),
  });
});

// GET /conversations/:conversationId/messages
router.get("/conversations/:conversationId/messages", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = GetMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, parsed.data.conversationId))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  if (conv.buyerId !== req.userId && conv.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, parsed.data.conversationId))
    .orderBy(messagesTable.createdAt);

  const enriched = await Promise.all(
    rows.map(async (msg) => {
      const sender = await db.select().from(usersTable).where(eq(usersTable.clerkId, msg.senderId)).limit(1).then(r => r[0]);
      return {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: sender?.displayName ?? sender?.username ?? null,
        senderAvatarUrl: sender?.avatarUrl ?? null,
        text: msg.text,
        createdAt: msg.createdAt.toISOString(),
      };
    })
  );

  res.json(enriched);
});

// POST /conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", requireAuth, async (req: any, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.conversationId))
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  if (conv.buyerId !== req.userId && conv.sellerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      conversationId: params.data.conversationId,
      senderId: req.userId,
      text: parsed.data.text,
    })
    .returning();

  // Touch conversation updatedAt
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, params.data.conversationId));

  const sender = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId)).limit(1).then(r => r[0]);

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: sender?.displayName ?? sender?.username ?? null,
    senderAvatarUrl: sender?.avatarUrl ?? null,
    text: msg.text,
    createdAt: msg.createdAt.toISOString(),
  });
});

// POST /conversations/:conversationId/read
router.post("/conversations/:conversationId/read", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = MarkConversationReadParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, parsed.data.conversationId),
        isNull(messagesTable.readAt),
        sql`${messagesTable.senderId} != ${req.userId}`
      )
    );

  res.json({ status: "ok" });
});

export default router;
