import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/axios";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { AuthLayout } from "../components/common/Layout";
import { toast } from "../components/ui/Toast";
import "../styles/auth.css";

export default function ActivateAccountPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");

  useEffect(() => {
    async function activate() {
      try {
        await api.post("/auth/users/activation/", { uid, token });
        setStatus("success");
        toast.success("Your account has been activated. You can now log in.");
        setTimeout(() => navigate("/login", { replace: true }), 2500);
      } catch (err) {
        setStatus("error");
        setError(
          err?.response?.data?.detail ||
            "Activation failed. Please verify your link or request a new email."
        );
      }
    }

    if (uid && token) {
      activate();
    } else {
      setStatus("error");
      setError("Activation link is invalid.");
    }
  }, [uid, token, navigate]);

  return (
    <AuthLayout>
      <Card className="auth-card auth-card-lg">
        <div className="auth-header">
          <h1>Activate Account</h1>
          <p>
            {status === "pending"
              ? "Activating your account, please wait..."
              : status === "success"
              ? "Your account is now active. Redirecting to login..."
              : "Activation failed."}
          </p>
        </div>

        {status === "error" && <div className="form-error">{error}</div>}

        <div className="auth-footer">
          <Button
            variant="primary"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to Login
          </Button>
        </div>
      </Card>
    </AuthLayout>
  );
}
