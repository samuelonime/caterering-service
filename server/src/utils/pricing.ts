export function calculateSubtotal(items: { price_per_head: number; quantity: number }[], guestCount: number): number {
  return items.reduce((sum, item) => sum + item.price_per_head * item.quantity * guestCount, 0);
}

export function calculateVAT(subtotal: number, rate: number = 0.075): number {
  return subtotal * rate;
}

export function calculateTotal(params: {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
}): number {
  return params.subtotal + params.deliveryFee + params.serviceFee + params.vat;
}

export function generateQuoteNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `QTE-${y}${m}${d}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `INV-${y}${m}${d}-${rand}`;
}
