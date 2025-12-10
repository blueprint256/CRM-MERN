import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/common/Alert';

const ChangePassword = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await changePassword(
        formData.email,
        formData.currentPassword,
        formData.newPassword
      );
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h2 className="text-primary">
              <i className="bi bi-shield-lock me-2"></i>
              Change Password
            </h2>
            <p className="text-muted">Please update your temporary password</p>
          </div>

          {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label">
                Current Password (Temporary)
              </label>
              <input
                type="password"
                className="form-control"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmNewPassword" className="form-label">
                Confirm New Password
              </label>
              <input
                type="password"
                className="form-control"
                id="confirmNewPassword"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
