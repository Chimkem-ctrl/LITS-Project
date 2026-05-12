import { useState } from "react";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle } from "../components/ui/Card";
import { Input, Select, Checkbox } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import { toast } from "../components/ui/Toast";
import "../styles/settings.css";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    theme: "dark",
    timezone: "UTC+8",
  });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <ProtectedLayout>
      <div className="settings-container">
        <h1>Settings</h1>

        <div className="settings-content">
          <Card className="settings-card">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="settings-group">
                <Checkbox
                  label="Email Notifications"
                  name="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={handleChange}
                />
                <p className="setting-description">
                  Receive email notifications for important updates
                </p>
              </div>

              <div className="settings-group">
                <Checkbox
                  label="SMS Notifications"
                  name="smsNotifications"
                  checked={settings.smsNotifications}
                  onChange={handleChange}
                />
                <p className="setting-description">
                  Receive SMS notifications for payments and alerts
                </p>
              </div>

              <Button variant="primary" onClick={handleSave}>
                Save Preferences
              </Button>
            </CardBody>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <CardTitle>Display</CardTitle>
            </CardHeader>
            <CardBody>
              <Select
                label="Theme"
                name="theme"
                value={settings.theme}
                onChange={handleChange}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "auto", label: "Auto" },
                ]}
              />

              <Select
                label="Timezone"
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                options={[
                  { value: "UTC+8", label: "UTC+8 (Philippines)" },
                  { value: "UTC+0", label: "UTC+0 (London)" },
                  { value: "UTC-5", label: "UTC-5 (New York)" },
                ]}
              />

              <Button variant="primary" onClick={handleSave}>
                Save Display Settings
              </Button>
            </CardBody>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="settings-group">
                <h4>Two-Factor Authentication</h4>
                <p className="setting-description">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              <div className="settings-group border-top">
                <h4>Active Sessions</h4>
                <p className="setting-description">
                  Manage your active sessions and connected devices
                </p>
                <Button variant="outline">View Sessions</Button>
              </div>

              <div className="settings-group border-top">
                <h4>Download Your Data</h4>
                <p className="setting-description">
                  Export your personal data in a portable format
                </p>
                <Button variant="outline">Download Data</Button>
              </div>
            </CardBody>
          </Card>

          <Card className="settings-card danger-zone">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="danger-section">
                <h4>Delete Account</h4>
                <p className="setting-description">
                  Permanently delete your account and all associated data
                </p>
                <Button variant="danger">Delete Account</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
