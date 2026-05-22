import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/:bookingId', (req: Request, res: Response) => {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (req.user!.role === 'client' && booking.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.booking_id = ? ORDER BY m.created_at ASC
  `).all(req.params.bookingId);

  // Mark messages as read
  db.prepare('UPDATE messages SET is_read = 1 WHERE booking_id = ? AND sender_id != ?').run(req.params.bookingId, req.user!.userId);

  res.json(messages);
});

router.post('/:bookingId', (req: Request, res: Response) => {
  const parsed = z.object({ message: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Message is required' }); return; }

  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (req.user!.role === 'client' && booking.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const id = uuid();
  db.prepare('INSERT INTO messages (id, booking_id, sender_id, message) VALUES (?, ?, ?, ?)')
    .run(id, req.params.bookingId, req.user!.userId, parsed.data.message);

  // Notify the other party
  const notifyUserId = req.user!.role === 'client' ? 'admin' : booking.client_id;
  const title = req.user!.role === 'client' ? 'New message from client' : 'New message from admin';

  if (notifyUserId === 'admin') {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as any[];
    for (const admin of admins) {
      db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), admin.id, title, parsed.data.message.substring(0, 100), 'general', req.params.bookingId);
    }
  } else {
    db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), notifyUserId, title, parsed.data.message.substring(0, 100), 'general', req.params.bookingId);
  }

  const msg = db.prepare(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?
  `).get(id);

  res.status(201).json(msg);
});

// Get conversation list (for client: bookings they have messages for)
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  let query = `
    SELECT DISTINCT b.id, b.event_type, b.event_date, b.status,
      u.name as client_name,
      (SELECT message FROM messages WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE booking_id = b.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE booking_id = b.id AND is_read = 0 AND sender_id != ?) as unread_count
    FROM messages m
    JOIN bookings b ON m.booking_id = b.id
    JOIN users u ON b.client_id = u.id
  `;
  const params: any[] = [req.user!.userId];

  if (req.user!.role === 'client') {
    query += ' WHERE b.client_id = ?';
    params.push(req.user!.userId);
  }

  query += ' ORDER BY last_message_at DESC';
  res.json(db.prepare(query).all(...params));
});

export default router;
