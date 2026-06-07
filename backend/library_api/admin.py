from django.contrib import admin
from .models import Book, BorrowRecord

# Register your models so they become manageable via the Admin UI
admin.site.register(Book)
admin.site.register(BorrowRecord)