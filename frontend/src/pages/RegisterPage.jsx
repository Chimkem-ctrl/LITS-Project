import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AuthLayout } from "../components/common/Layout";
import { toast } from "../components/ui/Toast";
import "../styles/auth.css";

const defaultForm = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
    if (!form.firstName) newErrors.firstName = "First name is required";
    if (!form.lastName) newErrors.lastName = "Last name is required";
    if (!form.password) newErrors.password = "Password is required";
    if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await register({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success(
        "Registration successful! Please check your email and activate your account before logging in."
      );
      navigate("/login", { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      const message =
        typeof data === "object" && data !== null
          ? Object.values(data).flat().join(" ")
          : "Registration failed. Please verify details and try again.";
      toast.error(message);
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Card className="auth-card auth-card-lg">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join LITS and start managing your loans</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form auth-form-grid">
          <Input
            id="firstName"
            name="firstName"
            label="First Name"
            placeholder="John"
            value={form.firstName}
            onChange={onChange}
            error={errors.firstName}
            required
          />

          <Input
            id="lastName"
            name="lastName"
            label="Last Name"
            placeholder="Doe"
            value={form.lastName}
            onChange={onChange}
            error={errors.lastName}
            required
          />

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
            helperText="At least 8 characters"
            value={form.password}
            onChange={onChange}
            error={errors.password}
            required
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={onChange}
            error={errors.confirmPassword}
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
            Create Account
          </Button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className="auth-link-button">
          Sign in instead
        </Link>
      </Card>
    </AuthLayout>
  );
}
