import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Card,
  CardContent,
  Badge,
  LinearProgress,
  Collapse,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AttachFile as AttachIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon,
  Facebook as FacebookIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  EmojiEmotions as EmojiIcon,
  Link as LinkIcon,
  FormatBold as BoldIcon,
  Tag as HashtagIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TwitterPreview from './previews/TwitterPreview';
import InstagramPreview from './previews/InstagramPreview';
import LinkedInPreview from './previews/LinkedInPreview';
import FacebookPreview from './previews/FacebookPreview';
import WhatsAppPreview from './previews/WhatsAppPreview';
import TikTokPreview from './previews/TikTokPreview';
import api from '../../services/api';

/**
 * ContentEditor Component
 *
 * Full-featured content editor with:
 * - Rich text editing with character counts
 * - Multi-platform targeting with platform-specific variants
 * - Live platform previews (Buffer-style)
 * - Media attachment management
 * - Scheduling with queue integration
 * - Label/tag management
 * - Campaign association
 * - AI-assisted content suggestions
 */

const PLATFORM_CONFIG = {
  twitter: {
    name: 'Twitter/X',
    icon: TwitterIcon,
    color: '#1DA1F2',
    maxChars: 280,
    supportsMedia: true,
    maxImages: 4,
    maxVideos: 1,
    supportsThreads: true,
    supportsHashtags: true
  },
  instagram: {
    name: 'Instagram',
    icon: InstagramIcon,
    color: '#E4405F',
    maxChars: 2200,
    supportsMedia: true,
    maxImages: 10,
    maxVideos: 1,
    supportsCarousel: true,
    supportsHashtags: true,
    requiresMedia: true
  },
  linkedin: {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    color: '#0A66C2',
    maxChars: 3000,
    supportsMedia: true,
    maxImages: 9,
    maxVideos: 1,
    supportsArticles: true
  },
  facebook: {
    name: 'Facebook',
    icon: FacebookIcon,
    color: '#1877F2',
    maxChars: 63206,
    supportsMedia: true,
    maxImages: 10,
    maxVideos: 1
  },
  tiktok: {
    name: 'TikTok',
    icon: VideoIcon,
    color: '#000000',
    maxChars: 2200,
    supportsMedia: true,
    maxVideos: 1,
    requiresVideo: true
  },
  youtube: {
    name: 'YouTube',
    icon: YouTubeIcon,
    color: '#FF0000',
    maxChars: 5000,
    titleMaxChars: 100,
    supportsMedia: true,
    maxVideos: 1,
    requiresVideo: true
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: null,
    color: '#25D366',
    maxChars: 4096,
    supportsMedia: true,
    maxImages: 1,
    supportsButtons: true
  }
};

const ContentEditor = ({ mode = 'create', contentId = null, onSave, onCancel }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const effectiveId = contentId || id;

  // Content state
  const [content, setContent] = useState({
    title: '',
    body: '',
    platforms: [],
    platformVariants: {},
    media: [],
    labels: [],
    campaign: null,
    scheduledFor: null,
    status: 'idea'
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState({});

  // Reference data
  const [campaigns, setCampaigns] = useState([]);
  const [labels, setLabels] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [assets, setAssets] = useState([]);

  // Load content if editing
  useEffect(() => {
    if (mode === 'edit' && effectiveId) {
      loadContent();
    }
    loadReferenceData();
  }, [mode, effectiveId]);

  // Set initial preview platform when platforms change
  useEffect(() => {
    if (content.platforms.length > 0 && !previewPlatform) {
      setPreviewPlatform(content.platforms[0]);
    }
  }, [content.platforms]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/content/${effectiveId}`);
      setContent(response.data.content);
    } catch (err) {
      setError('Failed to load content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [campaignsRes, labelsRes, assetsRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/labels'),
        api.get('/assets')
      ]);
      setCampaigns(campaignsRes.data.campaigns || []);
      setLabels(labelsRes.data.labels || []);
      setAssets(assetsRes.data.assets || []);

      // Mock connected platforms for now
      setConnectedPlatforms(['twitter', 'instagram', 'linkedin', 'facebook']);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const handleContentChange = (field, value) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handlePlatformToggle = (platform) => {
    setContent(prev => {
      const platforms = prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform];

      // Initialize variant if adding platform
      const platformVariants = { ...prev.platformVariants };
      if (!prev.platforms.includes(platform)) {
        platformVariants[platform] = {
          body: prev.body,
          media: [...prev.media]
        };
      }

      return { ...prev, platforms, platformVariants };
    });
  };

  const handleVariantChange = (platform, field, value) => {
    setContent(prev => ({
      ...prev,
      platformVariants: {
        ...prev.platformVariants,
        [platform]: {
          ...prev.platformVariants[platform],
          [field]: value
        }
      }
    }));
  };

  const getContentForPlatform = (platform) => {
    const variant = content.platformVariants[platform];
    return {
      body: variant?.body || content.body,
      media: variant?.media || content.media
    };
  };

  const getCharacterCount = (platform) => {
    const { body } = getContentForPlatform(platform);
    const config = PLATFORM_CONFIG[platform];
    return {
      current: body?.length || 0,
      max: config?.maxChars || 0,
      isOver: (body?.length || 0) > (config?.maxChars || Infinity)
    };
  };

  const handleSave = async (status = content.status) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...content,
        status
      };

      let response;
      if (mode === 'edit' && effectiveId) {
        response = await api.put(`/content/${effectiveId}`, payload);
      } else {
        response = await api.post('/content', payload);
      }

      setSuccess('Content saved successfully');
      if (onSave) {
        onSave(response.data.content);
      } else {
        setTimeout(() => navigate('/content'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.scheduledFor) {
      setError('Please select a schedule time');
      return;
    }
    await handleSave('scheduled');
    setShowScheduler(false);
  };

  const handleMediaSelect = (asset) => {
    setContent(prev => ({
      ...prev,
      media: [...prev.media, { asset: asset._id, url: asset.url, type: asset.type }]
    }));
    setShowMediaPicker(false);
  };

  const handleMediaRemove = (index) => {
    setContent(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const copyToVariant = (fromPlatform, toPlatform) => {
    const source = getContentForPlatform(fromPlatform);
    handleVariantChange(toPlatform, 'body', source.body);
  };

  const togglePlatformExpand = (platform) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const renderPreview = () => {
    if (!previewPlatform) return null;

    const platformContent = getContentForPlatform(previewPlatform);
    const previewProps = {
      content: platformContent.body,
      media: platformContent.media,
      author: {
        name: 'Marketing Team',
        handle: '@marketing',
        avatar: null
      },
      timestamp: new Date()
    };

    switch (previewPlatform) {
      case 'twitter':
        return <TwitterPreview {...previewProps} />;
      case 'instagram':
        return <InstagramPreview {...previewProps} />;
      case 'linkedin':
        return <LinkedInPreview {...previewProps} />;
      case 'facebook':
        return <FacebookPreview {...previewProps} />;
      case 'whatsapp':
        return <WhatsAppPreview {...previewProps} />;
      case 'tiktok':
        return <TikTokPreview {...previewProps} />;
      default:
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Preview not available for this platform
            </Typography>
          </Box>
        );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            {mode === 'edit' ? 'Edit Content' : 'Create Content'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={onCancel || (() => navigate('/content'))}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => handleSave('draft')}
              disabled={saving}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              onClick={() => setShowScheduler(true)}
              disabled={saving || content.platforms.length === 0}
            >
              Schedule
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={() => handleSave('pending_review')}
              disabled={saving || content.platforms.length === 0}
            >
              Submit for Review
            </Button>
          </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Editor */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              {/* Title */}
              <TextField
                fullWidth
                label="Content Title (Internal)"
                value={content.title}
                onChange={(e) => handleContentChange('title', e.target.value)}
                placeholder="e.g., Q4 Product Launch Announcement"
                sx={{ mb: 3 }}
              />

              {/* Platform Selection */}
              <Typography variant="subtitle2" gutterBottom>
                Target Platforms
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                  const isConnected = connectedPlatforms.includes(key);
                  const isSelected = content.platforms.includes(key);
                  const Icon = config.icon;

                  return (
                    <Tooltip
                      key={key}
                      title={isConnected ? config.name : `${config.name} (Not connected)`}
                    >
                      <span>
                        <Chip
                          icon={Icon ? <Icon /> : null}
                          label={config.name}
                          onClick={() => isConnected && handlePlatformToggle(key)}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          disabled={!isConnected}
                          sx={{
                            borderColor: isSelected ? config.color : undefined,
                            '&.Mui-disabled': { opacity: 0.5 }
                          }}
                        />
                      </span>
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Main Content Body */}
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Content"
                value={content.body}
                onChange={(e) => handleContentChange('body', e.target.value)}
                placeholder="Write your content here..."
                sx={{ mb: 2 }}
              />

              {/* Character counts for selected platforms */}
              {content.platforms.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  {content.platforms.map(platform => {
                    const { current, max, isOver } = getCharacterCount(platform);
                    const config = PLATFORM_CONFIG[platform];
                    return (
                      <Chip
                        key={platform}
                        size="small"
                        icon={config.icon ? <config.icon style={{ fontSize: 16 }} /> : null}
                        label={`${current}/${max}`}
                        color={isOver ? 'error' : 'default'}
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              )}

              {/* Media */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Media</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowMediaPicker(true)}
                  >
                    Add Media
                  </Button>
                </Box>
                {content.media.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {content.media.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          position: 'relative',
                          width: 100,
                          height: 100,
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <img
                          src={item.url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                          }}
                          onClick={() => handleMediaRemove(index)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 3,
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    onClick={() => setShowMediaPicker(true)}
                  >
                    <ImageIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      Click to add images or videos
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Platform Variants */}
              {content.platforms.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Platform-Specific Variations
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Customize content for each platform
                  </Typography>

                  {content.platforms.map(platform => {
                    const config = PLATFORM_CONFIG[platform];
                    const Icon = config.icon;
                    const variant = content.platformVariants[platform] || {};
                    const isExpanded = expandedPlatforms[platform];

                    return (
                      <Card key={platform} variant="outlined" sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => togglePlatformExpand(platform)}
                        >
                          {Icon && <Icon sx={{ mr: 1, color: config.color }} />}
                          <Typography flex={1}>{config.name}</Typography>
                          <Chip
                            size="small"
                            label={variant.body ? 'Customized' : 'Using default'}
                            color={variant.body ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </Box>
                        <Collapse in={isExpanded}>
                          <Divider />
                          <Box sx={{ p: 2 }}>
                            <TextField
                              fullWidth
                              multiline
                              rows={4}
                              value={variant.body || content.body}
                              onChange={(e) => handleVariantChange(platform, 'body', e.target.value)}
                              helperText={`${(variant.body || content.body).length}/${config.maxChars} characters`}
                            />
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                startIcon={<CopyIcon />}
                                onClick={() => handleVariantChange(platform, 'body', content.body)}
                              >
                                Reset to Default
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                      </Card>
                    );
                  })}
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Labels and Campaign */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={labels}
                    getOptionLabel={(option) => option.name}
                    value={labels.filter(l => content.labels.includes(l._id))}
                    onChange={(e, newValue) => handleContentChange('labels', newValue.map(l => l._id))}
                    renderInput={(params) => (
                      <TextField {...params} label="Labels" placeholder="Add labels" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option._id}
                          label={option.name}
                          size="small"
                          style={{ backgroundColor: option.color }}
                        />
                      ))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Campaign</InputLabel>
                    <Select
                      value={content.campaign || ''}
                      label="Campaign"
                      onChange={(e) => handleContentChange('campaign', e.target.value)}
                    >
                      <MenuItem value="">No Campaign</MenuItem>
                      {campaigns.map(campaign => (
                        <MenuItem key={campaign._id} value={campaign._id}>
                          {campaign.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Right Column - Preview */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 0, position: 'sticky', top: 80 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={content.platforms.indexOf(previewPlatform) >= 0 ? content.platforms.indexOf(previewPlatform) : 0}
                  onChange={(e, idx) => setPreviewPlatform(content.platforms[idx])}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {content.platforms.map(platform => {
                    const config = PLATFORM_CONFIG[platform];
                    const Icon = config.icon;
                    return (
                      <Tab
                        key={platform}
                        icon={Icon ? <Icon /> : null}
                        label={config.name}
                        iconPosition="start"
                      />
                    );
                  })}
                </Tabs>
              </Box>

              {content.platforms.length > 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PreviewIcon fontSize="small" />
                    Live Preview
                  </Typography>
                  {renderPreview()}
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Select platforms to see preview
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Schedule Dialog */}
        <Dialog open={showScheduler} onClose={() => setShowScheduler(false)}>
          <DialogTitle>Schedule Content</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, minWidth: 300 }}>
              <DateTimePicker
                label="Schedule for"
                value={content.scheduledFor}
                onChange={(date) => handleContentChange('scheduledFor', date)}
                minDateTime={new Date()}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Content will be queued for publishing at the scheduled time.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowScheduler(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSchedule} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : 'Schedule'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Media Picker Dialog */}
        <Dialog
          open={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Select Media</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {assets.filter(a => a.type === 'image' || a.type === 'video').map(asset => (
                <Grid item xs={6} sm={4} md={3} key={asset._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 }
                    }}
                    onClick={() => handleMediaSelect(asset)}
                  >
                    <Box sx={{ height: 120, overflow: 'hidden' }}>
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="caption" noWrap>
                        {asset.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {assets.filter(a => a.type === 'image' || a.type === 'video').length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No media assets found. Upload some assets first.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMediaPicker(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default ContentEditor;
