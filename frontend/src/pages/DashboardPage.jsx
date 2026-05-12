import { useAuth } from "../context/AuthContext";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardTitle } from "../components/ui/Card";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.first_name}!</p>
        </div>

        <div className="stats-grid">
          {STATS.map((stat) => (
            <Card key={stat.id} className="stat-card">
              <CardBody className="stat-card-body">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <p className="stat-label">{stat.label}</p>
                  <h3 className="stat-value">{stat.value}</h3>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="dashboard-grid">
          <Card className="dashboard-card">
            <CardTitle>Recent Activity</CardTitle>
            <CardBody>
              <div className="activity-list">
                {ACTIVITIES.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">{activity.icon}</div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <p className="activity-time">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="dashboard-card">
            <CardTitle>Quick Stats</CardTitle>
            <CardBody>
              <div className="quick-stats">
                {QUICK_STATS.map((s) => (
                  <div key={s.id} className="quick-stat">
                    <span className="quick-stat-label">{s.label}</span>
                    <span className="quick-stat-value">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}

const STATS = [
  { id: 1, icon: "📊", label: "Total Loans", value: "12" },
  { id: 2, icon: "💵", label: "Active Balance", value: "₱50,000" },
  { id: 3, icon: "✓", label: "Paid Loans", value: "5" },
  { id: 4, icon: "⏰", label: "Overdue", value: "0" },
];

const ACTIVITIES = [
  { id: 1, icon: "✓", title: "Payment received", time: "2 hours ago" },
  { id: 2, icon: "📝", title: "Loan application submitted", time: "1 day ago" },
  { id: 3, icon: "✓", title: "Loan approved", time: "3 days ago" },
  { id: 4, icon: "💰", title: "Payment due in 5 days", time: "1 week ago" },
];

const QUICK_STATS = [
  { id: 1, label: "Interest Rate", value: "8.5%" },
  { id: 2, label: "Total Paid", value: "₱25,500" },
  { id: 3, label: "Remaining", value: "₱24,500" },
];
