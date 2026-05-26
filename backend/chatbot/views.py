from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = str(request.data.get("message", "")).strip()
        if not message:
            return Response(
                {"detail": "Please provide a message to send to the chatbot."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": message,
                "reply": self.generate_reply(message),
            }
        )

    def generate_reply(self, message):
        text = message.lower()
        if "loan" in text or "borrow" in text:
            return (
                "Loans are managed from your dashboard. You can create borrowers, add loans, "
                "and record payments there."
            )

        if "payment" in text or "pay" in text:
            return (
                "To record a payment, use the Payments section of the dashboard and enter "
                "the payment amount with the associated loan."
            )

        if "profile" in text or "account" in text:
            return (
                "Your profile page shows your account details and lets you update your name "
                "or photo."
            )

        if "activate" in text or "activation" in text:
            return (
                "If you signed up recently, check your email for the activation link before "
                "logging in."
            )

        if "help" in text or "support" in text:
            return (
                "I can help with common questions about logging in, registration, loans, "
                "payments, and profile settings. Ask me anything."
            )

        return (
            "I’m here to help with your LITS account and loan workflows. Try asking about "
            "your dashboard, profile, loan creation, or activation process."
        )
