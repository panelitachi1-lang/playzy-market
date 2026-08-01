CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  rating REAL,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users (lower(username));
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'sell',
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  category TEXT,
  condition TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  city TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  seller_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  deal_status TEXT NOT NULL DEFAULT 'active',
  deal_marked_by TEXT,
  deal_marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payment_receipts (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  receipt_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  card_number TEXT NOT NULL,
  card_bank TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  reviewer_id TEXT NOT NULL,
  reviewed_user_id TEXT NOT NULL,
  conversation_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  deal_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS listing_pins (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL,
  clerk_id TEXT NOT NULL,
  amount_paid INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
