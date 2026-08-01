/**
 * Telegram Bot — управление Pleer из Telegram.
 * Только владелец (OWNER_TELEGRAM_ID) может использовать команды.
 *
 * Команды:
 *   /start                          — приветствие и список команд
 *
 *   👤 Пользователи:
 *   /user <username>                — информация о пользователе
 *   /ban <username>                 — забанить пользователя
 *   /unban <username>               — разбанить пользователя
 *
 *   💰 Баланс:
 *   /add_balance <username> <сумма> — пополнить баланс (в рублях)
 *   /remove_balance <username> <сумма> — снять с баланса (в рублях)
 *
 *   🛡 Администраторы:
 *   /grant_admin <username>         — выдать права администратора
 *   /revoke_admin <username>        — забрать права администратора
 *   /admins                         — список текущих администраторов
 *
 *   ⭐ Отзывы:
 *   /set_reviews <username> <число> — установить счётчик отзывов (totalSales)
 *
 *   🔑 Доступ:
 *   /get_admin_token <email>        — clerkId пользователя для /admin доступа
 */
import { eq, sql } from "drizzle-orm";
import { db, usersTable, reviewsTable } from "@workspace/db";
import { logger } from "./logger";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const EXTRA_ADMIN_ID = process.env.EXTRA_ADMIN_TELEGRAM_ID;

// All Telegram IDs that can use admin commands
const ALLOWED_IDS = [OWNER_ID, EXTRA_ADMIN_ID].filter(Boolean);

const POLLING_INTERVAL_MS = 3000;

let lastUpdateId = 0;
let polling = false;

async function callTg(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

async function sendMessage(chatId: number | string, text: string) {
  return callTg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}

/** Найти пользователя по username, вернуть или отправить ошибку */
async function findUser(chatId: number | string, username: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    await sendMessage(chatId, `❌ Пользователь @${username} не найден.`);
    return null;
  }
  return user;
}

async function handleUpdate(update: any) {
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const fromId = String(msg.from?.id ?? "");
  const text: string = msg.text.trim();
  const parts = text.split(/\s+/);
  const cmd = parts[0];

  // ── /start ──────────────────────────────────────────────────────────────
  if (cmd === "/start") {
    await sendMessage(
      chatId,
      "👋 <b>Привет! Это бот управления Pleer.</b>\n\n" +
      "👤 <b>Пользователи:</b>\n" +
      "/user &lt;username&gt; — информация о пользователе\n" +
      "/ban &lt;username&gt; — забанить\n" +
      "/unban &lt;username&gt; — разбанить\n\n" +
      "💰 <b>Баланс:</b>\n" +
      "/add_balance &lt;username&gt; &lt;сумма₽&gt; — пополнить\n" +
      "/remove_balance &lt;username&gt; &lt;сумма₽&gt; — снять\n\n" +
      "🛡 <b>Администраторы:</b>\n" +
      "/grant_admin &lt;username&gt; — выдать права\n" +
      "/revoke_admin &lt;username&gt; — забрать права\n" +
      "/admins — список администраторов\n\n" +
      "⭐ <b>Отзывы:</b>\n" +
      "/set_reviews &lt;username&gt; &lt;число&gt; — установить счётчик\n\n" +
      "🔑 <b>Доступ:</b>\n" +
      "/get_admin_token &lt;email&gt; — токен для /admin"
    );
    return;
  }

  // ── All other commands — only for allowed IDs ────────────────────────────
  if (!ALLOWED_IDS.includes(fromId)) {
    await sendMessage(chatId, "❌ У вас нет прав для этой команды.");
    return;
  }

  // ── /user <username> ────────────────────────────────────────────────────
  if (cmd === "/user") {
    const username = parts[1]?.replace(/^@/, "");
    if (!username) {
      await sendMessage(chatId, "Использование: /user &lt;username&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    const [reviewResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewsTable)
      .where(eq(reviewsTable.reviewedUserId, user.clerkId));

    const balanceRub = (user.balance / 100).toFixed(2);
    const status = user.isBanned ? "🔴 Забанен" : user.isAdmin ? "🛡 Админ" : "✅ Активен";

    await sendMessage(
      chatId,
      `👤 <b>@${user.username}</b>\n\n` +
      `Имя: ${user.displayName ?? "—"}\n` +
      `ID: <code>${user.clerkId}</code>\n` +
      `Статус: ${status}\n` +
      `Баланс: <b>${balanceRub} ₽</b>\n` +
      `Продаж: ${user.totalSales}\n` +
      `Покупок: ${user.totalPurchases}\n` +
      `Отзывов: ${reviewResult?.count ?? 0}\n` +
      `Рейтинг: ${user.rating ?? "—"}\n` +
      `Зарегистрирован: ${user.createdAt.toLocaleDateString("ru-RU")}`
    );
    return;
  }

  // ── /ban <username> ─────────────────────────────────────────────────────
  if (cmd === "/ban") {
    const username = parts[1]?.replace(/^@/, "");
    if (!username) {
      await sendMessage(chatId, "Использование: /ban &lt;username&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    if (user.isBanned) {
      await sendMessage(chatId, `⚠️ @${username} уже забанен.`);
      return;
    }

    await db.update(usersTable).set({ isBanned: true }).where(eq(usersTable.username, username));
    await sendMessage(chatId, `🔴 @${username} забанен.`);
    return;
  }

  // ── /unban <username> ───────────────────────────────────────────────────
  if (cmd === "/unban") {
    const username = parts[1]?.replace(/^@/, "");
    if (!username) {
      await sendMessage(chatId, "Использование: /unban &lt;username&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    if (!user.isBanned) {
      await sendMessage(chatId, `⚠️ @${username} не забанен.`);
      return;
    }

    await db.update(usersTable).set({ isBanned: false }).where(eq(usersTable.username, username));
    await sendMessage(chatId, `✅ @${username} разбанен.`);
    return;
  }

  // ── /add_balance <username> <сумма> ─────────────────────────────────────
  if (cmd === "/add_balance") {
    const username = parts[1]?.replace(/^@/, "");
    const amountRub = parseFloat(parts[2] ?? "");

    if (!username || isNaN(amountRub) || amountRub <= 0) {
      await sendMessage(chatId, "Использование: /add_balance &lt;username&gt; &lt;сумма₽&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    const amountKopecks = Math.round(amountRub * 100);
    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${amountKopecks}` })
      .where(eq(usersTable.username, username));

    const newBalance = ((user.balance + amountKopecks) / 100).toFixed(2);
    await sendMessage(
      chatId,
      `💰 @${username}: +${amountRub} ₽\nНовый баланс: <b>${newBalance} ₽</b>`
    );
    return;
  }

  // ── /remove_balance <username> <сумма> ──────────────────────────────────
  if (cmd === "/remove_balance") {
    const username = parts[1]?.replace(/^@/, "");
    const amountRub = parseFloat(parts[2] ?? "");

    if (!username || isNaN(amountRub) || amountRub <= 0) {
      await sendMessage(chatId, "Использование: /remove_balance &lt;username&gt; &lt;сумма₽&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    const amountKopecks = Math.round(amountRub * 100);
    if (user.balance < amountKopecks) {
      await sendMessage(
        chatId,
        `❌ Недостаточно средств. Баланс @${username}: ${(user.balance / 100).toFixed(2)} ₽`
      );
      return;
    }

    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} - ${amountKopecks}` })
      .where(eq(usersTable.username, username));

    const newBalance = ((user.balance - amountKopecks) / 100).toFixed(2);
    await sendMessage(
      chatId,
      `💸 @${username}: -${amountRub} ₽\nНовый баланс: <b>${newBalance} ₽</b>`
    );
    return;
  }

  // ── /grant_admin <username> / /revoke_admin <username> ──────────────────
  if (cmd === "/grant_admin" || cmd === "/revoke_admin") {
    const isGrant = cmd === "/grant_admin";
    const username = parts[1]?.replace(/^@/, "");

    if (!username) {
      await sendMessage(chatId, `Использование: /${isGrant ? "grant_admin" : "revoke_admin"} &lt;username&gt;`);
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    await db
      .update(usersTable)
      .set({ isAdmin: isGrant })
      .where(eq(usersTable.username, username));

    await sendMessage(
      chatId,
      isGrant
        ? `✅ @${username} теперь администратор Pleer.`
        : `✅ Права администратора у @${username} удалены.`
    );
    return;
  }

  // ── /admins ──────────────────────────────────────────────────────────────
  if (cmd === "/admins") {
    const admins = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.isAdmin, true));

    if (!admins.length) {
      await sendMessage(chatId, "Нет активных администраторов.");
      return;
    }

    const list = admins
      .map((u) => `• @${u.username}${u.displayName ? ` (${u.displayName})` : ""}`)
      .join("\n");
    await sendMessage(chatId, `🛡 <b>Администраторы Pleer:</b>\n\n${list}`);
    return;
  }

  // ── /set_reviews <username> <число> ─────────────────────────────────────
  if (cmd === "/set_reviews") {
    const username = parts[1]?.replace(/^@/, "");
    const count = parseInt(parts[2] ?? "", 10);

    if (!username || isNaN(count) || count < 0) {
      await sendMessage(chatId, "Использование: /set_reviews &lt;username&gt; &lt;число&gt;");
      return;
    }

    const user = await findUser(chatId, username);
    if (!user) return;

    // totalSales используется как счётчик "сделок/отзывов" на профиле
    await db
      .update(usersTable)
      .set({ totalSales: count })
      .where(eq(usersTable.username, username));

    await sendMessage(chatId, `⭐ @${username}: счётчик отзывов установлен на <b>${count}</b>.`);
    return;
  }

  // ── /get_admin_token <email> ─────────────────────────────────────────────
  if (cmd === "/get_admin_token") {
    const emailOrUsername = parts[1]?.replace(/^@/, "");
    if (!emailOrUsername) {
      await sendMessage(chatId, "Использование: /get_admin_token &lt;email или username&gt;");
      return;
    }

    // Ищем по username (email в DB не хранится, он в Clerk)
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, emailOrUsername))
      .limit(1);

    if (!user) {
      await sendMessage(
        chatId,
        `❌ Пользователь <code>${emailOrUsername}</code> не найден.\n\n` +
        `💡 Используйте username (без @). Email хранится только в Clerk.\n` +
        `Для доступа к /admin используйте ADMIN_CLERK_IDS в env или команду /grant_admin &lt;username&gt;.`
      );
      return;
    }

    await sendMessage(
      chatId,
      `🔑 <b>Данные для /admin доступа:</b>\n\n` +
      `Пользователь: @${user.username}\n` +
      `Clerk ID: <code>${user.clerkId}</code>\n` +
      `Является админом: ${user.isAdmin ? "✅ Да" : "❌ Нет"}\n\n` +
      `Добавьте Clerk ID в переменную окружения <code>ADMIN_CLERK_IDS</code> или выдайте права через /grant_admin.`
    );
    return;
  }

  await sendMessage(chatId, "❓ Неизвестная команда. Напишите /start для списка команд.");
}

async function poll() {
  if (!polling) return;
  try {
    const data: any = await callTg("getUpdates", {
      offset: lastUpdateId + 1,
      timeout: 25,
      allowed_updates: ["message"],
    });

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        handleUpdate(update).catch((err) =>
          logger.error({ err }, "Telegram update handler error")
        );
      }
    }
  } catch (err) {
    logger.warn({ err }, "Telegram polling error");
  }

  setTimeout(poll, POLLING_INTERVAL_MS);
}

export function startTelegramBot() {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return;
  }
  if (!OWNER_ID) {
    logger.warn("OWNER_TELEGRAM_ID not set — admin commands will be disabled");
  }
  polling = true;
  logger.info("Telegram bot started");
  poll();
}

export function stopTelegramBot() {
  polling = false;
}
