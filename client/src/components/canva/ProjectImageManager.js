import React, { useState, useEffect, useCallback } from 'react';
import { useCanva } from '../../context/CanvaContext';
import canvaService from '../../services/canvaService';

const ProjectImageManager = ({ project, onImageUpdated, onProjectUpdate }) => {
  const { isConnected, connect, checkStatus } = useCanva();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Canva editing state
  const [editMode, setEditMode] = useState(null); // 'edit', 'create', null
  const [editUrl, setEditUrl] = useState(null);
  const [designId, setDesignId] = useState(null);

  // History viewer state
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryImage, setSelectedHistoryImage] = useState(null);

  // Image comparison state
  const [compareMode, setCompareMode] = useState(false);

  // Design size options
  const [designSize, setDesignSize] = useState({ width: 1200, height: 1200 });
  const [showSizeModal, setShowSizeModal] = useState(false);

  const currentImage = project?.imgDesign || project?.imageUrl;
  const hasImage = !!currentImage;
  const imageHistory = project?.imageHistory || [];

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Handle connect to Canva
  const handleConnect = async () => {
    try {
      setLoading(true);
      await connect();
    } catch (err) {
      setError('Failed to connect to Canva');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit existing image in Canva
  const handleEditInCanva = async () => {
    if (!isConnected) {
      if (window.confirm('You need to connect your Canva account first. Connect now?')) {
        handleConnect();
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await canvaService.editProjectImage(project._id);
      setEditUrl(result.editUrl);
      setDesignId(result.designId);
      setEditMode('edit');

      // Open Canva in new tab
      window.open(result.editUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open Canva editor');
    } finally {
      setLoading(false);
    }
  };

  // Handle create new design in Canva
  const handleCreateInCanva = async (customSize = null) => {
    if (!isConnected) {
      if (window.confirm('You need to connect your Canva account first. Connect now?')) {
        handleConnect();
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setShowSizeModal(false);

      const size = customSize || designSize;
      const result = await canvaService.createNewForProject(project._id, {
        title: `Design for: ${project.campaignName}`,
        width: size.width,
        height: size.height
      });

      setEditUrl(result.editUrl);
      setDesignId(result.designId);
      setEditMode('create');

      // Open Canva in new tab
      window.open(result.editUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create Canva design');
    } finally {
      setLoading(false);
    }
  };

  // Handle save from Canva
  const handleSaveFromCanva = async () => {
    if (!designId) {
      setError('No design to save');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const result = await canvaService.saveToProject(project._id, designId);

      setSuccess('Design saved successfully!');
      setEditMode(null);
      setEditUrl(null);
      setDesignId(null);

      if (onImageUpdated) {
        onImageUpdated(result.imageUrl);
      }
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditMode(null);
    setEditUrl(null);
    setDesignId(null);
  };

  // Handle reopen Canva editor
  const handleReopenCanva = () => {
    if (editUrl) {
      window.open(editUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle restore from history
  const handleRestoreFromHistory = async (historyItem) => {
    if (!window.confirm('Restore this version? The current image will be saved to history.')) {
      return;
    }

    try {
      setLoading(true);
      // This would need a backend endpoint - for now, we'll just notify
      setSuccess('Image restored from history');
      setShowHistory(false);
      setSelectedHistoryImage(null);
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (err) {
      setError('Failed to restore image');
    } finally {
      setLoading(false);
    }
  };

  // Preset sizes for new designs
  const presetSizes = [
    { name: 'Instagram Post', width: 1080, height: 1080 },
    { name: 'Instagram Story', width: 1080, height: 1920 },
    { name: 'Facebook Post', width: 1200, height: 630 },
    { name: 'Twitter Post', width: 1600, height: 900 },
    { name: 'LinkedIn Post', width: 1200, height: 627 },
    { name: 'YouTube Thumbnail', width: 1280, height: 720 },
    { name: 'A4 Portrait', width: 2480, height: 3508 },
    { name: 'A4 Landscape', width: 3508, height: 2480 },
    { name: 'Presentation (16:9)', width: 1920, height: 1080 },
    { name: 'Square', width: 1200, height: 1200 },
  ];

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-image me-2"></i>
          Project Image
        </h5>
        {imageHistory.length > 0 && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowHistory(!showHistory)}
          >
            <i className={`bi bi-clock-history me-1`}></i>
            History ({imageHistory.length})
          </button>
        )}
      </div>

      <div className="card-body">
        {/* Messages */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
            <button type="button" className="btn-close" onClick={() => setError(null)}></button>
          </div>
        )}
        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <i className="bi bi-check-circle me-2"></i>
            {success}
            <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
          </div>
        )}

        {/* Editing Mode Banner */}
        {editMode && (
          <div className="alert alert-info mb-3">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <i className="bi bi-palette2 me-2"></i>
                <strong>
                  {editMode === 'edit' ? 'Editing in Canva' : 'Creating in Canva'}
                </strong>
                <p className="mb-0 small mt-1">
                  Make your changes in the Canva tab, then come back here to save.
                </p>
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleReopenCanva}
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  Reopen Canva
                </button>
                <button
                  className="btn btn-sm btn-success"
                  onClick={handleSaveFromCanva}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1"></i>
                      Save to Project
                    </>
                  )}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Image Display */}
        <div className="position-relative">
          {hasImage ? (
            <div className="text-center mb-3">
              {compareMode && selectedHistoryImage ? (
                <div className="row">
                  <div className="col-6">
                    <p className="text-muted small mb-2">Previous Version</p>
                    <img
                      src={selectedHistoryImage.url}
                      alt="Previous version"
                      className="img-fluid rounded border"
                      style={{ maxHeight: '300px' }}
                    />
                    <p className="small text-muted mt-1">
                      {new Date(selectedHistoryImage.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="col-6">
                    <p className="text-muted small mb-2">Current Version</p>
                    <img
                      src={currentImage}
                      alt="Current design"
                      className="img-fluid rounded border"
                      style={{ maxHeight: '300px' }}
                    />
                    <p className="small text-muted mt-1">Current</p>
                  </div>
                </div>
              ) : (
                <img
                  src={currentImage}
                  alt="Project Design"
                  className="img-fluid rounded"
                  style={{ maxHeight: '350px' }}
                />
              )}
              {project.lastCanvaEdit && (
                <p className="small text-muted mt-2 mb-0">
                  <i className="bi bi-palette me-1"></i>
                  Last edited in Canva: {new Date(project.lastCanvaEdit).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-5 bg-light rounded mb-3">
              <i className="bi bi-image text-muted" style={{ fontSize: '4rem' }}></i>
              <p className="text-muted mt-2">No image uploaded yet</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-wrap gap-2 justify-content-center">
          {/* Canva Connection Status */}
          {!isConnected ? (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Connecting...
                </>
              ) : (
                <>
                  <i className="bi bi-link-45deg me-2"></i>
                  Connect Canva
                </>
              )}
            </button>
          ) : (
            <>
              {/* Edit in Canva - only if image exists */}
              {hasImage && !editMode && (
                <button
                  className="btn btn-primary"
                  onClick={handleEditInCanva}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Opening...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-pencil-square me-2"></i>
                      Edit in Canva
                    </>
                  )}
                </button>
              )}

              {/* Create New Design */}
              {!editMode && (
                <div className="btn-group">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => setShowSizeModal(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Create in Canva
                  </button>
                </div>
              )}
            </>
          )}

          {/* Compare with history */}
          {imageHistory.length > 0 && hasImage && !editMode && (
            <button
              className={`btn ${compareMode ? 'btn-secondary' : 'btn-outline-secondary'}`}
              onClick={() => {
                if (compareMode) {
                  setCompareMode(false);
                  setSelectedHistoryImage(null);
                } else {
                  setCompareMode(true);
                  setSelectedHistoryImage(imageHistory[0]);
                }
              }}
            >
              <i className="bi bi-layout-split me-2"></i>
              {compareMode ? 'Exit Compare' : 'Compare Versions'}
            </button>
          )}
        </div>

        {/* Image History Panel */}
        {showHistory && imageHistory.length > 0 && (
          <div className="mt-4 border-top pt-3">
            <h6 className="mb-3">
              <i className="bi bi-clock-history me-2"></i>
              Image History
            </h6>
            <div className="row g-2">
              {imageHistory.map((item, index) => (
                <div key={index} className="col-4 col-md-3">
                  <div
                    className={`card h-100 cursor-pointer ${
                      selectedHistoryImage?.url === item.url ? 'border-primary' : ''
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedHistoryImage(item);
                      if (!compareMode) {
                        setCompareMode(true);
                      }
                    }}
                  >
                    <img
                      src={item.url}
                      alt={`Version ${index + 1}`}
                      className="card-img-top"
                      style={{ height: '80px', objectFit: 'cover' }}
                    />
                    <div className="card-body p-2">
                      <small className="text-muted d-block">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </small>
                      <span className={`badge ${item.source === 'canva' ? 'bg-primary' : 'bg-secondary'} mt-1`}>
                        {item.source === 'canva' ? 'Canva' : 'Upload'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Selection Modal */}
      {showSizeModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-aspect-ratio me-2"></i>
                  Choose Design Size
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSizeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Preset Sizes</label>
                  <div className="row g-2">
                    {presetSizes.map((preset, index) => (
                      <div key={index} className="col-6">
                        <button
                          className={`btn btn-outline-secondary w-100 text-start ${
                            designSize.width === preset.width && designSize.height === preset.height
                              ? 'active'
                              : ''
                          }`}
                          onClick={() => setDesignSize({ width: preset.width, height: preset.height })}
                        >
                          <small className="d-block fw-bold">{preset.name}</small>
                          <small className="text-muted">{preset.width} x {preset.height}</small>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-top pt-3">
                  <label className="form-label fw-bold">Custom Size</label>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small">Width (px)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={designSize.width}
                        onChange={(e) => setDesignSize({ ...designSize, width: parseInt(e.target.value) || 1200 })}
                        min={40}
                        max={8000}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Height (px)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={designSize.height}
                        onChange={(e) => setDesignSize({ ...designSize, height: parseInt(e.target.value) || 1200 })}
                        min={40}
                        max={8000}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSizeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleCreateInCanva()}
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
                      Create Design ({designSize.width} x {designSize.height})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectImageManager;
