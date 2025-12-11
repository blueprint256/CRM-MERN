import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';
import { ProjectImageManager } from '../components/canva';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSystemAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [marketeers, setMarketeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    suggestedSlogan: '',
    status: '',
    designer: '',
    marketeer: ''
  });

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
      setFormData({
        suggestedSlogan: response.data.project.suggestedSlogan || '',
        status: response.data.project.status || 'pending',
        designer: response.data.project.designer?._id || '',
        marketeer: response.data.project.marketeer?._id || ''
      });
    } catch (err) {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const [designerRes, marketeerRes] = await Promise.all([
        api.get('/users/by-role/designer'),
        api.get('/users/by-role/marketeer')
      ]);
      setDesigners(designerRes.data.users);
      setMarketeers(marketeerRes.data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/projects/${id}`, formData);
      setSuccess('Project updated successfully');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSlogan = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/projects/${id}/generate-slogan`);
      setProject({
        ...project,
        generatedSlogan: response.data.generatedSlogan
      });
      setSuccess('Slogan generated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate slogan');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setSaving(true);
      await api.post(`/projects/${id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Image uploaded successfully');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete project');
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

  if (!project) {
    return (
      <div className="alert alert-danger">Project not found</div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">{project.campaignName}</h1>
        <div>
          <button
            className="btn btn-outline-secondary me-2"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back
          </button>
          {isSystemAdmin && (
            <button className="btn btn-danger" onClick={handleDelete}>
              <i className="bi bi-trash me-1"></i>
              Delete
            </button>
          )}
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="row">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Project Details</h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Status:</strong>
                  <span className={`badge ms-2 ${
                    project.status === 'pending' ? 'bg-warning text-dark' :
                    project.status === 'in progress' ? 'bg-primary' :
                    project.status === 'finished' ? 'bg-success' : 'bg-secondary'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="col-md-6">
                  <strong>Created:</strong>{' '}
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>

              {project.details && (
                <div className="mb-3">
                  <strong>Details:</strong>
                  <div
                    className="mt-2"
                    dangerouslySetInnerHTML={{ __html: project.details }}
                  />
                </div>
              )}

              {project.suggestedSlogan && (
                <div className="mb-3">
                  <strong>Suggested Slogan:</strong>
                  <p className="mt-1">{project.suggestedSlogan}</p>
                </div>
              )}

              {project.generatedSlogan && (
                <div className="mb-3">
                  <strong>AI Generated Slogan:</strong>
                  <p className="mt-1 text-primary">{project.generatedSlogan}</p>
                </div>
              )}

              <div className="row">
                <div className="col-md-4">
                  <strong>Client:</strong>
                  <p>
                    {project.client
                      ? `${project.client.firstName} ${project.client.lastName}`
                      : 'Not assigned'}
                  </p>
                </div>
                <div className="col-md-4">
                  <strong>Designer:</strong>
                  <p>
                    {project.designer
                      ? `${project.designer.firstName} ${project.designer.lastName}`
                      : 'Not assigned'}
                  </p>
                </div>
                <div className="col-md-4">
                  <strong>Marketeer:</strong>
                  <p>
                    {project.marketeer
                      ? `${project.marketeer.firstName} ${project.marketeer.lastName}`
                      : 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Canva Image Manager */}
          <div className="mb-4">
            <ProjectImageManager
              project={project}
              onImageUpdated={(newImageUrl) => {
                setProject({ ...project, imgDesign: newImageUrl });
                setSuccess('Image updated successfully');
              }}
              onProjectUpdate={fetchProject}
            />
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Update Project</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleUpdate}>
                <div className="mb-3">
                  <label className="form-label">Suggested Slogan</label>
                  <textarea
                    className="form-control"
                    name="suggestedSlogan"
                    value={formData.suggestedSlogan}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="finished">Finished</option>
                    <option value="shelf">Shelf</option>
                  </select>
                </div>

                {(isSystemAdmin || user?.role === 'hybrid') && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Designer</label>
                      <select
                        className="form-select"
                        name="designer"
                        value={formData.designer}
                        onChange={handleChange}
                      >
                        <option value="">Select Designer</option>
                        {designers.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.firstName} {d.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Marketeer</label>
                      <select
                        className="form-select"
                        name="marketeer"
                        value={formData.marketeer}
                        onChange={handleChange}
                      >
                        <option value="">Select Marketeer</option>
                        {marketeers.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.firstName} {m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label">Upload Design Image</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Update Project
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary w-100"
                  onClick={handleGenerateSlogan}
                  disabled={generating || !formData.suggestedSlogan}
                >
                  {generating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2"></i>
                      Generate AI Slogan
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
