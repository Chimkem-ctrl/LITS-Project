import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardTitle } from "../components/ui/Card";
import { AuthLayout } from "../components/common/Layout";
import "../styles/home.css";

export default function HomePage() {
  return (
    <AuthLayout>
      <div className="home-container">
        <div className="home-hero">
          <div className="hero-badge">Minimal finance platform</div>
          <h1 className="home-title">A calm, precise loan experience.</h1>
          <p className="home-subtitle">
            The modern system for borrower tracking, payment clarity, and secure workflows.
          </p>
          <p className="home-description">
            Designed for people who want a quiet, elegant interface that keeps the numbers in view and the process under control.
          </p>

          <div className="home-actions">
            <Link to="/login">
              <Button variant="primary" size="lg">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
        </div>

        <div className="home-features">
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <Card key={feature.id} className="feature-card">
                <CardBody>
                  <div className="feature-icon">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <p>{feature.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

const FEATURES = [
  {
    id: 1,
    icon: "💰",
    title: "Loan Management",
    description: "Track and manage loans with detailed information and status updates.",
  },
  {
    id: 2,
    icon: "📊",
    title: "Analytics",
    description: "Monitor payments, interest rates, and loan performance metrics.",
  },
  {
    id: 3,
    icon: "👥",
    title: "Borrower Profiles",
    description: "Maintain comprehensive borrower information and history.",
  },
  {
    id: 4,
    icon: "🔒",
    title: "Secure Access",
    description: "Role-based access control with JWT authentication.",
  },
];
