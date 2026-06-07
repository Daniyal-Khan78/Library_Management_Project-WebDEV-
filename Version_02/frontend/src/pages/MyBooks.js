import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

// ── Card Payment Modal ──────────────────────────────────────────────────
function PaymentModal({ record, fine, onClose, onSuccess }) {
  const [cardType, setCardType] = useState('visa');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const validate = () => {
    const e = {};
    const rawCard = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(rawCard)) e.cardNumber = 'Card number must be 16 digits.';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = 'Expiry must be MM/YY.';
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = 'CVV must be 3–4 digits.';
    if (!name.trim()) e.name = 'Name on card is required.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setProcessing(true);
    await onSuccess(record.id);
    setProcessing(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className="modal-box payment-modal">
        <div className="modal-header">
          <h3>💳 Pay Fine</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="payment-summary">
          <span>Fine for <strong>"{record.book_title}"</strong></span>
          <span className="fine-total">${parseFloat(fine).toFixed(2)}</span>
        </div>

        <div className="card-type-row">
          <label className={`card-type-btn ${cardType === 'visa' ? 'selected' : ''}`}>
            <input type="radio" name="cardType" value="visa" checked={cardType === 'visa'} onChange={() => setCardType('visa')} />
            <span>VISA</span>
          </label>
          <label className={`card-type-btn ${cardType === 'mastercard' ? 'selected' : ''}`}>
            <input type="radio" name="cardType" value="mastercard" checked={cardType === 'mastercard'} onChange={() => setCardType('mastercard')} />
            <span>Mastercard</span>
          </label>
        </div>

        <div className="form-group">
          <label>Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={e => setName(e.target.value)}
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label>Card Number</label>
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            className={errors.cardNumber ? 'input-error' : ''}
          />
          {errors.cardNumber && <span className="field-error">{errors.cardNumber}</span>}
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>Expiry (MM/YY)</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              maxLength={5}
              className={errors.expiry ? 'input-error' : ''}
            />
            {errors.expiry && <span className="field-error">{errors.expiry}</span>}
          </div>
          <div className="form-group">
            <label>CVV</label>
            <input
              type="text"
              placeholder="123"
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className={errors.cvv ? 'input-error' : ''}
            />
            {errors.cvv && <span className="field-error">{errors.cvv}</span>}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={processing}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={processing}>
            {processing ? 'Processing…' : `Pay $${parseFloat(fine).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────
function MyBooks() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [payModal, setPayModal] = useState(null); // { record, fine }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activeRes, histRes] = await Promise.all([
        api.getMyBooks(token),
        api.getMyHistory(token),
      ]);
      if (activeRes.ok) setRecords(await activeRes.json());
      if (histRes.ok) setHistory(await histRes.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const handleReturn = async (record) => {
    const fine = calcFine(record);
    if (parseFloat(fine) > 0 && !record.fine_paid) {
      showMessage(`You must pay the $${parseFloat(fine).toFixed(2)} fine before returning this book.`, 'error');
      return;
    }
    const res = await api.returnBook(token, record.book);
    if (res.ok) { showMessage('Book returned successfully!'); fetchData(); }
    else {
      const d = await res.json();
      showMessage(d.error || 'Failed to return book.', 'error');
    }
  };

  const handlePayFineConfirm = async (recordId) => {
    const res = await api.payFine(token, recordId);
    if (res.ok) {
      const d = await res.json();
      showMessage(d.message || 'Fine paid!');
      fetchData();
    } else {
      const d = await res.json();
      showMessage(d.error || 'Payment failed.', 'error');
    }
  };

  const isOverdue = (record) => record.due_date && new Date(record.due_date) < new Date() && record.status === 'active';

  const calcFine = (record) => {
    if (!record.due_date) return 0;
    const now = new Date();
    const due = new Date(record.due_date);
    if (now > due && record.status === 'active') {
      const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      return (days * 1.0).toFixed(2);
    }
    return 0;
  };

  const returnedHistory = history.filter(r => r.status === 'returned');
  const totalFines = records.reduce((sum, r) => sum + parseFloat(calcFine(r)), 0);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page">
      {payModal && (
        <PaymentModal
          record={payModal.record}
          fine={payModal.fine}
          onClose={() => setPayModal(null)}
          onSuccess={handlePayFineConfirm}
        />
      )}

      <div className="page-header">
        <div>
          <h1>My Books</h1>
          <p>{records.length} currently borrowed · {returnedHistory.length} returned</p>
        </div>
        <Link to="/books" className="btn-secondary">Browse Catalog</Link>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {totalFines > 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          ⚠️ You have <strong>${totalFines.toFixed(2)}</strong> in outstanding fines. Pay your fines before returning overdue books.
        </div>
      )}

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Currently Borrowed {records.length > 0 && <span className="tab-count">{records.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Borrow History {returnedHistory.length > 0 && <span className="tab-count">{returnedHistory.length}</span>}
        </button>
      </div>

      {tab === 'active' && (
        records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No borrowed books</h3>
            <p>You haven't borrowed any books yet.</p>
            <Link to="/books" className="btn-primary">Browse the Catalog</Link>
          </div>
        ) : (
          <div className="my-books-list">
            {records.map(record => {
              const overdue = isOverdue(record);
              const fine = calcFine(record);
              const hasFine = parseFloat(fine) > 0 && !record.fine_paid;
              return (
                <div key={record.id} className={`my-book-card ${overdue ? 'overdue' : ''}`}>
                  <div className="my-book-cover" style={{ background: stringToColor(record.book_title) }}>
                    {record.book_title?.[0]?.toUpperCase()}
                  </div>
                  <div className="my-book-info">
                    <Link to={`/books/${record.book}`} className="my-book-title">{record.book_title}</Link>
                    <p className="my-book-author">{record.book_author}</p>
                    <div className="my-book-dates">
                      <span>Borrowed: {new Date(record.borrowed_at).toLocaleDateString()}</span>
                      {record.due_date && (
                        <span className={overdue ? 'text-danger' : ''}>
                          {overdue ? '⚠️ Overdue since' : 'Due'}: {new Date(record.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {overdue && hasFine && (
                      <div className="fine-info">
                        <span className="fine-amount">Fine: ${fine}</span>
                        <button
                          className="btn-sm btn-pay"
                          onClick={() => setPayModal({ record, fine })}
                        >
                          💳 Pay Fine
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="my-book-actions">
                    <button
                      className={`btn-sm btn-return ${hasFine ? 'btn-disabled' : ''}`}
                      onClick={() => handleReturn(record)}
                      title={hasFine ? 'Pay fine before returning' : 'Return book'}
                    >
                      ↩️ Return
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'history' && (
        returnedHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No history yet</h3>
            <p>Your returned books will appear here.</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="books-table">
              <thead>
                <tr>
                  <th>Book</th><th>Author</th><th>Borrowed</th><th>Returned</th><th>Fine</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {returnedHistory.map(record => (
                  <tr key={record.id}>
                    <td><Link to={`/books/${record.book}`} className="book-link">{record.book_title}</Link></td>
                    <td>{record.book_author}</td>
                    <td>{new Date(record.borrowed_at).toLocaleDateString()}</td>
                    <td>{record.returned_at ? new Date(record.returned_at).toLocaleDateString() : '—'}</td>
                    <td>
                      {parseFloat(record.fine_amount) > 0 ? (
                        <span className={record.fine_paid ? 'text-success' : 'text-danger'}>
                          ${record.fine_amount} {record.fine_paid ? '✅ Paid' : '⚠️ Unpaid'}
                        </span>
                      ) : '—'}
                    </td>
                    <td><span className="badge badge-success">Returned</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function stringToColor(str = '') {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default MyBooks;
