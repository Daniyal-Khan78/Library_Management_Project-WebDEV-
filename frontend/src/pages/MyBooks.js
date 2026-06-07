import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function MyBooks() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active'); // active | history
  const [message, setMessage] = useState({ text: '', type: '' });

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
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleReturn = async (bookId) => {
    const res = await api.returnBook(token, bookId);
    if (res.ok) { showMessage('Book returned successfully!'); fetchData(); }
    else showMessage('Failed to return book.', 'error');
  };

  const handlePayFine = async (recordId) => {
    const res = await api.payFine(token, recordId);
    if (res.ok) { const d = await res.json(); showMessage(d.message || 'Fine paid!'); fetchData(); }
    else { const d = await res.json(); showMessage(d.error || 'Payment failed.', 'error'); }
  };

  const isOverdue = (record) => record.due_date && new Date(record.due_date) < new Date() && record.status === 'active';

  const calcFine = (record) => {
    if (!record.due_date) return 0;
    const now = new Date();
    const due = new Date(record.due_date);
    if (now > due && record.status === 'active') {
      const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      return (days * 0.5).toFixed(2);
    }
    return 0;
  };

  const returnedHistory = history.filter(r => r.status === 'returned');
  const totalFines = records.reduce((sum, r) => sum + parseFloat(calcFine(r)), 0);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page">
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
          ⚠️ You have <strong>${totalFines.toFixed(2)}</strong> in outstanding fines. Return overdue books to settle them.
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
                    {overdue && fine > 0 && (
                      <div className="fine-info">
                        <span className="fine-amount">Fine: ${fine}</span>
                        <button className="btn-sm btn-pay" onClick={() => handlePayFine(record.id)}>💳 Pay Fine</button>
                      </div>
                    )}
                  </div>
                  <div className="my-book-actions">
                    <button className="btn-sm btn-return" onClick={() => handleReturn(record.book)}>↩️ Return</button>
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
