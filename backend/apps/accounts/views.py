from django.conf import settings
from django.db import transaction
from django.middleware.csrf import get_token
from rest_framework import generics, status, views
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import AuditLog
from apps.organizations.models import Organization

from .models import Recruiter
from .permissions import IsAdmin
from .serializers import (
    LoginSerializer,
    OrganizationSerializer,
    RecruiterProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set HTTP-only cookies for JWT tokens."""
    samesite = settings.AUTH_COOKIE_SAMESITE
    secure = settings.AUTH_COOKIE_SECURE
    response.set_cookie(
        "access",
        access_token,
        max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
        httponly=True,
        samesite=samesite,
        secure=secure,
    )
    response.set_cookie(
        "refresh",
        refresh_token,
        max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
        httponly=True,
        samesite=samesite,
        secure=secure,
    )


class CsrfTokenView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, *args, **kwargs):
        return Response({"csrfToken": get_token(request)})


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth_register"

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {"detail": "Account created successfully."},
            status=status.HTTP_201_CREATED,
        )
        _set_auth_cookies(response, access, refresh_token)
        return response


class LoginView(views.APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response({"detail": "Successfully logged in."}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access, refresh_token)
        AuditLog.log(action="auth.login", user=user, ip_address=request.META.get("REMOTE_ADDR"))
        return response


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.COOKIES.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except (TokenError, InvalidToken):
            pass

        response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        response.delete_cookie("access")
        response.delete_cookie("refresh")
        AuditLog.log(
            action="auth.logout",
            user=request.user,
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response


class RefreshView(views.APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_refresh"

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            token = RefreshToken(refresh_token)
            access = str(token.access_token)
            token.set_jti()
            token.set_exp()
            token.set_iat()
            new_refresh = str(token)

            response = Response({"detail": "Token refreshed."}, status=status.HTTP_200_OK)
            _set_auth_cookies(response, access, new_refresh)
            return response
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminRecruiterListView(generics.ListAPIView):
    serializer_class = RecruiterProfileSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Recruiter.objects.select_related("user", "organization").all()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(verification_status=status_param)
        return qs


class AdminRecruiterApproveView(views.APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk, *args, **kwargs):
        try:
            recruiter = Recruiter.objects.get(pk=pk)
        except Recruiter.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        prev = recruiter.verification_status
        recruiter.approve()
        AuditLog.log(
            action="recruiter.approved",
            user=request.user,
            entity=recruiter,
            metadata={"previous": prev},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Recruiter approved."})


class AdminRecruiterRejectView(views.APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk, *args, **kwargs):
        try:
            recruiter = Recruiter.objects.get(pk=pk)
        except Recruiter.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        prev = recruiter.verification_status
        recruiter.reject()
        AuditLog.log(
            action="recruiter.rejected",
            user=request.user,
            entity=recruiter,
            metadata={"previous": prev},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Recruiter rejected."})


class AdminOrganizationListView(generics.ListAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Organization.objects.all()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(approval_status=status_param)
        return qs


class AdminOrganizationApproveView(views.APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk, *args, **kwargs):
        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        prev = org.approval_status
        org.approval_status = Organization.ApprovalStatus.APPROVED
        org.save(update_fields=["approval_status", "updated_at"])
        AuditLog.log(
            action="org.approved",
            user=request.user,
            entity=org,
            metadata={"previous": prev},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Organization approved."})


class AdminOrganizationRejectView(views.APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk, *args, **kwargs):
        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        prev = org.approval_status
        org.approval_status = Organization.ApprovalStatus.REJECTED
        org.save(update_fields=["approval_status", "updated_at"])
        AuditLog.log(
            action="org.rejected",
            user=request.user,
            entity=org,
            metadata={"previous": prev},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Organization rejected."})
