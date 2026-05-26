import { useState } from "react";
import { api } from "../api/axios";
import { ProtectedLayout } from "../components/common/Layout";
import { Card } from "../components/ui/Card";
import { Input } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import "../styles/chat.css";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(event) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    const userMessage = { role: "user", text: message.trim() };
    setConversation((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/chat/", { message: userMessage.text });
      setConversation((prev) => [
        ...prev,
        { role: "bot", text: response.data.reply },
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to send your message. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedLayout>
      <div className="chat-container">
        <div className="chat-header">
          <h1>Chatbot Support</h1>
          <p>Ask the assistant about loans, registration, profile updates, or account activation.</p>
        </div>

        <Card className="chat-card">
          <div className="chat-feed">
            {conversation.length === 0 ? (
              <div className="chat-empty">
                <p>Start the conversation by asking a question.</p>
              </div>
            ) : (
              conversation.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`chat-bubble chat-${item.role}`}
                >
                  <span>{item.text}</span>
                </div>
              ))
            )}
          </div>

          <form className="chat-form" onSubmit={handleSend}>
            <Input
              id="chatMessage"
              name="chatMessage"
              label="Your message"
              placeholder="Ask about loans, activation, or profile settings..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={error}
              required
            />
            <Button type="submit" variant="primary" loading={loading}>
              Send
            </Button>
          </form>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
