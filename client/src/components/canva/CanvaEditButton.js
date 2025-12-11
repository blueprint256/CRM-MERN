import React, { useState } from 'react';
import { useCanva } from '../../context/CanvaContext';
import CanvaEditorModal from './CanvaEditorModal';

const CanvaEditButton = ({ project, onImageUpdated, variant = 'primary', size = '' }) => {
  const { isConnected, connect } = useCanva();
  const [showModal, setShowModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleClick = async () => {
    if (!isConnected) {
      // Prompt to connect Canva
      if (window.confirm('You need to connect your Canva account first. Connect now?')) {
        try {
          setConnecting(true);
          await connect();
        } catch (err) {
          console.error('Failed to connect Canva:', err);
          setConnecting(false);
        }
      }
      return;
    }

    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleImageUpdated = (newImageUrl) => {
    setShowModal(false);
    if (onImageUpdated) {
      onImageUpdated(newImageUrl);
    }
  };

  const buttonClass = `btn btn-${variant} ${size ? `btn-${size}` : ''}`;

  return (
    <>
      <button
        className={buttonClass}
        onClick={handleClick}
        disabled={connecting}
        title={isConnected ? 'Edit in Canva' : 'Connect Canva to edit'}
      >
        {connecting ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </span>
            Connecting...
          </>
        ) : (
          <>
            <i className="bi bi-palette me-2"></i>
            {isConnected ? 'Edit in Canva' : 'Connect Canva'}
          </>
        )}
      </button>

      {showModal && (
        <CanvaEditorModal
          project={project}
          show={showModal}
          onClose={handleModalClose}
          onImageUpdated={handleImageUpdated}
        />
      )}
    </>
  );
};

export default CanvaEditButton;
