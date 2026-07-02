-- Add mock products
INSERT INTO products (name, sku, price, qty) VALUES
('Laptop Dell XPS 13', 'DEL-XPS-13', 899.99, 15),
('Monitor Samsung 27"', 'SAM-M27', 299.99, 8),
('Keyboard Mechanical RGB', 'KEY-RGB-01', 129.99, 25),
('Mouse Logitech MX Master', 'LOG-MX-M', 99.99, 20),
('USB-C Hub 7-in-1', 'USB-HUB-7', 49.99, 30),
('Wireless Headphones Sony', 'SON-WH-1', 199.99, 12),
('Webcam Logitech 4K', 'LOG-CAM-4K', 89.99, 18),
('SSD Samsung 1TB', 'SAM-SSD-1TB', 119.99, 22),
('External HDD 2TB', 'WES-HDD-2TB', 69.99, 14),
('Desk Lamp LED', 'LAMP-LED-01', 39.99, 40);

-- Add mock clients
INSERT INTO clients (name, company, email, phone, address, postcode) VALUES
('John Smith', 'Tech Solutions Inc.', 'john@techsolutions.com', '0722123456', '123 Tech Street, New York', '100001'),
('Maria Garcia', 'Innovation Labs', 'maria@innovationlabs.com', '0722987654', '456 Innovation Ave, Los Angeles', '900001'),
('Ahmed Hassan', 'Digital Ventures', 'ahmed@digitalventures.com', '0723456789', '789 Digital Blvd, Chicago', '600001'),
('Sophie Martin', 'Creative Agency Pro', 'sophie@creativeagency.com', '0721234567', '321 Creative Lane, Houston', '770001'),
('Carlos Rodriguez', 'Business Solutions Ltd', 'carlos@businesssolutions.com', '0724567890', '654 Business Park, Miami', '330001');

-- Add mock sales
INSERT INTO sales (date, client_id, status, stock_deducted, recorded_by, created_at) VALUES
(CURRENT_DATE - INTERVAL '5 days', 1, 'Paid', true, 1, NOW() - INTERVAL '5 days'),
(CURRENT_DATE - INTERVAL '3 days', 2, 'Paid', true, 1, NOW() - INTERVAL '3 days'),
(CURRENT_DATE - INTERVAL '2 days', 3, 'Pending', false, 1, NOW() - INTERVAL '2 days'),
(CURRENT_DATE - INTERVAL '1 day', 4, 'Paid', true, 1, NOW() - INTERVAL '1 day'),
(CURRENT_DATE, 5, 'Pending', false, 1, NOW());

-- Add mock sale items
INSERT INTO sale_items (sale_id, product_id, qty, price) VALUES
(6, 1, 1, 899.99),
(6, 3, 2, 129.99),
(7, 2, 1, 299.99),
(7, 4, 1, 99.99),
(7, 6, 1, 199.99),
(8, 5, 2, 49.99),
(9, 7, 1, 89.99),
(9, 8, 2, 119.99),
(9, 10, 3, 39.99),
(10, 9, 1, 69.99),
(10, 2, 1, 299.99);

-- Add mock audit log entries
INSERT INTO audit_log (user_id, username, role, action, entity, detail, ts) VALUES
(1, 'admin', 'admin', 'create', 'Sale #1', 'Laptop Dell XPS 13, Keyboard Mechanical RGB for Tech Solutions Inc. - Paid', NOW() - INTERVAL '5 days'),
(1, 'admin', 'admin', 'create', 'Sale #2', 'Monitor Samsung 27", Mouse Logitech MX Master, Wireless Headphones Sony for Innovation Labs - Paid', NOW() - INTERVAL '3 days'),
(1, 'admin', 'admin', 'create', 'Sale #3', 'USB-C Hub 7-in-1 for Digital Ventures - Pending', NOW() - INTERVAL '2 days'),
(1, 'admin', 'admin', 'create', 'Sale #4', 'Webcam Logitech 4K, SSD Samsung 1TB, Desk Lamp LED for Creative Agency Pro - Paid', NOW() - INTERVAL '1 day'),
(1, 'admin', 'admin', 'create', 'Sale #5', 'External HDD 2TB, Monitor Samsung 27" for Business Solutions Ltd - Pending', NOW()),
(1, 'admin', 'admin', 'login', 'User', 'admin logged in', NOW() - INTERVAL '6 days'),
(2, 'maria', 'user', 'login', 'User', 'maria logged in', NOW() - INTERVAL '4 days');
