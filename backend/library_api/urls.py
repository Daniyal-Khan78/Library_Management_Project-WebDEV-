from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'books', views.BookViewSet, basename='book')

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('my-books/', views.my_books_view, name='my-books'),
    path('my-history/', views.my_history_view, name='my-history'),
    path('profile/', views.profile_view, name='profile'),
    path('notifications/', views.notifications_view, name='notifications'),
    path('notifications/read/', views.mark_notifications_read, name='notifications-read'),
    path('notifications/clear/', views.clear_notifications, name='notifications-clear'),
    path('borrow-records/', views.all_borrow_records, name='all-borrow-records'),
    path('pay-fine/<int:record_id>/', views.pay_fine, name='pay-fine'),
    path('', include(router.urls)),
]
