import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function stringToColor(str) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function BookCatalog() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // table | grid
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      let params = '?';
      if (search) params += `search=${encodeURIComponent(search)}&`;
      if (filter === 'available') params += 'is_available=true&';
      if (filter === 'borrowed') params += 'is_available=false&';
      const res = await api.getBooks(token, params);
      if (res.ok) {
        const data = await res.json();
        setBooks(Array.isArray(data) ? data : data.results || []);
      }
    } finally { setLoading(false); }
  }, [token, search, filter]);

  useEffect(() => {
    const delay = setTimeout(fetchBooks, 300);
    return () => clearTimeout(delay);
  }, [fetchBooks]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleBorrow = async (id) => {
    const res = await api.borrowBook(token, id);
    if (res.ok) { const d = await res.json(); showMessage(d.message || 'Book borrowed!'); fetchBooks(); }
    else { const d = await res.json(); showMessage(d.error || 'Failed to borrow.', 'error'); }
  };

  const handleReturn = async (id) => {
    const res = await api.returnBook(token, id);
    if (res.ok) { showMessage('Book returned!'); fetchBooks(); }
    else showMessage('Failed to return.', 'error');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    const res = await api.deleteBook(token, id);
    if (res.ok) { showMessage('Book deleted.'); fetchBooks(); }
    else showMessage('Failed to delete.', 'error');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Book Catalog</h1>
        <Link to="/add-book" className="btn-primary">+ Add Book</Link>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="catalog-controls">
        <input
          type="text" className="search-input"
          placeholder="🔍  Search by title, author, or ISBN..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all', 'available', 'borrowed'].map(f => (
            <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table view">☰</button>
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">⊞</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No books found. Try a different search or <Link to="/add-book">add a book</Link>.</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-wrapper">
          <table className="books-table">
            <thead>
              <tr>
                <th>Title</th><th>Author</th><th>ISBN</th><th>Genre</th><th>Copies</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id}>
                  <td>
                    <div className="table-book-title">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt="" className="table-thumb" />
                      ) : (
                        <div className="table-thumb-placeholder" style={{ background: stringToColor(book.title) }}>{book.title[0]}</div>
                      )}
                      <Link to={`/books/${book.id}`} className="book-link"><strong>{book.title}</strong></Link>
                    </div>
                  </td>
                  <td>{book.author}</td>
                  <td><code>{book.isbn}</code></td>
                  <td>{book.genre || '—'}</td>
                  <td>
                    <span className="copies-pill">
                      {book.available_copies}/{book.total_copies}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {book.available_copies > 0 ? `✅ ${book.available_copies} free` : '❌ All out'}
                    </span>
                  </td>
                  <td className="action-btns">
                    <button className="btn-sm btn-view" onClick={() => navigate(`/books/${book.id}`)}>View</button>
                    {book.available_copies > 0 ? (
                      <button className="btn-sm btn-borrow" onClick={() => handleBorrow(book.id)}>Borrow</button>
                    ) : (
                      book.borrowed_by_username === user?.username && (
                        <button className="btn-sm btn-return" onClick={() => handleReturn(book.id)}>Return</button>
                      )
                    )}
                    {(user?.is_staff || book.added_by_username === user?.username) && (
                      <button className="btn-sm btn-delete" onClick={() => handleDelete(book.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="book-grid">
          {books.map(book => (
            <div key={book.id} className="book-card">
              <Link to={`/books/${book.id}`}>
                {book.cover_image_url ? (
                  <div className="book-cover book-cover-img"><img src={book.cover_image_url} alt={book.title} /></div>
                ) : (
                  <div className="book-cover" style={{ background: stringToColor(book.title) }}>
                    <span>{book.title.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </Link>
              <div className="book-info">
                <h3 className="book-title"><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
                <p className="book-author">{book.author}</p>
                <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                  {book.available_copies > 0 ? `✅ ${book.available_copies}/${book.total_copies} avail.` : '❌ All borrowed'}
                </span>
                <div className="card-actions" style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {book.available_copies > 0 ? (
                    <button className="btn-sm btn-borrow" onClick={() => handleBorrow(book.id)}>Borrow</button>
                  ) : (
                    book.borrowed_by_username === user?.username && (
                      <button className="btn-sm btn-return" onClick={() => handleReturn(book.id)}>Return</button>
                    )
                  )}
                  {(user?.is_staff || book.added_by_username === user?.username) && (
                    <button className="btn-sm btn-delete" onClick={() => handleDelete(book.id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookCatalog;
