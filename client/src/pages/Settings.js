import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CanvaSettings } from '../components/canva';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="container py-4">
      <h2 className="mb-4">
        <i className="bi bi-gear me-2"></i>
        Settings
      </h2>

      <div className="row">
        {/* User Profile Card */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-person-circle me-2"></i>
                Profile Information
              </h5>
              <hr />
              <div className="mb-3">
                <label className="form-label text-muted small">Name</label>
                <p className="mb-0 fw-medium">{user?.firstName} {user?.lastName}</p>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Email</label>
                <p className="mb-0 fw-medium">{user?.email}</p>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Role</label>
                <p className="mb-0">
                  <span className="badge bg-primary text-capitalize">{user?.role}</span>
                </p>
              </div>
              <div>
                <label className="form-label text-muted small">Authentication Provider</label>
                <p className="mb-0">
                  <span className={`badge ${user?.authProvider === 'google' ? 'bg-danger' : 'bg-secondary'}`}>
                    {user?.authProvider === 'google' ? (
                      <>
                        <i className="bi bi-google me-1"></i>
                        Google
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope me-1"></i>
                        Email/Password
                      </>
                    )}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Canva Integration Card */}
        <div className="col-md-6 mb-4">
          <CanvaSettings />
        </div>
      </div>

      {/* Additional Settings Section */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-info-circle me-2"></i>
                About Integrations
              </h5>
              <hr />
              <div className="row">
                <div className="col-md-6">
                  <h6>
                    <i className="bi bi-palette text-primary me-2"></i>
                    Canva Integration
                  </h6>
                  <p className="text-muted small">
                    Connect your Canva account to edit project images using Canva's powerful design tools.
                    You can edit existing images, create new designs, and save them directly back to your projects.
                  </p>
                </div>
                <div className="col-md-6">
                  <h6>
                    <i className="bi bi-cloud text-success me-2"></i>
                    AWS S3 Storage
                  </h6>
                  <p className="text-muted small">
                    All project images are securely stored in AWS S3. When you edit images in Canva,
                    the updated versions are automatically uploaded and stored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
