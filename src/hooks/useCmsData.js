import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

const sortByOrder = (items) =>
  [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

export function useCmsDocument(documentId, fallback) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "siteContent", documentId),
      (snapshot) => {
        setData(snapshot.exists() ? { ...fallback, ...snapshot.data() } : fallback);
        setLoading(false);
      },
      () => {
        setData(fallback);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [documentId, fallback]);

  return { data, loading };
}

export function useCmsCollection(collectionName, fallback) {
  const [items, setItems] = useState(sortByOrder(fallback));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectionQuery = query(collection(db, collectionName), orderBy("order", "asc"));

    const unsubscribe = onSnapshot(
      collectionQuery,
      (snapshot) => {
        const docs = snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .filter((item) => item.published !== false);

        setItems(docs.length ? docs : sortByOrder(fallback));
        setLoading(false);
      },
      () => {
        setItems(sortByOrder(fallback));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName, fallback]);

  return { items, loading };
}
