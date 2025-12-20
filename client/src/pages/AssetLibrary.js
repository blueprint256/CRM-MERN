import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import Alert from '../components/common/Alert';

const AssetLibrary = () => {
  const [assets, setAssets] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (currentFolder) params.append('folder', currentFolder);
      if (filterType !== 'all') params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);

      const [assetsRes, foldersRes, labelsRes] = await Promise.all([
        api.get(`/assets?${params}`),
        currentFolder
          ? api.get(`/folders/${currentFolder}`)
          : api.get('/folders'),
        api.get('/labels?appliesTo=asset')
      ]);

      setAssets(assetsRes.data.assets || []);

      if (currentFolder) {
        setFolders(foldersRes.data.subfolders || []);
        setBreadcrumbs(foldersRes.data.breadcrumbs || []);
      } else {
        // Transform tree to flat list for root
        const rootFolders = foldersRes.data.filter(f => !f.parent);
        setFolders(rootFolders);
        setBreadcrumbs([]);
      }

      setLabels(labelsRes.data || []);
    } catch (err) {
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, filterType, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (currentFolder) formData.append('folder', currentFolder);

      const endpoint = files.length > 1 ? '/assets/upload-multiple' : '/assets/upload';
      if (files.length === 1) {
        formData.delete('files');
        formData.append('file', files[0]);
      }

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(`${files.length} file(s) uploaded successfully`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.post('/folders', {
        name: newFolderName,
        parent: currentFolder || undefined
      });
      setSuccess('Folder created');
      setNewFolderName('');
      setShowNewFolderModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create folder');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await api.delete(`/assets/${assetId}`);
      setSuccess('Asset deleted');
      fetchData();
      setShowAssetModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete asset');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) return;

    try {
      await api.delete(`/folders/${folderId}`);
      setSuccess('Folder deleted');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete folder');
    }
  };

  const navigateToFolder = (folderId) => {
    setCurrentFolder(folderId);
    setSelectedAssets([]);
  };

  const navigateUp = () => {
    if (breadcrumbs.length > 1) {
      setCurrentFolder(breadcrumbs[breadcrumbs.length - 2]._id);
    } else {
      setCurrentFolder(null);
    }
    setSelectedAssets([]);
  };

  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const openAssetDetail = (asset) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
  };

  const getFileIcon = (type, mimeType) => {
    if (type === 'image') return 'bi-image';
    if (type === 'video') return 'bi-camera-video';
    if (type === 'audio') return 'bi-music-note';
    if (mimeType?.includes('pdf')) return 'bi-file-pdf';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'bi-file-word';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'bi-file-excel';
    return 'bi-file-earmark';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">
            <i className="bi bi-collection me-2"></i>
            Asset Library
          </h1>
          <p className="text-muted mb-0">Manage your marketing assets</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowNewFolderModal(true)}
          >
            <i className="bi bi-folder-plus me-1"></i>
            New Folder
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Uploading...
              </>
            ) : (
              <>
                <i className="bi bi-upload me-1"></i>
                Upload
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="d-none"
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Breadcrumbs */}
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setCurrentFolder(null); }}
                    className="text-decoration-none"
                  >
                    <i className="bi bi-house me-1"></i>
                    Root
                  </a>
                </li>
                {breadcrumbs.map((crumb, index) => (
                  <li
                    key={crumb._id}
                    className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                  >
                    {index === breadcrumbs.length - 1 ? (
                      crumb.name
                    ) : (
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); navigateToFolder(crumb._id); }}
                        className="text-decoration-none"
                      >
                        {crumb.name}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Filters & Search */}
            <div className="d-flex gap-2 align-items-center">
              <div className="input-group input-group-sm" style={{ width: '200px' }}>
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select form-select-sm"
                style={{ width: '120px' }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
              </select>

              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                  className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('list')}
                >
                  <i className="bi bi-list"></i>
                </button>
              </div>
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
      ) : (
        <>
          {/* Folders */}
          {folders.length > 0 && (
            <div className="mb-4">
              <h6 className="text-muted mb-3">
                <i className="bi bi-folder me-2"></i>
                Folders
              </h6>
              <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3">
                {currentFolder && (
                  <div className="col">
                    <div
                      className="card h-100 folder-card"
                      style={{ cursor: 'pointer' }}
                      onClick={navigateUp}
                    >
                      <div className="card-body text-center py-4">
                        <i className="bi bi-arrow-up-circle display-6 text-muted"></i>
                        <p className="mb-0 mt-2 text-muted small">Go Back</p>
                      </div>
                    </div>
                  </div>
                )}
                {folders.map(folder => (
                  <div className="col" key={folder._id}>
                    <div
                      className="card h-100 folder-card"
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        className="card-body text-center py-4"
                        onClick={() => navigateToFolder(folder._id)}
                      >
                        <i className="bi bi-folder-fill display-6 text-warning"></i>
                        <p className="mb-0 mt-2 text-truncate" title={folder.name}>
                          {folder.name}
                        </p>
                      </div>
                      <div className="card-footer bg-transparent border-0 py-1">
                        <button
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder._id); }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          {assets.length === 0 && folders.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-cloud-upload display-1 text-muted"></i>
              <h4 className="mt-3 text-muted">No assets yet</h4>
              <p className="text-muted">Upload images, videos, or documents to get started.</p>
              <button
                className="btn btn-primary mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-upload me-1"></i>
                Upload Files
              </button>
            </div>
          ) : assets.length > 0 && (
            <>
              <h6 className="text-muted mb-3">
                <i className="bi bi-file-earmark me-2"></i>
                Files ({assets.length})
              </h6>

              {viewMode === 'grid' ? (
                <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3">
                  {assets.map(asset => (
                    <div className="col" key={asset._id}>
                      <div
                        className={`card h-100 asset-card ${selectedAssets.includes(asset._id) ? 'border-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openAssetDetail(asset)}
                      >
                        <div className="position-relative">
                          {asset.type === 'image' && asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              className="card-img-top"
                              alt={asset.originalName}
                              style={{ height: '120px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="d-flex align-items-center justify-content-center bg-light"
                              style={{ height: '120px' }}
                            >
                              <i className={`bi ${getFileIcon(asset.type, asset.mimeType)} display-4 text-muted`}></i>
                            </div>
                          )}
                          <div className="position-absolute top-0 start-0 m-2">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedAssets.includes(asset._id)}
                              onChange={(e) => { e.stopPropagation(); toggleAssetSelection(asset._id); }}
                            />
                          </div>
                        </div>
                        <div className="card-body py-2 px-2">
                          <p className="small mb-0 text-truncate" title={asset.originalName}>
                            {asset.originalName}
                          </p>
                          <small className="text-muted">{formatFileSize(asset.size)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Modified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map(asset => (
                        <tr
                          key={asset._id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => openAssetDetail(asset)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedAssets.includes(asset._id)}
                              onChange={() => toggleAssetSelection(asset._id)}
                            />
                          </td>
                          <td>
                            <i className={`bi ${getFileIcon(asset.type, asset.mimeType)} me-2`}></i>
                            {asset.originalName}
                          </td>
                          <td><span className="badge bg-secondary">{asset.type}</span></td>
                          <td>{formatFileSize(asset.size)}</td>
                          <td>{new Date(asset.updatedAt).toLocaleDateString()}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteAsset(asset._id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-folder-plus me-2"></i>
                  New Folder
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowNewFolderModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateFolder}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Folder Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowNewFolderModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Folder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {showAssetModal && selectedAsset && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-truncate" style={{ maxWidth: '400px' }}>
                  {selectedAsset.originalName}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowAssetModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8">
                    {selectedAsset.type === 'image' ? (
                      <img
                        src={selectedAsset.s3Url}
                        className="img-fluid rounded"
                        alt={selectedAsset.originalName}
                      />
                    ) : selectedAsset.type === 'video' ? (
                      <video
                        src={selectedAsset.s3Url}
                        controls
                        className="w-100 rounded"
                      />
                    ) : (
                      <div className="text-center py-5 bg-light rounded">
                        <i className={`bi ${getFileIcon(selectedAsset.type, selectedAsset.mimeType)} display-1 text-muted`}></i>
                        <p className="mt-3">{selectedAsset.originalName}</p>
                        <a
                          href={selectedAsset.s3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                        >
                          <i className="bi bi-download me-1"></i>
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="col-md-4">
                    <h6>Details</h6>
                    <dl className="row small">
                      <dt className="col-5 text-muted">Type</dt>
                      <dd className="col-7">{selectedAsset.type}</dd>

                      <dt className="col-5 text-muted">Size</dt>
                      <dd className="col-7">{formatFileSize(selectedAsset.size)}</dd>

                      {selectedAsset.dimensions?.width && (
                        <>
                          <dt className="col-5 text-muted">Dimensions</dt>
                          <dd className="col-7">
                            {selectedAsset.dimensions.width} x {selectedAsset.dimensions.height}
                          </dd>
                        </>
                      )}

                      <dt className="col-5 text-muted">Uploaded</dt>
                      <dd className="col-7">{new Date(selectedAsset.createdAt).toLocaleDateString()}</dd>

                      <dt className="col-5 text-muted">Modified</dt>
                      <dd className="col-7">{new Date(selectedAsset.updatedAt).toLocaleDateString()}</dd>
                    </dl>

                    {selectedAsset.labels?.length > 0 && (
                      <>
                        <h6 className="mt-3">Labels</h6>
                        <div className="d-flex flex-wrap gap-1">
                          {selectedAsset.labels.map(label => (
                            <span
                              key={label._id}
                              className="badge"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-danger"
                  onClick={() => handleDeleteAsset(selectedAsset._id)}
                >
                  <i className="bi bi-trash me-1"></i>
                  Delete
                </button>
                <a
                  href={selectedAsset.s3Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="bi bi-download me-1"></i>
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .folder-card:hover, .asset-card:hover {
          box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default AssetLibrary;
