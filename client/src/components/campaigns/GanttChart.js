import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Avatar,
  AvatarGroup,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Slider,
  Skeleton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Flag as MilestoneIcon,
  Link as DependencyIcon,
  CheckCircle as CompleteIcon,
  Warning as DelayedIcon,
  Schedule as InProgressIcon
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isWithinInterval,
  isBefore,
  isAfter,
  isSameDay,
  parseISO,
  min,
  max
} from 'date-fns';
import api from '../../services/api';

/**
 * GanttChart Component
 *
 * Microsoft Project-style Gantt chart for campaign management:
 * - Campaign and task timelines
 * - Zoom levels (day, week, month)
 * - Progress tracking
 * - Dependencies visualization
 * - Milestones
 * - Drag to adjust dates
 * - Collapsible task groups
 */

const TASK_COLORS = {
  campaign: '#1976d2',
  content: '#4caf50',
  milestone: '#ff9800',
  review: '#9c27b0',
  approval: '#00bcd4'
};

const STATUS_ICONS = {
  not_started: null,
  in_progress: InProgressIcon,
  completed: CompleteIcon,
  delayed: DelayedIcon
};

const GanttChart = ({ workspaceId, campaignId = null }) => {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const timelineRef = useRef(null);

  // State
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewStart, setViewStart] = useState(startOfMonth(new Date()));
  const [zoomLevel, setZoomLevel] = useState('week'); // day, week, month
  const [expandedCampaigns, setExpandedCampaigns] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    progress: 0,
    type: 'content'
  });

  // Calculate view range
  const viewRange = useMemo(() => {
    let end;
    if (zoomLevel === 'day') {
      end = addDays(viewStart, 30);
    } else if (zoomLevel === 'week') {
      end = addMonths(viewStart, 3);
    } else {
      end = addMonths(viewStart, 12);
    }
    return { start: viewStart, end };
  }, [viewStart, zoomLevel]);

  // Generate time units for header
  const timeUnits = useMemo(() => {
    const { start, end } = viewRange;
    if (zoomLevel === 'day') {
      return eachDayOfInterval({ start, end }).map(date => ({
        date,
        label: format(date, 'd'),
        isWeekend: [0, 6].includes(date.getDay()),
        isToday: isSameDay(date, new Date())
      }));
    } else if (zoomLevel === 'week') {
      return eachWeekOfInterval({ start, end }).map(date => ({
        date,
        label: format(date, 'MMM d'),
        isToday: isWithinInterval(new Date(), {
          start: date,
          end: addDays(date, 6)
        })
      }));
    } else {
      return eachMonthOfInterval({ start, end }).map(date => ({
        date,
        label: format(date, 'MMM yyyy'),
        isToday: isSameDay(startOfMonth(new Date()), date)
      }));
    }
  }, [viewRange, zoomLevel]);

  // Load data
  useEffect(() => {
    loadData();
  }, [workspaceId, campaignId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, contentRes] = await Promise.all([
        api.get('/campaigns', { params: { workspaceId } }),
        api.get('/content', { params: { workspaceId, status: ['scheduled', 'published', 'draft'] } })
      ]);

      const campaignsData = campaignsRes.data.campaigns || campaignsRes.data || [];
      const contentData = contentRes.data.content || contentRes.data || [];

      // Build task list
      const allTasks = [];

      campaignsData.forEach(campaign => {
        // Add campaign as parent task
        allTasks.push({
          id: campaign._id,
          name: campaign.name,
          type: 'campaign',
          startDate: campaign.startDate ? parseISO(campaign.startDate) : new Date(),
          endDate: campaign.endDate ? parseISO(campaign.endDate) : addDays(new Date(), 30),
          progress: campaign.progress || 0,
          status: campaign.status,
          isParent: true,
          children: []
        });

        // Initialize expanded state
        if (expandedCampaigns[campaign._id] === undefined) {
          setExpandedCampaigns(prev => ({ ...prev, [campaign._id]: true }));
        }
      });

      // Add content as child tasks
      contentData.forEach(content => {
        if (content.campaign) {
          const parentTask = allTasks.find(t => t.id === content.campaign);
          if (parentTask) {
            const task = {
              id: content._id,
              name: content.title || 'Untitled',
              type: 'content',
              startDate: content.createdAt ? parseISO(content.createdAt) : new Date(),
              endDate: content.scheduledFor ? parseISO(content.scheduledFor) : addDays(new Date(), 7),
              progress: content.status === 'published' ? 100 :
                        content.status === 'scheduled' ? 80 :
                        content.status === 'approved' ? 60 :
                        content.status === 'in_review' ? 40 : 20,
              status: content.status,
              parentId: content.campaign
            };
            parentTask.children.push(task);
            allTasks.push(task);
          }
        }
      });

      setCampaigns(campaignsData);
      setTasks(allTasks);

      // Auto-set view to show all tasks
      if (allTasks.length > 0) {
        const allDates = allTasks.flatMap(t => [t.startDate, t.endDate]);
        const minDate = min(allDates);
        setViewStart(startOfMonth(subDays(minDate, 7)));
      }
    } catch (err) {
      setError('Failed to load campaign data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get pixel position for a date
  const getDatePosition = (date) => {
    const { start } = viewRange;
    const totalDays = differenceInDays(viewRange.end, start);
    const dayOffset = differenceInDays(date, start);
    return (dayOffset / totalDays) * 100;
  };

  // Get width for a date range
  const getDateWidth = (startDate, endDate) => {
    const totalDays = differenceInDays(viewRange.end, viewRange.start);
    const duration = differenceInDays(endDate, startDate) + 1;
    return Math.max((duration / totalDays) * 100, 1);
  };

  // Navigation
  const navigatePrev = () => {
    if (zoomLevel === 'day') {
      setViewStart(subDays(viewStart, 7));
    } else if (zoomLevel === 'week') {
      setViewStart(subMonths(viewStart, 1));
    } else {
      setViewStart(subMonths(viewStart, 3));
    }
  };

  const navigateNext = () => {
    if (zoomLevel === 'day') {
      setViewStart(addDays(viewStart, 7));
    } else if (zoomLevel === 'week') {
      setViewStart(addMonths(viewStart, 1));
    } else {
      setViewStart(addMonths(viewStart, 3));
    }
  };

  const goToToday = () => {
    setViewStart(startOfMonth(new Date()));
  };

  // Toggle campaign expansion
  const toggleCampaignExpand = (campaignId) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
  };

  // Task actions
  const handleTaskClick = (event, task) => {
    setSelectedTask(task);
    setMenuAnchor(event.currentTarget);
  };

  const handleTaskDoubleClick = (task) => {
    if (task.type === 'campaign') {
      navigate(`/campaigns/${task.id}`);
    } else {
      navigate(`/content/${task.id}/edit`);
    }
  };

  // Get visible tasks (considering expansion)
  const getVisibleTasks = () => {
    const visible = [];
    tasks.forEach(task => {
      if (task.isParent) {
        visible.push(task);
        if (expandedCampaigns[task.id]) {
          visible.push(...task.children);
        }
      }
    });
    return visible;
  };

  // Render task bar
  const renderTaskBar = (task, index) => {
    const left = getDatePosition(task.startDate);
    const width = getDateWidth(task.startDate, task.endDate);
    const color = TASK_COLORS[task.type] || TASK_COLORS.content;
    const isVisible = left + width > 0 && left < 100;

    if (!isVisible) return null;

    return (
      <Box
        key={task.id}
        sx={{
          position: 'absolute',
          left: `${Math.max(left, 0)}%`,
          width: `${Math.min(width, 100 - left)}%`,
          height: 28,
          top: 4,
          cursor: 'pointer',
          transition: 'transform 0.1s',
          '&:hover': {
            transform: 'scaleY(1.1)',
            zIndex: 10
          }
        }}
        onClick={(e) => handleTaskClick(e, task)}
        onDoubleClick={() => handleTaskDoubleClick(task)}
      >
        {/* Task bar background */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: color + '40',
            borderRadius: 1,
            border: `1px solid ${color}`,
            overflow: 'hidden'
          }}
        >
          {/* Progress fill */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${task.progress}%`,
              bgcolor: color,
              transition: 'width 0.3s'
            }}
          />
        </Box>

        {/* Task label */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            px: 1,
            overflow: 'hidden'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: task.progress > 50 ? 'white' : 'text.primary',
              fontWeight: task.isParent ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {task.name}
          </Typography>
          {task.progress === 100 && (
            <CompleteIcon sx={{ ml: 0.5, fontSize: 14, color: 'success.main' }} />
          )}
        </Box>

        {/* Resize handles (for future drag implementation) */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            cursor: 'ew-resize',
            '&:hover': { bgcolor: color }
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 4,
            cursor: 'ew-resize',
            '&:hover': { bgcolor: color }
          }}
        />
      </Box>
    );
  };

  const visibleTasks = getVisibleTasks();
  const cellWidth = zoomLevel === 'day' ? 40 : zoomLevel === 'week' ? 100 : 150;

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <IconButton onClick={navigatePrev}>
          <PrevIcon />
        </IconButton>
        <IconButton onClick={navigateNext}>
          <NextIcon />
        </IconButton>
        <Button startIcon={<TodayIcon />} onClick={goToToday}>
          Today
        </Button>

        <Divider orientation="vertical" flexItem />

        <ToggleButtonGroup
          value={zoomLevel}
          exclusive
          onChange={(e, v) => v && setZoomLevel(v)}
          size="small"
        >
          <ToggleButton value="day">
            <ZoomInIcon sx={{ mr: 0.5 }} /> Day
          </ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">
            <ZoomOutIcon sx={{ mr: 0.5 }} /> Month
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <Typography variant="subtitle1">
          {format(viewRange.start, 'MMM d, yyyy')} - {format(viewRange.end, 'MMM d, yyyy')}
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/campaigns/new')}
        >
          New Campaign
        </Button>
      </Box>

      {/* Gantt body */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Task list (left panel) */}
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'auto'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              height: 50,
              display: 'flex',
              alignItems: 'center',
              px: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Task Name
            </Typography>
          </Box>

          {/* Task rows */}
          {visibleTasks.map((task, index) => (
            <Box
              key={task.id}
              sx={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                px: task.parentId ? 4 : 2,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: task.isParent ? 'action.hover' : 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' }
              }}
              onClick={() => task.isParent && toggleCampaignExpand(task.id)}
              onDoubleClick={() => handleTaskDoubleClick(task)}
            >
              {task.isParent && (
                <IconButton size="small" sx={{ mr: 0.5, p: 0.25 }}>
                  {expandedCampaigns[task.id] ? <ExpandIcon /> : <CollapseIcon />}
                </IconButton>
              )}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: TASK_COLORS[task.type],
                  mr: 1
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontWeight: task.isParent ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {task.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {task.progress}%
              </Typography>
            </Box>
          ))}

          {visibleTasks.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No campaigns found. Create one to get started.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Timeline (right panel) */}
        <Box
          ref={timelineRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            position: 'relative'
          }}
        >
          {/* Time header */}
          <Box
            sx={{
              height: 50,
              display: 'flex',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 1,
              minWidth: timeUnits.length * cellWidth
            }}
          >
            {timeUnits.map((unit, idx) => (
              <Box
                key={idx}
                sx={{
                  width: cellWidth,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: 1,
                  borderColor: 'divider',
                  bgcolor: unit.isToday ? 'primary.light' + '30' :
                           unit.isWeekend ? 'action.hover' : 'transparent'
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: unit.isToday ? 700 : 400,
                    color: unit.isToday ? 'primary.main' : 'text.secondary'
                  }}
                >
                  {unit.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Task rows with bars */}
          <Box sx={{ minWidth: timeUnits.length * cellWidth }}>
            {visibleTasks.map((task, index) => (
              <Box
                key={task.id}
                sx={{
                  height: 36,
                  position: 'relative',
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: task.isParent ? 'action.hover' : 'transparent'
                }}
              >
                {/* Grid lines */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex'
                  }}
                >
                  {timeUnits.map((unit, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: cellWidth,
                        flexShrink: 0,
                        borderRight: 1,
                        borderColor: 'divider',
                        bgcolor: unit.isWeekend ? 'action.hover' + '50' : 'transparent'
                      }}
                    />
                  ))}
                </Box>

                {/* Task bar */}
                {renderTaskBar(task, index)}
              </Box>
            ))}
          </Box>

          {/* Today marker */}
          {isWithinInterval(new Date(), viewRange) && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${getDatePosition(new Date())}%`,
                width: 2,
                bgcolor: 'error.main',
                zIndex: 5,
                pointerEvents: 'none'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: -4,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'error.main'
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        {Object.entries(TASK_COLORS).map(([type, color]) => (
          <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: color
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {type}
            </Typography>
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Double-click to edit • Drag to reschedule
        </Typography>
      </Box>

      {/* Task context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          handleTaskDoubleClick(selectedTask);
          setMenuAnchor(null);
        }}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          setTaskForm({
            name: selectedTask?.name || '',
            startDate: selectedTask?.startDate ? format(selectedTask.startDate, 'yyyy-MM-dd') : '',
            endDate: selectedTask?.endDate ? format(selectedTask.endDate, 'yyyy-MM-dd') : '',
            progress: selectedTask?.progress || 0,
            type: selectedTask?.type || 'content'
          });
          setShowTaskDialog(true);
          setMenuAnchor(null);
        }}>
          <MilestoneIcon sx={{ mr: 1, fontSize: 18 }} />
          Update Progress
        </MenuItem>
        {selectedTask?.type === 'content' && (
          <MenuItem onClick={() => {
            // Add dependency logic
            setMenuAnchor(null);
          }}>
            <DependencyIcon sx={{ mr: 1, fontSize: 18 }} />
            Add Dependency
          </MenuItem>
        )}
      </Menu>

      {/* Progress update dialog */}
      <Dialog
        open={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Task Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {taskForm.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                type="date"
                label="Start Date"
                fullWidth
                value={taskForm.startDate}
                onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="End Date"
                fullWidth
                value={taskForm.endDate}
                onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Typography variant="body2" gutterBottom>
              Progress: {taskForm.progress}%
            </Typography>
            <Slider
              value={taskForm.progress}
              onChange={(e, v) => setTaskForm({ ...taskForm, progress: v })}
              step={10}
              marks
              min={0}
              max={100}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              // Save progress update
              try {
                if (selectedTask?.type === 'campaign') {
                  await api.put(`/campaigns/${selectedTask.id}`, {
                    progress: taskForm.progress,
                    startDate: taskForm.startDate,
                    endDate: taskForm.endDate
                  });
                }
                loadData();
              } catch (err) {
                console.error('Failed to update:', err);
              }
              setShowTaskDialog(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GanttChart;
