-- Add settings table for company/expeditor info
CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Default expeditor info (edit from the app Settings page)
INSERT INTO settings (key, value) VALUES
  ('company_name',    'My Company SRL'),
  ('company_address', 'Str. Exemplu 1'),
  ('company_city',    'Cluj-Napoca'),
  ('company_country', 'Romania'),
  ('company_phone',   '+40 700 000 000'),
  ('company_email',   'contact@mycompany.com')
ON CONFLICT (key) DO NOTHING;
