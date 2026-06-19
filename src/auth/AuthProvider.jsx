import { useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getIdToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AuthContext } from "./AuthContext";
import { auth, db } from "../firebase";
import { saveArticleSubscriber } from "../services/articleSubscriberService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [adminCheckError, setAdminCheckError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setUser(nextUser);
      setAdminCheckError("");

      if (!nextUser) {
        setIsAdmin(false);
        setAdminProfile(null);
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
      } catch (error) {
        console.error("Admin check failed:", error);
        setAdminCheckError(error.message || "Unable to read the admin document.");
        setIsAdmin(false);
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

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
      loading,
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      loginWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: () => signOut(auth),
    }),
    [user, isAdmin, adminProfile, adminCheckError, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
