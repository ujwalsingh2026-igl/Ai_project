from django.contrib import admin
from django.urls import include, path

from apps.assistant import views as assistant_views
from apps.users import views as users_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", assistant_views.HealthView.as_view()),
    path("api/auth/token/", users_views.LoginView.as_view()),
    path("api/auth/register/", users_views.RegisterView.as_view()),
    path("api/auth/profile/", users_views.UserProfileView.as_view()),
    path("api/admin/users/", users_views.AdminUserDirectoryView.as_view()),
    path("api/assistant/chat/", assistant_views.ChatView.as_view()),
    path("api/assistant/confirm/", assistant_views.ConfirmView.as_view()),
    path("api/assistant/status/", assistant_views.AssistantStatusView.as_view()),
    path("api/assistant/approvals/", assistant_views.PendingApprovalListView.as_view()),
    path("api/audit/", assistant_views.AuditLogListView.as_view()),
    path("api/conversations/", assistant_views.ConversationListView.as_view()),
    path("api/conversations/<uuid:pk>/", assistant_views.ConversationDetailView.as_view()),
    path("api/assistant/memories/", assistant_views.MemoryListCreateView.as_view()),
    path("api/assistant/memories/<int:pk>/", assistant_views.MemoryDetailView.as_view()),
    path("api/assistant/memories/clear/", assistant_views.MemoryClearView.as_view()),
    path("api/tools/", assistant_views.ToolListView.as_view()),
    path("api/tools/<str:name>/run/", assistant_views.ToolRunView.as_view()),
    path("api/planner/", include("apps.planner.urls")),
    path("api/network/", include("apps.network.urls")),
    path("api/security/", include("apps.security.urls")),
]
