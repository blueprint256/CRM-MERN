import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../components/common/ProjectCard';
import Pagination from '../components/common/Pagination';
import Alert from '../components/common/Alert';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isSystemAdmin } = useAuth();

  useEffect(() => {
    fetchProjects(1);
  }, []);

  const fetchProjects = async (page) => {
    try {
      setLoading(true);
      const response = await api.get(`/projects?page=${page}&limit=6&status=active`);
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

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">Dashboard</h1>
          <p className="text-muted mb-0">
            Welcome back, {user?.firstName}!
          </p>
        </div>
        {(isSystemAdmin || ['designer', 'marketeer', 'hybrid'].includes(user?.role)) && (
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
      ) : projects.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-folder2-open display-1 text-muted"></i>
          <h4 className="mt-3 text-muted">No projects yet</h4>
          <p className="text-muted">Get started by creating your first project.</p>
          {(isSystemAdmin || ['designer', 'marketeer', 'hybrid'].includes(user?.role)) && (
            <Link to="/create-project" className="btn btn-primary mt-2">
              <i className="bi bi-plus-circle me-2"></i>
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {projects.map((project) => (
              <div className="col" key={project._id}>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
