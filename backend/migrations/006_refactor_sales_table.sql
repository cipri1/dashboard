-- Remove product-specific columns from sales table
-- They are now in the sale_items table
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_product_id_fkey;
ALTER TABLE sales DROP COLUMN IF EXISTS product_id;
ALTER TABLE sales DROP COLUMN IF EXISTS qty;
ALTER TABLE sales DROP COLUMN IF EXISTS price;
DROP INDEX IF EXISTS idx_sales_product;
