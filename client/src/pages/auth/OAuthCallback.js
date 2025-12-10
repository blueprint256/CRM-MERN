import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Store token and fetch user
      loginWithToken(token)
        .then(() => {
          navigate('/');
        })
        .catch((err) => {
          setError('Failed to complete login. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        });
    } else {
      setError('No authentication token received.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        {error ? (
          <>
            <i className="bi bi-exclamation-circle display-1 text-danger"></i>
            <h4 className="mt-3">{error}</h4>
            <p className="text-muted">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h4>Completing login...</h4>
            <p className="text-muted">Please wait while we sign you in.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
