from djoser import email
from decouple import config


def build_link(base, path):
    cleaned_base = (base or '').strip()
    cleaned_path = (path or '').lstrip('/')

    if not cleaned_base:
        return cleaned_path

    if cleaned_base.endswith('://'):
        return f"{cleaned_base}{cleaned_path}"

    return f"{cleaned_base.rstrip('/')}/{cleaned_path}"


class CustomActivationEmail(email.ActivationEmail):
    template_name = 'emails/activation.html'

    def get_context_data(self):
        context = super().get_context_data()
        activation_path = context.get('url', '')

        frontend_base = config('FRONTEND_ACTIVATION_BASE_URL', default='http://localhost:5173')
        mobile_base = config('MOBILE_ACTIVATION_DEEP_LINK', default='litsmobile://')

        context['frontend_activation_link'] = build_link(frontend_base, activation_path)
        context['mobile_activation_link'] = build_link(mobile_base, activation_path)
        return context