import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const GENRES = ['Fiction','Non-Fiction','Science','Technology','History','Biography','Mystery','Romance','Fantasy','Horror','Self-Help','Philosophy','Religion','Art','Other'];

function BookDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });
  const [newCover, setNewCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const fetchBook = async () => {
    const res = await api.getBook(token, id);
    if (res.ok) { const data = await res.json(); setBook(data); setEditData(data); }
    else navigate('/books');
    setLoading(false);
  };

  useEffect(() => { fetchBook(); }, [id]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const payload = {
      title: editData.title, author: editData.author, isbn: editData.isbn,
      genre: editData.genre, published_date: editData.published_date || null,
      description: editData.description, total_copies: editData.total_copies
    };
    const res = await api.updateBook(token, id, payload);
    if (res.ok) { const data = await res.json(); setBook(data); setEditing(false); showMessage('Book updated successfully!'); }
    else showMessage('Failed to update book.', 'error');
  };

  const handleBorrow = async () => {
    const res = await api.borrowBook(token, id);
    if (res.ok) { const d = await res.json(); showMessage(d.message || 'Book borrowed!'); fetchBook(); }
    else { const d = await res.json(); showMessage(d.error || 'Failed to borrow.', 'error'); }
  };

  const handleReturn = async () => {
    const res = await api.returnBook(token, id);
    if (res.ok) { showMessage('Book returned successfully!'); fetchBook(); }
    else showMessage('Failed to return.', 'error');
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this book permanently?')) return;
    const res = await api.deleteBook(token, id);
    if (res.ok) navigate('/books');
    else showMessage('Failed to delete.', 'error');
  };

  const userHasActiveBorrow = book?.borrow_records?.some
    ? false // We'll track via borrowed_by_username for now
    : false;
  const canReturn = book?.borrowed_by_username === user?.username || user?.is_staff;

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!book) return null;

  const availPercent = book.total_copies > 0 ? Math.round((book.available_copies / book.total_copies) * 100) : 0;

  return (
    <div className="page">
      <div className="breadcrumb"><Link to="/books">← Back to Catalog</Link></div>
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="detail-layout">
        {/* Cover */}
        <div className="detail-cover-wrap">
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt={book.title} className="detail-cover-img" />
          ) : (
            <div className="detail-cover" style={{ background: stringToColor(book.title) }}>
              <span>{book.title.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Copy availability bar */}
          <div className="copies-bar-wrap">
            <div className="copies-bar-label">
              <span>{book.available_copies} of {book.total_copies} cop{book.total_copies === 1 ? 'y' : 'ies'} available</span>
              <span>{availPercent}%</span>
            </div>
            <div className="copies-bar">
              <div className="copies-bar-fill" style={{ width: `${availPercent}%`, background: availPercent > 50 ? '#10b981' : availPercent > 0 ? '#f59e0b' : '#ef4444' }} />
            </div>
          </div>
        </div>

        <div className="detail-content">
          {!editing ? (
            <>
              <div className="detail-header">
                <h1>{book.title}</h1>
                <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {book.available_copies > 0 ? `✅ ${book.available_copies} Available` : '❌ All Borrowed'}
                </span>
              </div>

              <div className="detail-meta">
                <div className="meta-row"><span>Author</span><strong>{book.author}</strong></div>
                <div className="meta-row"><span>ISBN</span><code>{book.isbn}</code></div>
                <div className="meta-row"><span>Genre</span><strong>{book.genre || 'Not specified'}</strong></div>
                <div className="meta-row"><span>Published</span><strong>{book.published_date || 'Unknown'}</strong></div>
                <div className="meta-row"><span>Copies</span><strong>{book.total_copies} total / {book.available_copies} available</strong></div>
                <div className="meta-row"><span>Added by</span><strong>{book.added_by_username || 'Unknown'}</strong></div>
                {book.borrowed_by_username && (
                  <div className="meta-row"><span>Primary borrower</span><strong>{book.borrowed_by_username}</strong></div>
                )}
              </div>

              {book.description && (
                <div className="book-description"><h3>Description</h3><p>{book.description}</p></div>
              )}

              {book.ebook_file_url && (
                <div className="ebook-section">
                  <h3>📄 E-Book Available</h3>
                  <a href={book.ebook_file_url} target="_blank" rel="noreferrer" className="btn-secondary" download>
                    Download PDF
                  </a>
                </div>
              )}

              <div className="detail-actions">
                {book.available_copies > 0 ? (
                  <button className="btn-primary" onClick={handleBorrow}>📖 Borrow This Book</button>
                ) : (
                  canReturn && (
                    <button className="btn-secondary" onClick={handleReturn}>↩️ Return Book</button>
                  )
                )}
                {/* Also show return if user has active borrow even if copies > 0 */}
                {book.available_copies > 0 && book.borrowed_by_username === user?.username && (
                  <button className="btn-secondary" onClick={handleReturn}>↩️ Return Book</button>
                )}
                {(user?.is_staff || book.added_by_username === user?.username) && (
                  <>
                    <button className="btn-secondary" onClick={() => setEditing(true)}>✏️ Edit</button>
                    <button className="btn-danger" onClick={handleDelete}>🗑️ Delete</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdate} className="edit-form">
              <h2>Edit Book</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input value={editData.title || ''} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Author</label>
                  <input value={editData.author || ''} onChange={e => setEditData({ ...editData, author: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ISBN</label>
                  <input value={editData.isbn || ''} onChange={e => setEditData({ ...editData, isbn: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select value={editData.genre || ''} onChange={e => setEditData({ ...editData, genre: e.target.value })}>
                    <option value="">Select genre...</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Published Date</label>
                  <input type="date" value={editData.published_date || ''} onChange={e => setEditData({ ...editData, published_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Total Copies</label>
                  <input type="number" min="1" value={editData.total_copies || 1} onChange={e => setEditData({ ...editData, total_copies: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={4} value={editData.description || ''} onChange={e => setEditData({ ...editData, description: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function stringToColor(str) {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default BookDetail;
