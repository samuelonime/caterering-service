import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <ClientDashboard />;
}

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data));
    api.get('/dashboard/recent-bookings').then(r => setRecent(r.data));
    api.get('/dashboard/upcoming-events').then(r => setUpcoming(r.data));
    api.get('/dashboard/popular-dishes').then(r => setPopular(r.data));
  }, []);

  const cards = [
    { label: 'Total Bookings', value: stats?.totalBookings ?? '...', color: 'bg-blue-500' },
    { label: 'Active Events', value: stats?.activeBookings ?? '...', color: 'bg-green-500' },
    { label: 'Revenue (Total)', value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, color: 'bg-primary-600' },
    { label: 'Pending Payments', value: `$${(stats?.pendingRevenue ?? 0).toLocaleString()}`, color: 'bg-yellow-500' },
    { label: 'Total Clients', value: stats?.totalClients ?? '...', color: 'bg-purple-500' },
    { label: 'Staff', value: stats?.totalStaff ?? '...', color: 'bg-teal-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border p-4">
            <div className={`w-3 h-3 rounded-full ${c.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Bookings</h2>
          <div className="space-y-3">
            {recent.slice(0, 5).map((b: any) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.client_name}</p>
                  <p className="text-xs text-gray-500">{b.event_type} - {new Date(b.event_date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{b.status}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.client_name}</p>
                  <p className="text-xs text-gray-500">{b.event_type} - {new Date(b.event_date).toLocaleDateString()} | {b.guest_count} guests</p>
                </div>
                <span className="text-xs text-gray-400">{b.venue_name || 'TBD'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Popular Dishes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Dish</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium text-right">Times Booked</th>
                <th className="pb-2 font-medium text-right">Total Served</th>
              </tr>
            </thead>
            <tbody>
              {popular.map((d: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2.5 font-medium text-gray-900">{d.name}</td>
                  <td className="py-2.5 text-gray-500">{d.category}</td>
                  <td className="py-2.5 text-right">{d.booking_count}</td>
                  <td className="py-2.5 text-right font-medium">{d.total_served}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClientDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/bookings').then(r => setBookings(r.data.bookings));
  }, []);

  const active = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="text-gray-500">Manage your events and orders</p>
        </div>
        <Link to="/bookings/new" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm">
          New Booking
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h2>
          <p className="text-gray-500 mb-4">Start by creating a new booking for your event</p>
          <Link to="/bookings/new" className="inline-block bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">Create Booking</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Active Events</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {active.map(b => (
                  <Link key={b.id} to={`/bookings/${b.id}`} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium capitalize bg-primary-50 text-primary-700">{b.event_type.replace('_', ' ')}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        b.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        b.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{b.payment_status}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{new Date(b.event_date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">{b.guest_count} guests {b.venue_name ? `at ${b.venue_name}` : ''}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary-600">${b.total_amount?.toFixed(2) || '0.00'}</span>
                      <span className="text-xs text-gray-400">total</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Past Events</h2>
              <div className="space-y-2">
                {past.map(b => (
                  <Link key={b.id} to={`/bookings/${b.id}`} className="flex items-center justify-between bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{b.event_type.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(b.event_date).toLocaleDateString()} | {b.guest_count} guests</p>
                    </div>
                    <span className="text-xs text-gray-400">{b.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
