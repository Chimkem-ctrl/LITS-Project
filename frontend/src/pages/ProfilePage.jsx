import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "../components/ui/Card";
import { Input } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import { toast } from "../components/ui/Toast";
import "../styles/profile.css";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  return (
    <ProtectedLayout>
      <div className="profile-container">
        <h1>Profile</h1>

        <div className="profile-content">
          <Card className="profile-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="profile-info">
                <div className="profile-avatar">
                  {user?.profile_picture_url ? (
                    <img src={user.profile_picture_url} alt={user?.email} />
                  ) : (
                    <span>{user?.email?.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="profile-details">
                  {!isEditing ? (
                    <>
                      <div className="profile-field">
                        <label>Email</label>
                        <p>{user?.email}</p>
                      </div>
                      <div className="profile-field">
                        <label>First Name</label>
                        <p>{user?.first_name}</p>
                      </div>
                      <div className="profile-field">
                        <label>Last Name</label>
                        <p>{user?.last_name}</p>
                      </div>
                      <div className="profile-field">
                        <label>Role</label>
                        <p className="role-badge">{user?.role}</p>
                      </div>
                      <div className="profile-field">
                        <label>Account Status</label>
                        <p className={user?.is_active ? "status-active" : "status-inactive"}>
                          {user?.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="profile-field">
                        <label>Member Since</label>
                        <p>{new Date(user?.date_joined).toLocaleDateString()}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Input
                        label="First Name"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                      />
                      <Input
                        label="Last Name"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardBody>
            <CardFooter>
              {!isEditing ? (
                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave}>
                    Save Changes
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>

          <Card className="profile-card">
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="security-section">
                <h4>Password</h4>
                <p>Last changed: Never</p>
                <Button variant="outline">Change Password</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
