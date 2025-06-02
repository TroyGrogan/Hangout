from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, UserPreference

class UserPreferenceInline(admin.StackedInline):
    model = UserPreference
    can_delete = False

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'location', 'is_staff')
    search_fields = ('username', 'email', 'location')
    inlines = (UserPreferenceInline,)
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('bio', 'location', 'latitude', 'longitude', 'profile_image')}),
    )

@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'notification_enabled')
    list_filter = ('notification_enabled',)