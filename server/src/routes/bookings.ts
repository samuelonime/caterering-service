import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendEmail, bookingConfirmationEmail } from '../utils/email.js';

const router = Router();

const createBookingSchema = z.object({
  event_type: z.enum(['wedding', 'birthday', 'corporate', 'private_party', 'other']),
  event_date: z.string(),
  guest_count: z.number().int().min(1),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  delivery_time: z.string().optional(),
  notes: z.string().optional(),
});

router.use(authenticate);

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { status, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let query = 'SELECT b.*, u.name as client_name, u.email as client_email, u.phone as client_phone FROM bookings b JOIN users u ON b.client_id = u.id';
  const params: any[] = [];

  if (req.user!.role === 'client') {
    query += ' WHERE b.client_id = ?';
    params.push(req.user!.userId);
  }

  if (status) {
    query += params.length ? ' AND' : ' WHERE';
    query += ' b.status = ?';
    params.push(status);
  }

  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string), offset);

  const bookings = db.prepare(query).all(...params);
  const countQuery = query.replace(/SELECT b.*, u.name as client_name, u.email as client_email, u.phone as client_phone/, 'SELECT COUNT(*) as total').replace(/ LIMIT \? OFFSET \?/, '');
  const countParams = params.slice(0, -2);
  const { total } = db.prepare(countQuery).get(...countParams) as any;

  res.json({ bookings, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const booking = db.prepare(`
    SELECT b.*, u.name as client_name, u.email as client_email, u.phone as client_phone,
      p.name as package_name, p.price_per_head as package_price
    FROM bookings b
    JOIN users u ON b.client_id = u.id
    LEFT JOIN packages p ON b.package_id = p.id
    WHERE b.id = ?
  `).get(req.params.id) as any;

  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (req.user!.role === 'client' && booking.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const menuItems = db.prepare(`
    SELECT bmi.*, mi.name, mi.price_per_head, mi.image, c.name as category_name
    FROM booking_menu_items bmi
    JOIN menu_items mi ON bmi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    WHERE bmi.booking_id = ?
  `).all(req.params.id);

  const staff = db.prepare(`
    SELECT sa.*, s.role as staff_role, u.name as staff_name, u.phone as staff_phone
    FROM staff_assignments sa
    JOIN staff s ON sa.staff_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE sa.booking_id = ?
  `).all(req.params.id);

  res.json({ ...booking, menu_items: menuItems, staff_assignments: staff });
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }
  const db = getDb();
  const id = uuid();
  const data = parsed.data;

  db.prepare(`
    INSERT INTO bookings (id, client_id, event_type, event_date, guest_count, venue_name, venue_address, delivery_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user!.userId, data.event_type, data.event_date, data.guest_count, data.venue_name || null, data.venue_address || null, data.delivery_time || null, data.notes || null);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.status(201).json(booking);
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
  if (!existing) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (req.user!.role === 'client' && existing.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const allowed = ['event_type', 'event_date', 'guest_count', 'venue_name', 'venue_address', 'delivery_time', 'notes', 'status'];
  const updates: string[] = [];
  const params: any[] = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  updates.push('updated_at = datetime(\'now\')');
  params.push(req.params.id);
  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (req.body.status === 'confirmed') {
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(existing.client_id) as any;
    if (user?.email) {
      sendEmail({ to: user.email, subject: 'Booking Confirmed', html: bookingConfirmationEmail({ name: user.name, eventDate: existing.event_date, bookingId: existing.id }) });
    }
  }

  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Booking deleted' });
});

router.post('/:id/menu', (req: Request, res: Response) => {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (req.user!.role === 'client' && booking.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { package_id, menu_item_ids } = req.body;
  const bmiDelete = db.prepare('DELETE FROM booking_menu_items WHERE booking_id = ?');
  const bmInsert = db.prepare('INSERT INTO booking_menu_items (id, booking_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)');
  const getItem = db.prepare('SELECT price_per_head FROM menu_items WHERE id = ?');

  let totalAmount = 0;
  let packagePrice = 0;

  bmiDelete.run(req.params.id);

  if (package_id) {
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(package_id) as any;
    if (pkg) {
      packagePrice = pkg.price_per_head;
      const pkgItems = db.prepare('SELECT menu_item_id FROM package_items WHERE package_id = ?').all(package_id) as any[];
      for (const pi of pkgItems) {
        const item = getItem.get(pi.menu_item_id) as any;
        if (item) {
          bmInsert.run(uuid(), req.params.id, pi.menu_item_id, 1, item.price_per_head);
        }
      }
    }
  }

  if (menu_item_ids && Array.isArray(menu_item_ids)) {
    for (const mid of menu_item_ids) {
      const item = getItem.get(mid) as any;
      if (item) {
        bmInsert.run(uuid(), req.params.id, mid, 1, item.price_per_head);
        totalAmount += item.price_per_head;
      }
    }
  }

  const finalPrice = packagePrice > 0 ? packagePrice : totalAmount;
  db.prepare('UPDATE bookings SET package_id = ?, total_amount = ? WHERE id = ?').run(package_id || null, finalPrice * booking.guest_count, req.params.id);

  res.json({ message: 'Menu updated', total: finalPrice * booking.guest_count });
});

router.get('/calendar/events', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const { month, year } = req.query;
  let query = `
    SELECT b.id, b.event_type, b.event_date, b.guest_count, b.status, b.venue_name,
      u.name as client_name, b.delivery_time
    FROM bookings b JOIN users u ON b.client_id = u.id
    WHERE b.status NOT IN ('cancelled')
  `;
  const params: any[] = [];

  if (month && year) {
    query += ' AND strftime(\'%m\', b.event_date) = ? AND strftime(\'%Y\', b.event_date) = ?';
    params.push(String(parseInt(month as string)).padStart(2, '0'), String(year));
  }

  query += ' ORDER BY b.event_date';
  const events = db.prepare(query).all(...params);
  res.json(events);
});

export default router;
