from django.utils import timezone
from .models import AuditLog, User
from organizations.models import Organization


class AuditLogService:
    """Service for creating and managing audit logs."""
    
    @staticmethod
    def log_action(user, action_type, description, organization=None, 
                   ip_address=None, user_agent=None, related_object_type=None, 
                   related_object_id=None, changes=None, status='success', 
                   error_message=None):
        """
        Create an audit log entry.
        
        Args:
            user: The user performing the action (can be None for system actions)
            action_type: AuditLog.ActionType value
            description: Human-readable description of the action
            organization: The organization context (if applicable)
            ip_address: IP address of the user
            user_agent: User agent string
            related_object_type: Type of related object (e.g., 'User', 'Organization')
            related_object_id: ID of related object
            changes: JSON dict of old/new values for changes
            status: 'success' or 'failed'
            error_message: Error message if status is 'failed'
        """
        return AuditLog.objects.create(
            user=user,
            organization=organization or (user.current_organization if user else None),
            action_type=action_type,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            changes=changes or {},
            status=status,
            error_message=error_message
        )
    
    @staticmethod
    def log_login(user, request, status='success', error_message=None):
        """Log a login attempt."""
        return AuditLogService.log_action(
            user=user if status == 'success' else None,
            action_type=AuditLog.ActionType.LOGIN if status == 'success' else AuditLog.ActionType.FAILED_LOGIN,
            description=f"Login attempt for {user.username if user else 'unknown user'}",
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            status=status,
            error_message=error_message
        )
    
    @staticmethod
    def log_logout(user, request):
        """Log a logout action."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.LOGOUT,
            description=f"User {user.username} logged out",
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
    
    @staticmethod
    def log_password_change(user, request, old_password_hash=None):
        """Log a password change."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.PASSWORD_CHANGE,
            description=f"User {user.username} changed password",
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            changes={'old_password_hash': old_password_hash} if old_password_hash else None
        )
    
    @staticmethod
    def log_password_reset(user, request):
        """Log a password reset."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.PASSWORD_RESET,
            description=f"Password reset requested for {user.username}",
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
    
    @staticmethod
    def log_role_change(user, target_user, old_role, new_role, request):
        """Log a role change."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.ROLE_CHANGE,
            description=f"User {user.username} changed role of {target_user.username} from {old_role} to {new_role}",
            related_object_type='User',
            related_object_id=target_user.id,
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            changes={'old_role': old_role, 'new_role': new_role}
        )
    
    @staticmethod
    def log_permission_change(user, organization, module, role, old_access, new_access, request):
        """Log a permission change."""
        return AuditLogService.log_action(
            user=user,
            organization=organization,
            action_type=AuditLog.ActionType.PERMISSION_CHANGE,
            description=f"User {user.username} changed {role} permissions for {module} from {old_access} to {new_access}",
            related_object_type='RolePermission',
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            changes={'module': module, 'role': role, 'old_access': old_access, 'new_access': new_access}
        )
    
    @staticmethod
    def log_user_create(user, target_user, request):
        """Log a user creation."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.USER_CREATE,
            description=f"User {user.username} created new user {target_user.username}",
            related_object_type='User',
            related_object_id=target_user.id,
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
    
    @staticmethod
    def log_user_delete(user, target_username, request):
        """Log a user deletion."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.USER_DELETE,
            description=f"User {user.username} deleted user {target_username}",
            related_object_type='User',
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
    
    @staticmethod
    def log_api_access(user, request, endpoint, method='GET'):
        """Log API access (can be selectively enabled)."""
        return AuditLogService.log_action(
            user=user,
            action_type=AuditLog.ActionType.API_ACCESS,
            description=f"API access: {method} {endpoint}",
            ip_address=AuditLogService._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            changes={'endpoint': endpoint, 'method': method}
        )
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip