import { useMemo, useState } from "react";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/forms/Input";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/ui/Toast";
import "../styles/chat.css";

const QUICK_PROMPTS = [
  "Explain my next loan payment in simple terms.",
  "What does a loan application invoice mean?",
  "How do monthly loan deadlines work?",
  "Summarize the difference between personal and student loans.",
];

export default function ChatAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello. I am LITS Assist. Ask me about loans, invoices, deadlines, and payment schedules.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const canSend = draft.trim().length > 0 && !sending;

  const conversationPreview = useMemo(
    () => messages.filter((message) => message.role !== "system"),
    [messages]
  );

  async function sendMessage(content = draft) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);

    try {
      const response = await api.post("/assistant/chat/", {
        messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
      });

      if (response.data?.mode === "fallback") {
        setStatusNote("Ollama is offline. LITS Assist is using built-in fallback answers for now.");
      } else {
        setStatusNote("");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.data.reply,
        },
      ]);
    } catch (error) {
      setStatusNote("");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not reach the Ollama assistant right now. Please make sure Ollama is running and try again.",
        },
      ]);
      toast.error(error?.response?.data?.detail || "Chat assistant is unavailable.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ProtectedLayout>
      <div className="chat-page">
        <div className="chat-hero">
          <div>
            <p className="chat-eyebrow">AI Assistant</p>
            <h1>LITS Assist</h1>
            <p>
              Ask about loan deadlines, invoice status, payment schedules, and portal navigation.
            </p>
          </div>
          <div className="chat-hero-card">
            <span className="chat-hero-label">Signed in as</span>
            <strong>{user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.email}</strong>
            <span>{user?.role}</span>
          </div>
        </div>

        <div className="chat-grid">
          <Card className="chat-panel">
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardBody>
              {statusNote ? <div className="chat-status-note">{statusNote}</div> : null}
              <div className="chat-history" aria-live="polite">
                {conversationPreview.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`chat-bubble chat-bubble-${message.role}`}>
                    <span className="chat-bubble-role">{message.role === "assistant" ? "LITS Assist" : "You"}</span>
                    <p>{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="chat-chips">
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="chat-chip" onClick={() => sendMessage(prompt)} disabled={sending}>
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="chat-composer">
                <Textarea
                  id="chat-message"
                  label="Type a message"
                  placeholder="Ask LITS Assist anything about your loans..."
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                />
                <div className="chat-actions">
                  <Button type="button" onClick={() => sendMessage()} disabled={!canSend} loading={sending}>
                    Send Message
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="chat-panel chat-side-panel">
            <CardHeader>
              <CardTitle>What I can help with</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="chat-help-list">
                <li>Explain your active loans and remaining balance.</li>
                <li>Interpret application and payment invoices.</li>
                <li>Summarize monthly deadlines and payment expectations.</li>
                <li>Guide you to the right page in the portal.</li>
              </ul>
              <div className="chat-note">
                <strong>Note:</strong> LITS Assist uses Ollama running on your local service. If it is offline, the chat will show an availability error.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
