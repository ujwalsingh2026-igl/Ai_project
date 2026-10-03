from django.contrib import admin

from .models import AuditLog, PendingApproval


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "tool_name", "risk_level", "decision", "status")
    list_filter = ("decision", "status", "tool_name")
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PendingApproval)
class PendingApprovalAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "tool_name", "status", "expires_at")
    list_filter = ("status", "tool_name")
    readonly_fields = [f.name for f in PendingApproval._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
