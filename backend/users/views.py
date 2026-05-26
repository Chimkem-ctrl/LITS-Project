from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from .serializers import UserSerializer, UserUpdateSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update profile — including uploading a new profile picture."""
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(UserSerializer(request.user).data)
            except Exception as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)