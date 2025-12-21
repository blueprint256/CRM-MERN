import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';

/**
 * Inbox View - The Action Hub
 *
 * Central dashboard showing items requiring attention:
 * - Pending approvals (for team members)
 * - Failed posts needing retry
 * - Content due today
 * - Recent activity feed
 *
 * Inspired by: Gmail's action-oriented inbox and Buffer's publishing dashboard
 */
const Inbox = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [actionItems, setActionItems] = useState({
    pendingApprovals: [],
    failedPosts: [],
    dueToday: [],
    scheduledToday: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingContent, setUpcomingContent] = useState([]);

  const fetchInboxData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch multiple data sources in parallel
      const [contentRes, activityRes] = await Promise.all([
        api.get('/content/board'),
        api.get('/workspaces').catch(() => ({ data: { workspaces: [] } }))
      ]);

      // Extract action items from board data
      const boardData = contentRes.data;

      // Pending approvals (content in review stage)
      const pendingApprovals = boardData.review || [];

      // Failed posts
      const failedPosts = boardData.failed || [];

      // Content scheduled for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const scheduledContent = boardData.scheduled || [];
      const scheduledToday = scheduledContent.filter(content => {
        if (!content.scheduledFor) return false;
        const scheduledDate = new Date(content.scheduledFor);
        return scheduledDate >= today && scheduledDate < tomorrow;
      });

      // Drafts that need attention (older than 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const staleDrafts = (boardData.draft || []).filter(content => {
        return new Date(content.updatedAt) < threeDaysAgo;
      }).slice(0, 5);

      setActionItems({
        pendingApprovals: pendingApprovals.slice(0, 5),
        failedPosts: failedPosts.slice(0, 5),
        dueToday: staleDrafts,
        scheduledToday: scheduledToday.slice(0, 5)
      });

      // Calculate stats
      const totalContent = Object.values(boardData).flat().length;
      const published = (boardData.published || []).length;

      setStats({
        totalContent,
        pendingApprovals: pendingApprovals.length,
        failedPosts: failedPosts.length,
        scheduledToday: scheduledToday.length,
        published
      });

      // Upcoming content (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcoming = scheduledContent
        .filter(c => c.scheduledFor && new Date(c.scheduledFor) < nextWeek)
        .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
        .slice(0, 10);
      setUpcomingContent(upcoming);

    } catch (err) {
      console.error('Error fetching inbox data:', err);
      setError('Failed to load inbox data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInboxData();
  }, [fetchInboxData]);

  const getPlatformIcon = (platform) => {
    const icons = {
      twitter: 'bi-twitter-x',
      instagram: 'bi-instagram',
      facebook: 'bi-facebook',
      linkedin: 'bi-linkedin',
      tiktok: 'bi-tiktok',
      whatsapp: 'bi-whatsapp',
      youtube: 'bi-youtube'
    };
    return icons[platform] || 'bi-globe';
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = target - now;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 0) {
      // Past
      if (diffMins > -60) return `${Math.abs(diffMins)}m ago`;
      if (diffHours > -24) return `${Math.abs(diffHours)}h ago`;
      return `${Math.abs(diffDays)}d ago`;
    } else {
      // Future
      if (diffMins < 60) return `in ${diffMins}m`;
      if (diffHours < 24) return `in ${diffHours}h`;
      return `in ${diffDays}d`;
    }
  };

  const ActionCard = ({ title, icon, items, emptyMessage, linkTo, color = 'primary' }) => (
    <div className="card h-100">
      <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
        <span>
          <i className={`bi ${icon} me-2 text-${color}`}></i>
          {title}
        </span>
        {items.length > 0 && (
          <span className={`badge bg-${color}`}>{items.length}</span>
        )}
      </div>
      <div className="card-body">
        {items.length === 0 ? (
          <p className="text-muted small mb-0 text-center py-3">{emptyMessage}</p>
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((item) => (
              <li key={item._id} className="list-group-item px-0 py-2">
                <Link
                  to={`/content-board`}
                  className="text-decoration-none d-flex justify-content-between align-items-center"
                >
                  <div className="text-truncate" style={{ maxWidth: '200px' }}>
                    <span className="text-dark">{item.title}</span>
                    <div className="d-flex gap-1 mt-1">
                      {item.platforms?.slice(0, 3).map((p) => (
                        <i key={p} className={`bi ${getPlatformIcon(p)} small text-muted`}></i>
                      ))}
                    </div>
                  </div>
                  {item.scheduledFor && (
                    <small className="text-muted">
                      {formatRelativeTime(item.scheduledFor)}
                    </small>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > 0 && linkTo && (
        <div className="card-footer bg-transparent">
          <Link to={linkTo} className="btn btn-sm btn-outline-primary w-100">
            View All
          </Link>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0">
            <i className="bi bi-inbox me-2"></i>
            Inbox
          </h1>
          <p className="text-muted mb-0">
            Welcome back, {user?.firstName}! Here's what needs your attention.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/content-board" className="btn btn-outline-primary">
            <i className="bi bi-kanban me-1"></i>
            Content Board
          </Link>
          <Link to="/content/new" className="btn btn-primary">
            <i className="bi bi-plus-circle me-1"></i>
            Create Content
          </Link>
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Stats Overview */}
      <div className="row row-cols-2 row-cols-md-5 g-3 mb-4">
        <div className="col">
          <div className="card bg-primary text-white h-100">
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
        <div className="col">
          <div className={`card h-100 ${stats.pendingApprovals > 0 ? 'bg-warning' : 'bg-light'}`}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="small mb-0 opacity-75">Pending Review</p>
                  <h4 className="mb-0">{stats.pendingApprovals || 0}</h4>
                </div>
                <i className="bi bi-clock-history display-6 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className={`card h-100 ${stats.failedPosts > 0 ? 'bg-danger text-white' : 'bg-light'}`}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="small mb-0 opacity-75">Failed</p>
                  <h4 className="mb-0">{stats.failedPosts || 0}</h4>
                </div>
                <i className="bi bi-exclamation-triangle display-6 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-info text-white h-100">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="small mb-0 opacity-75">Scheduled Today</p>
                  <h4 className="mb-0">{stats.scheduledToday || 0}</h4>
                </div>
                <i className="bi bi-calendar-check display-6 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-success text-white h-100">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="small mb-0 opacity-75">Published</p>
                  <h4 className="mb-0">{stats.published || 0}</h4>
                </div>
                <i className="bi bi-check2-all display-6 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Grid */}
      <div className="row g-4 mb-4">
        <div className="col-md-6 col-lg-3">
          <ActionCard
            title="Pending Approvals"
            icon="bi-hourglass-split"
            items={actionItems.pendingApprovals}
            emptyMessage="No items pending approval"
            linkTo="/content-board?stage=review"
            color="warning"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <ActionCard
            title="Failed Posts"
            icon="bi-exclamation-octagon"
            items={actionItems.failedPosts}
            emptyMessage="No failed posts"
            linkTo="/content-board?stage=failed"
            color="danger"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <ActionCard
            title="Scheduled Today"
            icon="bi-calendar-event"
            items={actionItems.scheduledToday}
            emptyMessage="Nothing scheduled today"
            linkTo="/content-calendar"
            color="info"
          />
        </div>
        <div className="col-md-6 col-lg-3">
          <ActionCard
            title="Stale Drafts"
            icon="bi-pencil-square"
            items={actionItems.dueToday}
            emptyMessage="No stale drafts"
            linkTo="/content-board?stage=draft"
            color="secondary"
          />
        </div>
      </div>

      {/* Upcoming Content Timeline */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-calendar3 me-2"></i>
                Upcoming Content
              </span>
              <Link to="/content-calendar" className="btn btn-sm btn-outline-primary">
                View Calendar
              </Link>
            </div>
            <div className="card-body">
              {upcomingContent.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x display-4 text-muted"></i>
                  <p className="text-muted mt-3">No content scheduled for the next 7 days</p>
                  <Link to="/content-board" className="btn btn-primary">
                    Schedule Content
                  </Link>
                </div>
              ) : (
                <div className="timeline">
                  {upcomingContent.map((content, index) => (
                    <div key={content._id} className="d-flex align-items-start mb-3">
                      <div className="flex-shrink-0 me-3 text-center" style={{ width: '60px' }}>
                        <div className="small text-muted">
                          {new Date(content.scheduledFor).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="h5 mb-0">
                          {new Date(content.scheduledFor).getDate()}
                        </div>
                        <div className="small text-muted">
                          {new Date(content.scheduledFor).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex-grow-1 border-start ps-3">
                        <h6 className="mb-1">{content.title}</h6>
                        <div className="d-flex gap-2 align-items-center">
                          <div className="d-flex gap-1">
                            {content.platforms?.map((p) => (
                              <i key={p} className={`bi ${getPlatformIcon(p)} text-muted`}></i>
                            ))}
                          </div>
                          {content.campaign?.name && (
                            <span className="badge bg-light text-dark">
                              <i className="bi bi-megaphone me-1"></i>
                              {content.campaign.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-transparent">
              <i className="bi bi-lightning me-2"></i>
              Quick Actions
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/content/new" className="btn btn-outline-primary text-start">
                  <i className="bi bi-plus-circle me-2"></i>
                  Create New Content
                </Link>
                <Link to="/campaigns/new" className="btn btn-outline-primary text-start">
                  <i className="bi bi-megaphone me-2"></i>
                  Start New Campaign
                </Link>
                <Link to="/assets" className="btn btn-outline-primary text-start">
                  <i className="bi bi-upload me-2"></i>
                  Upload Assets
                </Link>
                <Link to="/content-calendar" className="btn btn-outline-primary text-start">
                  <i className="bi bi-calendar3 me-2"></i>
                  View Calendar
                </Link>
                <Link to="/campaigns" className="btn btn-outline-primary text-start">
                  <i className="bi bi-bar-chart me-2"></i>
                  Campaign Overview
                </Link>
              </div>
            </div>
          </div>

          {/* Platform Status */}
          <div className="card mt-4">
            <div className="card-header bg-transparent">
              <i className="bi bi-plug me-2"></i>
              Connected Platforms
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {['twitter', 'instagram', 'facebook', 'linkedin'].map((platform) => (
                  <div
                    key={platform}
                    className="d-flex align-items-center gap-2 px-3 py-2 bg-light rounded"
                  >
                    <i className={`bi ${getPlatformIcon(platform)}`}></i>
                    <span className="text-capitalize small">{platform}</span>
                    <i className="bi bi-check-circle-fill text-success small"></i>
                  </div>
                ))}
              </div>
              <Link to="/settings" className="btn btn-link btn-sm mt-2 p-0">
                <i className="bi bi-gear me-1"></i>
                Manage Connections
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
