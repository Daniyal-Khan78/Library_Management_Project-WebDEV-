from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Book, BorrowRecord, Notification, UserProfile
from django.utils import timezone


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_active=True  # auto-activate (no real email server needed)
        )
        UserProfile.objects.create(user=user, email_verified=True)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    is_staff = serializers.BooleanField(source='user.is_staff', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['username', 'email', 'is_staff', 'bio', 'avatar_url', 'email_verified']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class BorrowRecordSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    book_author = serializers.CharField(source='book.author', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    current_fine = serializers.SerializerMethodField()

    class Meta:
        model = BorrowRecord
        fields = [
            'id', 'book', 'book_title', 'book_author', 'user', 'username',
            'borrowed_at', 'due_date', 'returned_at', 'status',
            'fine_amount', 'fine_paid', 'is_overdue', 'current_fine'
        ]
        read_only_fields = ['borrowed_at', 'returned_at', 'fine_amount']

    def get_is_overdue(self, obj):
        if obj.due_date and obj.status == 'active':
            return timezone.now() > obj.due_date
        return False

    def get_current_fine(self, obj):
        return obj.calculate_fine()


class BookSerializer(serializers.ModelSerializer):
    borrowed_by_username = serializers.SerializerMethodField()
    added_by_username = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    ebook_file_url = serializers.SerializerMethodField()
    active_borrowers_count = serializers.SerializerMethodField()
    borrow_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'isbn', 'genre',
            'published_date', 'description', 'is_available',
            'total_copies', 'available_copies',
            'borrowed_by', 'borrowed_by_username',
            'added_by', 'added_by_username',
            'cover_image_url', 'ebook_file_url',
            'active_borrowers_count', 'borrow_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['is_available', 'borrowed_by', 'added_by', 'created_at', 'updated_at', 'available_copies']

    def get_borrowed_by_username(self, obj):
        return obj.borrowed_by.username if obj.borrowed_by else None

    def get_added_by_username(self, obj):
        return obj.added_by.username if obj.added_by else None

    def get_cover_image_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None

    def get_ebook_file_url(self, obj):
        request = self.context.get('request')
        if obj.ebook_file and request:
            return request.build_absolute_uri(obj.ebook_file.url)
        return None

    def get_active_borrowers_count(self, obj):
        return obj.borrow_records.filter(status='active').count()

    def get_borrow_percentage(self, obj):
        if obj.total_copies == 0:
            return 0
        borrowed = obj.total_copies - obj.available_copies
        return round((borrowed / obj.total_copies) * 100)


class BookCreateSerializer(serializers.ModelSerializer):
    """Used for creating/updating books — includes file upload fields."""
    class Meta:
        model = Book
        fields = [
            'title', 'author', 'isbn', 'genre', 'published_date',
            'description', 'cover_image', 'ebook_file', 'total_copies'
        ]

    def validate_total_copies(self, value):
        if value < 1:
            raise serializers.ValidationError("Total copies must be at least 1.")
        return value

    def create(self, validated_data):
        total = validated_data.get('total_copies', 1)
        validated_data['available_copies'] = total
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='related_book.title', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'created_at', 'related_book', 'book_title']
        read_only_fields = ['created_at']
