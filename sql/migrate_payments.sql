-- Migration: create/adjust payments table and RLS policies
-- Run in Supabase SQL editor or with psql

-- ensure uuid helper
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create table if missing (includes created_by)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  note text,
  client_id uuid REFERENCES clients(id),
  supplier_id uuid REFERENCES suppliers(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- if table existed without created_by, add the column
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE payments ALTER COLUMN created_by SET DEFAULT auth.uid();

-- enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
-- allow authenticated users to INSERT
-- drop if exists to avoid duplicate-policy errors
DROP POLICY IF EXISTS payments_insert_authenticated ON payments;
-- Require that the inserter is authenticated and that the record's created_by matches the current user
CREATE POLICY payments_insert_authenticated ON payments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- allow authenticated users to SELECT
DROP POLICY IF EXISTS payments_select_authenticated ON payments;
CREATE POLICY payments_select_authenticated ON payments
  FOR SELECT
  USING (true);

-- allow the creator to UPDATE (and ensure created_by remains the same when updating)
DROP POLICY IF EXISTS payments_update_owner ON payments;
CREATE POLICY payments_update_owner ON payments
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- allow the creator to DELETE
DROP POLICY IF EXISTS payments_delete_owner ON payments;
CREATE POLICY payments_delete_owner ON payments
  FOR DELETE
  USING (created_by = auth.uid());

-- Quick checks (optional):
-- SELECT column_name FROM information_schema.columns WHERE table_name='payments';
-- SELECT * FROM pg_policies WHERE tablename = 'payments';
