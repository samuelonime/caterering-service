import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', role: 'chef', hourly_rate: '', specialty: '' });

  useEffect(() => { api.get('/staff').then(r => setStaff(r.data)); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/staff', { ...form, hourly_rate: parseFloat(form.hourly_rate) || 0 });
      setShowForm(false);
      setForm({ user_id: '', role: 'chef', hourly_rate: '', specialty: '' });
      api.get('/staff').then(r => setStaff(r.data));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Remove this staff?')) return;
    await api.delete(`/staff/${id}`);
    api.get('/staff').then(r => setStaff(r.data));
  };

  const roleColors: Record<string, string> = { chef: 'bg-red-100 text-red-700', waiter: 'bg-blue-100 text-blue-700', server: 'bg-green-100 text-green-700', cleaner: 'bg-yellow-100 text-yellow-700', coordinator: 'bg-purple-100 text-purple-700', driver: 'bg-teal-100 text-teal-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Add Staff</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">Add Staff Member</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="User ID (from users table)" required value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg">
                <option value="chef">Chef</option>
                <option value="waiter">Waiter</option>
                <option value="server">Server</option>
                <option value="cleaner">Cleaner</option>
                <option value="coordinator">Coordinator</option>
                <option value="driver">Driver</option>
              </select>
              <input type="number" step="0.01" placeholder="Hourly rate" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" />
              <input type="text" placeholder="Specialty (e.g., Pastry, Grills)" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg" />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700">Add</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">{s.name?.charAt(0)}</div>
              <div>
                <p className="font-medium text-gray-900">{s.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[s.role] || 'bg-gray-100 text-gray-700'}`}>{s.role}</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>📧 {s.email}</p>
              <p>📞 {s.phone || 'N/A'}</p>
              <p>💰 ${s.hourly_rate?.toFixed(2)}/hr</p>
              {s.specialty && <p>🔪 {s.specialty}</p>}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.is_available ? 'Available' : 'Busy'}</span>
              <button onClick={() => deleteStaff(s.id)} className="ml-auto text-xs text-red-600 hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
