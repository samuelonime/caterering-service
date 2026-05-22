import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/ingredients', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM ingredients ORDER BY name').all());
});

router.post('/ingredients', requireRole('admin'), (req: Request, res: Response) => {
  const parsed = z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    unit_cost: z.number().default(0),
    category: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO ingredients (id, name, unit, unit_cost, category) VALUES (?, ?, ?, ?, ?)')
    .run(id, parsed.data.name, parsed.data.unit, parsed.data.unit_cost, parsed.data.category || null);

  res.status(201).json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id));
});

router.put('/ingredients/:id', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const fields = ['name', 'unit', 'unit_cost', 'category'];
  const updates: string[] = [];
  const params: any[] = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
  }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields' }); return; }
  params.push(req.params.id);
  db.prepare(`UPDATE ingredients SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json(db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id));
});

router.delete('/ingredients/:id', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM ingredients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ingredient deleted' });
});

// Link ingredients to menu items
router.post('/menu-ingredients', requireRole('admin'), (req: Request, res: Response) => {
  const parsed = z.object({
    menu_item_id: z.string(),
    ingredient_id: z.string(),
    quantity_per_head: z.number().min(0),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return; }

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO menu_item_ingredients (id, menu_item_id, ingredient_id, quantity_per_head) VALUES (?, ?, ?, ?)')
    .run(id, parsed.data.menu_item_id, parsed.data.ingredient_id, parsed.data.quantity_per_head);

  res.status(201).json(db.prepare('SELECT * FROM menu_item_ingredients WHERE id = ?').get(id));
});

// Generate shopping list for a booking
router.post('/shopping-list/:bookingId', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId) as any;
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

  // Get menu items for this booking
  const menuItems = db.prepare('SELECT menu_item_id FROM booking_menu_items WHERE booking_id = ?').all(req.params.bookingId) as any[];

  // Clear existing shopping list
  db.prepare('DELETE FROM shopping_lists WHERE booking_id = ?').run(req.params.bookingId);

  let totalCost = 0;
  const insert = db.prepare('INSERT INTO shopping_lists (id, booking_id, ingredient_id, quantity, unit, estimated_cost) VALUES (?, ?, ?, ?, ?, ?)');

  for (const bmi of menuItems) {
    const ingredients = db.prepare(`
      SELECT mii.quantity_per_head, i.name, i.unit, i.unit_cost, i.id as ingredient_id
      FROM menu_item_ingredients mii
      JOIN ingredients i ON mii.ingredient_id = i.id
      WHERE mii.menu_item_id = ?
    `).all(bmi.menu_item_id) as any[];

    for (const ing of ingredients) {
      const totalQty = ing.quantity_per_head * booking.guest_count;
      const cost = totalQty * ing.unit_cost;
      totalCost += cost;

      // Check if ingredient already added
      const existing = db.prepare('SELECT id, quantity, estimated_cost FROM shopping_lists WHERE booking_id = ? AND ingredient_id = ?')
        .get(req.params.bookingId, ing.ingredient_id) as any;

      if (existing) {
        db.prepare('UPDATE shopping_lists SET quantity = quantity + ?, estimated_cost = estimated_cost + ? WHERE id = ?')
          .run(totalQty, cost, existing.id);
      } else {
        insert.run(uuid(), req.params.bookingId, ing.ingredient_id, totalQty, ing.unit, cost);
      }
    }
  }

  res.json({
    message: 'Shopping list generated',
    total_estimated_cost: totalCost,
    items: db.prepare(`
      SELECT sl.*, i.name as ingredient_name, i.category as ingredient_category
      FROM shopping_lists sl JOIN ingredients i ON sl.ingredient_id = i.id
      WHERE sl.booking_id = ? ORDER BY i.category, i.name
    `).all(req.params.bookingId),
  });
});

router.get('/shopping-list/:bookingId', (req: Request, res: Response) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT sl.*, i.name as ingredient_name, i.category as ingredient_category
    FROM shopping_lists sl JOIN ingredients i ON sl.ingredient_id = i.id
    WHERE sl.booking_id = ? ORDER BY i.category, i.name
  `).all(req.params.bookingId);

  const total = items.reduce((sum: number, item: any) => sum + item.estimated_cost, 0);
  res.json({ items, total_estimated_cost: total });
});

router.put('/shopping-list/:id/purchase', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('UPDATE shopping_lists SET is_purchased = ? WHERE id = ?').run(req.body.is_purchased ? 1 : 0, req.params.id);
  res.json({ message: 'Updated' });
});

export default router;
