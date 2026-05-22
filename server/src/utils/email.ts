import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: process.env.SMTP_USER, ...opts });
    return true;
  } catch {
    console.warn('[Email] Failed to send email');
    return false;
  }
}

export function bookingConfirmationEmail(data: { name: string; eventDate: string; bookingId: string }): string {
  return `<h1>Booking Confirmed</h1><p>Dear ${data.name},</p><p>Your booking for ${data.eventDate} has been confirmed. Booking ID: ${data.bookingId}.</p>`;
}

export function paymentConfirmationEmail(data: { name: string; amount: number; invoiceNumber: string }): string {
  return `<h1>Payment Received</h1><p>Dear ${data.name},</p><p>Your payment of $${data.amount.toFixed(2)} for invoice ${data.invoiceNumber} has been received.</p>`;
}

export function eventReminderEmail(data: { name: string; eventDate: string; venue: string }): string {
  return `<h1>Event Reminder</h1><p>Dear ${data.name},</p><p>This is a reminder for your event on ${data.eventDate} at ${data.venue}.</p>`;
}
