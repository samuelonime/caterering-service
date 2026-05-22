import { Router, Request, Response } from 'express';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', (_req: Request, res: Response) => {
  const db = getDb();

  const totalBookings = (db.prepare('SELECT COUNT(*) as count FROM bookings').get() as any).count;
  const activeBookings = (db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status NOT IN ('completed','cancelled')").get() as any).count;
  const totalRevenue = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = \'success\'').get() as any).total;
  const pendingRevenue = (db.prepare("SELECT COALESCE(SUM(balance), 0) as total FROM invoices WHERE status IN ('sent','partially_paid')").get() as any).total;
  const totalClients = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'client'").get() as any).count;
  const totalStaff = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'staff'").get() as any).count;

  const bookingsThisMonth = (db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE strftime('%Y-%m', event_date) = strftime('%Y-%m', 'now')
  `).get() as any).count;

  res.json({
    totalBookings, activeBookings, totalRevenue, pendingRevenue,
    totalClients, totalStaff, bookingsThisMonth,
  });
});

router.get('/revenue-monthly', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT strftime('%Y-%m', paid_at) as month, COALESCE(SUM(amount), 0) as revenue
    FROM payments WHERE status = 'success' AND paid_at IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all();
  res.json(data);
});

router.get('/popular-dishes', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT mi.name, c.name as category, COUNT(bmi.id) as booking_count, SUM(bmi.quantity * b.guest_count) as total_served
    FROM booking_menu_items bmi
    JOIN menu_items mi ON bmi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    JOIN bookings b ON bmi.booking_id = b.id
    GROUP BY bmi.menu_item_id ORDER BY total_served DESC LIMIT 10
  `).all();
  res.json(data);
});

router.get('/booking-status', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT status, COUNT(*) as count FROM bookings GROUP BY status
  `).all();
  res.json(data);
});

router.get('/payment-status', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT payment_status, COUNT(*) as count FROM bookings GROUP BY payment_status
  `).all();
  res.json(data);
});

router.get('/recent-bookings', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT b.*, u.name as client_name FROM bookings b
    JOIN users u ON b.client_id = u.id
    ORDER BY b.created_at DESC LIMIT 10
  `).all();
  res.json(data);
});

router.get('/upcoming-events', (_req: Request, res: Response) => {
  const db = getDb();
  const data = db.prepare(`
    SELECT b.*, u.name as client_name, u.phone as client_phone
    FROM bookings b JOIN users u ON b.client_id = u.id
    WHERE b.event_date >= date('now') AND b.status NOT IN ('completed','cancelled')
    ORDER BY b.event_date ASC LIMIT 10
  `).all();
  res.json(data);
});

export default router;
