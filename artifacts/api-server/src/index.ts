import app from "./app";
import { logger } from "./lib/logger";
import { startTelegramBot } from "./lib/telegramBot";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Apply DB migrations on startup
async function applyMigrations() {
  try {
    const conn = await pool.getConnection();
    await conn.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, clerk_id VARCHAR(255) NOT NULL UNIQUE, username VARCHAR(100) NOT NULL UNIQUE, display_name TEXT, avatar_url TEXT, bio TEXT, city TEXT, rating FLOAT, total_sales INT NOT NULL DEFAULT 0, total_purchases INT NOT NULL DEFAULT 0, balance INT NOT NULL DEFAULT 0, is_banned BOOLEAN NOT NULL DEFAULT false, is_admin BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS listings (id INT AUTO_INCREMENT PRIMARY KEY, title TEXT NOT NULL, description TEXT, type VARCHAR(10) NOT NULL DEFAULT "sell", price INT NOT NULL DEFAULT 0, currency VARCHAR(10) NOT NULL DEFAULT "RUB", category TEXT, \`condition\` TEXT, image_url TEXT, images_json TEXT, secret_data TEXT, secret_type VARCHAR(50) DEFAULT "credentials", status VARCHAR(20) NOT NULL DEFAULT "pending", city TEXT, views INT NOT NULL DEFAULT 0, seller_id VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS conversations (id INT AUTO_INCREMENT PRIMARY KEY, listing_id INT, buyer_id VARCHAR(255) NOT NULL, seller_id VARCHAR(255) NOT NULL, deal_status VARCHAR(20), deal_marked_by VARCHAR(255), deal_marked_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, conversation_id INT NOT NULL, sender_id VARCHAR(255) NOT NULL, \`text\` TEXT NOT NULL, read_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS payment_receipts (id INT AUTO_INCREMENT PRIMARY KEY, clerk_id VARCHAR(255) NOT NULL, amount INT NOT NULL, receipt_image_url TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT "pending", admin_note TEXT, reviewed_by VARCHAR(255), reviewed_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS withdrawal_requests (id INT AUTO_INCREMENT PRIMARY KEY, clerk_id VARCHAR(255) NOT NULL, amount INT NOT NULL, fee INT NOT NULL DEFAULT 0, net_amount INT NOT NULL DEFAULT 0, card_number VARCHAR(255) NOT NULL, card_bank VARCHAR(255) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT "pending", admin_note TEXT, processed_by VARCHAR(255), processed_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY, reviewer_id VARCHAR(255) NOT NULL, reviewed_user_id VARCHAR(255) NOT NULL, conversation_id INT NOT NULL, rating INT NOT NULL, comment TEXT, deal_status VARCHAR(20) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS listing_pins (id INT AUTO_INCREMENT PRIMARY KEY, listing_id INT NOT NULL, clerk_id VARCHAR(255) NOT NULL, hours INT NOT NULL DEFAULT 1, amount_paid INT NOT NULL, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS purchases (id INT AUTO_INCREMENT PRIMARY KEY, listing_id INT NOT NULL, buyer_id VARCHAR(255) NOT NULL, seller_id VARCHAR(255) NOT NULL, amount INT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT "pending", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    conn.release();
    logger.info("DB migrations applied");
  } catch (err) {
    logger.warn({ err }, "Migration warning (may already exist)");
  }
}

applyMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startTelegramBot();
  });
});
