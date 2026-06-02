-- Manufacturing Dashboard Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  fullname VARCHAR(128) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts
CREATE TABLE parts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  sku VARCHAR(64) UNIQUE NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  sku VARCHAR(64) UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials (product → parts)
CREATE TABLE bom (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  UNIQUE(product_id, part_id)
);

-- Clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  company VARCHAR(128),
  email VARCHAR(128),
  phone VARCHAR(64),
  address TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  price NUMERIC(10,2) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Paid','Aborted','Refunded')),
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(64),
  role VARCHAR(16),
  action VARCHAR(32) NOT NULL,
  entity VARCHAR(128),
  detail TEXT
);

-- Indexes
CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_bom_product ON bom(product_id);
CREATE INDEX idx_audit_ts ON audit_log(ts DESC);

-- Seed admin user (password: admin123)
INSERT INTO users (username, fullname, password_hash, role)
VALUES ('admin', 'Admin User', crypt('admin123', gen_salt('bf')), 'admin');

-- Seed regular user (password: user123)
INSERT INTO users (username, fullname, password_hash, role)
VALUES ('maria', 'Maria Pop', crypt('user123', gen_salt('bf')), 'user');

-- Seed parts
INSERT INTO parts (name, sku, qty, min_stock, unit_cost) VALUES
  ('Capacitor 100µF',     'CAP-100', 45,  20, 0.15),
  ('Microcontroller ATmega','MCU-ATM', 8,  10, 3.50),
  ('Resistor 10kΩ pack',  'RES-10K', 200, 50, 0.05),
  ('PCB board v2',        'PCB-002', 12,   5, 2.20),
  ('LED 5mm red',         'LED-5R',  130, 30, 0.08);

-- Seed products
INSERT INTO products (name, sku, price, description) VALUES
  ('Control board v2',   'CB-002', 28.00, 'Main control unit'),
  ('Sensor module A',    'SM-A01', 14.50, 'Temperature sensor'),
  ('LED indicator panel','LIP-01',  8.90, 'Status display panel'),
  ('Power relay unit',   'PR-U01', 19.00, 'High-current relay module');

-- Seed BOM
-- Control board v2: MCU×1, PCB×1, CAP×4, RES×10
INSERT INTO bom (product_id, part_id, qty) VALUES
  (1,2,1),(1,4,1),(1,1,4),(1,3,10);
-- Sensor module A: MCU×1, CAP×2, LED×1
INSERT INTO bom (product_id, part_id, qty) VALUES
  (2,2,1),(2,1,2),(2,5,1);
-- LED panel: LED×8, RES×5, PCB×1
INSERT INTO bom (product_id, part_id, qty) VALUES
  (3,5,8),(3,3,5),(3,4,1);
-- Power relay: PCB×1, CAP×6, RES×8
INSERT INTO bom (product_id, part_id, qty) VALUES
  (4,4,1),(4,1,6),(4,3,8);

-- Seed clients
INSERT INTO clients (name, company, email, phone, address) VALUES
  ('Marta Ionescu',  'Electrotek SRL', 'marta@electrotek.ro', '+40 721 111 222', 'Str. Electrica 5, Cluj-Napoca'),
  ('Bogdan Mureșan', 'Autom Systems',  'bogdan@autom.ro',     '+40 744 333 444', 'Bd. Industriei 12, Timișoara'),
  ('Ioana Filip',    'FilTech SA',     'ioana@filtech.ro',    '+40 766 555 666', 'Calea Victoriei 88, București');
