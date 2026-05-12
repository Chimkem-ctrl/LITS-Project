import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

const defaultForm = {
  email: "",
  firstName: "",
  lastName: "",
  role: "borrower",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register(form);

      // Auto-login after registration so user lands in dashboard directly.
      await login(form.email, form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      const firstMessage =
        typeof data === "object" && data !== null
          ? Object.values(data).flat().join(" ")
          : "Registration failed. Please verify details and try again.";
      setError(firstMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p>Register a new account to access the LITS platform.</p>

        <form onSubmit={onSubmit} className="auth-form auth-grid-form">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            required
          />

          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
          />

          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={form.role} onChange={onChange}>
            <option value="borrower">Borrower</option>
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            required
          />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={onChange}
            required
          />

          {error && <div className="form-error">{error}</div>}
          {successMessage && <div className="form-success">{successMessage}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
