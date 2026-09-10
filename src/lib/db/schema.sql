-- $BUCKS schema. Idempotent: safe to run against an existing database.
-- Applied by `npm run db:migrate`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address     TEXT NOT NULL,
  chain       TEXT NOT NULL DEFAULT 'solana:mainnet',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallets_address_unique UNIQUE (address, chain)
);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);

-- Single-use login challenges. Rows are consumed on verify and swept on expiry.
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce       TEXT PRIMARY KEY,
  address     TEXT NOT NULL,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_nonces_expires_at_idx ON auth_nonces(expires_at);

-- ---------------------------------------------------------------------------
-- Assets and provider catalog
-- ---------------------------------------------------------------------------

-- The payment assets the app will accept, keyed by verified mint address.
-- Symbols are display-only; the mint is the source of truth.
CREATE TABLE IF NOT EXISTS supported_assets (
  symbol      TEXT PRIMARY KEY,
  mint        TEXT NOT NULL,
  decimals    SMALLINT NOT NULL,
  is_native   BOOLEAN NOT NULL DEFAULT false,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT supported_assets_mint_unique UNIQUE (mint)
);

-- A snapshot of a live FazerCards offer at the moment a user selected it.
-- Never a source of truth for availability: that is always re-read live.
CREATE TABLE IF NOT EXISTS provider_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL DEFAULT 'fazercards',
  category_id       TEXT NOT NULL,
  card_id           TEXT NOT NULL,
  name              TEXT NOT NULL,
  category_name     TEXT NOT NULL,
  face_value_usd    BIGINT,
  price_usd         BIGINT NOT NULL,
  last_seen_stock   INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT provider_products_unique UNIQUE (provider, category_id, card_id)
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

-- A short-lived, server-authored price. The client cannot alter any amount:
-- confirmation re-reads the quote row and verifies against these numbers.
CREATE TABLE IF NOT EXISTS payment_quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address        TEXT NOT NULL,
  product_id            UUID NOT NULL REFERENCES provider_products(id),
  intent                TEXT NOT NULL CHECK (intent IN ('purchase', 'gift')),
  payment_asset         TEXT NOT NULL REFERENCES supported_assets(symbol),
  payment_mint          TEXT NOT NULL,
  payment_amount        BIGINT NOT NULL,
  required_usdc         BIGINT NOT NULL,
  provider_price_usd    BIGINT NOT NULL,
  platform_fee_usd      BIGINT NOT NULL DEFAULT 0,
  route_label           TEXT,
  jupiter_request_id    TEXT,
  network_fee_lamports  BIGINT NOT NULL DEFAULT 0,
  unsigned_transaction  TEXT,
  sender_name           TEXT,
  gift_message          TEXT,
  expires_at            TIMESTAMPTZ NOT NULL,
  consumed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_quotes_user_id_idx ON payment_quotes(user_id);
CREATE INDEX IF NOT EXISTS payment_quotes_expires_at_idx ON payment_quotes(expires_at);

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID NOT NULL REFERENCES payment_quotes(id),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  asset           TEXT NOT NULL,
  mint            TEXT NOT NULL,
  amount          BIGINT NOT NULL,
  received_usdc   BIGINT,
  signature       TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('processing', 'confirmed', 'failed')),
  slot            BIGINT,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,
  -- A given onchain transaction can pay for exactly one order, ever.
  CONSTRAINT payments_signature_unique UNIQUE (signature)
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id                UUID NOT NULL REFERENCES provider_products(id),
  quote_id                  UUID REFERENCES payment_quotes(id),
  payment_id                UUID REFERENCES payments(id),
  intent                    TEXT NOT NULL DEFAULT 'purchase' CHECK (intent IN ('purchase', 'gift')),
  payment_asset             TEXT NOT NULL,
  payment_amount            BIGINT NOT NULL,
  payment_signature         TEXT,
  provider_price_usd        BIGINT NOT NULL,
  face_value_usd            BIGINT,
  fazercards_order_id       TEXT,
  idempotency_key           UUID NOT NULL,
  status                    TEXT NOT NULL CHECK (status IN (
                              'awaiting_payment',
                              'payment_processing',
                              'payment_confirmed',
                              'provider_processing',
                              'ready',
                              'claimed',
                              'provider_failed',
                              'refund_required'
                            )),
  status_detail             TEXT,
  provider_attempts         SMALLINT NOT NULL DEFAULT 0,
  encrypted_redemption_data TEXT,
  revealed_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at              TIMESTAMPTZ,
  -- Guarantees one provider purchase per order, even across retries.
  CONSTRAINT orders_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_fazercards_order_id_idx ON orders(fazercards_order_id);

-- ---------------------------------------------------------------------------
-- Gifting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coffee_gifts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name             TEXT,
  message                 TEXT,
  -- Only the hash of the claim token is queryable. The token itself is kept
  -- encrypted so the sender can re-copy their own link from /account.
  claim_token_hash        TEXT NOT NULL,
  encrypted_claim_token   TEXT NOT NULL,
  status                  TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'claimed')),
  claimed_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coffee_gifts_order_unique UNIQUE (order_id),
  CONSTRAINT coffee_gifts_claim_token_hash_unique UNIQUE (claim_token_hash)
);

CREATE INDEX IF NOT EXISTS coffee_gifts_sender_idx ON coffee_gifts(sender_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Provider webhooks
-- ---------------------------------------------------------------------------

-- event_id is the provider's delivery id: the unique constraint makes
-- duplicate deliveries a no-op.
CREATE TABLE IF NOT EXISTS webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL DEFAULT 'fazercards',
  event_id      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  provider_order_id TEXT,
  payload       JSONB NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  process_error TEXT,
  CONSTRAINT webhook_events_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_order_idx ON webhook_events(provider_order_id);

-- ---------------------------------------------------------------------------
-- Rate limiting (shared across serverless instances)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Seed the assets that need no configuration
-- ---------------------------------------------------------------------------

INSERT INTO supported_assets (symbol, mint, decimals, is_native, sort_order)
VALUES ('SOL', 'So11111111111111111111111111111111111111112', 9, true, 3)
ON CONFLICT (symbol) DO UPDATE
  SET mint = EXCLUDED.mint,
      decimals = EXCLUDED.decimals,
      is_native = EXCLUDED.is_native,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();
