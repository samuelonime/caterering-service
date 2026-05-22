import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { generateQuoteNumber, generateInvoiceNumber, calculateSubtotal, calculateVAT, calculateTotal } from '../utils/pricing.js';
import { generateQuotePdf, generateInvoicePdf } from '../utils/pdf.js';
import { sendEmail } from '../utils/email.js';

const router = Router();
router.use(authenticate);

router.get('/quotes', (req: Request, res: Response) => {
  const db = getDb();
  let query = 'SELECT q.*, b.event_type, b.event_date, b.guest_count, u.name as client_name, u.email as client_email FROM quotes q JOIN bookings b ON q.booking_id = b.id JOIN users u ON b.client_id = u.id';
  const params: any[] = [];

  if (req.user!.role === 'client') {
    query += ' WHERE b.client_id = ?';
    params.push(req.user!.userId);
  }

  query += ' ORDER BY q.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/quotes', (req: Request, res: Response) => {
  const parsed = z.object({
    booking_id: z.string(),
    delivery_fee: z.number().default(0),
    service_fee: z.number().default(0),
    vat_rate: z.number().default(0.075),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.issues }); return; }

  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(parsed.data.booking_id) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

  const existing = db.prepare('SELECT id FROM quotes WHERE booking_id = ? AND status != \'converted\'').get(parsed.data.booking_id);
  if (existing) { res.status(409).json({ error: 'Quote already exists for this booking. Use PUT to update.' }); return; }

  const menuItems = db.prepare(`
    SELECT bmi.*, mi.name, mi.price_per_head FROM booking_menu_items bmi JOIN menu_items mi ON bmi.menu_item_id = mi.id WHERE bmi.booking_id = ?
  `).all(parsed.data.booking_id) as any[];

  const subtotal = menuItems.reduce((sum, item) => sum + item.price_per_head * (item.quantity || 1), 0) * booking.guest_count;
  const vat = calculateVAT(subtotal, parsed.data.vat_rate);
  const total = calculateTotal({ subtotal, deliveryFee: parsed.data.delivery_fee, serviceFee: parsed.data.service_fee, vat });

  const id = uuid();
  const quoteNumber = generateQuoteNumber();
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO quotes (id, booking_id, quote_number, subtotal, delivery_fee, service_fee, vat, total, valid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, parsed.data.booking_id, quoteNumber, subtotal, parsed.data.delivery_fee, parsed.data.service_fee, vat, total, validUntil);

  // Update booking totals
  db.prepare('UPDATE bookings SET total_amount = ?, delivery_fee = ?, service_fee = ?, vat = ? WHERE id = ?')
    .run(total, parsed.data.delivery_fee, parsed.data.service_fee, vat, parsed.data.booking_id);

  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as any;

  // Generate PDF
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(booking.client_id) as any;
  const pdfUrl = generateQuotePdf({
    quoteNumber, clientName: user?.name || 'Client', clientEmail: user?.email || '',
    eventDate: booking.event_date, eventType: booking.event_type, guestCount: booking.guest_count,
    items: menuItems.map(mi => ({ name: mi.name, price: mi.price_per_head, quantity: mi.quantity || 1 })),
    subtotal, deliveryFee: parsed.data.delivery_fee, serviceFee: parsed.data.service_fee, vat, total, validUntil,
  });

  res.status(201).json({ ...quote, pdf_url: pdfUrl });
});

router.put('/quotes/:id', (req: Request, res: Response) => {
  const db = getDb();
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id) as any;
  if (!quote) { res.status(404).json({ error: 'Quote not found' }); return; }
  if (quote.status === 'converted') { res.status(400).json({ error: 'Cannot update converted quote' }); return; }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(quote.booking_id) as any;
  const deliveryFee = req.body.delivery_fee ?? quote.delivery_fee;
  const serviceFee = req.body.service_fee ?? quote.service_fee;
  const vatRate = req.body.vat_rate ?? 0.075;

  const menuItems = db.prepare(`
    SELECT bmi.*, mi.name, mi.price_per_head FROM booking_menu_items bmi JOIN menu_items mi ON bmi.menu_item_id = mi.id WHERE bmi.booking_id = ?
  `).all(quote.booking_id) as any[];

  const subtotal = menuItems.reduce((sum, item) => sum + item.price_per_head * (item.quantity || 1), 0) * booking.guest_count;
  const vat = calculateVAT(subtotal, vatRate);
  const total = calculateTotal({ subtotal, deliveryFee, serviceFee, vat });

  db.prepare('UPDATE quotes SET subtotal = ?, delivery_fee = ?, service_fee = ?, vat = ?, total = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(subtotal, deliveryFee, serviceFee, vat, total, req.params.id);

  res.json(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
});

router.post('/quotes/:id/convert', (req: Request, res: Response) => {
  const db = getDb();
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id) as any;
  if (!quote) { res.status(404).json({ error: 'Quote not found' }); return; }

  const existingInv = db.prepare('SELECT id FROM invoices WHERE quote_id = ?').get(quote.id);
  if (existingInv) { res.status(409).json({ error: 'Invoice already exists from this quote' }); return; }

  const id = uuid();
  const invoiceNumber = generateInvoiceNumber();
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO invoices (id, booking_id, quote_id, invoice_number, subtotal, delivery_fee, service_fee, vat, total, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
  `).run(id, quote.booking_id, quote.id, invoiceNumber, quote.subtotal, quote.delivery_fee, quote.service_fee, quote.vat, quote.total, dueDate);

  db.prepare('UPDATE quotes SET status = \'converted\', converted_to_invoice = 1 WHERE id = ?').run(quote.id);
  db.prepare('UPDATE bookings SET payment_status = \'pending\' WHERE id = ?').run(quote.booking_id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(quote.booking_id) as any;
  const menuItems = db.prepare(`
    SELECT bmi.*, mi.name, mi.price_per_head FROM booking_menu_items bmi JOIN menu_items mi ON bmi.menu_item_id = mi.id WHERE bmi.booking_id = ?
  `).all(quote.booking_id) as any[];
  const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(booking.client_id) as any;

  const pdfUrl = generateInvoicePdf({
    invoiceNumber, clientName: user?.name || 'Client', clientEmail: user?.email || '',
    eventDate: booking.event_date, eventType: booking.event_type, guestCount: booking.guest_count,
    items: menuItems.map(mi => ({ name: mi.name, price: mi.price_per_head, quantity: mi.quantity || 1 })),
    subtotal: invoice.subtotal, deliveryFee: invoice.delivery_fee, serviceFee: invoice.service_fee, vat: invoice.vat,
    total: invoice.total, dueDate, amountPaid: 0, balance: invoice.total, status: 'sent',
  });

  res.json({ ...invoice, pdf_url: pdfUrl });
});

router.get('/invoices', (req: Request, res: Response) => {
  const db = getDb();
  let query = `SELECT i.*, b.event_type, b.event_date, b.guest_count, u.name as client_name, u.email as client_email
    FROM invoices i JOIN bookings b ON i.booking_id = b.id JOIN users u ON b.client_id = u.id`;
  const params: any[] = [];

  if (req.user!.role === 'client') {
    query += ' WHERE b.client_id = ?';
    params.push(req.user!.userId);
  }

  query += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/invoices/:id', (req: Request, res: Response) => {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT i.*, b.event_type, b.event_date, b.guest_count, b.venue_name, b.delivery_time,
      u.name as client_name, u.email as client_email, u.phone as client_phone
    FROM invoices i JOIN bookings b ON i.booking_id = b.id JOIN users u ON b.client_id = u.id WHERE i.id = ?
  `).get(req.params.id) as any;

  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }
  if (req.user!.role === 'client') {
    const booking = db.prepare('SELECT client_id FROM bookings WHERE id = ?').get(invoice.booking_id) as any;
    if (booking?.client_id !== req.user!.userId) { res.status(403).json({ error: 'Access denied' }); return; }
  }

  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...invoice, payments });
});

router.put('/invoices/:id', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const fields = ['status', 'due_date', 'notes'];
  const updates: string[] = [];
  const params: any[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields' }); return; }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id));
});

// Share link
router.get('/share/:type/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { type, id } = req.params;

  if (type === 'quote') {
    const q = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as any;
    if (!q) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ type: 'quote', data: q });
  } else if (type === 'invoice') {
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
    if (!inv) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ type: 'invoice', data: inv });
  } else {
    res.status(400).json({ error: 'Invalid type' });
  }
});

export default router;
