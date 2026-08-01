import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, listingsTable, usersTable, messagesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const [[totalListings], [activeListings], [totalUsers], [totalMessages], [sellListings], [buyListings], topCategories] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(listingsTable),
      db.select({ count: sql<number>`count(*)` }).from(listingsTable).where(eq(listingsTable.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(messagesTable),
      db.select({ count: sql<number>`count(*)` }).from(listingsTable).where(eq(listingsTable.type, "sell")),
      db.select({ count: sql<number>`count(*)` }).from(listingsTable).where(eq(listingsTable.type, "buy")),
      db
        .select({ name: listingsTable.category, count: sql<number>`count(*)` })
        .from(listingsTable)
        .where(sql`${listingsTable.category} IS NOT NULL`)
        .groupBy(listingsTable.category)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
    ]);

  res.json({
    totalListings: totalListings.count,
    activeListings: activeListings.count,
    totalUsers: totalUsers.count,
    totalMessages: totalMessages.count,
    sellListings: sellListings.count,
    buyListings: buyListings.count,
    topCategories: topCategories.map((r) => ({ name: r.name ?? "", count: r.count })),
  });
});

export default router;
