import { useState, useEffect } from "react";
import "./Modal.css";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      setIsAnimating(false);
      setTimeout(onClose, 200);
    }
  };

  return (
    <>
      <div
        className={`modal-backdrop ${isAnimating ? "modal-backdrop-open" : ""}`}
        onClick={handleBackdropClick}
      />
      <div
        className={`modal modal-${size} ${isAnimating ? "modal-open" : ""}`}
      >
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button
              className="modal-close"
              onClick={() => {
                setIsAnimating(false);
                setTimeout(onClose, 200);
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </>
  );
}
