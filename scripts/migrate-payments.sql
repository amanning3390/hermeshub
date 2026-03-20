-- HermesHub Private Repos & Payments - Database Migration
-- Creates 5 new tables: creators, private_skills, transactions, licenses, mpp_sessions
-- Run against Neon Postgres
-- Safe to re-run (uses IF NOT EXISTS)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. creators ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id VARCHAR(255) UNIQUE NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  wallet_address VARCHAR(255),
  wallet_chain VARCHAR(50) DEFAULT 'base',
  solana_address VARCHAR(255),
  stripe_account_id VARCHAR(255),
  tempo_address VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. private_skills ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  version VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd >= 0.50 AND price_usd <= 999.99),
  accepted_protocols TEXT[] DEFAULT '{x402,mpp}',
  accepted_chains TEXT[] DEFAULT '{base}',
  archive_url VARCHAR(500) NOT NULL,
  archive_hash VARCHAR(128) NOT NULL,
  encryption_key_id VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_skills_creator ON private_skills(creator_id);
CREATE INDEX IF NOT EXISTS idx_private_skills_category ON private_skills(category);
CREATE INDEX IF NOT EXISTS idx_private_skills_active ON private_skills(is_active);

-- ─── 3. transactions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES private_skills(id) ON DELETE CASCADE,
  buyer_wallet VARCHAR(255),
  buyer_email VARCHAR(255),
  creator_id UUID NOT NULL REFERENCES creators(id),
  protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('x402', 'mpp')),
  amount_usd DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  creator_payout DECIMAL(10,2) NOT NULL,
  chain VARCHAR(50),
  tx_hash VARCHAR(255),
  stripe_payment_id VARCHAR(255),
  mpp_session_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_skill ON transactions(skill_id);
CREATE INDEX IF NOT EXISTS idx_transactions_creator ON transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_wallet ON transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ─── 4. licenses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id),
  skill_id UUID NOT NULL REFERENCES private_skills(id),
  buyer_wallet VARCHAR(255),
  buyer_email VARCHAR(255),
  license_key_hash VARCHAR(255) UNIQUE NOT NULL,
  downloads_remaining INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_skill ON licenses(skill_id);
CREATE INDEX IF NOT EXISTS idx_licenses_buyer_wallet ON licenses(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_licenses_buyer_email ON licenses(buyer_email);

-- ─── 5. mpp_sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mpp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email VARCHAR(255) NOT NULL,
  stripe_session_id VARCHAR(255) UNIQUE,
  spending_limit DECIMAL(10,2) NOT NULL,
  amount_spent DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpp_sessions_buyer ON mpp_sessions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_mpp_sessions_status ON mpp_sessions(status);

-- ─── Done ───────────────────────────────────────────────────────────────────
-- Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
