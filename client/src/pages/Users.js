import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Alert from '../components/common/Alert';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'client'
  });

  useEffect(() => {
    fetchUsers();
    fetchPrompt();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompt = async () => {
    try {
      const response = await api.get('/prompts');
      setPrompt(response.data.prompt || '');
    } catch (err) {
      console.error('Failed to fetch prompt:', err);
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
    setSuccess('');

    try {
      await api.post('/users', formData);
      setSuccess('User created successfully! A temporary password has been sent to their email.');
      setShowModal(false);
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        role: 'client'
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleUpdatePrompt = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.put('/prompts', { prompt });
      setSuccess('Prompt updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update prompt');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      system: 'bg-danger',
      designer: 'bg-info',
      marketeer: 'bg-warning text-dark',
      hybrid: 'bg-secondary',
      client: 'bg-success'
    };
    return colors[role] || 'bg-secondary';
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-people me-2"></i>
          User Management
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-person-plus me-2"></i>
          Add User
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Users</h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user._id}>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.email}</td>
                            <td>{user.username}</td>
                            <td>
                              <span className={`badge ${getRoleBadge(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user._id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-chat-left-text me-2"></i>
                AI Prompt Settings
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleUpdatePrompt}>
                <div className="mb-3">
                  <label className="form-label">System Prompt for AI Slogan Generation</label>
                  <textarea
                    className="form-control"
                    rows={6}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter the system prompt for AI slogan generation..."
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  <i className="bi bi-check-circle me-2"></i>
                  Update Prompt
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="system">System Admin</option>
                      <option value="designer">Designer</option>
                      <option value="marketeer">Marketeer</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
