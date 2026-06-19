import { useEffect } from "react";
import { FaTrashAlt } from "react-icons/fa";
import "../assets/Style/articleDeleteModal.css";

export default function ArticleDeleteConfirmModal({
  isOpen,
  articleTitle = "",
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="article-delete-modal__overlay" onClick={onCancel}>
      <div className="article-delete-modal" onClick={(event) => event.stopPropagation()}>
        <div className="article-delete-modal__icon">
          <FaTrashAlt aria-hidden="true" />
        </div>
        <div className="article-delete-modal__content">
          <h3>Delete article?</h3>
          <p>
            {articleTitle
              ? `This will permanently remove "${articleTitle}". This cannot be undone.`
              : "This will permanently remove the selected article. This cannot be undone."}
          </p>
        </div>
        <div className="article-delete-modal__actions">
          <button
            type="button"
            className="article-delete-modal__button article-delete-modal__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="article-delete-modal__button article-delete-modal__button--danger"
            onClick={onConfirm}
          >
            Delete article
          </button>
        </div>
      </div>
    </div>
  );
}
