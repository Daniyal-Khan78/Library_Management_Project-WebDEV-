import os
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Book, BorrowRecord, Notification, UserProfile
from .serializers import (
    UserRegisterSerializer, BookSerializer, BookCreateSerializer,
    BorrowRecordSerializer, NotificationSerializer, UserProfileSerializer
)


def create_notification(user, notif_type, title, message, book=None):
    """Helper to create a notification for a user."""
    Notification.objects.create(
        user=user, type=notif_type, title=title, message=message, related_book=book
    )


# ─── AUTH ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        # Welcome notification
        create_notification(
            user, 'system',
            'Welcome to LibraryMS! 🎉',
            f'Hello {user.username}! Your account is ready. Start browsing the catalog.'
        )
        return Response({
            'message': 'Account created successfully.',
            'token': token.key,
            'username': user.username,
            'user_id': user.id,
            'is_staff': user.is_staff,
        }, status=status.HTTP_201_CREATED)
    return Response({'error': list(serializer.errors.values())[0][0]}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    if not username or not password:
        return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    # Ensure profile exists
    UserProfile.objects.get_or_create(user=user)
    unread_count = Notification.objects.filter(user=user, is_read=False).count()
    return Response({
        'token': token.key,
        'username': user.username,
        'user_id': user.id,
        'is_staff': user.is_staff,
        'unread_notifications': unread_count,
    })


# ─── DASHBOARD ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    user = request.user
    total_books = Book.objects.count()
    available_books = Book.objects.filter(available_copies__gt=0).count()
    borrowed_books = Book.objects.filter(available_copies=0).count()
    my_borrowed = BorrowRecord.objects.filter(user=user, status='active').count()
    total_copies = Book.objects.aggregate(t=Sum('total_copies'))['t'] or 0
    available_copies = Book.objects.aggregate(a=Sum('available_copies'))['a'] or 0

    # Genre stats for pie chart
    genre_stats = (
        Book.objects.exclude(genre='')
        .values('genre')
        .annotate(count=Count('id'))
        .order_by('-count')[:8]
    )

    # Monthly borrow trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (timezone.now() - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        count = BorrowRecord.objects.filter(
            borrowed_at__gte=month_start, borrowed_at__lt=month_end
        ).count()
        monthly_trend.append({
            'month': month_start.strftime('%b %Y'),
            'borrows': count
        })

    # Most borrowed books (top 5)
    most_borrowed = (
        Book.objects.annotate(borrow_count=Count('borrow_records'))
        .order_by('-borrow_count')[:5]
        .values('id', 'title', 'author', 'genre', 'borrow_count')
    )

    # User personal stats
    my_records = BorrowRecord.objects.filter(user=user)
    my_overdue = my_records.filter(status='active', due_date__lt=timezone.now()).count()
    my_total_borrowed = my_records.count()

    # My unpaid fines
    my_fines = sum(r.calculate_fine() for r in my_records.filter(fine_paid=False, status__in=['active', 'returned']))

    return Response({
        'total_books': total_books,
        'available_books': available_books,
        'borrowed_books': borrowed_books,
        'my_borrowed': my_borrowed,
        'total_copies': total_copies,
        'available_copies': available_copies,
        'genre_stats': list(genre_stats),
        'monthly_trend': monthly_trend,
        'most_borrowed': list(most_borrowed),
        'my_overdue': my_overdue,
        'my_total_borrowed': my_total_borrowed,
        'my_fines': float(my_fines),
    })


# ─── MY BOOKS ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_books_view(request):
    records = BorrowRecord.objects.filter(user=request.user, status='active').select_related('book')
    serializer = BorrowRecordSerializer(records, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_history_view(request):
    records = BorrowRecord.objects.filter(user=request.user).select_related('book')
    serializer = BorrowRecordSerializer(records, many=True)
    return Response(serializer.data)


# ─── PROFILE ────────────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    # PATCH — update avatar or bio
    if 'avatar' in request.FILES:
        profile.avatar = request.FILES['avatar']
    if 'bio' in request.data:
        profile.bio = request.data['bio']
    profile.save()
    serializer = UserProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)


# ─── NOTIFICATIONS ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_view(request):
    notifs = Notification.objects.filter(user=request.user)[:30]
    serializer = NotificationSerializer(notifs, many=True)
    unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'notifications': serializer.data, 'unread_count': unread_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_notifications(request):
    Notification.objects.filter(user=request.user).delete()
    return Response({'status': 'cleared'})


# ─── BORROW RECORDS (admin) ──────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_borrow_records(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin only.'}, status=403)
    records = BorrowRecord.objects.select_related('book', 'user').all()
    serializer = BorrowRecordSerializer(records, many=True)
    return Response(serializer.data)


# ─── FINE PAYMENT ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_fine(request, record_id):
    try:
        record = BorrowRecord.objects.get(id=record_id, user=request.user)
    except BorrowRecord.DoesNotExist:
        return Response({'error': 'Record not found.'}, status=404)

    fine = record.calculate_fine()
    if fine <= 0:
        return Response({'error': 'No fine to pay.'}, status=400)

    # Simulate payment (in production, integrate Stripe/PayPal here)
    record.fine_amount = fine
    record.fine_paid = True
    record.save()

    create_notification(
        request.user, 'fine',
        'Fine Paid ✅',
        f'Your fine of ${fine:.2f} for "{record.book.title}" has been paid.',
        book=record.book
    )
    return Response({'status': 'paid', 'amount': float(fine), 'message': f'Fine of ${fine:.2f} paid successfully.'})


# ─── BOOK VIEWSET ────────────────────────────────────────────────────────

class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BookCreateSerializer
        return BookSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):
        queryset = Book.objects.all()
        search = self.request.query_params.get('search', '')
        is_available = self.request.query_params.get('is_available', '')
        genre = self.request.query_params.get('genre', '')

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(author__icontains=search) |
                Q(isbn__icontains=search) |
                Q(genre__icontains=search)
            )
        if is_available == 'true':
            queryset = queryset.filter(available_copies__gt=0)
        elif is_available == 'false':
            queryset = queryset.filter(available_copies=0)
        if genre:
            queryset = queryset.filter(genre__icontains=genre)
        return queryset

    def perform_create(self, serializer):
        book = serializer.save(added_by=self.request.user)
        # Notify all staff of new book addition
        for staff_user in User.objects.filter(is_staff=True):
            create_notification(
                staff_user, 'system',
                f'New Book Added 📚',
                f'"{book.title}" by {book.author} was added to the catalog.',
                book=book
            )

    def perform_update(self, serializer):
        book = serializer.save()
        # Recalculate available_copies if total_copies changed
        active_borrows = book.borrow_records.filter(status='active').count()
        book.available_copies = max(0, book.total_copies - active_borrows)
        book.save()

    @action(detail=True, methods=['post'])
    def borrow(self, request, pk=None):
        book = self.get_object()
        if book.available_copies <= 0:
            return Response({'error': 'No copies available for borrowing.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user already has an active borrow for this book
        if BorrowRecord.objects.filter(book=book, user=request.user, status='active').exists():
            return Response({'error': 'You already have an active borrow for this book.'}, status=status.HTTP_400_BAD_REQUEST)

        # Set due date to 14 days from now
        due_date = timezone.now() + timedelta(days=14)

        BorrowRecord.objects.create(
            book=book, user=request.user, status='active', due_date=due_date
        )
        book.available_copies -= 1
        if book.borrowed_by is None:
            book.borrowed_by = request.user
        book.save()

        # Notification for user
        create_notification(
            request.user, 'borrow',
            f'You borrowed "{book.title}" 📖',
            f'Due date: {due_date.strftime("%B %d, %Y")}. Remember to return it on time!',
            book=book
        )
        # Notification for admin
        for staff_user in User.objects.filter(is_staff=True):
            create_notification(
                staff_user, 'borrow',
                f'Book Borrowed',
                f'{request.user.username} borrowed "{book.title}". {book.available_copies} cop{"y" if book.available_copies == 1 else "ies"} remaining.',
                book=book
            )

        serializer = BookSerializer(book, context={'request': request})
        return Response({**serializer.data, 'due_date': due_date.isoformat(), 'message': f'Borrowed! Due back by {due_date.strftime("%B %d, %Y")}.'})

    @action(detail=True, methods=['post'], url_path='return_book')
    def return_book(self, request, pk=None):
        book = self.get_object()
        record = BorrowRecord.objects.filter(book=book, user=request.user, status='active').first()
        if not record and not request.user.is_staff:
            return Response({'error': 'You do not have an active borrow for this book.'}, status=status.HTTP_400_BAD_REQUEST)

        if record:
            record.returned_at = timezone.now()
            # Check for overdue
            if record.due_date and timezone.now() > record.due_date:
                record.status = 'returned'
                fine = record.calculate_fine()
                record.fine_amount = fine
            else:
                record.status = 'returned'
                fine = 0
            record.save()

            if fine > 0:
                create_notification(
                    request.user, 'fine',
                    'Late Return Fine 💸',
                    f'You returned "{book.title}" late. Fine: ${fine:.2f}. Please pay at the library desk.',
                    book=book
                )
            else:
                create_notification(
                    request.user, 'return',
                    f'Returned "{book.title}" ✅',
                    'Thank you for returning the book on time!',
                    book=book
                )

        book.available_copies = min(book.total_copies, book.available_copies + 1)
        # Update primary borrower if needed
        if book.borrowed_by == request.user:
            next_record = BorrowRecord.objects.filter(book=book, status='active').exclude(user=request.user).first()
            book.borrowed_by = next_record.user if next_record else None
        book.save()

        # Admin notification
        for staff_user in User.objects.filter(is_staff=True):
            create_notification(
                staff_user, 'return',
                'Book Returned',
                f'{request.user.username} returned "{book.title}". {book.available_copies} cop{"y" if book.available_copies == 1 else "ies"} now available.',
                book=book
            )

        serializer = BookSerializer(book, context={'request': request})
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        book = self.get_object()
        if not request.user.is_staff and book.added_by != request.user:
            return Response({'error': 'You can only delete books you added.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='borrow_records')
    def book_borrow_records(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        book = self.get_object()
        records = BorrowRecord.objects.filter(book=book).select_related('user')
        serializer = BorrowRecordSerializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        # Top borrowed genres
        genre_borrows = (
            BorrowRecord.objects.select_related('book')
            .exclude(book__genre='')
            .values('book__genre')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
        )
        return Response({'genre_borrows': list(genre_borrows)})
