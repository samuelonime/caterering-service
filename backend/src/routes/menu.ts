import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/categories', (_req: Request, res: Response) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(categories);
});

router.get('/items', (req: Request, res: Response) => {
  const db = getDb();
  const { category_id } = req.query;
  let query = 'SELECT mi.*, c.name as category_name, c.slug as category_slug FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.is_available = 1';
  const params: any[] = [];

  if (category_id) {
    query += ' AND mi.category_id = ?';
    params.push(category_id);
  }

  query += ' ORDER BY c.sort_order, mi.name';
  const items = db.prepare(query).all(...params);
  res.json(items);
});

router.get('/items/:id', (req: Request, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT mi.*, c.name as category_name, c.slug FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.id = ?').get(req.params.id);
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
  res.json(item);
});

router.post('/items', requireRole('admin'), upload.single('image'), (req: Request, res: Response) => {
  const parsed = z.object({
    category_id: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    price_per_head: z.coerce.number().min(0),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const db = getDb();
  const id = uuid();
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare('INSERT INTO menu_items (id, category_id, name, description, price_per_head, image) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, parsed.data.category_id, parsed.data.name, parsed.data.description || null, parsed.data.price_per_head, image);

  res.status(201).json(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id));
});

router.put('/items/:id', requireRole('admin'), upload.single('image'), (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id) as any;
  if (!existing) { res.status(404).json({ error: 'Item not found' }); return; }

  const allowed = ['category_id', 'name', 'description', 'price_per_head', 'is_available'];
  const updates: string[] = [];
  const params: any[] = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (req.file) {
    updates.push('image = ?');
    params.push(`/uploads/${req.file.filename}`);
  }

  if (updates.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json(db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id));
});

router.delete('/items/:id', requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Menu item deleted' });
});

router.get('/packages', (_req: Request, res: Response) => {
  const db = getDb();
  const packages = db.prepare('SELECT * FROM packages WHERE is_active = 1').all() as any[];
  const getItems = db.prepare(`
    SELECT mi.*, c.name as category_name, c.slug as category_slug
    FROM package_items pi
    JOIN menu_items mi ON pi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    WHERE pi.package_id = ?
  `);

  const result = packages.map((pkg: any) => ({
    ...pkg,
    items: getItems.all(pkg.id),
  }));

  res.json(result);
});

router.post('/packages', requireRole('admin'), (req: Request, res: Response) => {
  const parsed = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price_per_head: z.number().min(0),
    menu_item_ids: z.array(z.string()).optional(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.issues }); return; }

  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO packages (id, name, description, price_per_head) VALUES (?, ?, ?, ?)').run(id, parsed.data.name, parsed.data.description || null, parsed.data.price_per_head);

  if (parsed.data.menu_item_ids) {
    const insert = db.prepare('INSERT INTO package_items (id, package_id, menu_item_id) VALUES (?, ?, ?)');
    for (const mid of parsed.data.menu_item_ids) {
      insert.run(uuid(), id, mid);
    }
  }

  res.status(201).json(db.prepare('SELECT * FROM packages WHERE id = ?').get(id));
});

export default router;
