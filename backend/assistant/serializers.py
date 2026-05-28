from rest_framework import serializers


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=('user', 'assistant'))
    content = serializers.CharField(trim_whitespace=True)


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=False, trim_whitespace=True)
    messages = ChatMessageSerializer(many=True, required=False)

    def validate(self, attrs):
        message = attrs.get('message')
        messages = attrs.get('messages')
        if not message and not messages:
            raise serializers.ValidationError('Provide a message or a message history.')
        return attrs
