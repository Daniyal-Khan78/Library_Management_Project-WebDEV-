import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const GENRES = [
  'Fiction', 'Non-Fiction', 'Science', 'Technology', 'History',
  'Biography', 'Mystery', 'Romance', 'Fantasy', 'Horror',
  'Self-Help', 'Philosophy', 'Religion', 'Art', 'Other'
];

function AddBook() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '', author: '', isbn: '', genre: '', published_date: '', description: '', total_copies: 1
  });
  const [coverImage, setCoverImage] = useState(null);
  const [ebookFile, setEbookFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required.';
    if (!formData.author.trim()) newErrors.author = 'Author is required.';
    if (!formData.isbn.trim()) newErrors.isbn = 'ISBN is required.';
    else if (!/^[\d-]{10,17}$/.test(formData.isbn.replace(/\s/g, '')))
      newErrors.isbn = 'Enter a valid ISBN (10 or 13 digits).';
    if (formData.total_copies < 1) newErrors.total_copies = 'Must have at least 1 copy.';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'total_copies' ? parseInt(value) || 1 : value });
    setErrors({ ...errors, [name]: '' });
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      if (coverImage) fd.append('cover_image', coverImage);
      if (ebookFile) fd.append('ebook_file', ebookFile);

      const res = await api.createBook(token, fd);
      if (res.ok) {
        const book = await res.json();
        setSuccess('Book added successfully!');
        setTimeout(() => navigate(`/books/${book.id}`), 1200);
      } else {
        const data = await res.json();
        if (data.isbn) setErrors({ isbn: 'A book with this ISBN already exists.' });
        else setErrors({ general: data.error || 'Failed to add book.' });
      }
    } catch {
      setErrors({ general: 'Cannot connect to server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="breadcrumb"><Link to="/books">← Back to Catalog</Link></div>
      <div className="form-page">
        <div className="form-card">
          <h1>Add New Book</h1>
          <p className="form-subtitle">Fill in the details to add a book to the library.</p>

          {errors.general && <div className="alert alert-error">{errors.general}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            {/* Cover Image Upload */}
            <div className="form-group">
              <label>Book Cover Image</label>
              <div className="file-upload-area">
                {coverPreview ? (
                  <div className="cover-preview-wrap">
                    <img src={coverPreview} alt="Cover preview" className="cover-preview" />
                    <button type="button" className="btn-sm btn-delete" onClick={() => { setCoverImage(null); setCoverPreview(null); }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="file-upload-label">
                    <span className="file-upload-icon">🖼️</span>
                    <span>Click to upload cover image</span>
                    <span className="file-upload-hint">.jpg, .png — up to 5MB</span>
                    <input type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Title <span className="required">*</span></label>
                <input name="title" type="text" placeholder="Book title" value={formData.title} onChange={handleChange} />
                {errors.title && <span className="field-error">{errors.title}</span>}
              </div>
              <div className="form-group">
                <label>Author <span className="required">*</span></label>
                <input name="author" type="text" placeholder="Author name" value={formData.author} onChange={handleChange} />
                {errors.author && <span className="field-error">{errors.author}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ISBN <span className="required">*</span></label>
                <input name="isbn" type="text" placeholder="e.g. 978-3-16-148410-0" value={formData.isbn} onChange={handleChange} />
                {errors.isbn && <span className="field-error">{errors.isbn}</span>}
              </div>
              <div className="form-group">
                <label>Genre</label>
                <select name="genre" value={formData.genre} onChange={handleChange}>
                  <option value="">Select genre...</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Published Date</label>
                <input name="published_date" type="date" value={formData.published_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Total Copies <span className="required">*</span></label>
                <input name="total_copies" type="number" min="1" max="999" value={formData.total_copies} onChange={handleChange} />
                {errors.total_copies && <span className="field-error">{errors.total_copies}</span>}
                <span className="field-hint">How many physical copies does the library own?</span>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" rows={4} placeholder="Brief description of the book (optional)" value={formData.description} onChange={handleChange} />
            </div>

            {/* E-Book Upload */}
            <div className="form-group">
              <label>E-Book File (Optional)</label>
              <div className="file-upload-area">
                {ebookFile ? (
                  <div className="ebook-selected">
                    <span>📄 {ebookFile.name}</span>
                    <button type="button" className="btn-sm btn-delete" onClick={() => setEbookFile(null)}>Remove</button>
                  </div>
                ) : (
                  <label className="file-upload-label">
                    <span className="file-upload-icon">📄</span>
                    <span>Click to upload PDF e-book</span>
                    <span className="file-upload-hint">.pdf — up to 50MB</span>
                    <input type="file" accept=".pdf" onChange={(e) => setEbookFile(e.target.files[0] || null)} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Adding...' : '+ Add Book'}</button>
              <Link to="/books" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddBook;
