import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ChatRequestSerializer


class OllamaChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _last_user_message(self, messages):
        for message in reversed(messages):
            if message.get('role') == 'user' and message.get('content'):
                return message.get('content', '').strip()
        return ''

    def _fallback_reply(self, user, messages):
        text = self._last_user_message(messages).lower()
        borrower_name = getattr(user, 'first_name', '') or 'there'

        if re.search(r'\b(invoice|bill|receipt)\b', text):
            return (
                f'Hi {borrower_name}, invoices in LITS are used to track loan application and payment charges. '
                'Open the Invoices page to see issued records and amounts due.'
            )

        if re.search(r'\b(deadline|schedule|calendar|due date|monthly)\b', text):
            return (
                f'Hi {borrower_name}, your calendar shows installment deadlines by month. '
                'Use the Calendar page to move between months and review each expected payment date and amount.'
            )

        if re.search(r'\b(balance|remaining|payment|pay|installment)\b', text):
            return (
                f'Hi {borrower_name}, payments are applied to your loan balance and the schedule updates after each payment. '
                'Check your loan details for the installment breakdown and remaining balance.'
            )

        if re.search(r'\b(personal loan|student loan|loan type|type of loan)\b', text):
            return (
                'LITS currently supports Personal Loan and Student Loan requests. '
                'Choose the loan type that matches your need when submitting a request.'
            )

        return (
            'I can help with loan requests, invoices, deadlines, payments, and account navigation. '
            'Ask me something specific like "When is my next due date?" or "What does this invoice mean?"'
        )

    def _build_system_prompt(self, user):
        role = getattr(user, 'role', 'user')
        name = getattr(user, 'first_name', '') or user.email or 'user'

        base_prompt = (
            'You are LITS Assist, a helpful loan and account support assistant for the LITS portal. '
            'Keep answers concise, practical, and friendly. '
            'You can explain loan requests, invoices, deadlines, payment schedules, and account navigation. '
            'Do not invent account data. If the user asks about their exact balance, deadlines, or invoice numbers, '
            'tell them to check the portal data shown in the app. '
            'If the request is outside the lending portal, politely say you can only help with LITS account and loan topics.'
        )

        if role == 'borrower':
            extra = (
                f' The current user is a borrower named {name}. '
                'Use borrower-focused language and encourage them to review upcoming deadlines and invoices.'
            )
        else:
            extra = (
                f' The current user is a {role}. '
                'Use admin or officer language when relevant and keep support-oriented answers focused on the portal.'
            )

        return base_prompt + extra

    def _call_ollama(self, messages):
        payload = {
            'model': settings.OLLAMA_MODEL,
            'messages': messages,
            'stream': False,
            'options': {
                'temperature': 0.3,
                'top_p': 0.9,
            },
        }

        request = Request(
            f'{settings.OLLAMA_BASE_URL}/api/chat',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )

        with urlopen(request, timeout=settings.OLLAMA_TIMEOUT_SECONDS) as response:
            body = response.read().decode('utf-8')
            return json.loads(body)

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        incoming_messages = serializer.validated_data.get('messages') or []
        message = serializer.validated_data.get('message')

        if message:
            incoming_messages = [*incoming_messages, {'role': 'user', 'content': message}]

        messages = [{'role': 'system', 'content': self._build_system_prompt(request.user)}]
        messages.extend(incoming_messages[-20:])

        try:
            data = self._call_ollama(messages)
        except HTTPError as error:
            return Response(
                {
                    'reply': self._fallback_reply(request.user, messages),
                    'model': f'offline-fallback:{settings.OLLAMA_MODEL}',
                    'created_at': timezone.now().isoformat(),
                    'mode': 'fallback',
                    'detail': f'Ollama returned an error: {error.reason}',
                }
            )
        except (URLError, TimeoutError, OSError):
            return Response(
                {
                    'reply': self._fallback_reply(request.user, messages),
                    'model': f'offline-fallback:{settings.OLLAMA_MODEL}',
                    'created_at': timezone.now().isoformat(),
                    'mode': 'fallback',
                    'detail': (
                        'Unable to reach Ollama. Using the built-in LITS Assist fallback reply instead.'
                    ),
                }
            )

        reply = data.get('message', {}).get('content') or data.get('response') or ''
        if not reply:
            return Response(
                {
                    'reply': self._fallback_reply(request.user, messages),
                    'model': f'offline-fallback:{settings.OLLAMA_MODEL}',
                    'created_at': timezone.now().isoformat(),
                    'mode': 'fallback',
                    'detail': 'Ollama did not return a response. Using the built-in fallback reply instead.',
                }
            )

        return Response(
            {
                'reply': reply,
                'model': data.get('model', settings.OLLAMA_MODEL),
                'created_at': timezone.now().isoformat(),
            }
        )
