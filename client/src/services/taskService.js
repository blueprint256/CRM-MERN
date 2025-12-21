import api from './api';

/**
 * Task Service
 *
 * API wrapper for task management operations.
 * Provides clean interface for task CRUD and status changes.
 */

const taskService = {
  /**
   * Get tasks with optional filters
   */
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  /**
   * Get inbox tasks for current user
   */
  getInbox: async (params = {}) => {
    const response = await api.get('/tasks/inbox', { params });
    return response.data;
  },

  /**
   * Get overdue tasks
   */
  getOverdue: async () => {
    const response = await api.get('/tasks/overdue');
    return response.data;
  },

  /**
   * Get task statistics
   */
  getStats: async () => {
    const response = await api.get('/tasks/stats');
    return response.data;
  },

  /**
   * Get tasks for Gantt chart
   */
  getForGantt: async (campaignId) => {
    const response = await api.get(`/tasks/gantt/${campaignId}`);
    return response.data;
  },

  /**
   * Get single task by ID
   */
  getTask: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Create new task
   */
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  /**
   * Update task
   */
  updateTask: async (taskId, updates) => {
    const response = await api.put(`/tasks/${taskId}`, updates);
    return response.data;
  },

  /**
   * Start a task
   */
  startTask: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/start`);
    return response.data;
  },

  /**
   * Complete a task
   */
  completeTask: async (taskId, actualTime = null) => {
    const response = await api.post(`/tasks/${taskId}/complete`, { actualTime });
    return response.data;
  },

  /**
   * Assign task to user
   */
  assignTask: async (taskId, userId) => {
    const response = await api.post(`/tasks/${taskId}/assign`, { userId });
    return response.data;
  },

  /**
   * Add comment to task
   */
  addComment: async (taskId, text) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { text });
    return response.data;
  },

  /**
   * Update checklist item
   */
  updateChecklistItem: async (taskId, index, completed) => {
    const response = await api.put(`/tasks/${taskId}/checklist/${index}`, { completed });
    return response.data;
  },

  /**
   * Add checklist item
   */
  addChecklistItem: async (taskId, text) => {
    const response = await api.post(`/tasks/${taskId}/checklist`, { text });
    return response.data;
  },

  /**
   * Delete task (soft delete)
   */
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  }
};

export default taskService;
