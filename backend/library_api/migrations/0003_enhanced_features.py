from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('library_api', '0002_alter_book_created_at_alter_book_updated_at'),
    ]

    operations = [
        # Add new fields to Book
        migrations.AddField(
            model_name='book',
            name='total_copies',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='book',
            name='available_copies',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='book',
            name='cover_image',
            field=models.ImageField(blank=True, null=True, upload_to='book_covers/'),
        ),
        migrations.AddField(
            model_name='book',
            name='ebook_file',
            field=models.FileField(blank=True, null=True, upload_to='ebooks/'),
        ),
        # UserProfile model
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/')),
                ('email_verified', models.BooleanField(default=False)),
                ('email_verification_token', models.CharField(blank=True, default='', max_length=100)),
                ('bio', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='profile',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        # BorrowRecord model
        migrations.CreateModel(
            name='BorrowRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('borrowed_at', models.DateTimeField(auto_now_add=True)),
                ('due_date', models.DateTimeField(blank=True, null=True)),
                ('returned_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[('active', 'Active'), ('returned', 'Returned'), ('overdue', 'Overdue')],
                    default='active', max_length=20,
                )),
                ('fine_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=8)),
                ('fine_paid', models.BooleanField(default=False)),
                ('book', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='borrow_records',
                    to='library_api.book',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='borrow_records',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-borrowed_at']},
        ),
        # Notification model
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(
                    choices=[
                        ('borrow', 'Book Borrowed'), ('return', 'Book Returned'),
                        ('overdue', 'Overdue Alert'), ('available', 'Book Available'),
                        ('fine', 'Fine Due'), ('system', 'System'),
                    ],
                    default='system', max_length=20,
                )),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('related_book', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to='library_api.book',
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
