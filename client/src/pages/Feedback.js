import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Alert from '../components/common/Alert';

const Feedback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    campaignName: '',
    details: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/projects', {
        campaignName: formData.campaignName,
        details: formData.details,
        status: 'pending'
      });
      setSuccess('Your feedback has been submitted successfully!');
      setFormData({ campaignName: '', details: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-chat-square-text me-2"></i>
              Submit Feedback
            </h1>
            <p className="text-muted">
              Share your campaign ideas and product details with our team
            </p>
          </div>

          {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Campaign Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="campaignName"
                    value={formData.campaignName}
                    onChange={handleChange}
                    placeholder="Enter a title for your campaign"
                    minLength={3}
                    maxLength={100}
                    required
                  />
                  <div className="form-text">
                    A brief, descriptive title for your campaign idea
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Product & Campaign Details *</label>
                  <textarea
                    className="form-control"
                    name="details"
                    value={formData.details}
                    onChange={handleChange}
                    rows={8}
                    placeholder="Describe your product, target audience, campaign goals, and any specific requirements..."
                    minLength={10}
                    required
                  />
                  <div className="form-text">
                    Please provide as much detail as possible about your product and campaign vision
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/')}
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
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
