import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Avatar,
  AvatarGroup,
  Menu,
  MenuItem,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
  Skeleton,
  Collapse,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  DragIndicator as DragIcon,
  Schedule as ScheduleIcon,
  Image as ImageIcon,
  Comment as CommentIcon,
  Flag as PriorityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ArrowForward as MoveIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Facebook as FacebookIcon,
  CheckCircle as ApprovedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import api from '../../services/api';

/**
 * KanbanBoard Component
 *
 * Full-featured Kanban board for content workflow management:
 * - Drag and drop between columns
 * - Configurable workflow stages
 * - Content cards with rich previews
 * - Quick actions and status transitions
 * - Filtering and search
 * - Swimlanes by campaign
 * - WIP limits per column
 */

// Default workflow stages
const DEFAULT_STAGES = [
  { id: 'idea', name: 'Ideas', color: '#9e9e9e', wipLimit: null },
  { id: 'draft', name: 'Drafts', color: '#2196f3', wipLimit: 10 },
  { id: 'in_review', name: 'In Review', color: '#ff9800', wipLimit: 5 },
  { id: 'approved', name: 'Approved', color: '#4caf50', wipLimit: null },
  { id: 'scheduled', name: 'Scheduled', color: '#9c27b0', wipLimit: null },
  { id: 'published', name: 'Published', color: '#00bcd4', wipLimit: null }
];

const PLATFORM_ICONS = {
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon
};

const PRIORITY_COLORS = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  urgent: '#d32f2f'
};

const KanbanBoard = ({
  workspaceId,
  campaignId = null,
  stages = DEFAULT_STAGES,
  onContentSelect,
  showFilters = true
}) => {
  const navigate = useNavigate();

  // State
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);
  const [cardMenuAnchor, setCardMenuAnchor] = useState(null);
  const [quickAddColumn, setQuickAddColumn] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  // Load content
  useEffect(() => {
    loadContent();
  }, [workspaceId, campaignId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const params = { campaignId };
      const response = await api.get('/content', { params });

      // Group content by stage
      const grouped = {};
      stages.forEach(stage => {
        grouped[stage.id] = [];
      });

      (response.data.content || response.data || []).forEach(item => {
        const stageId = item.status || 'idea';
        if (grouped[stageId]) {
          grouped[stageId].push(item);
        } else {
          // Handle unknown statuses by putting in first column
          grouped[stages[0].id].push(item);
        }
      });

      setContent(grouped);
    } catch (err) {
      setError('Failed to load content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag and drop
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;

    // Check WIP limit
    const destStageConfig = stages.find(s => s.id === destStage);
    if (destStageConfig?.wipLimit && content[destStage].length >= destStageConfig.wipLimit) {
      setError(`WIP limit reached for ${destStageConfig.name}`);
      return;
    }

    // Optimistic update
    const newContent = { ...content };
    const [movedItem] = newContent[sourceStage].splice(source.index, 1);
    movedItem.status = destStage;
    newContent[destStage].splice(destination.index, 0, movedItem);
    setContent(newContent);

    // Update on server
    try {
      await api.put(`/content/${draggableId}`, { status: destStage });
    } catch (err) {
      // Revert on error
      loadContent();
      setError('Failed to update content status');
    }
  };

  // Filter content
  const getFilteredContent = (stageContent) => {
    return stageContent.filter(item => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesBody = item.body?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBody) return false;
      }

      // Platform filter
      if (filterPlatform !== 'all') {
        if (!item.platforms?.includes(filterPlatform)) return false;
      }

      // Priority filter
      if (filterPriority !== 'all') {
        if (item.priority !== filterPriority) return false;
      }

      return true;
    });
  };

  // Quick add content
  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;

    try {
      const response = await api.post('/content', {
        title: quickAddTitle,
        status: quickAddColumn,
        body: ''
      });

      setContent(prev => ({
        ...prev,
        [quickAddColumn]: [...prev[quickAddColumn], response.data.content]
      }));

      setQuickAddTitle('');
      setQuickAddColumn(null);
    } catch (err) {
      setError('Failed to create content');
    }
  };

  // Toggle column collapse
  const toggleColumnCollapse = (stageId) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  // Card actions
  const handleCardClick = (item) => {
    if (onContentSelect) {
      onContentSelect(item);
    } else {
      navigate(`/content/${item._id}/edit`);
    }
  };

  const handleCardMenuOpen = (event, item) => {
    event.stopPropagation();
    setSelectedCard(item);
    setCardMenuAnchor(event.currentTarget);
  };

  const handleCardMenuClose = () => {
    setCardMenuAnchor(null);
    setSelectedCard(null);
  };

  const handleDeleteContent = async () => {
    if (!selectedCard) return;

    try {
      await api.delete(`/content/${selectedCard._id}`);
      setContent(prev => {
        const newContent = { ...prev };
        Object.keys(newContent).forEach(stageId => {
          newContent[stageId] = newContent[stageId].filter(
            item => item._id !== selectedCard._id
          );
        });
        return newContent;
      });
    } catch (err) {
      setError('Failed to delete content');
    }
    handleCardMenuClose();
  };

  // Render content card
  const renderCard = (item, index) => {
    const hasMedia = item.media?.length > 0;
    const isOverdue = item.scheduledFor && isBefore(new Date(item.scheduledFor), new Date());
    const PlatformIcon = item.platforms?.[0] ? PLATFORM_ICONS[item.platforms[0]] : null;

    return (
      <Draggable key={item._id} draggableId={item._id} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            sx={{
              mb: 1.5,
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, transform 0.2s',
              transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
              boxShadow: snapshot.isDragging ? 8 : 1,
              '&:hover': {
                boxShadow: 4
              },
              border: isOverdue ? '2px solid #f44336' : 'none'
            }}
            onClick={() => handleCardClick(item)}
          >
            {/* Drag handle */}
            <Box
              {...provided.dragHandleProps}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 0.5,
                bgcolor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <DragIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>

            {/* Media preview */}
            {hasMedia && (
              <Box
                sx={{
                  height: 120,
                  bgcolor: 'grey.100',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={item.media[0].thumbnailUrl || item.media[0].url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            )}

            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              {/* Labels */}
              {item.labels?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  {item.labels.slice(0, 3).map((label, idx) => (
                    <Chip
                      key={idx}
                      label={label.name || label}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 11,
                        bgcolor: label.color || 'primary.main',
                        color: 'white'
                      }}
                    />
                  ))}
                  {item.labels.length > 3 && (
                    <Chip
                      label={`+${item.labels.length - 3}`}
                      size="small"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  )}
                </Box>
              )}

              {/* Title */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {item.title || 'Untitled'}
              </Typography>

              {/* Body preview */}
              {item.body && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.body}
                </Typography>
              )}

              {/* Meta row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                {/* Platforms */}
                {item.platforms?.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {item.platforms.slice(0, 3).map(platform => {
                      const Icon = PLATFORM_ICONS[platform];
                      return Icon ? (
                        <Icon key={platform} sx={{ fontSize: 16, color: 'text.secondary' }} />
                      ) : null;
                    })}
                  </Box>
                )}

                {/* Priority */}
                {item.priority && item.priority !== 'low' && (
                  <Tooltip title={`${item.priority} priority`}>
                    <PriorityIcon
                      sx={{
                        fontSize: 16,
                        color: PRIORITY_COLORS[item.priority]
                      }}
                    />
                  </Tooltip>
                )}

                {/* Has media */}
                {hasMedia && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <ImageIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {item.media.length}
                    </Typography>
                  </Box>
                )}

                {/* Comments */}
                {item.comments?.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <CommentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {item.comments.length}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ flex: 1 }} />

                {/* Schedule */}
                {item.scheduledFor && (
                  <Tooltip title={format(new Date(item.scheduledFor), 'PPp')}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <ScheduleIcon
                        sx={{
                          fontSize: 14,
                          color: isOverdue ? 'error.main' : 'text.secondary'
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: isOverdue ? 'error.main' : 'text.secondary' }}
                      >
                        {format(new Date(item.scheduledFor), 'MMM d')}
                      </Typography>
                    </Box>
                  </Tooltip>
                )}

                {/* Menu */}
                <IconButton
                  size="small"
                  onClick={(e) => handleCardMenuOpen(e, item)}
                  sx={{ ml: 0.5, p: 0.25 }}
                >
                  <MoreIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              {/* Assignees */}
              {item.assignees?.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                    {item.assignees.map((assignee, idx) => (
                      <Tooltip key={idx} title={assignee.name || 'User'}>
                        <Avatar src={assignee.avatar}>
                          {assignee.name?.[0] || 'U'}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Draggable>
    );
  };

  // Render column
  const renderColumn = (stage) => {
    const stageContent = content[stage.id] || [];
    const filteredContent = getFilteredContent(stageContent);
    const isCollapsed = collapsedColumns[stage.id];
    const isOverWipLimit = stage.wipLimit && stageContent.length >= stage.wipLimit;

    return (
      <Box
        key={stage.id}
        sx={{
          minWidth: isCollapsed ? 50 : 300,
          maxWidth: isCollapsed ? 50 : 300,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          borderRadius: 2,
          overflow: 'hidden',
          transition: 'min-width 0.3s, max-width 0.3s'
        }}
      >
        {/* Column header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: stage.color + '20',
            borderBottom: `3px solid ${stage.color}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer'
          }}
          onClick={() => toggleColumnCollapse(stage.id)}
        >
          {isCollapsed ? (
            <Box
              sx={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 1
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {stage.name}
              </Typography>
              <Badge badgeContent={stageContent.length} color="primary" />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1 }}>
                {stage.name}
              </Typography>
              <Badge
                badgeContent={stageContent.length}
                color={isOverWipLimit ? 'error' : 'primary'}
                sx={{ mr: 1 }}
              />
              {stage.wipLimit && (
                <Tooltip title={`WIP Limit: ${stage.wipLimit}`}>
                  <Typography variant="caption" color="text.secondary">
                    /{stage.wipLimit}
                  </Typography>
                </Tooltip>
              )}
              <IconButton size="small" sx={{ ml: 'auto' }}>
                {isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
              </IconButton>
            </>
          )}
        </Box>

        {/* Column content */}
        {!isCollapsed && (
          <Droppable droppableId={stage.id}>
            {(provided, snapshot) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  flex: 1,
                  p: 1,
                  minHeight: 200,
                  bgcolor: snapshot.isDraggingOver ? stage.color + '10' : 'transparent',
                  transition: 'background-color 0.2s',
                  overflowY: 'auto'
                }}
              >
                {/* WIP limit warning */}
                {isOverWipLimit && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      p: 1,
                      mb: 1,
                      bgcolor: 'error.light',
                      borderRadius: 1
                    }}
                  >
                    <WarningIcon sx={{ fontSize: 16, color: 'error.dark' }} />
                    <Typography variant="caption" color="error.dark">
                      WIP limit reached
                    </Typography>
                  </Box>
                )}

                {/* Cards */}
                {filteredContent.map((item, index) => renderCard(item, index))}
                {provided.placeholder}

                {/* Empty state */}
                {filteredContent.length === 0 && (
                  <Box
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      color: 'text.secondary',
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body2">
                      {searchQuery ? 'No matching content' : 'No content'}
                    </Typography>
                  </Box>
                )}

                {/* Quick add */}
                {quickAddColumn === stage.id ? (
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Enter title..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleQuickAdd()}
                      autoFocus
                    />
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleQuickAdd}
                        disabled={!quickAddTitle.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setQuickAddColumn(null);
                          setQuickAddTitle('');
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setQuickAddColumn(stage.id)}
                    sx={{ mt: 1, justifyContent: 'flex-start', color: 'text.secondary' }}
                  >
                    Add content
                  </Button>
                )}
              </Box>
            )}
          </Droppable>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, p: 2, overflow: 'auto' }}>
        {stages.map(stage => (
          <Skeleton
            key={stage.id}
            variant="rectangular"
            width={300}
            height={400}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filters */}
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ width: 250 }}
          />
          <TextField
            select
            size="small"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="all">All Platforms</MenuItem>
            <MenuItem value="twitter">Twitter</MenuItem>
            <MenuItem value="instagram">Instagram</MenuItem>
            <MenuItem value="linkedin">LinkedIn</MenuItem>
            <MenuItem value="facebook">Facebook</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="urgent">Urgent</MenuItem>
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/content/new')}
          >
            New Content
          </Button>
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            gap: 2,
            p: 2,
            overflowX: 'auto',
            overflowY: 'hidden'
          }}
        >
          {stages.map(stage => renderColumn(stage))}
        </Box>
      </DragDropContext>

      {/* Card context menu */}
      <Menu
        anchorEl={cardMenuAnchor}
        open={Boolean(cardMenuAnchor)}
        onClose={handleCardMenuClose}
      >
        <MenuItem onClick={() => {
          handleCardClick(selectedCard);
          handleCardMenuClose();
        }}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          window.open(`/content/${selectedCard?._id}/preview`, '_blank');
          handleCardMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1, fontSize: 18 }} />
          Preview
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteContent} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default KanbanBoard;
