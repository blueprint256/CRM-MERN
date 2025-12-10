import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'in progress':
        return 'status-in-progress';
      case 'finished':
        return 'status-finished';
      case 'shelf':
        return 'status-shelf';
      default:
        return 'bg-secondary';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="card h-100">
      {project.imageUrl && (
        <img
          src={project.imageUrl}
          className="card-img-top"
          alt={project.campaignName}
          style={{ height: '150px', objectFit: 'cover' }}
        />
      )}
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{project.campaignName}</h5>
          <span className={`badge status-badge ${getStatusClass(project.status)}`}>
            {project.status}
          </span>
        </div>

        {project.details && (
          <p className="card-text text-muted small">
            {project.details.substring(0, 100)}
            {project.details.length > 100 ? '...' : ''}
          </p>
        )}

        <div className="mt-3">
          {project.client && (
            <small className="d-block text-muted">
              <i className="bi bi-person me-1"></i>
              Client: {project.client.firstName} {project.client.lastName}
            </small>
          )}
          {project.designer && (
            <small className="d-block text-muted">
              <i className="bi bi-palette me-1"></i>
              Designer: {project.designer.firstName} {project.designer.lastName}
            </small>
          )}
          {project.marketeer && (
            <small className="d-block text-muted">
              <i className="bi bi-megaphone me-1"></i>
              Marketeer: {project.marketeer.firstName} {project.marketeer.lastName}
            </small>
          )}
          {project.startDatetime && (
            <small className="d-block text-muted mt-2">
              <i className="bi bi-calendar me-1"></i>
              {formatDate(project.startDatetime)}
              {project.endDatetime && ` - ${formatDate(project.endDatetime)}`}
            </small>
          )}
        </div>
      </div>
      <div className="card-footer bg-transparent">
        <Link to={`/project/${project._id}`} className="btn btn-primary btn-sm w-100">
          <i className="bi bi-eye me-1"></i>
          View Details
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
