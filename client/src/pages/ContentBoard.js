import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Alert from '../components/common/Alert';

const STAGES = [
  { id: 'idea', label: 'Ideas', icon: 'bi-lightbulb', color: '#6c757d' },
  { id: 'draft', label: 'Drafts', icon: 'bi-pencil', color: '#0d6efd' },
  { id: 'review', label: 'In Review', icon: 'bi-eye', color: '#ffc107' },
  { id: 'approved', label: 'Approved', icon: 'bi-check-circle', color: '#198754' },
  { id: 'scheduled', label: 'Scheduled', icon: 'bi-calendar-check', color: '#0dcaf0' },
  { id: 'published', label: 'Published', icon: 'bi-send-check', color: '#20c997' }
];

const PLATFORMS = [
  { id: 'twitter', label: 'Twitter/X', icon: 'bi-twitter-x' },
  { id: 'instagram', label: 'Instagram', icon: 'bi-instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'bi-facebook' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin' },
  { id: 'tiktok', label: 'TikTok', icon: 'bi-tiktok' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp' },
  { id: 'youtube', label: 'YouTube', icon: 'bi-youtube' }
];

const ContentBoard = () => {
  const [boardData, setBoardData] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [newContent, setNewContent] = useState({
    title: '',
    body: '',
    platforms: [],
    campaign: '',
    labels: []
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filterCampaign) params.append('campaign', filterCampaign);
      if (filterPlatform) params.append('platform', filterPlatform);

      const [boardRes, campaignsRes, labelsRes] = await Promise.all([
        api.get(`/content/board?${params}`),
        api.get('/campaigns'),
        api.get('/labels?appliesTo=content')
      ]);

      setBoardData(boardRes.data);
      setCampaigns(campaignsRes.data.campaigns || []);
      setLabels(labelsRes.data || []);
    } catch (err) {
      setError('Failed to load content board');
    } finally {
      setLoading(false);
    }
  }, [filterCampaign, filterPlatform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateContent = async (e) => {
    e.preventDefault();
    if (!newContent.title.trim()) return;

    try {
      await api.post('/content', {
        ...newContent,
        stage: 'idea'
      });
      setSuccess('Content created');
      setShowCreateModal(false);
      setNewContent({ title: '', body: '', platforms: [], campaign: '', labels: [] });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create content');
    }
  };

  const handleStageChange = async (contentId, newStage) => {
    try {
      await api.post(`/content/${contentId}/stage`, { stage: newStage });
      setSuccess(`Moved to ${STAGES.find(s => s.id === newStage)?.label}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change stage');
    }
  };

  const openContentDetail = (content) => {
    setSelectedContent(content);
    setShowContentModal(true);
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    try {
      await api.delete(`/content/${contentId}`);
      setSuccess('Content deleted');
      setShowContentModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete content');
    }
  };

  const togglePlatform = (platformId) => {
    setNewContent(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const getContentCount = (stageId) => {
    return boardData[stageId]?.length || 0;
  };

  const getPlatformIcon = (platform) => {
    const found = PLATFORMS.find(p => p.id === platform);
    return found?.icon || 'bi-globe';
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">
            <i className="bi bi-kanban me-2"></i>
            Content Board
          </h1>
          <p className="text-muted mb-0">Manage your content pipeline</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/content-calendar" className="btn btn-outline-primary">
            <i className="bi bi-calendar3 me-1"></i>
            Calendar View
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            New Content
          </button>
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex gap-3 align-items-center">
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0">Campaign:</label>
              <select
                className="form-select form-select-sm"
                style={{ width: '180px' }}
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
              >
                <option value="">All Campaigns</option>
                {campaigns.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0">Platform:</label>
              <select
                className="form-select form-select-sm"
                style={{ width: '150px' }}
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
              >
                <option value="">All Platforms</option>
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-sm btn-link text-muted"
              onClick={() => { setFilterCampaign(''); setFilterPlatform(''); }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="kanban-board">
          <div className="d-flex gap-3 overflow-auto pb-3" style={{ minHeight: '70vh' }}>
            {STAGES.map(stage => (
              <div
                key={stage.id}
                className="kanban-column flex-shrink-0"
                style={{ width: '280px' }}
              >
                <div
                  className="card h-100"
                  style={{ borderTop: `3px solid ${stage.color}` }}
                >
                  <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-2">
                    <span>
                      <i className={`bi ${stage.icon} me-2`} style={{ color: stage.color }}></i>
                      {stage.label}
                    </span>
                    <span className="badge bg-secondary rounded-pill">
                      {getContentCount(stage.id)}
                    </span>
                  </div>
                  <div
                    className="card-body p-2 overflow-auto"
                    style={{ maxHeight: 'calc(70vh - 60px)' }}
                  >
                    {boardData[stage.id]?.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className={`bi ${stage.icon} display-6 opacity-50`}></i>
                        <p className="small mt-2 mb-0">No content</p>
                      </div>
                    ) : (
                      boardData[stage.id]?.map(content => (
                        <div
                          key={content._id}
                          className="card mb-2 content-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => openContentDetail(content)}
                        >
                          <div className="card-body p-2">
                            <h6 className="card-title mb-1 small fw-semibold">
                              {content.title}
                            </h6>
                            {content.body && (
                              <p className="card-text small text-muted mb-2 text-truncate">
                                {content.body.substring(0, 80)}
                              </p>
                            )}
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex gap-1">
                                {content.platforms?.slice(0, 3).map(p => (
                                  <i
                                    key={p}
                                    className={`bi ${getPlatformIcon(p)} small text-muted`}
                                    title={p}
                                  ></i>
                                ))}
                                {content.platforms?.length > 3 && (
                                  <span className="small text-muted">+{content.platforms.length - 3}</span>
                                )}
                              </div>
                              {content.scheduledFor && (
                                <small className="text-muted">
                                  <i className="bi bi-clock me-1"></i>
                                  {new Date(content.scheduledFor).toLocaleDateString()}
                                </small>
                              )}
                            </div>
                            {content.labels?.length > 0 && (
                              <div className="mt-2 d-flex gap-1 flex-wrap">
                                {content.labels.slice(0, 2).map(label => (
                                  <span
                                    key={label._id || label}
                                    className="badge"
                                    style={{
                                      backgroundColor: label.color || '#6c757d',
                                      fontSize: '0.65rem'
                                    }}
                                  >
                                    {label.name || label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  New Content
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateContent}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newContent.title}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                      placeholder="Enter content title"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Content / Caption</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={newContent.body}
                      onChange={(e) => setNewContent({ ...newContent, body: e.target.value })}
                      placeholder="Write your content..."
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Target Platforms</label>
                    <div className="d-flex flex-wrap gap-2">
                      {PLATFORMS.map(platform => (
                        <button
                          key={platform.id}
                          type="button"
                          className={`btn btn-sm ${newContent.platforms.includes(platform.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => togglePlatform(platform.id)}
                        >
                          <i className={`bi ${platform.icon} me-1`}></i>
                          {platform.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Campaign</label>
                        <select
                          className="form-select"
                          value={newContent.campaign}
                          onChange={(e) => setNewContent({ ...newContent, campaign: e.target.value })}
                        >
                          <option value="">No Campaign</option>
                          {campaigns.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Labels</label>
                        <select
                          className="form-select"
                          multiple
                          value={newContent.labels}
                          onChange={(e) => setNewContent({
                            ...newContent,
                            labels: Array.from(e.target.selectedOptions, o => o.value)
                          })}
                          style={{ height: '80px' }}
                        >
                          {labels.map(l => (
                            <option key={l._id} value={l._id}>{l.name}</option>
                          ))}
                        </select>
                        <small className="text-muted">Hold Ctrl/Cmd to select multiple</small>
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
                    Create as Idea
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Content Detail Modal */}
      {showContentModal && selectedContent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedContent.title}</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowContentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="small text-muted">Content</label>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{selectedContent.body || 'No content yet'}</p>
                    </div>

                    {selectedContent.platformVariants && Object.keys(selectedContent.platformVariants).length > 0 && (
                      <div className="mb-3">
                        <label className="small text-muted">Platform Variants</label>
                        <div className="accordion" id="platformVariants">
                          {Object.entries(selectedContent.platformVariants).map(([platform, variant]) => (
                            <div className="accordion-item" key={platform}>
                              <h2 className="accordion-header">
                                <button
                                  className="accordion-button collapsed py-2"
                                  type="button"
                                  data-bs-toggle="collapse"
                                  data-bs-target={`#variant-${platform}`}
                                >
                                  <i className={`bi ${getPlatformIcon(platform)} me-2`}></i>
                                  {platform}
                                </button>
                              </h2>
                              <div id={`variant-${platform}`} className="accordion-collapse collapse">
                                <div className="accordion-body small">
                                  <pre className="mb-0">{JSON.stringify(variant, null, 2)}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="small text-muted">Stage</label>
                      <div>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: STAGES.find(s => s.id === selectedContent.stage)?.color || '#6c757d'
                          }}
                        >
                          {STAGES.find(s => s.id === selectedContent.stage)?.label || selectedContent.stage}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="small text-muted">Move To</label>
                      <div className="d-flex flex-wrap gap-1">
                        {STAGES.filter(s => s.id !== selectedContent.stage).map(stage => (
                          <button
                            key={stage.id}
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleStageChange(selectedContent._id, stage.id)}
                          >
                            <i className={`bi ${stage.icon} me-1`}></i>
                            {stage.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="small text-muted">Platforms</label>
                      <div className="d-flex gap-2 flex-wrap">
                        {selectedContent.platforms?.map(p => (
                          <span key={p} className="badge bg-light text-dark">
                            <i className={`bi ${getPlatformIcon(p)} me-1`}></i>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedContent.scheduledFor && (
                      <div className="mb-3">
                        <label className="small text-muted">Scheduled For</label>
                        <p className="mb-0">
                          <i className="bi bi-calendar me-1"></i>
                          {new Date(selectedContent.scheduledFor).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedContent.campaign && (
                      <div className="mb-3">
                        <label className="small text-muted">Campaign</label>
                        <p className="mb-0">
                          <i className="bi bi-megaphone me-1"></i>
                          {selectedContent.campaign.name || 'Unknown'}
                        </p>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="small text-muted">Created</label>
                      <p className="mb-0 small">
                        {new Date(selectedContent.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleDeleteContent(selectedContent._id)}
                >
                  <i className="bi bi-trash me-1"></i>
                  Delete
                </button>
                <Link
                  to={`/content/${selectedContent._id}`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil me-1"></i>
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .content-card:hover {
          box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
          transition: all 0.15s ease;
        }
        .kanban-column .card {
          background-color: #f8f9fa;
        }
        .kanban-column .content-card {
          background-color: white;
        }
      `}</style>
    </div>
  );
};

export default ContentBoard;
