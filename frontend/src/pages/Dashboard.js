import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-icon" style={{ color }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBooks, setRecentBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, booksRes] = await Promise.all([
          api.getDashboardStats(token),
          api.getBooks(token, '?ordering=-id&page_size=6'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (booksRes.ok) {
          const data = await booksRes.json();
          setRecentBooks(Array.isArray(data) ? data.slice(0, 6) : (data.results || []).slice(0, 6));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const genreData = (stats?.genre_stats || []).map(g => ({ name: g.genre, value: g.count }));
  const trendData = stats?.monthly_trend || [];
  const mostBorrowed = stats?.most_borrowed || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, <span className="highlight">{user?.username}</span> 👋</h1>
          <p>Here's what's happening in the library today.</p>
        </div>
        {stats?.my_fines > 0 && (
          <div className="fine-alert">
            ⚠️ You have an outstanding fine of <strong>${stats.my_fines.toFixed(2)}</strong>.
            <Link to="/my-books"> View details</Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon="📚" label="Total Books" value={stats?.total_books ?? '—'} color="#3b82f6"
          sub={`${stats?.total_copies ?? 0} total copies`} />
        <StatCard icon="✅" label="Available" value={stats?.available_books ?? '—'} color="#10b981"
          sub={`${stats?.available_copies ?? 0} copies free`} />
        <StatCard icon="📖" label="Borrowed" value={stats?.borrowed_books ?? '—'} color="#f59e0b" />
        <StatCard icon="👤" label="My Borrowed" value={stats?.my_borrowed ?? '—'} color="#8b5cf6"
          sub={stats?.my_overdue > 0 ? `⚠️ ${stats.my_overdue} overdue` : 'All on time'} />
      </div>

      {/* Charts Row */}
      {(genreData.length > 0 || trendData.length > 0) && (
        <div className="charts-row">
          {genreData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">📊 Genre Popularity</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={genreData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {trendData.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">📈 Monthly Borrow Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="borrows" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Most Borrowed */}
      {mostBorrowed.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>🏆 Most Borrowed Books</h2>
          </div>
          <div className="chart-card" style={{ padding: '1rem 1.5rem' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mostBorrowed.map(b => ({ name: b.title.length > 20 ? b.title.slice(0, 20) + '…' : b.title, borrows: b.borrow_count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="borrows" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Books */}
      <div className="section">
        <div className="section-header">
          <h2>Recently Added Books</h2>
          <Link to="/books" className="view-all">View All →</Link>
        </div>
        {recentBooks.length === 0 ? (
          <div className="empty-state"><p>No books yet. <Link to="/add-book">Add the first one!</Link></p></div>
        ) : (
          <div className="book-grid">
            {recentBooks.map(book => (
              <Link to={`/books/${book.id}`} key={book.id} className="book-card">
                {book.cover_image_url ? (
                  <div className="book-cover book-cover-img">
                    <img src={book.cover_image_url} alt={book.title} />
                  </div>
                ) : (
                  <div className="book-cover" style={{ background: stringToColor(book.title) }}>
                    <span>{book.title.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  <div className="copies-info">
                    <span className={`badge ${book.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {book.available_copies > 0 ? `✅ ${book.available_copies}/${book.total_copies} available` : '❌ All borrowed'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <Link to="/add-book" className="action-card"><span className="action-icon">➕</span><span>Add New Book</span></Link>
          <Link to="/books" className="action-card"><span className="action-icon">🔍</span><span>Browse Catalog</span></Link>
          <Link to="/my-books" className="action-card"><span className="action-icon">📖</span><span>My Borrowed Books</span></Link>
          <Link to="/profile" className="action-card"><span className="action-icon">👤</span><span>My Profile</span></Link>
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

export default Dashboard;
