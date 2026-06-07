import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function Profile() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchProfile = async () => {
    const res = await api.getProfile(token);
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setBio(data.bio || '');
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = ev => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append('bio', bio);
    if (avatar) fd.append('avatar', avatar);
    const res = await api.updateProfile(token, fd);
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setAvatar(null);
      showMessage('Profile updated!');
    } else {
      showMessage('Failed to update profile.', 'error');
    }
    setSaving(false);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const displayAvatar = avatarPreview || profile?.avatar_url;

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="profile-layout">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrap">
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <label className="avatar-upload-btn" title="Change avatar">
              📷
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
          <h2 className="profile-username">{profile?.username}</h2>
          <p className="profile-email">{profile?.email}</p>
          {profile?.is_staff && <span className="badge badge-success">Admin</span>}
        </div>

        {/* Info Section */}
        <div className="profile-info-section">
          <div className="profile-card">
            <h3>Account Information</h3>
            <div className="meta-row"><span>Username</span><strong>{profile?.username}</strong></div>
            <div className="meta-row"><span>Email</span><strong>{profile?.email || 'Not set'}</strong></div>
            <div className="meta-row"><span>Role</span><strong>{profile?.is_staff ? 'Librarian / Admin' : 'Library Member'}</strong></div>
            <div className="meta-row">
              <span>Email Verified</span>
              <strong>{profile?.email_verified ? '✅ Verified' : '⚠️ Not verified'}</strong>
            </div>
          </div>

          <div className="profile-card">
            <h3>Edit Profile</h3>
            <div className="form-group">
              <label>Bio / About Me</label>
              <textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
              />
            </div>
            {avatar && (
              <div className="form-group">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  New avatar selected: <strong>{avatar.name}</strong>
                </p>
              </div>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
