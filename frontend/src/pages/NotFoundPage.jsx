import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import "../styles/error.css";

export default function NotFoundPage() {
  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-description">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>

        <Link to="/dashboard">
          <Button variant="primary" size="lg">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="error-animation">
        <div className="floating-box">?</div>
      </div>
    </div>
  );
}
