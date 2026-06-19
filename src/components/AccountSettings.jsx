import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  FaBolt,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPen,
  FaShieldAlt,
  FaTrashAlt,
} from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import { auth, db } from "../firebase";
import Footer from "./Footer";
import LogoutConfirmModal from "./LogoutConfirmModal";
import Navbar from "./Navbar";
import "../assets/Style/accountSettings.css";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const providerSummary = (providerData = []) =>
  providerData
    .map((provider) => provider.providerId)
    .filter(Boolean)
    .join(", ");

function SettingsCard({ icon, title, subtitle, children, className = "", onEdit, contentRef }) {
  return (
    <section ref={contentRef} className={`account-settings-card-section ${className}`.trim()}>
      <div className="account-settings-card-section__header">
        <div className="account-settings-card-section__title">
          <div className="account-settings-card-section__icon">{icon}</div>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            className="account-settings-card-section__edit"
            onClick={onEdit}
            aria-label={`Edit ${title}`}
          >
            <FaPen aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export default function AccountSettings() {
  const { user, loading, accountRole, isAdmin, isOwner, logout } = useAuth();
  const navigate = useNavigate();

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [subscriberDocs, setSubscriberDocs] = useState([]);
  const [subscriberLoading, setSubscriberLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordFields, setShowPasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const profileSectionRef = useRef(null);
  const emailSectionRef = useRef(null);
  const passwordSectionRef = useRef(null);
  const notificationSectionRef = useRef(null);
  const deleteSectionRef = useRef(null);

  const currentEmail = normalizeEmail(user?.email);
  const passwordProviderPresent = Boolean(
    user?.providerData?.some((provider) => provider.providerId === "password")
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setEmailForm((current) => ({
      ...current,
      newEmail: user?.email || "",
    }));
  }, [user?.email]);

  useEffect(() => {
    if (!user?.uid || !user?.email) {
      setSubscriberDocs([]);
      setNotificationsEnabled(true);
      setSubscriberLoading(false);
      return undefined;
    }

    const subscriberRef = doc(db, "articleSubscribers", user.uid);
    let cancelled = false;

    const syncSubscriberOwnership = async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(
          subscriberRef,
          {
            authUid: user.uid,
            email: currentEmail,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            source: "account-settings",
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      const data = snapshot.data();
      const nextStatus = data.status === "paused" ? "paused" : "active";
      const needsUpdate =
        data.authUid !== user.uid ||
        normalizeEmail(data.email || "") !== currentEmail ||
        data.displayName !== (user.displayName || "") ||
        data.photoURL !== (user.photoURL || "");

      if (needsUpdate) {
        await setDoc(
          subscriberRef,
          {
            authUid: user.uid,
            email: currentEmail,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            source: data.source || "account-settings",
            status: nextStatus,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    };

    const seedAndWatch = async () => {
      try {
        const snapshot = await getDoc(subscriberRef);
        if (cancelled) return;

        const docs = snapshot.exists()
          ? [{ id: snapshot.id, ...snapshot.data() }]
          : [];
        setSubscriberDocs(docs);
        setNotificationsEnabled(
          docs.length > 0 ? docs.some((docItem) => docItem.status !== "paused") : true
        );
        setSubscriberLoading(false);

        await syncSubscriberOwnership(snapshot);
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load article notification settings:", error);
        setSubscriberDocs([]);
        setNotificationsEnabled(true);
        setSubscriberLoading(false);
      }
    };

    seedAndWatch();

    const unsubscribe = onSnapshot(
      subscriberRef,
      (snapshot) => {
        if (cancelled) return;

        const docs = snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : [];
        setSubscriberDocs(docs);
        setNotificationsEnabled(
          docs.length > 0 ? docs.some((docItem) => docItem.status !== "paused") : true
        );
        setSubscriberLoading(false);
      },
      (error) => {
        if (cancelled) return;
        console.error("Notification settings watch failed:", error);
        setNotificationMessage("");
        setSubscriberLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentEmail, user?.displayName, user?.photoURL, user?.uid]);

  useEffect(() => {
    if (!activeSection) {
      return undefined;
    }

    let sectionRef = null;
    switch (activeSection) {
      case "email":
        sectionRef = emailSectionRef;
        break;
      case "password":
        sectionRef = passwordSectionRef;
        break;
      case "notifications":
        sectionRef = notificationSectionRef;
        break;
      case "delete":
        sectionRef = deleteSectionRef;
        break;
      default:
        sectionRef = null;
    }

    const section = sectionRef?.current;
    if (!section) {
      return undefined;
    }

    section.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = section.querySelector("input, button, textarea, select");
    focusTarget?.focus({ preventScroll: true });

    return undefined;
  }, [activeSection]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="account-settings-page">
          <section className="account-settings-shell">
            <span className="section-tag">Account</span>
            <h1>Loading settings...</h1>
            <p>We are checking your session and preparing your account tools.</p>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: { pathname: "/settings" } }} />;
  }

  const openLogoutConfirm = () => {
    setLogoutOpen(true);
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const reauthenticateWithCurrentPassword = async (password) => {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw new Error("Your signed-in account email is unavailable.");
    }

    if (!password) {
      throw new Error("Please enter your current password.");
    }

    const credential = EmailAuthProvider.credential(currentUser.email, password);
    return reauthenticateWithCredential(currentUser, credential);
  };

  const reauthenticateForAccountDeletion = async (password) => {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw new Error("Your signed-in account email is unavailable.");
    }

    const googleProviderPresent = currentUser.providerData?.some(
      (provider) => provider.providerId === "google.com"
    );

    if (googleProviderPresent && !passwordProviderPresent) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return reauthenticateWithPopup(currentUser, provider);
    }

    return reauthenticateWithCurrentPassword(password);
  };

  const handleNotificationToggle = async () => {
    const nextEnabled = !notificationsEnabled;
    const normalized = currentEmail;
    setNotificationMessage("");
    setNotificationSaving(true);

    try {
      await setDoc(
        doc(db, "articleSubscribers", user.uid),
        {
          authUid: user.uid,
          email: normalized,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          source: "account-settings",
          status: nextEnabled ? "active" : "paused",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setNotificationsEnabled(nextEnabled);
      setNotificationMessage(
        nextEnabled ? "Article email notifications are on." : "Article email notifications are paused."
      );
    } catch (error) {
      setNotificationMessage(error.message || "Unable to update notifications.");
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setEmailMessage("");
    setEmailSaving(true);

    const nextEmail = normalizeEmail(emailForm.newEmail);
    const previousEmail = currentEmail;

    try {
      if (!nextEmail) {
        throw new Error("Please enter a new email address.");
      }

      if (nextEmail === previousEmail) {
        throw new Error("Your new email must be different from your current email.");
      }

      await reauthenticateWithCurrentPassword(emailForm.currentPassword);
      await verifyBeforeUpdateEmail(auth.currentUser, nextEmail, {
        url: `${window.location.origin}/settings`,
        handleCodeInApp: true,
      });

      setEmailForm({
        newEmail: nextEmail,
        currentPassword: "",
      });
      setEmailMessage(
        `Check your inbox for a verification link sent to ${nextEmail}. Verify it, then sign in again with the updated email.`
      );
    } catch (error) {
      setEmailMessage(error.message || "Unable to update your email.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordSaving(true);

    try {
      if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
        throw new Error("Please use a password with at least 6 characters.");
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("Your new passwords do not match.");
      }

      await reauthenticateWithCurrentPassword(passwordForm.currentPassword);
      await updatePassword(auth.currentUser, passwordForm.newPassword);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordFields({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
      setPasswordMessage("Your password was updated.");
    } catch (error) {
      setPasswordMessage(error.message || "Unable to update your password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteSubmit = async (event) => {
    event.preventDefault();
    setDeleteMessage("");
    setDeleteSaving(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error("Your signed-in account email is unavailable.");
      }

      await reauthenticateForAccountDeletion(deletePassword);

      const archivedEmail = currentEmail;
      const notificationByIdQuery = query(
        collection(db, "articleNotifications"),
        where("subscriberId", "==", user.uid)
      );
      const notificationByUidQuery = query(
        collection(db, "articleNotifications"),
        where("subscriberUid", "==", user.uid)
      );
      const consultationByUidQuery = query(
        collection(db, "consultations"),
        where("authUid", "==", user.uid)
      );
      const consultationByEmailQuery = query(
        collection(db, "consultations"),
        where("email", "==", currentUser.email || "")
      );
      const subscriberSnapshot = await getDoc(doc(db, "articleSubscribers", user.uid));
      const [notificationByIdSnapshot, notificationByUidSnapshot, consultationByUidSnapshot, consultationByEmailSnapshot] =
        await Promise.all([
          getDocs(notificationByIdQuery),
          getDocs(notificationByUidQuery),
          getDocs(consultationByUidQuery),
          getDocs(consultationByEmailQuery),
        ]);
      const archiveRef = doc(db, "accountArchive", user.uid);
      const uniqueDocsById = (docs) =>
        Array.from(new Map(docs.map((entry) => [entry.id, entry])).values());
      const archivedRecords = subscriberSnapshot.exists()
        ? [
            {
              id: subscriberSnapshot.id,
              ...subscriberSnapshot.data(),
            },
          ]
        : subscriberDocs;

      await setDoc(archiveRef, {
        uid: user.uid,
        email: currentUser.email || "",
        archivedEmail,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        providerData: (currentUser.providerData || []).map((provider) => ({
          providerId: provider.providerId || "",
          uid: provider.uid || "",
          displayName: provider.displayName || "",
          email: provider.email || "",
          photoURL: provider.photoURL || "",
        })),
        accountRole,
        isAdmin,
        isOwner,
        notificationPreference: notificationsEnabled ? "active" : "paused",
        archivedAt: serverTimestamp(),
        deleteReason: "user_requested_account_deletion",
        articleSubscriberRecords: archivedRecords,
        articleNotificationRecords: uniqueDocsById([
          ...notificationByIdSnapshot.docs,
          ...notificationByUidSnapshot.docs,
        ]).map((notificationDoc) => ({
          id: notificationDoc.id,
          ...notificationDoc.data(),
        })),
        consultationRecords: uniqueDocsById([
          ...consultationByUidSnapshot.docs,
          ...consultationByEmailSnapshot.docs,
        ]).map((consultationDoc) => ({
          id: consultationDoc.id,
          ...consultationDoc.data(),
        })),
      });

      const batch = writeBatch(db);
      if (subscriberSnapshot.exists()) {
        batch.delete(subscriberSnapshot.ref);
      }
      uniqueDocsById([...notificationByIdSnapshot.docs, ...notificationByUidSnapshot.docs]).forEach(
        (notificationDoc) => {
          batch.delete(notificationDoc.ref);
        }
      );
      uniqueDocsById([...consultationByUidSnapshot.docs, ...consultationByEmailSnapshot.docs]).forEach(
        (consultationDoc) => {
          batch.delete(consultationDoc.ref);
        }
      );
      await batch.commit();

      await deleteUser(currentUser);
      navigate("/login", { replace: true });
    } catch (error) {
      setDeleteMessage(error.message || "Unable to delete your account.");
    } finally {
      setDeleteSaving(false);
    }
  };

  const activeProviderSummary = providerSummary(user.providerData);

  const toggleSection = (sectionName) => {
    setActiveSection((current) => (current === sectionName ? null : sectionName));
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswordFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName],
    }));
  };

  return (
    <>
      <Navbar />
      <main className="account-settings-page">
        <section className="account-settings-shell">
          <div className="account-settings-hero">
            <span className="section-tag">Account</span>
            <h1>Settings</h1>
            <p>
              Manage your email, password, article email notifications, and your
              account archive from one place.
            </p>
          </div>

          <div className="account-settings-list">
            <SettingsCard
              icon={<FaShieldAlt aria-hidden="true" />}
              title="Profile"
              subtitle="Your signed-in identity and account access."
              contentRef={profileSectionRef}
            >
              <div className="account-settings-profile">
                <div className="account-settings-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "Profile photo"} />
                  ) : (
                    <span>{(user.displayName || user.email || "G").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="account-settings-profile__copy">
                  <strong>{user.displayName || "Signed in user"}</strong>
                  <p>{user.email}</p>
                  <small>{accountRole}</small>
                </div>
              </div>
              <div className="account-settings-meta">
                <span>
                  <FaEnvelope aria-hidden="true" /> {user.email}
                </span>
                <span>
                  <FaLock aria-hidden="true" /> {passwordProviderPresent ? "Password linked" : "Password not linked"}
                </span>
                <span>
                  <FaBolt aria-hidden="true" /> {activeProviderSummary || "Firebase auth"}
                </span>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={<FaEnvelope aria-hidden="true" />}
              title="Change Email"
              subtitle="Update the Gmail address tied to this account."
              onEdit={() => toggleSection("email")}
              contentRef={emailSectionRef}
            >
              {activeSection === "email" && (
                <form className="account-settings-form account-settings-form--expanded" onSubmit={handleEmailSubmit}>
                  <label>
                    New email
                    <input
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(event) =>
                        setEmailForm((current) => ({ ...current, newEmail: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Current password
                    <input
                      type="password"
                      value={emailForm.currentPassword}
                      onChange={(event) =>
                        setEmailForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  {emailMessage && <p className="account-settings-feedback">{emailMessage}</p>}
                  <button type="submit" disabled={emailSaving}>
                    {emailSaving ? "Updating..." : "Update email"}
                  </button>
                </form>
              )}
            </SettingsCard>

            <SettingsCard
              icon={<FaLock aria-hidden="true" />}
              title="Change Password"
              subtitle="Replace your login password with a new one."
              onEdit={() => toggleSection("password")}
              contentRef={passwordSectionRef}
            >
              {activeSection === "password" && (
                <form className="account-settings-form account-settings-form--expanded" onSubmit={handlePasswordSubmit}>
                  <label className="account-settings-password-field">
                    Current password
                    <div className="account-settings-password-field__control">
                      <input
                        className="account-settings-password-field__input"
                        type={showPasswordFields.currentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            currentPassword: event.target.value,
                          }))
                        }
                        required
                      />
                      <button
                        type="button"
                        className="account-settings-password-field__toggle"
                        onClick={() => togglePasswordVisibility("currentPassword")}
                        aria-label={
                          showPasswordFields.currentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                        aria-pressed={showPasswordFields.currentPassword}
                      >
                        {showPasswordFields.currentPassword ? (
                          <FaEyeSlash aria-hidden="true" />
                        ) : (
                          <FaEye aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </label>
                  <label className="account-settings-password-field">
                    New password
                    <div className="account-settings-password-field__control">
                      <input
                        className="account-settings-password-field__input"
                        type={showPasswordFields.newPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="account-settings-password-field__toggle"
                        onClick={() => togglePasswordVisibility("newPassword")}
                        aria-label={
                          showPasswordFields.newPassword ? "Hide new password" : "Show new password"
                        }
                        aria-pressed={showPasswordFields.newPassword}
                      >
                        {showPasswordFields.newPassword ? (
                          <FaEyeSlash aria-hidden="true" />
                        ) : (
                          <FaEye aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </label>
                  <label className="account-settings-password-field">
                    Confirm new password
                    <div className="account-settings-password-field__control">
                      <input
                        className="account-settings-password-field__input"
                        type={showPasswordFields.confirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="account-settings-password-field__toggle"
                        onClick={() => togglePasswordVisibility("confirmPassword")}
                        aria-label={
                          showPasswordFields.confirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        aria-pressed={showPasswordFields.confirmPassword}
                      >
                        {showPasswordFields.confirmPassword ? (
                          <FaEyeSlash aria-hidden="true" />
                        ) : (
                          <FaEye aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </label>
                  {passwordMessage && (
                    <p className="account-settings-feedback">{passwordMessage}</p>
                  )}
                  <button type="submit" disabled={passwordSaving}>
                    {passwordSaving ? "Saving..." : "Update password"}
                  </button>
                </form>
              )}
            </SettingsCard>

            <SettingsCard
              icon={<FaEnvelope aria-hidden="true" />}
              title="Article Email Notifications"
              subtitle="Pause or resume emails when new articles are posted."
              onEdit={() => toggleSection("notifications")}
              contentRef={notificationSectionRef}
            >
              {activeSection === "notifications" && (
                <>
                  <div className="account-settings-toggle-row">
                    <div>
                      <strong>{notificationsEnabled ? "Notifications enabled" : "Notifications paused"}</strong>
                      <p>
                        {notificationsEnabled
                          ? "You will receive article announcements."
                          : "You will not receive article announcements."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`account-settings-switch ${notificationsEnabled ? "is-on" : ""}`}
                      onClick={handleNotificationToggle}
                      disabled={notificationSaving || subscriberLoading}
                      aria-label={notificationsEnabled ? "Disable email notifications" : "Enable email notifications"}
                    >
                      <span className="account-settings-switch__track">
                        <span className="account-settings-switch__thumb" />
                      </span>
                    </button>
                  </div>
                  {notificationMessage && (
                    <p className="account-settings-feedback">{notificationMessage}</p>
                  )}
                </>
              )}
            </SettingsCard>

            <SettingsCard
              icon={<FaTrashAlt aria-hidden="true" />}
              title="Delete Gmail Connection"
              subtitle="Permanently archive this account and remove access."
              className="account-settings-card-section--danger"
              onEdit={() => toggleSection("delete")}
              contentRef={deleteSectionRef}
            >
              {activeSection === "delete" && (
                <form className="account-settings-form account-settings-form--expanded" onSubmit={handleDeleteSubmit}>
                  <p className="account-settings-danger-copy">
                    {passwordProviderPresent
                      ? "Enter your current password to archive this account in Firestore and permanently delete the Firebase Auth login. The archived record is stored in the account archive collection."
                      : "Confirm this action with Google to archive this account in Firestore and permanently delete the Firebase Auth login. The archived record is stored in the account archive collection."}
                  </p>
                  {passwordProviderPresent && (
                    <label>
                      Current password
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        required
                      />
                    </label>
                  )}
                  {deleteMessage && <p className="account-settings-feedback">{deleteMessage}</p>}
                  <button type="submit" className="account-settings-button--danger" disabled={deleteSaving}>
                    {deleteSaving ? "Deleting..." : "Delete account"}
                  </button>
                </form>
              )}
            </SettingsCard>
          </div>

          <div className="account-settings-actions">
            {(isAdmin || isOwner) && (
              <Link className="account-settings-button" to="/admin/dashboard">
                Open dashboard
              </Link>
            )}
            <Link className="account-settings-button account-settings-button--secondary" to="/">
              Back home
            </Link>
            <button
              type="button"
              className="account-settings-button account-settings-button--danger"
              onClick={openLogoutConfirm}
            >
              Logout
            </button>
          </div>
        </section>
      </main>
      <LogoutConfirmModal
        isOpen={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
      <Footer />
    </>
  );
}
