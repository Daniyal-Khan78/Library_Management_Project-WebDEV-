import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookCatalog from './pages/BookCatalog';
import MyBooks from './pages/MyBooks';
import AddBook from './pages/AddBook';
import BookDetail from './pages/BookDetail';
import Profile from './pages/Profile';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <AuthProvider>
      <Router>
        <Navbar currentTheme={theme} onToggleTheme={toggleTheme} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><BookCatalog /></ProtectedRoute>} />
          <Route path="/books/:id" element={<ProtectedRoute><BookDetail /></ProtectedRoute>} />
          <Route path="/my-books" element={<ProtectedRoute><MyBooks /></ProtectedRoute>} />
          <Route path="/add-book" element={<ProtectedRoute><AddBook /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
