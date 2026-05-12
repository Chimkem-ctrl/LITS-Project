import { useState, useEffect } from "react";
import "./Toast.css";

let toastId = 0;

const toastContainer = {
  toasts: [],
  listeners: [],
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },
  notify(message, type = "info", duration = 4000) {
    const id = ++toastId;
    this.toasts.push({ id, message, type, duration });
    this.listeners.forEach((l) => l([...this.toasts]));

    if (duration > 0) {
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.listeners.forEach((l) => l([...this.toasts]));
      }, duration);
    }

    return id;
  },
};

export const toast = {
  success: (msg, duration) =>
    toastContainer.notify(msg, "success", duration),
  error: (msg, duration) => toastContainer.notify(msg, "error", duration),
  warning: (msg, duration) =>
    toastContainer.notify(msg, "warning", duration),
  info: (msg, duration) => toastContainer.notify(msg, "info", duration),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastContainer.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(({ id, message, type }) => (
        <Toast
          key={id}
          message={message}
          type={type}
          onClose={() => {
            toastContainer.toasts = toastContainer.toasts.filter(
              (t) => t.id !== id
            );
            toastContainer.listeners.forEach((l) =>
              l([...toastContainer.toasts])
            );
          }}
        />
      ))}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type} animate-slide-up`}>
      <div className="toast-icon">
        {type === "success" && "✓"}
        {type === "error" && "✕"}
        {type === "warning" && "⚠"}
        {type === "info" && "ℹ"}
      </div>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
