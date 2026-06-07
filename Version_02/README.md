# Library Management System — Enhanced Edition

A full-stack Django + React library management system with an extensive feature set.

---

## 🚀 What's New in This Version

### 📚 Book Copy Tracking (Core Feature)
- **`total_copies`** and **`available_copies`** fields on every book
- Visual availability progress bar on book detail pages
- Catalog shows `available/total` count on every row
- Multiple users can borrow the same title simultaneously (up to `total_copies`)
- `available_copies` auto-syncs on every borrow/return

### 📊 Charts & Graphs (Dashboard)
- **Genre Popularity Pie Chart** — visual breakdown of your library's collection
- **Monthly Borrow Trend Line Chart** — last 6 months of checkout activity
- **Most Borrowed Books Bar Chart** — top 5 titles by all-time borrow count
- Built with [Recharts](https://recharts.org/)

### 🔔 Real-time Notifications
- In-navbar notification bell with unread badge counter
- Auto-polls every 30 seconds for new notifications
- Events covered: book borrowed, returned, new book added, overdue fine, fine paid, welcome
- Click bell → marks all as read; "Clear all" button to dismiss

### 🖼️ File Uploading
- **Book Cover Images** — admins upload `.jpg`/`.png` when adding a book; covers appear in the catalog grid, table thumbnails, and detail pages
- **E-Book PDFs** — optional PDF upload; a "Download PDF" button appears on the detail page
- **User Avatars** — profile picture upload on the Profile page; initials fallback if no avatar set

### 💸 Fine System (Payment Simulation)
- Every borrow gets a **14-day due date**
- Overdue books accrue **$0.50/day** automatically
- "My Books" page shows current fine with a **Pay Fine** button
- Payment is simulated (logged to console); swap in Stripe/PayPal in `views.py → pay_fine()`
- Fine history shown in the Borrow History tab

### 📋 Borrow Records & History
- `BorrowRecord` model tracks every checkout with borrowed_at, due_date, returned_at, status, and fine
- "My Books" page has two tabs: **Currently Borrowed** and **Borrow History**
- History table shows fine amounts and payment status

### 👤 User Profile Page
- `/profile` route — view account info, upload avatar, edit bio
- Shows email verified status

### 🌙 Light / Dark Mode (existing, preserved)
- Toggle via moon/sun button in navbar; persisted to localStorage

---

## 🛠 Setup

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies (Pillow added for image handling)
pip install -r requirements.txt

# Apply all migrations
python manage.py migrate

# Create a superuser (admin/librarian)
python manage.py createsuperuser

# Start dev server
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Install dependencies (recharts added)
npm install

# Start dev server
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
backend/
├── library/
│   ├── settings.py        # MEDIA_ROOT, EMAIL_BACKEND added
│   └── urls.py            # Static + media file serving
├── library_api/
│   ├── models.py          # Book (+ copies/files), BorrowRecord, Notification, UserProfile
│   ├── serializers.py     # Full serializers for all models
│   ├── views.py           # All API endpoints
│   ├── urls.py            # Routes
│   └── migrations/
│       └── 0003_enhanced_features.py
├── media/                 # Created at runtime (avatars, covers, ebooks)
└── requirements.txt       # + Pillow==10.1.0

frontend/
├── src/
│   ├── api.js             # All API calls including notifications, profile, fines
│   ├── App.js             # + /profile route
│   ├── components/
│   │   └── Navbar.js      # + notification bell, avatar link
│   └── pages/
│       ├── Dashboard.js   # + Recharts pie/line/bar charts, copy counts
│       ├── BookCatalog.js # + copy count column, grid/table toggle, cover thumbnails
│       ├── BookDetail.js  # + cover image, ebook download, copy bar
│       ├── AddBook.js     # + cover upload, ebook upload, total_copies field
│       ├── MyBooks.js     # + tabs, borrow history, fine display & payment
│       └── Profile.js     # NEW — avatar, bio, account info
└── package.json           # + recharts
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/` | Register user |
| POST | `/api/login/` | Login |
| GET/PATCH | `/api/profile/` | View/update profile + avatar |
| GET | `/api/dashboard/` | Stats + chart data |
| GET | `/api/my-books/` | Active borrows |
| GET | `/api/my-history/` | Full borrow history |
| GET | `/api/notifications/` | User notifications |
| POST | `/api/notifications/read/` | Mark all read |
| DELETE | `/api/notifications/clear/` | Clear all |
| POST | `/api/pay-fine/<id>/` | Simulate fine payment |
| GET/POST | `/api/books/` | List / Create books (multipart) |
| GET/PATCH/DELETE | `/api/books/<id>/` | Book detail / edit / delete |
| POST | `/api/books/<id>/borrow/` | Borrow a copy |
| POST | `/api/books/<id>/return_book/` | Return a copy |
| GET | `/api/books/<id>/borrow_records/` | Admin: borrow history for book |
| GET | `/api/books/analytics/` | Admin: genre borrow analytics |
| GET | `/api/borrow-records/` | Admin: all borrow records |

---

## 💳 Adding Real Payments (Stripe)

In `views.py`, find the `pay_fine` function and replace the simulation block with:

```python
import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

intent = stripe.PaymentIntent.create(
    amount=int(fine * 100),  # cents
    currency='usd',
    metadata={'record_id': record_id, 'user': request.user.username}
)
return Response({'client_secret': intent.client_secret, 'amount': float(fine)})
```

Then use `@stripe/stripe-js` and `@stripe/react-stripe-js` in the frontend to complete the payment.

---

## 📧 Adding Real Email (Production)

Replace `EMAIL_BACKEND` in `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
```

Then call `send_mail()` inside `register_view`, the borrow action, and a management command for daily overdue checks.

---

## 🌐 WebSockets (Django Channels) — Optional Upgrade

For truly real-time notifications (no polling), install `channels` and `daphne`:

```bash
pip install channels daphne
```

Create a `consumers.py` with a `NotificationConsumer`, set up routing, and connect from React with a `WebSocket` object. The current polling approach works well for most library-scale apps.
