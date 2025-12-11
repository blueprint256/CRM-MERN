import api from './api';

const canvaService = {
  // Check Canva connection status
  getStatus: async () => {
    const response = await api.get('/canva/status');
    return response.data;
  },

  // Initiate OAuth flow
  initiateAuth: async () => {
    const response = await api.get('/canva/auth');
    return response.data;
  },

  // Disconnect Canva account
  disconnect: async () => {
    const response = await api.post('/canva/disconnect');
    return response.data;
  },

  // Get Canva profile
  getProfile: async () => {
    const response = await api.get('/canva/profile');
    return response.data;
  },

  // List Canva designs
  listDesigns: async (limit = 20, continuation = null) => {
    const params = { limit };
    if (continuation) params.continuation = continuation;
    const response = await api.get('/canva/designs', { params });
    return response.data;
  },

  // Create new design
  createDesign: async (options) => {
    const response = await api.post('/canva/designs', options);
    return response.data;
  },

  // Get design details
  getDesign: async (designId) => {
    const response = await api.get(`/canva/designs/${designId}`);
    return response.data;
  },

  // Edit project image in Canva
  editProjectImage: async (projectId) => {
    const response = await api.post(`/canva/projects/${projectId}/edit`);
    return response.data;
  },

  // Save Canva design back to project
  saveToProject: async (projectId, designId) => {
    const response = await api.post(`/canva/projects/${projectId}/save`, { designId });
    return response.data;
  },

  // Create new design for project
  createNewForProject: async (projectId, options = {}) => {
    const response = await api.post(`/canva/projects/${projectId}/create-new`, options);
    return response.data;
  },

  // Get design associated with project
  getProjectDesign: async (projectId) => {
    const response = await api.get(`/canva/projects/${projectId}/design`);
    return response.data;
  }
};

export default canvaService;
