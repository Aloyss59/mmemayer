import React, { useEffect } from 'react';
import '../styles/Toast.css';

function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <p>{message}</p>
    </div>
  );
}

export default Toast;
