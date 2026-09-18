import { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getIdToken,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";
import { auth, db } from "../firebase";
import { saveArticleSubscriber } from "../services/articleSubscriberService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [adminCheckError, setAdminCheckError] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);
      setAdminCheckError("");

      if (!nextUser) {
        setIsAdmin(false);
        setAdminProfile(null);
        setMustChangePassword(false);
        setLoading(false);
        return;
      }

      try {
        if (nextUser?.email) {
          await getIdToken(nextUser, true);

          let subscriberSyncError = null;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              await saveArticleSubscriber(nextUser);
              subscriberSyncError = null;
              break;
            } catch (error) {
              subscriberSyncError = error;
              if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 350));
              }
            }
          }

          if (subscriberSyncError) {
            console.error("Subscriber sync failed:", subscriberSyncError);
          }
        }

        const adminSnapshot = await getDoc(doc(db, "admins", nextUser.uid));
        setIsAdmin(adminSnapshot.exists());
        setAdminProfile(
          adminSnapshot.exists()
            ? { uid: nextUser.uid, ...adminSnapshot.data() }
            : null
        );

        const subscriberSnapshot = await getDoc(doc(db, "articleSubscribers", nextUser.uid));
        setMustChangePassword(Boolean(subscriberSnapshot.data()?.mustChangePassword));
      } catch (error) {
        console.error("Admin check failed:", error);
        setAdminCheckError(error.message || "Unable to read the admin document.");
        setIsAdmin(false);
        setAdminProfile(null);
        setMustChangePassword(false);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const completeForcedPasswordChange = async (currentPassword, newPassword) => {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw new Error("We could not find your email address for this account.");
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    await setDoc(
      doc(db, "articleSubscribers", currentUser.uid),
      { mustChangePassword: false, passwordChangedAt: serverTimestamp() },
      { merge: true }
    );
    setMustChangePassword(false);
  };

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      adminProfile,
      isOwner: adminProfile?.role === "owner",
      accountRole: !user
        ? "guest"
        : adminProfile?.role === "owner"
          ? "owner"
          : isAdmin
            ? "admin"
            : "user",
      adminCheckError,
      mustChangePassword,
      loading,
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      loginWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: () => signOut(auth),
      completeForcedPasswordChange,
    }),
    [user, isAdmin, adminProfile, adminCheckError, mustChangePassword, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
