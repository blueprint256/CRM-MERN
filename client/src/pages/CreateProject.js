import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Alert from '../components/common/Alert';

const CreateProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [designers, setDesigners] = useState([]);
  const [marketeers, setMarketeers] = useState([]);
  const [clients, setClients] = useState([]);

  const [formData, setFormData] = useState({
    campaignName: '',
    details: '',
    suggestedSlogan: '',
    status: 'pending',
    designer: '',
    marketeer: '',
    client: '',
    startDatetime: '',
    endDatetime: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [designerRes, marketeerRes, clientRes] = await Promise.all([
        api.get('/users/by-role/designer'),
        api.get('/users/by-role/marketeer'),
        api.get('/users/by-role/client')
      ]);
      setDesigners(designerRes.data.users);
      setMarketeers(marketeerRes.data.users);
      setClients(clientRes.data.users);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/projects', formData);
      navigate(`/project/${response.data.project._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Create New Project</h1>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          <i className="bi bi-arrow-left me-1"></i>
          Back
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label">Campaign Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="campaignName"
                    value={formData.campaignName}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Details</label>
                  <textarea
                    className="form-control"
                    name="details"
                    value={formData.details}
                    onChange={handleChange}
                    rows={5}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Suggested Slogan</label>
                  <textarea
                    className="form-control"
                    name="suggestedSlogan"
                    value={formData.suggestedSlogan}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
              </div>

              <div className="col-md-4">
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

                <div className="mb-3">
                  <label className="form-label">Client</label>
                  <select
                    className="form-select"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="mb-3">
                  <label className="form-label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    name="startDatetime"
                    value={formData.startDatetime}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    name="endDatetime"
                    value={formData.endDatetime}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <hr />

            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary me-2"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i>
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
