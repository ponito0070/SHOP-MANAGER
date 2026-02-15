-- Migration: add categories to expenses table
-- Run in Supabase SQL editor

-- First, add missing columns if they don't exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create categories enum type
DROP TYPE IF EXISTS expense_category CASCADE;
CREATE TYPE expense_category AS ENUM (
  'salaire',
  'loyer',
  'utilities',
  'transport',
  'fournitures',
  'services',
  'marketing',
  'maintenance',
  'assurance',
  'impots',
  'autre'
);

-- Add category column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category expense_category DEFAULT 'autre';

-- Add other useful columns
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);

-- Enable RLS if not already
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS expenses_select_all ON expenses;
DROP POLICY IF EXISTS expenses_insert_authenticated ON expenses;
DROP POLICY IF EXISTS expenses_update_owner ON expenses;
DROP POLICY IF EXISTS expenses_delete_owner ON expenses;

-- Create new policies
CREATE POLICY expenses_select_all ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY expenses_insert_authenticated ON expenses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY expenses_update_authenticated ON expenses
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY expenses_delete_authenticated ON expenses
  FOR DELETE
  USING (auth.role() = 'authenticated');
