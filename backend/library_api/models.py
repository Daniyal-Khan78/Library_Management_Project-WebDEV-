from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True)
    genre = models.CharField(max_length=100, blank=True, default='')
    published_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default='')
    cover_image = models.ImageField(upload_to='book_covers/', null=True, blank=True)
    ebook_file = models.FileField(upload_to='ebooks/', null=True, blank=True)
    # Copy tracking
    total_copies = models.PositiveIntegerField(default=1)
    available_copies = models.PositiveIntegerField(default=1)
    # Legacy single-borrow support (kept for backwards compat, now tracks primary borrower)
    is_available = models.BooleanField(default=True)
    borrowed_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='borrowed_books'
    )
    added_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='added_books'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.author}"

    def save(self, *args, **kwargs):
        # Sync is_available with available_copies
        self.is_available = self.available_copies > 0
        super().save(*args, **kwargs)


class BorrowRecord(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    ]
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrow_records')
    borrowed_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    fine_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    fine_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['-borrowed_at']

    def __str__(self):
        return f"{self.user.username} borrowed {self.book.title}"

    def calculate_fine(self):
        """Calculate fine at $0.50/day for overdue books."""
        if self.status == 'returned' and self.returned_at and self.due_date:
            if self.returned_at > self.due_date:
                days_overdue = (self.returned_at - self.due_date).days
                return round(days_overdue * 0.50, 2)
        elif self.status == 'active' and self.due_date:
            now = timezone.now()
            if now > self.due_date:
                days_overdue = (now - self.due_date).days
                return round(days_overdue * 0.50, 2)
        return 0.00

class Notification(models.Model):
    TYPE_CHOICES = [
        ('borrow', 'Book Borrowed'),
        ('return', 'Book Returned'),
        ('overdue', 'Overdue Alert'),
        ('available', 'Book Available'),
        ('fine', 'Fine Due'),
        ('system', 'System'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_book = models.ForeignKey(Book, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"
