import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AuthLayout } from "../components/common/Layout";
import { toast } from "../components/ui/Toast";
import "../styles/auth.css";

export default function ActivateAccountPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const { activateAccount } = useAuth();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("Verifying your activation link...");

  useEffect(() => {
    let mounted = true;

    async function runActivation() {
      if (!uid || !token) {
        setSuccess(false);
        setMessage("Invalid activation link.");
        setLoading(false);
        return;
      }

      try {
        await activateAccount(uid, token);
        if (!mounted) return;
        setSuccess(true);
        setMessage("Your account is now active. You can sign in.");
        toast.success("Account activated");
      } catch (error) {
        if (!mounted) return;
        const details = error?.response?.data;
        const fallback = "Activation link is invalid or expired.";
        const text =
          details?.detail ||
          details?.token?.[0] ||
          details?.uid?.[0] ||
          fallback;

        if (typeof text === "string" && text.toLowerCase().includes("stale token")) {
          setSuccess(true);
          setMessage("Account is already activated. You can sign in now.");
          toast.success("Account already activated");
        } else {
          setSuccess(false);
          setMessage(text);
          toast.error(text);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    runActivation();

    return () => {
      mounted = false;
    };
  }, [uid, token, activateAccount]);

  return (
    <AuthLayout>
      <Card className="auth-card">
        <div className="auth-header">
          <h1>Account Activation</h1>
          <p>{message}</p>
        </div>

        <div className="auth-form">
          {loading ? (
            <Button type="button" variant="primary" size="lg" fullWidth loading>
              Activating...
            </Button>
          ) : success ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate("/login", { replace: true })}
            >
              Continue to Login
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => navigate("/register")}
              >
                Create Account Again
              </Button>
              <Link to="/login" className="auth-link-button" style={{ marginTop: 12 }}>
                Back to login
              </Link>
            </>
          )}
        </div>
      </Card>
    </AuthLayout>
  );
}
