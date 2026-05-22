export const SCHEMA_SQL = `
-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('admin','client','staff')),
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Categories (Meals, Proteins, Drinks, Desserts)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Menu Items (Dishes)
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price_per_head REAL NOT NULL DEFAULT 0,
  image TEXT,
  is_available INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Packages (Bronze, Silver, Gold)
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_per_head REAL NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Package Items (which dishes are in which package)
CREATE TABLE IF NOT EXISTS package_items (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id),
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings / Events
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('wedding','birthday','corporate','private_party','other')),
  event_date TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  delivery_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','in_progress','completed','cancelled')),
  package_id TEXT REFERENCES packages(id),
  total_amount REAL DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  balance_amount REAL DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  service_fee REAL DEFAULT 0,
  vat REAL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','partially_paid','paid')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Booking Menu Items (selected dishes for a booking)
CREATE TABLE IF NOT EXISTS booking_menu_items (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  quantity INTEGER DEFAULT 1,
  price_at_time REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  quote_number TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  service_fee REAL DEFAULT 0,
  vat REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  valid_until TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','rejected','converted')),
  converted_to_invoice INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  quote_id TEXT REFERENCES quotes(id),
  invoice_number TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  service_fee REAL DEFAULT 0,
  vat REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  due_date TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','partially_paid','overdue','cancelled')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount REAL NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('paystack','stripe','bank_transfer','cash','other')),
  reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
  type TEXT CHECK(type IN ('deposit','final_balance','full')),
  metadata TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('chef','waiter','server','cleaner','coordinator','driver')),
  hourly_rate REAL DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  phone TEXT,
  specialty TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Staff Assignments (staff assigned to events)
CREATE TABLE IF NOT EXISTS staff_assignments (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  role TEXT NOT NULL,
  hours_allocated REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost REAL DEFAULT 0,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Menu Item Ingredients (link dishes to ingredients)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id TEXT PRIMARY KEY,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity_per_head REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shopping Lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  estimated_cost REAL DEFAULT 0,
  is_purchased INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('payment','booking','menu','reminder','general')),
  reference_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_booking ON staff_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_booking ON shopping_lists(booking_id);

-- Seed Data: Categories
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES
  ('cat_meals', 'Meals', 'meals', 'Main course dishes', 1),
  ('cat_proteins', 'Proteins', 'proteins', 'Meat, fish, and plant-based proteins', 2),
  ('cat_drinks', 'Drinks', 'drinks', 'Beverages and refreshments', 3),
  ('cat_desserts', 'Desserts', 'desserts', 'Sweet treats and desserts', 4);

-- Seed Data: Sample Menu Items
INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price_per_head, is_available) VALUES
  ('item_jollof', 'cat_meals', 'Jollof Rice', 'Classic Nigerian jollof rice with mixed vegetables', 5.00, 1),
  ('item_fried_rice', 'cat_meals', 'Fried Rice', 'Savory fried rice with peas, carrots, and green beans', 5.00, 1),
  ('item_white_rice', 'cat_meals', 'White Rice', 'Steamed white rice', 3.00, 1),
  ('item_pounded_yam', 'cat_meals', 'Pounded Yam', 'Smooth pounded yam', 4.00, 1),
  ('item_eba', 'cat_meals', 'Eba (Garri)', 'Classic garri meal', 3.00, 1),
  ('item_amala', 'cat_meals', 'Amala', 'Yam flour amala', 3.50, 1),
  ('item_chicken', 'cat_proteins', 'Chicken', 'Fried or grilled chicken pieces', 6.00, 1),
  ('item_beef', 'cat_proteins', 'Beef', 'Seasoned beef stew', 5.00, 1),
  ('item_fish', 'cat_proteins', 'Fish', 'Grilled or fried fish', 5.50, 1),
  ('item_goat_meat', 'cat_proteins', 'Goat Meat', 'Spiced goat meat pepper soup', 7.00, 1),
  ('item_turkey', 'cat_proteins', 'Turkey', 'Roasted turkey', 8.00, 1),
  ('item_veg_protein', 'cat_proteins', 'Plant-Based Protein', 'Tofu or vegetable protein option', 4.50, 1),
  ('item_zobo', 'cat_drinks', 'Zobo Drink', 'Hibiscus drink with ginger and pineapple', 2.00, 1),
  ('item_juice', 'cat_drinks', 'Fruit Juice', 'Assorted fresh fruit juice', 2.50, 1),
  ('item_soda', 'cat_drinks', 'Soft Drinks', 'Coke, Fanta, Sprite, etc.', 1.50, 1),
  ('item_water', 'cat_drinks', 'Bottled Water', '500ml bottled water', 1.00, 1),
  ('item_wine', 'cat_drinks', 'Wine', 'Red or white wine', 5.00, 1),
  ('item_cheesecake', 'cat_desserts', 'Cheesecake', 'New York style cheesecake', 3.50, 1),
  ('item_chocolate_cake', 'cat_desserts', 'Chocolate Cake', 'Rich chocolate layer cake', 3.50, 1),
  ('item_fruit_platter', 'cat_desserts', 'Fruit Platter', 'Assorted fresh fruit platter', 2.50, 1),
  ('item_ice_cream', 'cat_desserts', 'Ice Cream', 'Vanilla, chocolate, or strawberry', 2.00, 1),
  ('item_samosa', 'cat_desserts', 'Samosas', 'Meat or vegetable samosas', 2.00, 1);

-- Seed Data: Packages
INSERT OR IGNORE INTO packages (id, name, description, price_per_head, is_active) VALUES
  ('pkg_bronze', 'Bronze Package', 'Basic catering package for small events', 12.00, 1),
  ('pkg_silver', 'Silver Package', 'Premium catering with more variety', 18.00, 1),
  ('pkg_gold', 'Gold Package', 'Luxury full-service catering experience', 28.00, 1);

-- Bronze: 1 meal + 1 protein + 1 drink + 1 dessert
INSERT OR IGNORE INTO package_items (id, package_id, menu_item_id) VALUES
  ('pi_b1', 'pkg_bronze', 'item_jollof'),
  ('pi_b2', 'pkg_bronze', 'item_chicken'),
  ('pi_b3', 'pkg_bronze', 'item_soda'),
  ('pi_b4', 'pkg_bronze', 'item_samosa');

-- Silver: 2 meals + 2 proteins + 2 drinks + 1 dessert
INSERT OR IGNORE INTO package_items (id, package_id, menu_item_id) VALUES
  ('pi_s1', 'pkg_silver', 'item_jollof'),
  ('pi_s2', 'pkg_silver', 'item_fried_rice'),
  ('pi_s3', 'pkg_silver', 'item_chicken'),
  ('pi_s4', 'pkg_silver', 'item_beef'),
  ('pi_s5', 'pkg_silver', 'item_zobo'),
  ('pi_s6', 'pkg_silver', 'item_water'),
  ('pi_s7', 'pkg_silver', 'item_cheesecake');

-- Gold: 3 meals + 3 proteins + 3 drinks + 2 desserts
INSERT OR IGNORE INTO package_items (id, package_id, menu_item_id) VALUES
  ('pi_g1', 'pkg_gold', 'item_jollof'),
  ('pi_g2', 'pkg_gold', 'item_fried_rice'),
  ('pi_g3', 'pkg_gold', 'item_pounded_yam'),
  ('pi_g4', 'pkg_gold', 'item_chicken'),
  ('pi_g5', 'pkg_gold', 'item_goat_meat'),
  ('pi_g6', 'pkg_gold', 'item_fish'),
  ('pi_g7', 'pkg_gold', 'item_zobo'),
  ('pi_g8', 'pkg_gold', 'item_wine'),
  ('pi_g9', 'pkg_gold', 'item_water'),
  ('pi_g10', 'pkg_gold', 'item_chocolate_cake'),
  ('pi_g11', 'pkg_gold', 'item_fruit_platter');

-- Seed: Sample Ingredients
INSERT OR IGNORE INTO ingredients (id, name, unit, unit_cost, category) VALUES
  ('ing_rice', 'Rice', 'kg', 2.50, 'Grains'),
  ('ing_chicken', 'Chicken', 'kg', 8.00, 'Protein'),
  ('ing_tomato', 'Tomatoes', 'kg', 3.00, 'Vegetables'),
  ('ing_oil', 'Cooking Oil', 'litre', 4.00, 'Oil'),
  ('ing_onion', 'Onions', 'kg', 2.00, 'Vegetables'),
  ('ing_pepper', 'Peppers', 'kg', 3.50, 'Vegetables'),
  ('ing_garlic', 'Garlic', 'kg', 5.00, 'Spices'),
  ('ing_ginger', 'Ginger', 'kg', 4.00, 'Spices'),
  ('ing_sugar', 'Sugar', 'kg', 1.50, 'Baking'),
  ('ing_flour', 'Flour', 'kg', 2.00, 'Baking'),
  ('ing_butter', 'Butter', 'kg', 6.00, 'Dairy'),
  ('ing_cream', 'Cream', 'litre', 5.00, 'Dairy'),
  ('ing_cheese', 'Cream Cheese', 'kg', 8.00, 'Dairy'),
  ('ing_zobo_leaf', 'Hibiscus Leaves', 'kg', 3.00, 'Beverage'),
  ('ing_pineapple', 'Pineapple', 'piece', 2.00, 'Fruit'),
  ('ing_beef', 'Beef', 'kg', 9.00, 'Protein'),
  ('ing_fish', 'Fish', 'kg', 7.00, 'Protein'),
  ('ing_goat', 'Goat Meat', 'kg', 12.00, 'Protein'),
  ('ing_yam', 'Yam', 'kg', 2.50, 'Tubers'),
  ('ing_garri', 'Garri', 'kg', 1.50, 'Grains'),
  ('ing_soda_syrup', 'Soda Syrup', 'litre', 3.00, 'Beverage'),
  ('ing_turkey', 'Turkey', 'kg', 10.00, 'Protein'),
  ('ing_tofu', 'Tofu', 'kg', 4.00, 'Protein'),
  ('ing_chocolate', 'Chocolate', 'kg', 7.00, 'Baking'),
  ('ing_vanilla', 'Vanilla Extract', 'bottle', 5.00, 'Baking'),
  ('ing_samosa_wrapper', 'Samosa Wrappers', 'pack', 2.00, 'Pastry');

-- Menu Item Ingredients mapping
INSERT OR IGNORE INTO menu_item_ingredients (id, menu_item_id, ingredient_id, quantity_per_head) VALUES
  ('mii_j1', 'item_jollof', 'ing_rice', 0.15),
  ('mii_j2', 'item_jollof', 'ing_tomato', 0.10),
  ('mii_j3', 'item_jollof', 'ing_oil', 0.03),
  ('mii_j4', 'item_jollof', 'ing_onion', 0.05),
  ('mii_j5', 'item_jollof', 'ing_pepper', 0.03),
  ('mii_fr1', 'item_fried_rice', 'ing_rice', 0.15),
  ('mii_fr2', 'item_fried_rice', 'ing_oil', 0.03),
  ('mii_fr3', 'item_fried_rice', 'ing_onion', 0.05),
  ('mii_ch1', 'item_chicken', 'ing_chicken', 0.20),
  ('mii_ch2', 'item_chicken', 'ing_oil', 0.02),
  ('mii_be1', 'item_beef', 'ing_beef', 0.15),
  ('mii_fi1', 'item_fish', 'ing_fish', 0.15),
  ('mii_gm1', 'item_goat_meat', 'ing_goat', 0.20),
  ('mii_py1', 'item_pounded_yam', 'ing_yam', 0.20),
  ('mii_eb1', 'item_eba', 'ing_garri', 0.15),
  ('mii_zo1', 'item_zobo', 'ing_zobo_leaf', 0.02),
  ('mii_zo2', 'item_zobo', 'ing_sugar', 0.03),
  ('mii_zo3', 'item_zobo', 'ing_ginger', 0.01),
  ('mii_cc1', 'item_chocolate_cake', 'ing_flour', 0.05),
  ('mii_cc2', 'item_chocolate_cake', 'ing_chocolate', 0.05),
  ('mii_cc3', 'item_chocolate_cake', 'ing_sugar', 0.03),
  ('mii_cc4', 'item_chocolate_cake', 'ing_butter', 0.03);
`;
