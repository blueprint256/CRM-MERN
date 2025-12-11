import React, { useState, useEffect } from 'react';
import { useCanva } from '../../context/CanvaContext';
import { useSearchParams } from 'react-router-dom';

const CanvaSettings = () => {
  const { isConnected, canvaUserId, loading, error, connect, disconnect, checkStatus } = useCanva();
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth callback messages
  useEffect(() => {
    const canvaConnected = searchParams.get('canva_connected');
    const canvaError = searchParams.get('canva_error');

    if (canvaConnected === 'true') {
      setMessage({ type: 'success', text: 'Canva connected successfully!' });
      checkStatus();
      // Clean URL
      searchParams.delete('canva_connected');
      setSearchParams(searchParams);
    } else if (canvaError) {
      const errorMessages = {
        'access_denied': 'You denied access to Canva',
        'invalid_state': 'Invalid or expired session. Please try again.',
        'exchange_failed': 'Failed to complete Canva connection. Please try again.',
        'missing_params': 'Missing required parameters from Canva.'
      };
      setMessage({ type: 'danger', text: errorMessages[canvaError] || `Error: ${canvaError}` });
      // Clean URL
      searchParams.delete('canva_error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, checkStatus]);

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });
      await connect();
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to initiate Canva connection' });
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Canva account?')) {
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });
      await disconnect();
      setMessage({ type: 'success', text: 'Canva disconnected successfully' });
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to disconnect Canva' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">
            <i className="bi bi-palette me-2"></i>
            Canva Integration
          </h5>
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Checking connection status...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">
          <i className="bi bi-palette me-2"></i>
          Canva Integration
        </h5>

        <p className="text-muted">
          Connect your Canva account to edit project images directly in Canva's powerful editor.
        </p>

        {message.text && (
          <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
            {message.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage({ type: '', text: '' })}
            ></button>
          </div>
        )}

        {error && (
          <div className="alert alert-warning" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between">
          <div>
            <span className={`badge ${isConnected ? 'bg-success' : 'bg-secondary'} me-2`}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
            {isConnected && canvaUserId && (
              <small className="text-muted">ID: {canvaUserId}</small>
            )}
          </div>

          {isConnected ? (
            <button
              className="btn btn-outline-danger"
              onClick={handleDisconnect}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </span>
                  Disconnecting...
                </>
              ) : (
                <>
                  <i className="bi bi-x-circle me-2"></i>
                  Disconnect
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </span>
                  Connecting...
                </>
              ) : (
                <>
                  <i className="bi bi-link-45deg me-2"></i>
                  Connect Canva
                </>
              )}
            </button>
          )}
        </div>

        {isConnected && (
          <div className="mt-3 p-3 bg-light rounded">
            <h6>What you can do:</h6>
            <ul className="mb-0 small">
              <li>Edit project images directly in Canva</li>
              <li>Create new designs for your projects</li>
              <li>Save edited designs back to your projects</li>
              <li>Access your Canva templates and assets</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvaSettings;
