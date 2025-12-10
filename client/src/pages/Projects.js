import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/common/Pagination';
import Alert from '../components/common/Alert';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isSystemAdmin } = useAuth();

  useEffect(() => {
    fetchProjects(1);
  }, []);

  const fetchProjects = async (page) => {
    try {
      setLoading(true);
      const response = await api.get(`/projects?page=${page}&limit=10`);
      setProjects(response.data.projects);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    fetchProjects(page);
  };

  const getStatusBadge = (status) => {
    const classes = {
      'pending': 'bg-warning text-dark',
      'in progress': 'bg-primary',
      'finished': 'bg-success',
      'shelf': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">All Projects</h1>
        {isSystemAdmin && (
          <Link to="/create-project" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            New Project
          </Link>
        )}
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Campaign Name</th>
                  <th>Status</th>
                  <th>Client</th>
                  <th>Designer</th>
                  <th>Marketeer</th>
                  <th>Start Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id}>
                      <td>
                        <strong>{project.campaignName}</strong>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                      <td>
                        {project.client
                          ? `${project.client.firstName} ${project.client.lastName}`
                          : '-'}
                      </td>
                      <td>
                        {project.designer
                          ? `${project.designer.firstName} ${project.designer.lastName}`
                          : '-'}
                      </td>
                      <td>
                        {project.marketeer
                          ? `${project.marketeer.firstName} ${project.marketeer.lastName}`
                          : '-'}
                      </td>
                      <td>{formatDate(project.startDatetime)}</td>
                      <td>
                        <Link
                          to={`/project/${project._id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="bi bi-eye me-1"></i>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4">
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      </div>
    </div>
  );
};

export default Projects;
