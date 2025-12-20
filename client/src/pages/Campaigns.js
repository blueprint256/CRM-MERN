import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';
import Pagination from '../components/common/Pagination';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    goals: []
  });
  const { user } = useAuth();

  const fetchData = useCallback(async (page = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 12);
      if (filterStatus) params.append('status', filterStatus);

      const [campaignsRes, statsRes] = await Promise.all([
        api.get(`/campaigns?${params}`),
        api.get('/campaigns/stats')
      ]);

      setCampaigns(campaignsRes.data.campaigns || []);
      setPagination(campaignsRes.data.pagination || { page: 1, pages: 1, total: 0 });
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (page) => {
    fetchData(page);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) return;

    try {
      await api.post('/campaigns', newCampaign);
      setSuccess('Campaign created successfully');
      setShowCreateModal(false);
      setNewCampaign({ name: '', description: '', startDate: '', endDate: '', goals: [] });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    }
  };

  const handleArchiveCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to archive this campaign?')) return;

    try {
      await api.post(`/campaigns/${campaignId}/archive`);
      setSuccess('Campaign archived');
      setShowDetailModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive campaign');
    }
  };

  const openCampaignDetail = async (campaign) => {
    try {
      const response = await api.get(`/campaigns/${campaign._id}`);
      setSelectedCampaign(response.data);
      setShowDetailModal(true);
    } catch (err) {
      setError('Failed to load campaign details');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      planning: { class: 'bg-secondary', icon: 'bi-pencil' },
      active: { class: 'bg-success', icon: 'bi-play-circle' },
      paused: { class: 'bg-warning text-dark', icon: 'bi-pause-circle' },
      completed: { class: 'bg-info', icon: 'bi-check-circle' },
      archived: { class: 'bg-dark', icon: 'bi-archive' }
    };
    const badge = badges[status] || badges.planning;
    return (
      <span className={`badge ${badge.class}`}>
        <i className={`bi ${badge.icon} me-1`}></i>
        {status}
      </span>
    );
  };

  const getProgressPercent = (campaign) => {
    if (!campaign.contentCounts) return 0;
    const total = Object.values(campaign.contentCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    return Math.round((campaign.contentCounts.published || 0) / total * 100);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">
            <i className="bi bi-megaphone me-2"></i>
            Campaigns
          </h1>
          <p className="text-muted mb-0">Organize your marketing initiatives</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-circle me-1"></i>
          New Campaign
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Stats Cards */}
      {stats && (
        <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
          <div className="col">
            <div className="card bg-primary text-white">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="small mb-0 opacity-75">Active</p>
                    <h4 className="mb-0">{stats.active || 0}</h4>
                  </div>
                  <i className="bi bi-play-circle display-6 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-success text-white">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="small mb-0 opacity-75">Completed</p>
                    <h4 className="mb-0">{stats.completed || 0}</h4>
                  </div>
                  <i className="bi bi-check-circle display-6 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-warning">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="small mb-0 opacity-75">Planning</p>
                    <h4 className="mb-0">{stats.planning || 0}</h4>
                  </div>
                  <i className="bi bi-pencil display-6 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card bg-secondary text-white">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="small mb-0 opacity-75">Total Content</p>
                    <h4 className="mb-0">{stats.totalContent || 0}</h4>
                  </div>
                  <i className="bi bi-file-earmark-text display-6 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex gap-2 align-items-center">
            <label className="small text-muted mb-0">Status:</label>
            <div className="btn-group btn-group-sm">
              {['all', 'active', 'planning', 'completed', 'archived'].map(status => (
                <button
                  key={status}
                  className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilterStatus(status === 'all' ? '' : status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-megaphone display-1 text-muted"></i>
          <h4 className="mt-3 text-muted">No campaigns yet</h4>
          <p className="text-muted">Create your first campaign to organize content.</p>
          <button
            className="btn btn-primary mt-2"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Create Campaign
          </button>
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {campaigns.map(campaign => (
              <div className="col" key={campaign._id}>
                <div
                  className="card h-100 campaign-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openCampaignDetail(campaign)}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title mb-0">{campaign.name}</h5>
                      {getStatusBadge(campaign.status)}
                    </div>

                    {campaign.description && (
                      <p className="card-text text-muted small text-truncate">
                        {campaign.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Progress</span>
                        <span>{getProgressPercent(campaign)}%</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${getProgressPercent(campaign)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="d-flex justify-content-between small text-muted">
                      {campaign.startDate && (
                        <span>
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(campaign.startDate).toLocaleDateString()}
                        </span>
                      )}
                      {campaign.endDate && (
                        <span>
                          <i className="bi bi-calendar-check me-1"></i>
                          {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-footer bg-transparent">
                    <div className="d-flex justify-content-between align-items-center small">
                      <span className="text-muted">
                        <i className="bi bi-file-earmark-text me-1"></i>
                        {Object.values(campaign.contentCounts || {}).reduce((a, b) => a + b, 0)} items
                      </span>
                      <span className="text-muted">
                        <i className="bi bi-people me-1"></i>
                        {campaign.team?.length || 1} members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-megaphone me-2"></i>
                  New Campaign
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateCampaign}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Campaign Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="e.g., Summer Sale 2025"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="What's this campaign about?"
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newCampaign.startDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newCampaign.endDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Campaign
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedCampaign.name}</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="small text-muted">Description</label>
                      <p>{selectedCampaign.description || 'No description'}</p>
                    </div>

                    {/* Content Stats */}
                    <div className="mb-3">
                      <label className="small text-muted">Content by Stage</label>
                      <div className="row row-cols-3 g-2 mt-1">
                        {Object.entries(selectedCampaign.contentCounts || {}).map(([stage, count]) => (
                          <div className="col" key={stage}>
                            <div className="p-2 bg-light rounded text-center">
                              <div className="small text-muted text-capitalize">{stage}</div>
                              <div className="h5 mb-0">{count}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Goals */}
                    {selectedCampaign.goals?.length > 0 && (
                      <div className="mb-3">
                        <label className="small text-muted">Goals</label>
                        <ul className="list-group list-group-flush">
                          {selectedCampaign.goals.map((goal, idx) => (
                            <li key={idx} className="list-group-item px-0 py-2">
                              <div className="d-flex justify-content-between">
                                <span>{goal.metric}: {goal.target}</span>
                                {goal.current && (
                                  <span className="text-muted">Current: {goal.current}</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="small text-muted">Status</label>
                      <div>{getStatusBadge(selectedCampaign.status)}</div>
                    </div>

                    <div className="mb-3">
                      <label className="small text-muted">Timeline</label>
                      <p className="mb-0 small">
                        {selectedCampaign.startDate && (
                          <>
                            <i className="bi bi-calendar me-1"></i>
                            {new Date(selectedCampaign.startDate).toLocaleDateString()}
                          </>
                        )}
                        {selectedCampaign.startDate && selectedCampaign.endDate && ' - '}
                        {selectedCampaign.endDate && (
                          <>
                            {new Date(selectedCampaign.endDate).toLocaleDateString()}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="mb-3">
                      <label className="small text-muted">Team ({selectedCampaign.team?.length || 0})</label>
                      <ul className="list-unstyled small">
                        <li className="mb-1">
                          <i className="bi bi-person-circle me-1"></i>
                          {selectedCampaign.owner?.firstName} {selectedCampaign.owner?.lastName}
                          <span className="badge bg-primary ms-1">Owner</span>
                        </li>
                        {selectedCampaign.team?.map(member => (
                          <li key={member.user?._id || member.user} className="mb-1">
                            <i className="bi bi-person me-1"></i>
                            {member.user?.firstName || 'Unknown'} {member.user?.lastName || ''}
                            <span className="badge bg-secondary ms-1">{member.role}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <label className="small text-muted">Created</label>
                      <p className="mb-0 small">
                        {new Date(selectedCampaign.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {selectedCampaign.status !== 'archived' && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => handleArchiveCampaign(selectedCampaign._id)}
                  >
                    <i className="bi bi-archive me-1"></i>
                    Archive
                  </button>
                )}
                <Link
                  to={`/content-board?campaign=${selectedCampaign._id}`}
                  className="btn btn-outline-primary"
                >
                  <i className="bi bi-kanban me-1"></i>
                  View Content
                </Link>
                <Link
                  to={`/assets?campaign=${selectedCampaign._id}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-collection me-1"></i>
                  View Assets
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .campaign-card:hover {
          box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default Campaigns;
