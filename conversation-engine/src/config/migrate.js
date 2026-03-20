import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const DDL = `
-- Groups table (idempotent)
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  privacy       VARCHAR(20) NOT NULL DEFAULT 'private',
  approval_required BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members table (idempotent)
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  email         VARCHAR(320) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, email)
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(320) NOT NULL,
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token         VARCHAR(512) NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(DDL);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
