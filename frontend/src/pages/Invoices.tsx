import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function Invoices() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState('full');
  const [tab, setTab] = useState('invoices');
  const [params] = useSearchParams();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get('/invoices/quotes').then(r => setQuotes(r.data));
    api.get('/invoices/invoices').then(r => setInvoices(r.data));
  }, []);

  // Generate quote for a booking
  const generateQuote = async (bookingId: string) => {
    try {
      const res = await api.post('/invoices/quotes', { booking_id: bookingId, delivery_fee: 0, service_fee: 0, vat_rate: 0.075 });
      alert('Quote generated!');
      api.get('/invoices/quotes').then(r => setQuotes(r.data));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const convertToInvoice = async (quoteId: string) => {
    try {
      const res = await api.post(`/invoices/quotes/${quoteId}/convert`);
      alert('Invoice created!');
      api.get('/invoices/invoices').then(r => setInvoices(r.data));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const initializePayment = async (invoiceId: string) => {
    if (!paymentAmount || paymentAmount <= 0) { alert('Enter a valid amount'); return; }
    try {
      const res = await api.post('/payments/initialize', { invoice_id: invoiceId, amount: paymentAmount, type: paymentType });
      if (res.data.authorization_url) {
        window.open(res.data.authorization_url, '_blank');
      } else {
        alert(`Payment reference: ${res.data.reference}\n${res.data.message || 'Pay with this reference.'}`);
      }
      setShowPayment(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices & Payments</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('invoices')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'invoices' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Invoices</button>
        <button onClick={() => setTab('quotes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'quotes' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Quotes</button>
      </div>

      {tab === 'quotes' && (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">{q.quote_number}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${q.status === 'converted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{q.status}</span>
                </div>
                <span className="font-bold text-primary-600">${q.total?.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500">{q.client_name} | {new Date(q.event_date).toLocaleDateString()} | {q.guest_count} guests</p>
              {q.valid_until && <p className="text-xs text-gray-400 mt-1">Valid until: {q.valid_until}</p>}
              <div className="flex gap-2 mt-3">
                {isAdmin && q.status !== 'converted' && (
                  <button onClick={() => convertToInvoice(q.id)} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700">Convert to Invoice</button>
                )}
              </div>
            </div>
          ))}
          {quotes.length === 0 && <p className="text-center text-gray-400 py-8">No quotes yet</p>}
        </div>
      )}

      {tab === 'invoices' && (
        <>
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-900">{inv.invoice_number}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{inv.status}</span>
                  </div>
                  <span className="font-bold text-primary-600">${inv.total?.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500">{inv.client_name} | {new Date(inv.event_date).toLocaleDateString()} | {inv.guest_count} guests</p>
                {inv.due_date && <p className="text-xs text-gray-400 mt-1">Due: {inv.due_date} | Paid: ${(inv.amount_paid || 0).toFixed(2)} | Balance: ${(inv.balance || inv.total).toFixed(2)}</p>}
                <div className="flex gap-2 mt-3">
                  {!isAdmin && inv.status !== 'paid' && (
                    <button onClick={() => { setSelectedInvoice(inv); setPaymentAmount(inv.balance || inv.total); setShowPayment(true); }} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-700">Pay Now</button>
                  )}
                  <button onClick={() => setSelectedInvoice(inv)} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">View Details</button>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-center text-gray-400 py-8">No invoices yet</p>}
          </div>

          {/* Payment Modal */}
          {showPayment && selectedInvoice && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="font-semibold text-lg mb-4">Make Payment</h2>
                <p className="text-sm text-gray-500 mb-4">Invoice: {selectedInvoice.invoice_number} | Total: ${selectedInvoice.total.toFixed(2)}</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="number" min={1} value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2.5 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg">
                      <option value="full">Full Payment</option>
                      <option value="deposit">Deposit</option>
                      <option value="final_balance">Final Balance</option>
                    </select>
                  </div>
                  <button onClick={() => initializePayment(selectedInvoice.id)} className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700">Proceed to Payment</button>
                  <button onClick={() => setShowPayment(false)} className="w-full bg-gray-100 py-2.5 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
