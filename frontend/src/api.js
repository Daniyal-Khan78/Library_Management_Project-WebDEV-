const BASE_URL = 'http://localhost:8000/api';

const getHeaders = (token, isJson = true) => {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Token ${token}`;
  return headers;
};

export const api = {
  // Auth
  register: (data) =>
    fetch(`${BASE_URL}/register/`, { method: 'POST', headers: getHeaders(null), body: JSON.stringify(data) }),

  login: (data) =>
    fetch(`${BASE_URL}/login/`, { method: 'POST', headers: getHeaders(null), body: JSON.stringify(data) }),

  // Profile
  getProfile: (token) =>
    fetch(`${BASE_URL}/profile/`, { headers: getHeaders(token) }),

  updateProfile: (token, formData) =>
    fetch(`${BASE_URL}/profile/`, { method: 'PATCH', headers: { Authorization: `Token ${token}` }, body: formData }),

  // Books
  getBooks: (token, params = '') =>
    fetch(`${BASE_URL}/books/${params}`, { headers: getHeaders(token) }),

  getBook: (token, id) =>
    fetch(`${BASE_URL}/books/${id}/`, { headers: getHeaders(token) }),

  createBook: (token, formData) =>
    fetch(`${BASE_URL}/books/`, { method: 'POST', headers: { Authorization: `Token ${token}` }, body: formData }),

  updateBook: (token, id, data) =>
    fetch(`${BASE_URL}/books/${id}/`, { method: 'PATCH', headers: getHeaders(token), body: JSON.stringify(data) }),

  deleteBook: (token, id) =>
    fetch(`${BASE_URL}/books/${id}/`, { method: 'DELETE', headers: getHeaders(token) }),

  borrowBook: (token, id) =>
    fetch(`${BASE_URL}/books/${id}/borrow/`, { method: 'POST', headers: getHeaders(token) }),

  returnBook: (token, id) =>
    fetch(`${BASE_URL}/books/${id}/return_book/`, { method: 'POST', headers: getHeaders(token) }),

  getMyBooks: (token) =>
    fetch(`${BASE_URL}/my-books/`, { headers: getHeaders(token) }),

  getMyHistory: (token) =>
    fetch(`${BASE_URL}/my-history/`, { headers: getHeaders(token) }),

  getDashboardStats: (token) =>
    fetch(`${BASE_URL}/dashboard/`, { headers: getHeaders(token) }),

  // Notifications
  getNotifications: (token) =>
    fetch(`${BASE_URL}/notifications/`, { headers: getHeaders(token) }),

  markNotificationsRead: (token) =>
    fetch(`${BASE_URL}/notifications/read/`, { method: 'POST', headers: getHeaders(token) }),

  clearNotifications: (token) =>
    fetch(`${BASE_URL}/notifications/clear/`, { method: 'DELETE', headers: getHeaders(token) }),

  // Fines
  payFine: (token, recordId) =>
    fetch(`${BASE_URL}/pay-fine/${recordId}/`, { method: 'POST', headers: getHeaders(token) }),
};
