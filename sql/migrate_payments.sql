-- Migration: create/adjust payments table and RLS policies
-- Run in Supabase SQL editor or with psql

-- ensure uuid helper
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create table if missing
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  note text,
  party_type TEXT CHECK (party_type IN ('client', 'supplier')),
  party_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Add missing columns if they don't exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_id uuid;

-- Add CHECK constraint if needed
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_party_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_party_type_check CHECK (party_type IN ('client', 'supplier'));

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (will use secure SQL function instead)
DROP POLICY IF EXISTS payments_insert_authenticated ON payments;
DROP POLICY IF EXISTS payments_select_authenticated ON payments;
DROP POLICY IF EXISTS payments_update_authenticated ON payments;
DROP POLICY IF EXISTS payments_delete_authenticated ON payments;
DROP POLICY IF EXISTS payments_insert_authenticated ON payments;
DROP POLICY IF EXISTS payments_select_authenticated ON payments;
DROP POLICY IF EXISTS payments_update_owner ON payments;
DROP POLICY IF EXISTS payments_delete_owner ON payments;

-- Minimal RLS: Just allow authenticated users to SELECT
-- INSERT/UPDATE/DELETE will be handled via secure SQL function
DROP POLICY IF EXISTS payments_select_all ON payments;
CREATE POLICY payments_select_all ON payments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Quick checks (optional):
-- SELECT column_name FROM information_schema.columns WHERE table_name='payments';
-- SELECT * FROM pg_policies WHERE tablename = 'payments';
