import React from 'react';

const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const alertClass = `alert alert-${type} alert-dismissible fade show`;

  return (
    <div className={alertClass} role="alert">
      {message}
      {onClose && (
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close"
        ></button>
      )}
    </div>
  );
};

export default Alert;
