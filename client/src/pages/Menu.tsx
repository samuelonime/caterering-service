import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function Menu() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminMenu /> : <ClientMenu />;
}

function ClientMenu() {
  const [items, setItems] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState('');

  useEffect(() => {
    api.get('/menu/categories').then(r => {
      setCategories(r.data);
      if (r.data.length > 0) setActiveCat(r.data[0].id);
    });
    api.get('/menu/items').then(r => setItems(r.data));
    api.get('/menu/packages').then(r => setPackages(r.data));
  }, []);

  const filtered = activeCat ? items.filter(i => i.category_id === activeCat) : items;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Our Menu</h1>

      {packages.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Packages</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="font-bold text-lg text-gray-900">{p.name}</h3>
                <p className="text-2xl font-bold text-primary-600 my-2">${p.price_per_head.toFixed(2)}<span className="text-sm text-gray-400">/head</span></p>
                <p className="text-sm text-gray-500 mb-3">{p.description}</p>
                {p.items?.length > 0 && (
                  <div className="space-y-1">
                    {p.items.map((i: any) => (
                      <div key={i.id} className="text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {i.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">A La Carte</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map(c => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCat === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
            {item.image && <img src={item.image} alt={item.name} className="w-full h-36 object-cover rounded-lg mb-3" />}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
              <span className="text-primary-600 font-bold whitespace-nowrap">${item.price_per_head.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">per person</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminMenu() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ category_id: '', name: '', description: '', price_per_head: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(() => {
    api.get('/menu/items').then(r => setItems(r.data));
    api.get('/menu/categories').then(r => setCategories(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditItem(null);
    setForm({ category_id: categories[0]?.id || '', name: '', description: '', price_per_head: '' });
    setFile(null);
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ category_id: item.category_id, name: item.name, description: item.description || '', price_per_head: String(item.price_per_head) });
    setFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('category_id', form.category_id);
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price_per_head', form.price_per_head);
    if (file) fd.append('image', file);

    try {
      if (editItem) {
        await api.put(`/menu/items/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/menu/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false);
      load();
    } catch (err) {
      alert('Failed to save menu item');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/menu/items/${id}`);
    load();
  };

  const grouped = categories.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <button onClick={openNew} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Add Item</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">{editItem ? 'Edit Item' : 'New Menu Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Item name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" rows={2} />
              <input type="number" step="0.01" min="0" placeholder="Price per head" required value={form.price_per_head} onChange={e => setForm({...form, price_per_head: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" />
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full" />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {grouped.map(cat => (
        <div key={cat.id} className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">{cat.name}</h2>
          <div className="space-y-2">
            {cat.items.map((item: any) => (
              <div key={item.id} className="bg-white rounded-lg border p-3 flex items-center gap-4">
                {item.image && <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <span className="font-semibold text-primary-600">${item.price_per_head.toFixed(2)}</span>
                <button onClick={() => openEdit(item)} className="text-xs text-primary-600 hover:underline">Edit</button>
                <button onClick={() => deleteItem(item.id)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
