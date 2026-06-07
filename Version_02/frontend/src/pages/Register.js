import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirm_password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!formData.username || formData.username.length < 3)
      newErrors.username = 'Username must be at least 3 characters.';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = 'Enter a valid email address.';
    if (!formData.password || formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirm_password)
      newErrors.confirm_password = 'Passwords do not match.';
    return newErrors;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      if (res.ok) {
        setSuccess('Account created! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        const data = await res.json();
        setErrors({ general: data.error || 'Registration failed. Username may already be taken.' });
      }
    } catch {
      setErrors({ general: 'Cannot connect to server. Make sure the backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">✨</div>
          <h1>Create Account</h1>
          <p>Join the Library Management System</p>
        </div>

        {errors.general && <div className="alert alert-error">{errors.general}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username" name="username" type="text"
              placeholder="Choose a username"
              value={formData.username} onChange={handleChange}
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              placeholder="Enter your email"
              value={formData.email} onChange={handleChange}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              placeholder="Create a password (min 6 chars)"
              value={formData.password} onChange={handleChange}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirm Password</label>
            <input
              id="confirm_password" name="confirm_password" type="password"
              placeholder="Repeat your password"
              value={formData.confirm_password} onChange={handleChange}
            />
            {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
