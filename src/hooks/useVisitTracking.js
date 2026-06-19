import { useEffect } from "react";
import { doc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const getLocalDateId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function useVisitTracking() {
  useEffect(() => {
    const dateId = getLocalDateId();
    const storageKey = `proDentalVisit:${dateId}`;

    if (window.localStorage.getItem(storageKey)) return;

    window.localStorage.setItem(storageKey, "1");

    setDoc(
      doc(db, "visitorStats", dateId),
      {
        date: dateId,
        totalVisits: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((error) => {
      console.error("Visit tracking failed:", error);
      window.localStorage.removeItem(storageKey);
    });
  }, []);
}
