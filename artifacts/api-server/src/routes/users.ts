import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  UpdateMyProfileBody,
  GetUserProfileParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── Multer for avatar uploads ────────────────────────────────────────────────
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, _file, cb) => {
    const ext = ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Middleware to ensure user exists in DB (JIT provisioning)
async function ensureUser(clerkId: string, fallbackUsername?: string) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);
  if (existing) return existing;

  // Generate a unique username
  let base = fallbackUsername ?? `user_${clerkId.slice(-8)}`;
  // Sanitize: lowercase, only letters/digits/underscore
  base = base.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
  let username = base;
  let suffix = 1;
  while (true) {
    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(username) = ${username.toLowerCase()}`)
      .limit(1);
    if (!taken) break;
    username = `${base}_${suffix++}`;
  }

  const [created] = await db
    .insert(usersTable)
    .values({ clerkId, username })
    .returning();
  return created;
}

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// GET /users/me
router.get("/users/me", requireAuth, async (req: any, res): Promise<void> => {
  const user = await ensureUser(req.userId);
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    rating: user.rating,
    totalSales: user.totalSales,
    totalPurchases: user.totalPurchases,
    balance: user.balance,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt.toISOString(),
  });
});

// PUT /users/me
router.put("/users/me", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await ensureUser(req.userId);

  // Check username uniqueness if it's being changed
  if (parsed.data.username && parsed.data.username.toLowerCase() !== user.username.toLowerCase()) {
    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(username) = ${parsed.data.username.toLowerCase()}`)
      .limit(1);
    if (taken) {
      res.status(409).json({ error: "Этот никнейм уже занят. Выберите другой." });
      return;
    }
  }

  let updated;
  try {
    [updated] = await db
      .update(usersTable)
      .set(parsed.data)
      .where(eq(usersTable.id, user.id))
      .returning();
  } catch (err: any) {
    // Unique constraint violation on username (race condition)
    if (err?.code === "23505" && err?.constraint?.includes("username")) {
      res.status(409).json({ error: "Этот никнейм уже занят. Выберите другой." });
      return;
    }
    throw err;
  }
  res.json({
    id: updated.id,
    clerkId: updated.clerkId,
    username: updated.username,
    displayName: updated.displayName,
    avatarUrl: updated.avatarUrl,
    bio: updated.bio,
    city: updated.city,
    rating: updated.rating,
    totalSales: updated.totalSales,
    totalPurchases: updated.totalPurchases,
    balance: updated.balance,
    isAdmin: updated.isAdmin,
    isBanned: updated.isBanned,
    createdAt: updated.createdAt.toISOString(),
  });
});

// POST /users/me/avatar — upload avatar image
router.post("/users/me/avatar", requireAuth, avatarUpload.single("avatar"), async (req: any, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const user = await ensureUser(req.userId);
  const avatarUrl = `/api/uploads/avatars/${req.file.filename}`;

  await db
    .update(usersTable)
    .set({ avatarUrl })
    .where(eq(usersTable.id, user.id));

  res.json({ avatarUrl });
});

// GET /users/:userId
router.get("/users/:userId", async (req, res): Promise<void> => {
  const parsed = GetUserProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, parsed.data.userId))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    rating: user.rating,
    totalSales: user.totalSales,
    totalPurchases: user.totalPurchases,
    createdAt: user.createdAt.toISOString(),
  });
});

export { ensureUser, requireAuth };
export default router;
