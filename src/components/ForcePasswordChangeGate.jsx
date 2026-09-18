import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import ForcePasswordChangeModal from "./ForcePasswordChangeModal";

export default function ForcePasswordChangeGate() {
  const { user, mustChangePassword, completeForcedPasswordChange, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user || !mustChangePassword) return null;

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Please use a password with at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your new passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Choose a new password different from the temporary one.");
      return;
    }

    setSaving(true);

    try {
      await completeForcedPasswordChange(currentPassword, newPassword);
      resetFields();
    } catch (submitError) {
      setError(submitError.message || "Unable to update your password.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    resetFields();
    await logout();
  };

  return (
    <ForcePasswordChangeModal
      isOpen
      email={user.email || ""}
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleSubmit}
      onSignOut={handleSignOut}
      loading={saving}
      error={error}
    />
  );
}
