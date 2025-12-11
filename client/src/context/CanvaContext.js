import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import canvaService from '../services/canvaService';
import { useAuth } from './AuthContext';

const CanvaContext = createContext(null);

export const CanvaProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [canvaUserId, setCanvaUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check Canva connection status
  const checkStatus = useCallback(async () => {
    if (!user) {
      setIsConnected(false);
      setCanvaUserId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const status = await canvaService.getStatus();
      setIsConnected(status.connected);
      setCanvaUserId(status.canvaUserId);
      setError(null);
    } catch (err) {
      console.error('Failed to check Canva status:', err);
      setIsConnected(false);
      setError('Failed to check Canva connection status');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Initiate Canva OAuth
  const connect = async () => {
    try {
      setError(null);
      const { authUrl } = await canvaService.initiateAuth();
      // Redirect to Canva OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to initiate Canva auth:', err);
      setError('Failed to start Canva connection');
      throw err;
    }
  };

  // Disconnect Canva
  const disconnect = async () => {
    try {
      setError(null);
      await canvaService.disconnect();
      setIsConnected(false);
      setCanvaUserId(null);
    } catch (err) {
      console.error('Failed to disconnect Canva:', err);
      setError('Failed to disconnect Canva');
      throw err;
    }
  };

  // Edit project image in Canva
  const editProjectImage = async (projectId) => {
    if (!isConnected) {
      throw new Error('Please connect your Canva account first');
    }

    try {
      const result = await canvaService.editProjectImage(projectId);
      return result;
    } catch (err) {
      console.error('Failed to edit project in Canva:', err);
      throw err;
    }
  };

  // Save design back to project
  const saveToProject = async (projectId, designId) => {
    try {
      const result = await canvaService.saveToProject(projectId, designId);
      return result;
    } catch (err) {
      console.error('Failed to save design to project:', err);
      throw err;
    }
  };

  // Create new design for project
  const createNewForProject = async (projectId, options = {}) => {
    if (!isConnected) {
      throw new Error('Please connect your Canva account first');
    }

    try {
      const result = await canvaService.createNewForProject(projectId, options);
      return result;
    } catch (err) {
      console.error('Failed to create new design:', err);
      throw err;
    }
  };

  const value = {
    isConnected,
    canvaUserId,
    loading,
    error,
    connect,
    disconnect,
    checkStatus,
    editProjectImage,
    saveToProject,
    createNewForProject
  };

  return (
    <CanvaContext.Provider value={value}>
      {children}
    </CanvaContext.Provider>
  );
};

export const useCanva = () => {
  const context = useContext(CanvaContext);
  if (!context) {
    throw new Error('useCanva must be used within a CanvaProvider');
  }
  return context;
};

export default CanvaContext;
