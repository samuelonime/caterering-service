import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Inventory() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [shoppingList, setShoppingList] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', unit_cost: '', category: '' });

  useEffect(() => {
    api.get('/inventory/ingredients').then(r => setIngredients(r.data));
    api.get('/bookings').then(r => setBookings(r.data.bookings));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/ingredients', { ...form, unit_cost: parseFloat(form.unit_cost) || 0 });
      setShowForm(false);
      setForm({ name: '', unit: '', unit_cost: '', category: '' });
      api.get('/inventory/ingredients').then(r => setIngredients(r.data));
    } catch { alert('Failed'); }
  };

  const generateList = async () => {
    if (!selectedBooking) { alert('Select a booking'); return; }
    const res = await api.post(`/inventory/shopping-list/${selectedBooking}`);
    setShoppingList(res.data);
  };

  const togglePurchased = async (id: string, val: boolean) => {
    await api.put(`/inventory/shopping-list/${id}/purchase`, { is_purchased: val });
    if (selectedBooking) generateList();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Inventory & Ingredients</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Ingredients</h2>
            <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700">+ Add</button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-4 mb-4 space-y-2">
              <input type="text" placeholder="Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <input type="text" placeholder="Unit (kg, litre)" required value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <input type="number" step="0.01" placeholder="Cost" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <input type="text" placeholder="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ingredients.map(ing => (
              <div key={ing.id} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{ing.name}</p>
                  <p className="text-xs text-gray-500">{ing.category || 'Uncategorized'} | ${ing.unit_cost?.toFixed(2)} per {ing.unit}</p>
                </div>
                <span className="text-xs text-gray-400">{ing.unit}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Shopping List Generator</h2>
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Booking</label>
            <select value={selectedBooking} onChange={e => setSelectedBooking(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg mb-3">
              <option value="">Choose a booking...</option>
              {bookings.map((b: any) => (
                <option key={b.id} value={b.id}>{b.event_type} - {new Date(b.event_date).toLocaleDateString()} ({b.guest_count} guests)</option>
              ))}
            </select>
            <button onClick={generateList} className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Generate Shopping List</button>
          </div>

          {shoppingList && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Shopping List</h3>
                <span className="text-sm font-bold text-primary-600">Total: ${shoppingList.total_estimated_cost?.toFixed(2)}</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {shoppingList.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={item.is_purchased} onChange={e => togglePurchased(item.id, e.target.checked)} className="rounded" />
                      <div>
                        <p className={`text-sm font-medium ${item.is_purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.ingredient_name}</p>
                        <p className="text-xs text-gray-500">{item.quantity?.toFixed(2)} {item.unit}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium">${item.estimated_cost?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
