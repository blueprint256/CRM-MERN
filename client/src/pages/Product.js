import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const Product = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <div className="text-center">
          <i className="bi bi-exclamation-circle display-1 text-danger"></i>
          <h3 className="mt-3">{error || 'Project not found'}</h3>
          <Link to="/" className="btn btn-primary mt-3">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" to="/">
            <i className="bi bi-building me-2"></i>
            Blueprint Marketing
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-primary text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">{project.campaignName}</h1>
          {project.client && (
            <p className="lead">
              For {project.client.firstName} {project.client.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow-1 py-5 bg-light">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="card shadow-lg">
                <div className="card-body p-5">
                  {/* Project Image */}
                  {(project.imgDesign || project.imageUrl) && (
                    <div className="text-center mb-5">
                      <img
                        src={project.imgDesign || project.imageUrl}
                        alt={project.campaignName}
                        className="img-fluid rounded shadow"
                        style={{ maxHeight: '500px' }}
                      />
                    </div>
                  )}

                  {/* Slogan */}
                  {(project.generatedSlogan || project.suggestedSlogan) && (
                    <div className="text-center mb-5">
                      <blockquote className="blockquote">
                        <p className="display-6 fst-italic text-primary">
                          "{project.generatedSlogan || project.suggestedSlogan}"
                        </p>
                      </blockquote>
                    </div>
                  )}

                  {/* Details */}
                  {project.details && (
                    <div className="mb-5">
                      <h3 className="mb-4">
                        <i className="bi bi-info-circle me-2"></i>
                        About This Campaign
                      </h3>
                      <div
                        className="lead"
                        dangerouslySetInnerHTML={{ __html: project.details }}
                      />
                    </div>
                  )}

                  {/* Project Info */}
                  <div className="row g-4 mt-4">
                    <div className="col-md-4">
                      <div className="card bg-light h-100">
                        <div className="card-body text-center">
                          <i className="bi bi-calendar3 display-4 text-primary mb-3"></i>
                          <h5>Status</h5>
                          <span className={`badge ${
                            project.status === 'pending' ? 'bg-warning text-dark' :
                            project.status === 'in progress' ? 'bg-primary' :
                            project.status === 'finished' ? 'bg-success' : 'bg-secondary'
                          } fs-6`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {project.designer && (
                      <div className="col-md-4">
                        <div className="card bg-light h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-palette display-4 text-primary mb-3"></i>
                            <h5>Designer</h5>
                            <p className="mb-0">
                              {project.designer.firstName} {project.designer.lastName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {project.marketeer && (
                      <div className="col-md-4">
                        <div className="card bg-light h-100">
                          <div className="card-body text-center">
                            <i className="bi bi-megaphone display-4 text-primary mb-3"></i>
                            <h5>Marketeer</h5>
                            <p className="mb-0">
                              {project.marketeer.firstName} {project.marketeer.lastName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-4">
        <div className="container text-center">
          <p className="mb-0">
            &copy; {currentYear} Blueprint Marketing. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Product;
