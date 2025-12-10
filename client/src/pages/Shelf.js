import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProjectCard from '../components/common/ProjectCard';
import Pagination from '../components/common/Pagination';
import Alert from '../components/common/Alert';

const Shelf = () => {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects(1);
  }, []);

  const fetchProjects = async (page) => {
    try {
      setLoading(true);
      const response = await api.get(`/projects?page=${page}&limit=6&status=shelf`);
      setProjects(response.data.projects);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Failed to load shelved projects');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    fetchProjects(page);
  };

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-archive me-2"></i>
          Shelved Projects
        </h1>
        <p className="text-muted">Projects that have been shelved for later</p>
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
          <i className="bi bi-archive display-1 text-muted"></i>
          <h4 className="mt-3 text-muted">No shelved projects</h4>
          <p className="text-muted">Projects moved to shelf will appear here.</p>
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

export default Shelf;
