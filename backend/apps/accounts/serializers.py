from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.password_validation import validate_password as _validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from apps.core.models import AuditLog
from apps.organizations.models import Organization

from .models import Recruiter, User


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "website",
            "approval_status",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "slug", "approval_status", "is_active", "created_at")


class RecruiterProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model = Recruiter
        fields = (
            "id",
            "first_name",
            "last_name",
            "title",
            "organization",
            "verification_status",
            "is_verified",
            "created_at",
        )
        read_only_fields = (
            "id",
            "verification_status",
            "is_verified",
            "created_at",
            "organization",
        )


class UserSerializer(serializers.ModelSerializer):
    recruiter_profile = RecruiterProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_email_verified",
            "is_active",
            "recruiter_profile",
            "date_joined",
        )
        read_only_fields = ("id", "role", "is_email_verified", "is_active", "date_joined")


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    company_name = serializers.CharField(max_length=255)
    website = serializers.URLField(required=False, allow_blank=True)
    linkedin_profile = serializers.URLField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        
        website = attrs.get("website", "")
        linkedin = attrs.get("linkedin_profile", "")
        if not website and not linkedin:
            raise serializers.ValidationError(
                {
                    "non_field_errors": (
                        "You must provide either an official company website "
                        "or a LinkedIn profile."
                    )
                }
            )
            
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=User.Role.RECRUITER,
            is_email_verified=True,
        )

        org = Organization.objects.create(
            name=validated_data["company_name"],
            website=validated_data.get("website", ""),
            approval_status=Organization.ApprovalStatus.APPROVED,
            is_active=True,
        )

        Recruiter.objects.create(
            user=user,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            organization=org,
            linkedin_profile=validated_data.get("linkedin_profile", ""),
            verification_status=Recruiter.VerificationStatus.APPROVED,
            is_verified=True,
        )

        AuditLog.log(action="auth.register", user=user, entity=user)
        return user


class CandidateRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        _validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=User.Role.CANDIDATE,
            is_email_verified=True,
        )
        AuditLog.log(action="candidate.register", user=user, entity=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(
                request=self.context.get("request"),
                email=email,
                password=password,
            )
            if not user:
                raise AuthenticationFailed("Invalid email or password.", code="invalid_credentials")
        else:
            raise AuthenticationFailed("Must include 'email' and 'password'.")

        if not user.is_active:
            raise AuthenticationFailed("User account is disabled.", code="account_disabled")

        # Recruiter-specific shape checks (skip for candidates and admins)
        if user.is_recruiter:
            self._validate_recruiter_access(user)

        attrs["user"] = user
        return attrs

    def _validate_recruiter_access(self, user):
        profile = getattr(user, "recruiter_profile", None)
        if not profile:
            raise AuthenticationFailed("Recruiter profile missing.", code="profile_missing")

        org = profile.organization
        if not org:
            raise AuthenticationFailed("Organization missing.", code="org_missing")


class RecruiterStatusUpdateSerializer(serializers.Serializer):
    pass


class OrganizationStatusUpdateSerializer(serializers.Serializer):
    pass
