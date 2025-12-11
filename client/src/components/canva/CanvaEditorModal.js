import React, { useState, useEffect, useCallback } from 'react';
import { useCanva } from '../../context/CanvaContext';
import canvaService from '../../services/canvaService';

const CanvaEditorModal = ({ project, show, onClose, onImageUpdated }) => {
  const { editProjectImage, saveToProject, createNewForProject } = useCanva();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editUrl, setEditUrl] = useState(null);
  const [designId, setDesignId] = useState(null);
  const [mode, setMode] = useState('select'); // 'select', 'editing', 'preview'
  const [existingDesign, setExistingDesign] = useState(null);

  // Check for existing design
  useEffect(() => {
    const checkExistingDesign = async () => {
      if (project.canvaDesignId) {
        try {
          const result = await canvaService.getProjectDesign(project._id);
          if (result.design) {
            setExistingDesign(result.design);
          }
        } catch (err) {
          console.error('Failed to fetch existing design:', err);
        }
      }
    };

    if (show) {
      checkExistingDesign();
    }
  }, [show, project._id, project.canvaDesignId]);

  // Handle edit existing image
  const handleEditExisting = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await editProjectImage(project._id);
      setEditUrl(result.editUrl);
      setDesignId(result.designId);
      setMode('editing');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start Canva editor');
    } finally {
      setLoading(false);
    }
  };

  // Handle create new design
  const handleCreateNew = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await createNewForProject(project._id, {
        title: `Design for: ${project.campaignName}`,
        width: 1200,
        height: 1200
      });
      setEditUrl(result.editUrl);
      setDesignId(result.designId);
      setMode('editing');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create new design');
    } finally {
      setLoading(false);
    }
  };

  // Handle continue editing existing design
  const handleContinueEditing = async () => {
    if (existingDesign?.urls?.edit_url) {
      setEditUrl(existingDesign.urls.edit_url);
      setDesignId(existingDesign.id);
      setMode('editing');
    }
  };

  // Handle save design to project
  const handleSave = async () => {
    if (!designId) {
      setError('No design to save');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const result = await saveToProject(project._id, designId);
      onImageUpdated(result.imageUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save design');
      setSaving(false);
    }
  };

  // Open Canva editor in new tab
  const openCanvaEditor = useCallback(() => {
    if (editUrl) {
      window.open(editUrl, '_blank', 'noopener,noreferrer');
    }
  }, [editUrl]);

  // Effect to open editor when URL is available
  useEffect(() => {
    if (editUrl && mode === 'editing') {
      openCanvaEditor();
    }
  }, [editUrl, mode, openCanvaEditor]);

  if (!show) return null;

  const hasImage = project.imgDesign || project.imageUrl;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-palette me-2"></i>
              {mode === 'select' ? 'Edit with Canva' : mode === 'editing' ? 'Editing in Canva' : 'Preview'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {mode === 'select' && (
              <>
                {/* Current project image preview */}
                {hasImage && (
                  <div className="text-center mb-4">
                    <img
                      src={project.imgDesign || project.imageUrl}
                      alt={project.campaignName}
                      className="img-fluid rounded"
                      style={{ maxHeight: '200px' }}
                    />
                    <p className="text-muted mt-2 small">Current project image</p>
                  </div>
                )}

                <div className="row g-3">
                  {/* Edit existing image option */}
                  {hasImage && (
                    <div className="col-md-6">
                      <div
                        className="card h-100 border-primary"
                        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                        onClick={!loading ? handleEditExisting : undefined}
                      >
                        <div className="card-body text-center">
                          <i className="bi bi-pencil-square text-primary" style={{ fontSize: '2rem' }}></i>
                          <h6 className="mt-3">Edit Current Image</h6>
                          <p className="text-muted small mb-0">
                            Upload the current project image to Canva and edit it
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Create new design option */}
                  <div className={hasImage ? 'col-md-6' : 'col-12'}>
                    <div
                      className="card h-100 border-success"
                      style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                      onClick={!loading ? handleCreateNew : undefined}
                    >
                      <div className="card-body text-center">
                        <i className="bi bi-plus-circle text-success" style={{ fontSize: '2rem' }}></i>
                        <h6 className="mt-3">Create New Design</h6>
                        <p className="text-muted small mb-0">
                          Start a fresh design in Canva for this project
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Continue editing existing design */}
                  {existingDesign && (
                    <div className="col-12">
                      <div
                        className="card border-info"
                        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                        onClick={!loading ? handleContinueEditing : undefined}
                      >
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            {existingDesign.thumbnail?.url && (
                              <img
                                src={existingDesign.thumbnail.url}
                                alt="Design thumbnail"
                                className="rounded me-3"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                              />
                            )}
                            <div>
                              <h6 className="mb-1">
                                <i className="bi bi-arrow-repeat text-info me-2"></i>
                                Continue Previous Design
                              </h6>
                              <p className="text-muted small mb-0">
                                {existingDesign.title || 'Untitled Design'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {loading && (
                  <div className="text-center mt-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Preparing Canva editor...</p>
                  </div>
                )}
              </>
            )}

            {mode === 'editing' && (
              <div className="text-center py-4">
                <div className="mb-4">
                  <i className="bi bi-palette2 text-primary" style={{ fontSize: '4rem' }}></i>
                </div>
                <h5>Canva Editor Opened</h5>
                <p className="text-muted">
                  The Canva editor has been opened in a new tab. Make your edits there, then come back here to save.
                </p>

                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Tip:</strong> After finishing your edits in Canva, click "Save to Project" below to update your project image.
                </div>

                <button
                  className="btn btn-outline-primary me-2"
                  onClick={openCanvaEditor}
                >
                  <i className="bi bi-box-arrow-up-right me-2"></i>
                  Reopen Canva Editor
                </button>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {mode === 'editing' ? 'Close Without Saving' : 'Cancel'}
            </button>

            {mode === 'editing' && (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSave}
                disabled={saving || !designId}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Saving...</span>
                    </span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    Save to Project
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvaEditorModal;
