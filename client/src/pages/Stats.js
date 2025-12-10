import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [usersByRole, setUsersByRole] = useState({});
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isSystemAdmin } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const endpoint = isSystemAdmin ? '/stats' : '/stats/user';
      const response = await api.get(endpoint);

      if (isSystemAdmin) {
        setStats(response.data.stats);
        setUsersByRole(response.data.usersByRole);
        setRecentProjects(response.data.recentProjects);
      } else {
        setStats(response.data.stats);
      }
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-graph-up me-2"></i>
          Statistics
        </h1>
        <p className="text-muted">Overview of projects and performance</p>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Project Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 text-white-50">Total Projects</h6>
                  <h2 className="card-title mb-0">
                    {isSystemAdmin ? stats?.totalProjects : stats?.total}
                  </h2>
                </div>
                <i className="bi bi-folder2-open display-4 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card bg-warning text-dark h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 opacity-75">Pending</h6>
                  <h2 className="card-title mb-0">
                    {isSystemAdmin ? stats?.pendingProjects : stats?.pending}
                  </h2>
                </div>
                <i className="bi bi-hourglass-split display-4 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card bg-info text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 text-white-50">In Progress</h6>
                  <h2 className="card-title mb-0">
                    {isSystemAdmin ? stats?.inProgressProjects : stats?.inProgress}
                  </h2>
                </div>
                <i className="bi bi-arrow-repeat display-4 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card bg-success text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-subtitle mb-2 text-white-50">Finished</h6>
                  <h2 className="card-title mb-0">
                    {isSystemAdmin ? stats?.finishedProjects : stats?.finished}
                  </h2>
                </div>
                <i className="bi bi-check-circle display-4 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSystemAdmin && (
        <div className="row g-4">
          {/* Users by Role */}
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Users by Role
                </h5>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>System Admins</span>
                  <span className="badge bg-primary">{usersByRole.system || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Designers</span>
                  <span className="badge bg-info">{usersByRole.designer || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Marketeers</span>
                  <span className="badge bg-warning text-dark">{usersByRole.marketeer || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span>Hybrid</span>
                  <span className="badge bg-secondary">{usersByRole.hybrid || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Clients</span>
                  <span className="badge bg-success">{usersByRole.client || 0}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Total Users</strong>
                  <span className="badge bg-dark">{stats?.totalUsers || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="col-lg-8">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Recent Projects
                </h5>
                <Link to="/projects" className="btn btn-sm btn-outline-primary">
                  View All
                </Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Campaign</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProjects.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">
                            No projects yet
                          </td>
                        </tr>
                      ) : (
                        recentProjects.map((project) => (
                          <tr key={project._id}>
                            <td>
                              <Link to={`/project/${project._id}`} className="text-decoration-none">
                                {project.campaignName}
                              </Link>
                            </td>
                            <td>
                              {project.client
                                ? `${project.client.firstName} ${project.client.lastName}`
                                : '-'}
                            </td>
                            <td>
                              <span className={`badge ${
                                project.status === 'pending' ? 'bg-warning text-dark' :
                                project.status === 'in progress' ? 'bg-primary' :
                                project.status === 'finished' ? 'bg-success' : 'bg-secondary'
                              }`}>
                                {project.status}
                              </span>
                            </td>
                            <td>
                              {new Date(project.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;
