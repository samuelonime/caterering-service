import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { sendEmail, paymentConfirmationEmail } from '../utils/email.js';

const router = Router();
router.use(authenticate);

// Initialize payment with Paystack
router.post('/initialize', (req: Request, res: Response) => {
  const parsed = z.object({
    invoice_id: z.string(),
    amount: z.number().min(1),
    type: z.enum(['deposit', 'final_balance', 'full']),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(parsed.data.invoice_id) as any;
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return; }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(invoice.booking_id) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

  if (req.user!.role === 'client' && booking.client_id !== req.user!.userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const reference = `PAY-${uuid().slice(0, 8).toUpperCase()}`;
  const paymentId = uuid();

  db.prepare(`
    INSERT INTO payments (id, invoice_id, booking_id, amount, payment_method, reference, status, type)
    VALUES (?, ?, ?, ?, 'paystack', ?, 'pending', ?)
  `).run(paymentId, parsed.data.invoice_id, invoice.booking_id, parsed.data.amount, reference, parsed.data.type);

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (paystackSecret) {
    // Call Paystack API to initialize transaction
    const https = require('https');
    const params = JSON.stringify({
      email: req.user!.email,
      amount: Math.round(parsed.data.amount * 100),
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || `http://localhost:5000/api/payments/verify`,
    });

    const options = {
      hostname: 'api.paystack.co', port: 443, path: '/transaction/initialize',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${paystackSecret}`, 'Content-Type': 'application/json', 'Content-Length': params.length },
    };

    const paystackReq = https.request(options, (paystackRes: any) => {
      let data = '';
      paystackRes.on('data', (chunk: string) => data += chunk);
      paystackRes.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status) {
            res.json({ payment_id: paymentId, reference, authorization_url: response.data.authorization_url });
          } else {
            res.json({ payment_id: paymentId, reference, authorization_url: null, message: response.message });
          }
        } catch { res.json({ payment_id: paymentId, reference, authorization_url: null }); }
      });
    });

    paystackReq.on('error', () => {
      res.json({ payment_id: paymentId, reference, authorization_url: null, message: 'Paystack error' });
    });

    paystackReq.write(params);
    paystackReq.end();
  } else {
    // No Paystack configured - return reference for manual processing
    res.json({ payment_id: paymentId, reference, authorization_url: null, message: 'Payment gateway not configured. Reference generated for manual processing.' });
  }
});

// Verify payment
router.get('/verify', (req: Request, res: Response) => {
  const { reference, trxref } = req.query;
  const ref = reference || trxref;

  if (!ref) { res.status(400).json({ error: 'Reference required' }); return; }

  const db = getDb();
  const payment = db.prepare('SELECT * FROM payments WHERE reference = ?').get(ref as string) as any;
  if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (paystackSecret) {
    const https = require('https');
    https.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref as string)}`, {
      headers: { 'Authorization': `Bearer ${paystackSecret}` },
    }, (paystackRes: any) => {
      let data = '';
      paystackRes.on('data', (chunk: string) => data += chunk);
      paystackRes.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.status && response.data.status === 'success') {
            confirmPayment(db, payment);
            res.json({ status: 'success', payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id) });
          } else {
            res.json({ status: 'failed', payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id) });
          }
        } catch { res.json({ status: 'error', message: 'Verification failed' }); }
      });
    });
  } else {
    // Manual confirmation
    confirmPayment(db, payment);
    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/client/invoices?payment=success`);
  }
});

function confirmPayment(db: any, payment: any) {
  db.prepare('UPDATE payments SET status = \'success\', paid_at = datetime(\'now\') WHERE id = ?').run(payment.id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(payment.invoice_id) as any;
  const newAmountPaid = (invoice.amount_paid || 0) + payment.amount;
  const newBalance = invoice.total - newAmountPaid;
  let paymentStatus = 'partially_paid';
  let invoiceStatus = 'partially_paid';

  if (newBalance <= 0) {
    paymentStatus = 'paid';
    invoiceStatus = 'paid';
  }

  db.prepare('UPDATE invoices SET amount_paid = ?, balance = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newAmountPaid, Math.max(0, newBalance), invoiceStatus, payment.invoice_id);

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(invoice.booking_id) as any;
  db.prepare('UPDATE bookings SET payment_status = ?, deposit_amount = ?, balance_amount = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(paymentStatus, newAmountPaid, Math.max(0, newBalance), invoice.booking_id);

  // Notify user
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(booking.client_id) as any;
  if (user?.email) {
    sendEmail({
      to: user.email,
      subject: 'Payment Received',
      html: paymentConfirmationEmail({ name: user.name, amount: payment.amount, invoiceNumber: invoice.invoice_number }),
    });
  }

  // Create notification
  if (user) {
    db.prepare('INSERT INTO notifications (id, user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuid(), user.id, 'Payment Received', `Payment of $${payment.amount.toFixed(2)} confirmed for invoice ${invoice.invoice_number}`, 'payment', invoice.id);
  }
}

router.get('/history', (req: Request, res: Response) => {
  const db = getDb();
  let query = `SELECT p.*, i.invoice_number, b.event_type, b.event_date
    FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN bookings b ON p.booking_id = b.id`;
  const params: any[] = [];

  if (req.user!.role === 'client') {
    query += ' WHERE b.client_id = ?';
    params.push(req.user!.userId);
  }

  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

export default router;
