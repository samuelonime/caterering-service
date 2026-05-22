import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || '../client/public/uploads');

export function generateQuotePdf(data: {
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
  total: number;
  validUntil: string;
}): string {
  return generatePdf({
    title: 'QUOTE',
    number: data.quoteNumber,
    ...data,
  });
}

export function generateInvoicePdf(data: {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
  total: number;
  dueDate: string;
  amountPaid: number;
  balance: number;
  status: string;
}): string {
  return generatePdf({
    title: 'INVOICE',
    number: data.invoiceNumber,
    ...data,
  });
}

function generatePdf(data: any): string {
  const doc = new PDFDocument({ margin: 50 });
  const filename = `${data.number.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;
  const filepath = path.join(uploadDir, filename);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('CATERING PRO', 50, 50);
  doc.fontSize(10).font('Helvetica').text('123 Catering Street, Food City', 50, 80);
  doc.text('Phone: +234 800 CATERING | Email: info@cateringpro.com', 50, 95);

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text(data.title, 50, 130);
  doc.fontSize(10).font('Helvetica').text(`Number: ${data.number}`, 50, 155);

  // Client Info
  doc.text('Bill To:', 350, 155);
  doc.text(data.clientName, 350, 170);
  doc.text(data.clientEmail, 350, 185);
  doc.text(`Event: ${data.eventType}`, 350, 200);
  doc.text(`Date: ${data.eventDate}`, 350, 215);
  doc.text(`Guests: ${data.guestCount}`, 350, 230);

  // Line
  doc.moveTo(50, 250).lineTo(545, 250).stroke();

  // Table Header
  const tableTop = 265;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 350, tableTop);
  doc.text('Price/Head', 410, tableTop);
  doc.text('Total', 490, tableTop);

  doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).stroke();

  // Items
  let y = tableTop + 25;
  doc.font('Helvetica');
  for (const item of data.items) {
    doc.text(item.name, 50, y);
    doc.text(String(item.quantity), 350, y);
    doc.text(`$${item.price.toFixed(2)}`, 410, y);
    doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 490, y);
    y += 20;
  }

  // Totals
  y = Math.max(y + 10, 400);
  doc.moveTo(350, y).lineTo(545, y).stroke();
  y += 10;
  doc.text('Subtotal:', 350, y); doc.text(`$${data.subtotal.toFixed(2)}`, 490, y);
  y += 15;
  doc.text('Delivery Fee:', 350, y); doc.text(`$${data.deliveryFee.toFixed(2)}`, 490, y);
  y += 15;
  doc.text('Service Fee:', 350, y); doc.text(`$${data.serviceFee.toFixed(2)}`, 490, y);
  y += 15;
  doc.text('VAT:', 350, y); doc.text(`$${data.vat.toFixed(2)}`, 490, y);
  y += 15;
  doc.moveTo(350, y).lineTo(545, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold').text('Total:', 350, y); doc.text(`$${data.total.toFixed(2)}`, 490, y);

  if (data.amountPaid !== undefined) {
    y += 20;
    doc.font('Helvetica').text(`Amount Paid:`, 350, y);
    doc.text(`$${data.amountPaid.toFixed(2)}`, 490, y);
    y += 15;
    doc.font('Helvetica-Bold').text('Balance:', 350, y);
    doc.text(`$${data.balance.toFixed(2)}`, 490, y);
  }

  if (data.validUntil) {
    y += 30;
    doc.font('Helvetica').text(`Valid until: ${data.validUntil}`, 50, y);
  }
  if (data.dueDate) {
    y += 15;
    doc.text(`Due Date: ${data.dueDate}`, 50, y);
    y += 15;
    doc.text(`Status: ${data.status}`, 50, y);
  }

  doc.fontSize(8).text('Thank you for choosing Catering Pro!', 50, 700, { align: 'center' });

  doc.end();
  return `/uploads/${filename}`;
}
