import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import "../styles/admin.css";

export default function AdminPage() {
  return (
    <ProtectedLayout>
      <div className="admin-container">
        <h1>Admin Panel</h1>

        <div className="admin-grid">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Manage system users and roles</p>
              <Button variant="primary" size="sm">
                Manage Users
              </Button>
            </CardBody>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardBody>
              <p>Configure system-wide settings and preferences</p>
              <Button variant="primary" size="sm">
                System Configuration
              </Button>
            </CardBody>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Reports</CardTitle>
            </CardHeader>
            <CardBody>
              <p>View and generate system reports</p>
              <Button variant="primary" size="sm">
                Generate Report
              </Button>
            </CardBody>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardBody>
              <p>View system activity and audit trails</p>
              <Button variant="primary" size="sm">
                View Logs
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
