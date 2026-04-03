import React from 'react';
import '../styles/Modal.css';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText, isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button 
            onClick={onCancel} 
            className="btn-modal-secondary"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={isDanger ? 'btn-modal-danger' : 'btn-modal-primary'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
