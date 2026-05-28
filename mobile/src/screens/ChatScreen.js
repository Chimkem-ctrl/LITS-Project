import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

const QUICK_PROMPTS = [
  'Explain my next loan deadline.',
  'What is an application invoice?',
  'How much do I pay every month?',
  'Summarize my loan status.',
];

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello. I am LITS Assist. Ask me about loans, invoices, deadlines, and payment schedules.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  const canSend = draft.trim().length > 0 && !sending;
  const conversation = useMemo(() => messages.filter((message) => message.role !== 'system'), [messages]);

  const sendMessage = async (content = draft) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);

    try {
      const response = await api.post('/assistant/chat/', {
        messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
      });

      if (response.data?.mode === 'fallback') {
        setStatusNote('Ollama is offline. LITS Assist is using built-in fallback answers for now.');
      } else {
        setStatusNote('');
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: response.data.reply },
      ]);
    } catch (error) {
      setStatusNote('');
      const fallback = 'I could not reach the Ollama assistant right now. Please make sure Ollama is running and try again.';
      setMessages((current) => [...current, { role: 'assistant', content: fallback }]);
      Alert.alert('Chat unavailable', error?.response?.data?.detail || fallback);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>AI Assistant</Text>
          <Text style={styles.title}>LITS Assist</Text>
          <Text style={styles.subtitle}>
            Ask about loan deadlines, invoices, monthly payments, and portal navigation.
          </Text>
          <View style={styles.userCard}>
            <Text style={styles.userLabel}>Signed in as</Text>
            <Text style={styles.userName}>{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || '-'}</Text>
            <Text style={styles.userRole}>{user?.role || '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conversation</Text>
          {statusNote ? <Text style={styles.statusNote}>{statusNote}</Text> : null}
          <View style={styles.history}>
            {conversation.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                style={[
                  styles.bubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={styles.bubbleRole}>{message.role === 'assistant' ? 'LITS Assist' : 'You'}</Text>
                <Text style={styles.bubbleText}>{message.content}</Text>
              </View>
            ))}
          </View>

          <View style={styles.chipRow}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity key={prompt} style={styles.chip} onPress={() => sendMessage(prompt)} disabled={sending}>
                <Text style={styles.chipText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type a message</Text>
          <TextInput
            style={styles.input}
            placeholder="Ask LITS Assist anything about your loans..."
            placeholderTextColor={COLORS.textSecondary}
            value={draft}
            onChangeText={setDraft}
            multiline
          />

          <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!canSend}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send Message</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What I can help with</Text>
          <View style={styles.helpList}>
            <Text style={styles.helpItem}>• Explain your active loans and remaining balance.</Text>
            <Text style={styles.helpItem}>• Interpret application and payment invoices.</Text>
            <Text style={styles.helpItem}>• Summarize monthly deadlines and payment expectations.</Text>
            <Text style={styles.helpItem}>• Guide you to the right page in the app.</Text>
          </View>
          <View style={styles.note}>
            <Text style={styles.noteText}>
              LITS Assist uses Ollama running on your local service. If it is offline, the chat will show an availability error.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 28, gap: 14 },
  hero: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  kicker: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 4 },
  subtitle: { color: COLORS.textSecondary, marginTop: 8, lineHeight: 20 },
  userCard: {
    marginTop: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userLabel: { color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  userName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 },
  userRole: { color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  statusNote: {
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderColor: 'rgba(45,212,191,0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    lineHeight: 18,
  },
  history: { gap: 10, marginBottom: 12, maxHeight: 340 },
  bubble: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderColor: 'rgba(45,212,191,0.28)',
    maxWidth: '88%',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    maxWidth: '88%',
  },
  bubbleRole: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  bubbleText: { color: COLORS.textPrimary, marginTop: 4, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderColor: COLORS.border,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { color: COLORS.textPrimary, fontSize: 12 },
  label: { color: COLORS.textSecondary, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    color: COLORS.textPrimary,
    padding: 12,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '700' },
  helpList: { gap: 8 },
  helpItem: { color: COLORS.textSecondary, lineHeight: 20 },
  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.2)',
  },
  noteText: { color: COLORS.textSecondary, lineHeight: 20 },
});
