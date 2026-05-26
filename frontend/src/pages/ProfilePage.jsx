import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ProtectedLayout } from "../components/common/Layout";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "../components/ui/Card";
import { Input } from "../components/forms/Input";
import { Button } from "../components/ui/Button";
import { toast } from "../components/ui/Toast";
import "../styles/profile.css";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    status: user?.is_active ? "Active" : "Inactive",
    role: user?.role || "",
    dateJoined: user?.date_joined || "",
    profilePicture: null,
  });
  const [preview, setPreview] = useState(null);

  // Helper to get full image URL
  function getFullImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Default backend dev URL
    return `http://localhost:8000${url}`;
  }

  useEffect(() => {
    setForm({
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      email: user?.email || "",
      status: user?.is_active ? "Active" : "Inactive",
      role: user?.role || "",
      dateJoined: user?.date_joined || "",
      profilePicture: null,
    });
    setPreview(getFullImageUrl(user?.profile_picture_url));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, profilePicture: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(getFullImageUrl(user?.profile_picture_url));
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        first_name: form.firstName,
        last_name: form.lastName,
        profile_picture: form.profilePicture,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        Object.values(error?.response?.data || {}).flat().join(" ") ||
        "Failed to update profile";
      toast.error(message);
    }
  };

  return (
    <ProtectedLayout>
      <div className="profile-container">
        <h1>Profile</h1>
        <div className="profile-content">
          {/* Personal Information Card */}
          <Card className="profile-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="profile-info">
                <div className="profile-avatar">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Profile"
                      className="profile-picture"
                      onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <div className="profile-picture-placeholder">No Image</div>
                  )}
                </div>
                <div className="profile-details">
                  {!isEditing ? (
                    <>
                      <div className="detail-item">
                        <div className="detail-label">Email</div>
                        <div className="detail-value">{form.email || "—"}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">First Name</div>
                        <div className="detail-value">{form.firstName || "—"}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Last Name</div>
                        <div className="detail-value">{form.lastName || "—"}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Role</div>
                        <div className="detail-value"><span className="role-badge">{form.role || "—"}</span></div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Account Status</div>
                        <div className="detail-value">{form.status || "—"}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Member Since</div>
                        <div className="detail-value">{form.dateJoined ? new Date(form.dateJoined).toLocaleDateString() : "—"}</div>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">Profile Picture</div>
                        <div className="detail-value">{preview ? <img src={preview} alt="avatar-small" className="avatar-small" /> : 'No image'}</div>
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
                      <Input
                        label="Email"
                        name="email"
                        value={form.email}
                        disabled
                      />
                      <Input
                        label="Role"
                        name="role"
                        value={form.role}
                        disabled
                      />
                      <Input
                        label="Profile Picture"
                        name="profilePicture"
                        type="file"
                        onChange={handleFileChange}
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
          {/* Security Card */}
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
