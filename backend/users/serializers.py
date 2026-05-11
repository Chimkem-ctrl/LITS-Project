from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from rest_framework import serializers
from .models import CustomUser


class UserCreateSerializer(BaseUserCreateSerializer):
    """Registration serializer — accepts multipart/form-data so profile_picture works."""

    class Meta(BaseUserCreateSerializer.Meta):
        model = CustomUser
        fields = (
            "id", "email", "first_name", "last_name",
            "password", "re_password", "role", "profile_picture",
        )


class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id", "email", "first_name", "last_name",
            "role", "is_active", "date_joined",
            "profile_picture", "profile_picture_url",
        )
        read_only_fields = ("id", "is_active", "date_joined")

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("first_name", "last_name", "profile_picture")