import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { FaCloudUploadAlt, FaEllipsisH, FaTrash } from "react-icons/fa";
import { db } from "../firebase";
import { useAuth } from "../auth/useAuth";
import ConfirmActionModal from "../components/ConfirmActionModal";
import { useCmsLayout } from "../hooks/useCmsData";
import {
  DRAFTS_COLLECTION,
  createDraftFromLive,
  deleteDraft,
  publishDraft,
  renameDraft,
} from "../services/pageDrafts";
import "../assets/Style/pageContentList.css";

const formatDate = (value) => {
  const date = value?.toDate?.();
  return date
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "just now";
};

// Live, scaled-down desktop + mobile renders of a page (an iframe of the real
// site, so the thumbnail is always what the page actually looks like).
function PagePreview({ src, title }) {
  return (
    <div className="page-card__preview" aria-hidden="true">
      <div className="page-card__device page-card__device--desktop">
        <iframe src={src} title={`${title} (desktop)`} loading="lazy" tabIndex={-1} />
      </div>
      <div className="page-card__device page-card__device--mobile">
        <iframe src={src} title={`${title} (mobile)`} loading="lazy" tabIndex={-1} />
      </div>
    </div>
  );
}

function MoreMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="page-menu" ref={ref}>
      <button
        type="button"
        className="page-button page-button--icon"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaEllipsisH />
      </button>
      {open && (
        <div className="page-menu__list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`page-menu__item${item.danger ? " page-menu__item--danger" : ""}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageContentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: liveLayout } = useCmsLayout();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const draftsQuery = query(collection(db, DRAFTS_COLLECTION), orderBy("updatedAt", "desc"));
    return onSnapshot(
      draftsQuery,
      (snapshot) => {
        setDrafts(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  const handleDuplicate = async () => {
    setBusy(true);
    setMessage("");
    try {
      const id = await createDraftFromLive("Copy of Home page", user?.email);
      navigate(`/admin/page-content/${id}`);
    } catch {
      setMessage("Could not duplicate the page. Please try again.");
      setBusy(false);
    }
  };

  const handleRename = async (draft) => {
    const name = window.prompt("Rename this draft", draft.name || "");
    if (!name || !name.trim() || name.trim() === draft.name) return;
    try {
      await renameDraft(draft.id, name.trim());
    } catch {
      setMessage("Could not rename the draft. Please try again.");
    }
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    setMessage("");
    try {
      if (confirm.type === "publish") {
        await publishDraft(confirm.draft);
        setMessage(`"${confirm.draft.name}" is now the published page.`);
      } else {
        await deleteDraft(confirm.draft.id);
        setMessage("Draft deleted.");
      }
    } catch {
      setMessage("That did not work. Please try again.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <section className="admin-page page-list">
      <div className="admin-page-header">
        <span>Page Content</span>
        <h1>Pages</h1>
      </div>

      {message && <p className="page-list__message">{message}</p>}

      <article className="page-card">
        <PagePreview src="/" title="Published page" />
        <div className="page-card__footer">
          <div className="page-card__info">
            <div className="page-card__name">
              <strong>Home page</strong>
              <span className="page-badge page-badge--live">Active</span>
            </div>
            <p>Last saved: {formatDate(liveLayout.updatedAt)}</p>
            <p>Visitors see this page right now</p>
          </div>
          <div className="page-card__actions">
            <MoreMenu
              label="More actions for the published page"
              items={[
                { label: "Duplicate", onSelect: handleDuplicate },
                { label: "View live page", onSelect: () => window.open("/", "_blank") },
              ]}
            />
            <Link className="page-button page-button--dark" to="/admin/page-content/live">
              Edit page
            </Link>
          </div>
        </div>
      </article>

      <div className="page-list__section-head">
        <h2>Draft pages</h2>
        <button
          type="button"
          className="page-button"
          onClick={handleDuplicate}
          disabled={busy}
        >
          {busy ? "Creating…" : "Duplicate published page"}
        </button>
      </div>

      <div className="page-list__drafts">
        {loading ? (
          <p className="page-list__empty">Loading…</p>
        ) : drafts.length === 0 ? (
          <p className="page-list__empty">
            No drafts yet. Duplicate the published page to edit a copy without touching the
            live site.
          </p>
        ) : (
          drafts.map((draft) => (
            <article key={draft.id} className="page-card page-card--draft">
              <div className="page-card__thumb">
                <iframe
                  src={`/draft-preview/${draft.id}`}
                  title={`${draft.name} preview`}
                  loading="lazy"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
              <div className="page-card__info">
                <strong>{draft.name || "Untitled draft"}</strong>
                <p>Added: {formatDate(draft.createdAt)}</p>
                <p>Last saved: {formatDate(draft.updatedAt)}</p>
              </div>
              <div className="page-card__actions">
                <MoreMenu
                  label={`More actions for ${draft.name}`}
                  items={[
                    { label: "Rename", onSelect: () => handleRename(draft) },
                    {
                      label: "Delete",
                      danger: true,
                      onSelect: () => setConfirm({ type: "delete", draft }),
                    },
                  ]}
                />
                <button
                  type="button"
                  className="page-button"
                  onClick={() => setConfirm({ type: "publish", draft })}
                  disabled={busy}
                >
                  Publish
                </button>
                <Link className="page-button" to={`/admin/page-content/${draft.id}`}>
                  Edit page
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      <ConfirmActionModal
        isOpen={Boolean(confirm)}
        icon={confirm?.type === "delete" ? <FaTrash /> : <FaCloudUploadAlt />}
        title={confirm?.type === "delete" ? "Delete this draft?" : "Publish this draft?"}
        description={
          confirm?.type === "delete"
            ? `"${confirm?.draft?.name}" will be permanently deleted. The published page is not affected.`
            : `This replaces the published page's content with "${confirm?.draft?.name}". Visitors will see the changes immediately.`
        }
        confirmLabel={confirm?.type === "delete" ? "Delete" : "Publish"}
        danger={confirm?.type === "delete"}
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirmed}
      />
    </section>
  );
}
