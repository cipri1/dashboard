-- Add manual stock quantity to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS qty INTEGER NOT NULL DEFAULT 0;
