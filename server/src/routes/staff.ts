import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const staff = db.prepare(`
    SELECT s.*, u.name, u.email, u.phone, u.avatar
    FROM staff s JOIN users u ON s.user_id = u.id ORDER BY u.name
  `).all();
  res.json(staff);
});

router.post('/', (req: Request, res: Response) => {
  const parsed = z.object({
    user_id: z.string(),
    role: z.enum(['chef', 'waiter', 'server', 'cleaner', 'coordinator', 'driver']),
    hourly_rate: z.number().default(0),
    specialty: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();

  // Update user role to staff if needed
  db.prepare("UPDATE users SET role = 'staff' WHERE id = ? AND role = 'client'").run(parsed.data.user_id);

  const id = uuid();
  db.prepare('INSERT INTO staff (id, user_id, role, hourly_rate, specialty) VALUES (?, ?, ?, ?, ?)')
    .run(id, parsed.data.user_id, parsed.data.role, parsed.data.hourly_rate, parsed.data.specialty || null);

  // Create staff user if not exists
  const existingStaff = db.prepare('SELECT * FROM staff WHERE user_id = ?').get(parsed.data.user_id);
  if (existingStaff) {
    res.status(409).json({ error: 'User already registered as staff' });
    return;
  }

  res.status(201).json(db.prepare('SELECT s.*, u.name, u.email, u.phone FROM staff s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(id));
});

router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const fields = ['role', 'hourly_rate', 'is_available', 'specialty'];
  const updates: string[] = [];
  const params: any[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields' }); return; }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE staff SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json(db.prepare('SELECT s.*, u.name, u.email, u.phone FROM staff s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(req.params.id));
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM staff_assignments WHERE staff_id = ?').run(req.params.id);
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  res.json({ message: 'Staff deleted' });
});

// Assign staff to booking
router.post('/assign', (req: Request, res: Response) => {
  const parsed = z.object({
    staff_id: z.string(),
    booking_id: z.string(),
    role: z.string(),
    hours_allocated: z.number().default(0),
    notes: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO staff_assignments (id, staff_id, booking_id, role, hours_allocated, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, parsed.data.staff_id, parsed.data.booking_id, parsed.data.role, parsed.data.hours_allocated, parsed.data.notes || null);

  res.status(201).json(db.prepare(`
    SELECT sa.*, s.role as staff_role, u.name as staff_name, u.phone as staff_phone
    FROM staff_assignments sa JOIN staff s ON sa.staff_id = s.id JOIN users u ON s.user_id = u.id WHERE sa.id = ?
  `).get(id));
});

router.delete('/assign/:id', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM staff_assignments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Assignment removed' });
});

router.get('/calendar', (req: Request, res: Response) => {
  const db = getDb();
  const { month, year, staff_id } = req.query;
  let query = `
    SELECT sa.*, s.role as staff_role, u.name as staff_name, u.phone as staff_phone,
      b.event_type, b.event_date, b.venue_name, b.delivery_time, b.guest_count
    FROM staff_assignments sa
    JOIN staff s ON sa.staff_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN bookings b ON sa.booking_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (staff_id) { query += ' AND sa.staff_id = ?'; params.push(staff_id); }
  if (month && year) {
    query += " AND strftime('%m', b.event_date) = ? AND strftime('%Y', b.event_date) = ?";
    params.push(String(parseInt(month as string)).padStart(2, '0'), String(year));
  }

  query += ' ORDER BY b.event_date';
  res.json(db.prepare(query).all(...params));
});

export default router;
