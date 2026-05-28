import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AuthLayout } from "../components/common/Layout";
import { toast } from "../components/ui/Toast";
import "../styles/auth.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const newErrors = {};
    
    if (!form.email) newErrors.email = "Email is required";
    if (!form.password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const rawMessage = err?.response?.data?.detail || "";
      const message =
        typeof rawMessage === "string" && rawMessage.toLowerCase().includes("no active account")
          ? "Account is not activated yet. Please verify your email first."
          : rawMessage || "Login failed. Check your credentials and try again.";
      toast.error(message);
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card className="auth-card">
        <div className="auth-header">
          <h1>Welcome to LITS</h1>
          <p>Sign in to your account to continue</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            value={form.email}
            onChange={onChange}
            error={errors.email}
            required
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={form.password}
            onChange={onChange}
            error={errors.password}
            required
          />

          {errors.form && <div className="form-error">{errors.form}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Sign In
          </Button>
        </form>

        <div className="auth-divider">
          <span>Don't have an account?</span>
        </div>

        <Link to="/register" className="auth-link-button">
          Create new account
        </Link>
      </Card>
    </AuthLayout>
  );
}
