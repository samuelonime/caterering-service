import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDb, saveDb, getDb } from './database/connection.js';
import { initializeDatabase } from './database/init.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import menuRoutes from './routes/menu.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import staffRoutes from './routes/staff.js';
import inventoryRoutes from './routes/inventory.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import messageRoutes from './routes/messages.js';
import { scheduleNotificationJobs } from './routes/notifications.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, process.env.UPLOAD_DIR || '../client/public/uploads')));

async function start() {
  // Initialize database (async - loads sql.js WASM)
  await initializeDb();
  initializeDatabase();
  saveDb();

  // Seed admin user
  const db = getDb();
  const admin = db.prepare("SELECT id FROM users WHERE email = 'admin@catering.com'").get();
  if (!admin) {
    const id = uuid();
    const hashed = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (id, email, password, name, phone, role) VALUES (?, ?, ?, ?, ?, 'admin')")
      .run(id, 'admin@catering.com', hashed, 'Admin User', '+2348000000000');
    saveDb();
    console.log('[Seed] Admin user created: admin@catering.com / admin123');
  }

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/messages', messageRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Schedule notification jobs
  scheduleNotificationJobs();

  app.listen(PORT, () => {
    console.log(`[Server] Catering API running on http://localhost:${PORT}`);
    console.log(`[Server] Admin login: admin@catering.com / admin123`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
