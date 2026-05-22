import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail, eventReminderEmail } from '../utils/email.js';
import cron from 'node-cron';

const router = Router();
router.use(authenticate);

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const query = req.user!.role === 'admin'
    ? db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all()
    : db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user!.userId);
  res.json(query);
});

router.put('/:id/read', (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read' });
});

router.put('/read-all', (req: Request, res: Response) => {
  const db = getDb();
  const condition = req.user!.role === 'admin' ? '' : ' WHERE user_id = ?';
  const params = req.user!.role === 'admin' ? [] : [req.user!.userId];
  db.prepare(`UPDATE notifications SET is_read = 1${condition}`).run(...params);
  res.json({ message: 'All marked as read' });
});

router.get('/unread-count', (req: Request, res: Response) => {
  const db = getDb();
  const { count } = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user!.userId) as any;
  res.json({ count });
});

export function scheduleNotificationJobs(): void {
  // Daily reminder for upcoming events (runs at 8am)
  cron.schedule('0 8 * * *', () => {
    const db = getDb();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcoming = db.prepare(`
      SELECT b.*, u.id as user_id, u.name as client_name, u.email as client_email
      FROM bookings b JOIN users u ON b.client_id = u.id
      WHERE b.event_date = ? AND b.status IN ('confirmed', 'in_progress')
    `).all(tomorrow) as any[];

    for (const booking of upcoming) {
      // Create notification
      db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), booking.user_id, 'Event Tomorrow!', `Your ${booking.event_type} event is scheduled for tomorrow at ${booking.venue_name || 'TBD'}.`, 'reminder', booking.id);

      // Send email
      if (booking.client_email) {
        sendEmail({
          to: booking.client_email,
          subject: 'Event Reminder - Tomorrow!',
          html: eventReminderEmail({
            name: booking.client_name,
            eventDate: booking.event_date,
            venue: booking.venue_name || 'TBD',
          }),
        });
      }
    }

    if (upcoming.length > 0) {
      console.log(`[Notifications] Sent ${upcoming.length} event reminders`);
    }
  });

  // Weekly reminder for upcoming events (every Monday at 9am)
  cron.schedule('0 9 * * 1', () => {
    const db = getDb();
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcoming = db.prepare(`
      SELECT b.*, u.id as user_id, u.name as client_name, u.email as client_email
      FROM bookings b JOIN users u ON b.client_id = u.id
      WHERE b.event_date BETWEEN date('now') AND ? AND b.status IN ('confirmed', 'in_progress')
    `).all(weekFromNow) as any[];

    for (const booking of upcoming) {
      db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuid(), booking.user_id, 'Upcoming Event', `Your ${booking.event_type} event on ${booking.event_date} is coming up soon.`, 'reminder', booking.id);
    }

    if (upcoming.length > 0) {
      console.log(`[Notifications] Sent ${upcoming.length} weekly reminders`);
    }
  });

  console.log('[Cron] Notification jobs scheduled');
}

// Admin can send manual notifications
router.post('/send', (req: Request, res: Response) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const parsed = z.object({
    user_id: z.string(),
    title: z.string(),
    message: z.string(),
    type: z.enum(['payment', 'booking', 'menu', 'reminder', 'general']).default('general'),
    reference_id: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), parsed.data.user_id, parsed.data.title, parsed.data.message, parsed.data.type, parsed.data.reference_id || null);

  res.status(201).json({ message: 'Notification sent' });
});

export default router;
