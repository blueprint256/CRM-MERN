import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import canvaService from '../services/canvaService';

const CanvaReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, saving, success, error, no_session
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    const handleReturn = async () => {
      try {
        // Check for active session
        const { session } = await canvaService.getActiveSession();

        if (!session) {
          setStatus('no_session');
          // No active session, redirect to projects after 2 seconds
          setTimeout(() => navigate('/projects'), 2000);
          return;
        }

        setProjectId(session.projectId);
        setStatus('saving');

        // Auto-save the design
        const result = await canvaService.autoSaveSession();

        setStatus('success');

        // Redirect to the project page after a brief success message
        setTimeout(() => {
          navigate(`/project/${result.projectId}`);
        }, 1500);

      } catch (err) {
        console.error('Auto-save failed:', err);
        setError(err.response?.data?.error || 'Failed to save design');
        setStatus('error');
      }
    };

    handleReturn();
  }, [navigate]);

  const handleRetryOrSkip = async (retry) => {
    if (retry) {
      setStatus('saving');
      setError(null);
      try {
        const result = await canvaService.autoSaveSession();
        setStatus('success');
        setTimeout(() => {
          navigate(`/project/${result.projectId}`);
        }, 1500);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to save design');
        setStatus('error');
      }
    } else {
      // Clear session and go to project without saving
      try {
        await canvaService.clearSession();
      } catch (e) {
        // Ignore errors when clearing
      }
      if (projectId) {
        navigate(`/project/${projectId}`);
      } else {
        navigate('/projects');
      }
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="card-body text-center p-5">
          {status === 'checking' && (
            <>
              <div className="spinner-border text-primary mb-4" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h4>Returning from Canva</h4>
              <p className="text-muted">Checking your editing session...</p>
            </>
          )}

          {status === 'saving' && (
            <>
              <div className="spinner-border text-success mb-4" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Saving...</span>
              </div>
              <h4>Saving Your Design</h4>
              <p className="text-muted">Exporting and saving your design to the project...</p>
              <div className="progress mt-3">
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-success mb-4">
                <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem' }}></i>
              </div>
              <h4 className="text-success">Design Saved!</h4>
              <p className="text-muted">Redirecting to your project...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-danger mb-4">
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '4rem' }}></i>
              </div>
              <h4 className="text-danger">Save Failed</h4>
              <p className="text-muted">{error}</p>
              <div className="d-flex gap-2 justify-content-center mt-4">
                <button
                  className="btn btn-primary"
                  onClick={() => handleRetryOrSkip(true)}
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Try Again
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => handleRetryOrSkip(false)}
                >
                  Skip & Go to Project
                </button>
              </div>
            </>
          )}

          {status === 'no_session' && (
            <>
              <div className="text-info mb-4">
                <i className="bi bi-info-circle-fill" style={{ fontSize: '4rem' }}></i>
              </div>
              <h4>No Active Session</h4>
              <p className="text-muted">No editing session found. Redirecting to projects...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CanvaReturn;
