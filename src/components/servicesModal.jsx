import { useEffect } from "react";
import "../assets/Style/servicesModal.css";

export default function ServiceModal({ isOpen, onClose, title, description }) {
  // 🔒 Disable background scroll when modal is open
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
       
       <div className="title-box">
          <h3>{title}</h3>
       </div>
        <div className="desc-box">
            <p>{description}</p>

        </div>
       

        <button className="modal-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
