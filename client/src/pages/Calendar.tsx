import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/bookings/calendar/events?month=${month}&year=${year}`).then(r => setEvents(r.data));
  }, [month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else { setMonth(m => m - 1); } };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else { setMonth(m => m + 1); } };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.event_date === dateStr);
  };

  const typeColors: Record<string, string> = {
    wedding: 'bg-pink-100 text-pink-700',
    birthday: 'bg-blue-100 text-blue-700',
    corporate: 'bg-purple-100 text-purple-700',
    private_party: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Events Calendar</h1>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">&larr;</button>
          <h2 className="text-lg font-semibold">{monthName} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">&rarr;</button>
        </div>

        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-gray-500 border-r last:border-r-0">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r p-1 bg-gray-50" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
            return (
              <div key={day} className={`min-h-[100px] border-b border-r p-1 ${isToday ? 'bg-primary-50' : ''}`}>
                <span className={`text-xs font-medium ${isToday ? 'bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                  {isToday ? day : <span className="inline-block p-1">{day}</span>}
                </span>
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map(e => (
                    <Link key={e.id} to={`/bookings/${e.id}`} className={`block text-xs p-1 rounded truncate ${typeColors[e.event_type] || 'bg-gray-100'}`}>
                      {e.event_type.replace('_', ' ')}
                    </Link>
                  ))}
                  {dayEvents.length > 2 && <span className="text-xs text-gray-400 px-1">+{dayEvents.length - 2} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border p-5">
        <h2 className="font-semibold text-gray-900 mb-3">All Events This Month</h2>
        {events.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No events this month</p>
        ) : (
          <div className="space-y-2">
            {events.map(e => (
              <Link key={e.id} to={`/bookings/${e.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[e.event_type] || 'bg-gray-100'}`}>{e.event_type.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{e.client_name}</span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{new Date(e.event_date).toLocaleDateString()}</p>
                  <p>{e.guest_count} guests</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
