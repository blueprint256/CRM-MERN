/**
 * Centralized Model Exports
 *
 * All Mongoose models are exported from here for consistent imports.
 * This prevents circular dependencies and makes refactoring easier.
 */

// Core models
const User = require('./User');
const Workspace = require('./Workspace');
const Team = require('./Team');

// Content & Campaign models
const Campaign = require('./Campaign');
const Content = require('./Content');
const Task = require('./Task');

// Asset management
const Asset = require('./Asset');
const Folder = require('./Folder');
const Label = require('./Label');

// Workflow & Activity
const WorkflowDefinition = require('./WorkflowDefinition');
const Activity = require('./Activity');

// Platform connections
const PlatformConnection = require('./PlatformConnection');

// =====================================================
// DEPRECATED - Kept for backward compatibility only
// These will be removed in a future version
// =====================================================
// const Project = require('./Project');
// const ProjectHistory = require('./ProjectHistory');
// const Prompt = require('./Prompt');

module.exports = {
  // Core
  User,
  Workspace,
  Team,

  // Content & Campaigns
  Campaign,
  Content,
  Task,

  // Assets
  Asset,
  Folder,
  Label,

  // Workflow
  WorkflowDefinition,
  Activity,

  // Integrations
  PlatformConnection

  // DEPRECATED exports commented out
  // Project,
  // ProjectHistory,
  // Prompt
};
