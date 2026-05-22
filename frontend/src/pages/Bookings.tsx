import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Bookings() {
  const { id } = useParams();
  if (id) return <BookingDetail bookingId={id} />;
  return <BookingList />;
}

function BookingList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? `?status=${filter}` : '';
    api.get(`/bookings${params}`).then(r => setBookings(r.data.bookings));
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <Link to="/bookings/new" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">New Booking</Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {bookings.map(b => (
          <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize text-gray-900">{b.event_type.replace('_', ' ')}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{b.status}</span>
              </div>
              <span className="text-sm font-semibold text-primary-600">${(b.total_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
              <span>📅 {new Date(b.event_date).toLocaleDateString()}</span>
              <span>👥 {b.guest_count} guests</span>
              {b.venue_name && <span>📍 {b.venue_name}</span>}
              <span>💳 {b.payment_status}</span>
            </div>
          </Link>
        ))}
        {bookings.length === 0 && <p className="text-center text-gray-400 py-8">No bookings found</p>}
      </div>
    </div>
  );
}

function BookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then(r => {
      setBooking(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-32 bg-gray-200 rounded" /></div>;
  if (!booking) return <p className="text-gray-500">Booking not found</p>;

  return (
    <div>
      <Link to="/bookings" className="text-sm text-primary-600 hover:underline mb-4 inline-block">&larr; Back to Bookings</Link>

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold capitalize text-gray-900">{booking.event_type.replace('_', ' ')} Event</h1>
            <p className="text-sm text-gray-500">Booking ID: {booking.id.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
            }`}>{booking.status}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
              booking.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>{booking.payment_status}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Event Date</p><p className="font-medium">{new Date(booking.event_date).toLocaleDateString()}</p></div>
          <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Guests</p><p className="font-medium">{booking.guest_count}</p></div>
          <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Venue</p><p className="font-medium">{booking.venue_name || 'TBD'}</p></div>
          <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Delivery Time</p><p className="font-medium">{booking.delivery_time || 'TBD'}</p></div>
        </div>

        {booking.notes && <div className="bg-gray-50 p-3 rounded-lg mb-4"><p className="text-xs text-gray-500">Notes</p><p className="text-sm">{booking.notes}</p></div>}
      </div>

      {booking.menu_items?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Menu Items</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {booking.menu_items.map((mi: any) => (
              <div key={mi.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">{mi.name}</span>
                <span className="text-xs text-gray-500">${mi.price_at_time.toFixed(2)}/head</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {booking.staff_assignments?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Assigned Staff</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {booking.staff_assignments.map((sa: any) => (
              <div key={sa.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">{sa.staff_name} <span className="text-xs text-gray-500">({sa.staff_role})</span></span>
                <span className="text-xs text-gray-500">{sa.hours_allocated}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="flex gap-3">
          <Link to={`/invoices?booking=${booking.id}`} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">View Invoice</Link>
          <Link to={`/messages?booking=${booking.id}`} className="bg-white border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Message Client</Link>
        </div>
      )}
    </div>
  );
}

export function NewBooking() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    event_type: 'birthday', event_date: '', guest_count: 1,
    venue_name: '', venue_address: '', delivery_time: '', notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/bookings', form);
      navigate(`/bookings/${res.data.id}`);
    } catch (err) {
      alert('Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Booking</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="wedding">Wedding</option>
              <option value="birthday">Birthday</option>
              <option value="corporate">Corporate</option>
              <option value="private_party">Private Party</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
            <input type="date" required value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Guests</label>
            <input type="number" min={1} required value={form.guest_count} onChange={e => setForm({...form, guest_count: parseInt(e.target.value) || 1})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
            <input type="time" value={form.delivery_time} onChange={e => setForm({...form, delivery_time: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
          <input type="text" value={form.venue_name} onChange={e => setForm({...form, venue_name: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Event venue name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
          <input type="text" value={form.venue_address} onChange={e => setForm({...form, venue_address: e.target.value})} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Full address" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Any special requests..." />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Booking'}
        </button>
      </form>
    </div>
  );
}
