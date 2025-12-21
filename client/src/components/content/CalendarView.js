import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Avatar,
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
  Tooltip,
  Badge,
  Skeleton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Add as AddIcon,
  CalendarMonth as MonthIcon,
  ViewWeek as WeekIcon,
  ViewDay as DayIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  Facebook as FacebookIcon,
  CheckCircle as PublishedIcon,
  AccessTime as PendingIcon
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  setHours,
  setMinutes,
  getHours,
  getMinutes
} from 'date-fns';
import api from '../../services/api';

/**
 * CalendarView Component
 *
 * Full-featured content calendar with:
 * - Month/Week/Day views
 * - Drag to schedule/reschedule
 * - Time slots for optimal posting
 * - Platform-specific color coding
 * - Quick content creation from calendar
 * - Queue management integration
 */

const PLATFORM_COLORS = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  tiktok: '#000000',
  youtube: '#FF0000'
};

const PLATFORM_ICONS = {
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon
};

const TIME_SLOTS = [
  { hour: 8, label: '8:00 AM' },
  { hour: 9, label: '9:00 AM' },
  { hour: 10, label: '10:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 13, label: '1:00 PM' },
  { hour: 14, label: '2:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 16, label: '4:00 PM' },
  { hour: 17, label: '5:00 PM' },
  { hour: 18, label: '6:00 PM' },
  { hour: 19, label: '7:00 PM' },
  { hour: 20, label: '8:00 PM' }
];

const CalendarView = ({ workspaceId, campaignId = null, onContentSelect }) => {
  const navigate = useNavigate();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '09:00',
    platforms: []
  });

  // Load scheduled content
  useEffect(() => {
    loadContent();
  }, [workspaceId, campaignId, currentDate, viewMode]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Get date range based on view
      let start, end;
      if (viewMode === 'month') {
        start = startOfWeek(startOfMonth(currentDate));
        end = endOfWeek(endOfMonth(currentDate));
      } else if (viewMode === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = currentDate;
        end = currentDate;
      }

      const response = await api.get('/content', {
        params: {
          scheduledFrom: start.toISOString(),
          scheduledTo: end.toISOString(),
          status: ['scheduled', 'published', 'failed'],
          campaignId
        }
      });

      setContent(response.data.content || response.data || []);
    } catch (err) {
      console.error('Failed to load calendar content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get content for a specific date
  const getContentForDate = (date) => {
    return content.filter(item => {
      if (!item.scheduledFor) return false;
      return isSameDay(parseISO(item.scheduledFor), date);
    });
  };

  // Get content for a specific hour on a date
  const getContentForHour = (date, hour) => {
    return content.filter(item => {
      if (!item.scheduledFor) return false;
      const itemDate = parseISO(item.scheduledFor);
      return isSameDay(itemDate, date) && getHours(itemDate) === hour;
    });
  };

  // Navigation
  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle content click
  const handleContentClick = (event, item) => {
    event.stopPropagation();
    setSelectedContent(item);
    setMenuAnchor(event.currentTarget);
  };

  // Handle date click for new content
  const handleDateClick = (date, hour = 9) => {
    setSelectedDate(date);
    setScheduleForm({
      date: format(date, 'yyyy-MM-dd'),
      time: `${hour.toString().padStart(2, '0')}:00`,
      platforms: []
    });
    setShowScheduleDialog(true);
  };

  // Schedule new content
  const handleScheduleContent = async () => {
    const scheduledFor = new Date(`${scheduleForm.date}T${scheduleForm.time}`);

    try {
      const response = await api.post('/content', {
        title: scheduleForm.title || 'New Content',
        scheduledFor,
        platforms: scheduleForm.platforms,
        status: 'scheduled'
      });

      setContent(prev => [...prev, response.data.content]);
      setShowScheduleDialog(false);

      // Navigate to edit
      navigate(`/content/${response.data.content._id}/edit`);
    } catch (err) {
      console.error('Failed to schedule content:', err);
    }
  };

  // Reschedule content
  const handleReschedule = async (contentId, newDate) => {
    try {
      await api.put(`/content/${contentId}`, { scheduledFor: newDate });
      loadContent();
    } catch (err) {
      console.error('Failed to reschedule:', err);
    }
  };

  // Render content chip
  const renderContentChip = (item, compact = false) => {
    const primaryPlatform = item.platforms?.[0];
    const color = primaryPlatform ? PLATFORM_COLORS[primaryPlatform] : '#9e9e9e';
    const Icon = primaryPlatform ? PLATFORM_ICONS[primaryPlatform] : ScheduleIcon;
    const time = item.scheduledFor ? format(parseISO(item.scheduledFor), 'h:mm a') : '';

    if (compact) {
      return (
        <Tooltip
          key={item._id}
          title={
            <Box>
              <Typography variant="body2">{item.title || 'Untitled'}</Typography>
              <Typography variant="caption">{time}</Typography>
            </Box>
          }
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: color,
              cursor: 'pointer'
            }}
            onClick={(e) => handleContentClick(e, item)}
          />
        </Tooltip>
      );
    }

    return (
      <Chip
        key={item._id}
        size="small"
        icon={Icon ? <Icon sx={{ fontSize: 14 }} /> : null}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" noWrap sx={{ maxWidth: 100 }}>
              {item.title || 'Untitled'}
            </Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
              {time}
            </Typography>
          </Box>
        }
        onClick={(e) => handleContentClick(e, item)}
        sx={{
          bgcolor: color,
          color: 'white',
          mb: 0.5,
          maxWidth: '100%',
          '& .MuiChip-icon': { color: 'white' },
          '&:hover': { filter: 'brightness(1.1)' }
        }}
      />
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Day headers */}
        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Box
              key={day}
              sx={{
                flex: 1,
                p: 1,
                textAlign: 'center',
                fontWeight: 600,
                color: 'text.secondary'
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {weeks.map((week, weekIdx) => (
            <Box
              key={weekIdx}
              sx={{
                flex: 1,
                display: 'flex',
                borderBottom: weekIdx < weeks.length - 1 ? 1 : 0,
                borderColor: 'divider',
                minHeight: 100
              }}
            >
              {week.map((day, dayIdx) => {
                const dayContent = getContentForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <Box
                    key={dayIdx}
                    sx={{
                      flex: 1,
                      p: 0.5,
                      borderRight: dayIdx < 6 ? 1 : 0,
                      borderColor: 'divider',
                      bgcolor: isCurrentDay ? 'primary.light' + '20' : 'transparent',
                      opacity: isCurrentMonth ? 1 : 0.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      overflow: 'hidden'
                    }}
                    onClick={() => handleDateClick(day)}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrentDay ? 700 : 400,
                        color: isCurrentDay ? 'primary.main' : 'text.primary',
                        mb: 0.5
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {dayContent.slice(0, 3).map(item => renderContentChip(item))}
                      {dayContent.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{dayContent.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const days = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate)
    });

    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Day headers */}
        <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ width: 60 }} /> {/* Time column spacer */}
          {days.map((day, idx) => (
            <Box
              key={idx}
              sx={{
                flex: 1,
                p: 1,
                textAlign: 'center',
                borderLeft: 1,
                borderColor: 'divider',
                bgcolor: isToday(day) ? 'primary.light' + '20' : 'transparent'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {format(day, 'EEE')}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: isToday(day) ? 700 : 400,
                  color: isToday(day) ? 'primary.main' : 'text.primary'
                }}
              >
                {format(day, 'd')}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Time slots */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {TIME_SLOTS.map(slot => (
            <Box
              key={slot.hour}
              sx={{
                display: 'flex',
                borderBottom: 1,
                borderColor: 'divider',
                minHeight: 60
              }}
            >
              <Box
                sx={{
                  width: 60,
                  p: 0.5,
                  textAlign: 'right',
                  pr: 1,
                  color: 'text.secondary',
                  fontSize: 12
                }}
              >
                {slot.label}
              </Box>
              {days.map((day, idx) => {
                const hourContent = getContentForHour(day, slot.hour);

                return (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      p: 0.5,
                      borderLeft: 1,
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleDateClick(day, slot.hour)}
                  >
                    {hourContent.map(item => renderContentChip(item))}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Render day view
  const renderDayView = () => {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Day header */}
        <Box
          sx={{
            p: 2,
            textAlign: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: isToday(currentDate) ? 'primary.light' + '20' : 'transparent'
          }}
        >
          <Typography variant="h5" fontWeight={isToday(currentDate) ? 700 : 400}>
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>

        {/* Time slots */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {TIME_SLOTS.map(slot => {
            const hourContent = getContentForHour(currentDate, slot.hour);

            return (
              <Box
                key={slot.hour}
                sx={{
                  display: 'flex',
                  borderBottom: 1,
                  borderColor: 'divider',
                  minHeight: 80
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    p: 1,
                    textAlign: 'right',
                    pr: 2,
                    color: 'text.secondary'
                  }}
                >
                  {slot.label}
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    p: 1,
                    borderLeft: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleDateClick(currentDate, slot.hour)}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {hourContent.map(item => (
                      <Card
                        key={item._id}
                        sx={{
                          maxWidth: 300,
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 4 }
                        }}
                        onClick={(e) => handleContentClick(e, item)}
                      >
                        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {item.platforms?.map(p => {
                              const Icon = PLATFORM_ICONS[p];
                              return Icon ? (
                                <Icon key={p} sx={{ fontSize: 16, color: PLATFORM_COLORS[p] }} />
                              ) : null;
                            })}
                            <Typography variant="caption" color="text.secondary">
                              {format(parseISO(item.scheduledFor), 'h:mm a')}
                            </Typography>
                            {item.status === 'published' && (
                              <PublishedIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            )}
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {item.title || 'Untitled'}
                          </Typography>
                          {item.body && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {item.body}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={500} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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

        <Typography variant="h6" sx={{ flex: 1 }}>
          {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
          {viewMode === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
          {viewMode === 'day' && format(currentDate, 'MMMM d, yyyy')}
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, v) => v && setViewMode(v)}
          size="small"
        >
          <ToggleButton value="month">
            <MonthIcon sx={{ mr: 0.5 }} /> Month
          </ToggleButton>
          <ToggleButton value="week">
            <WeekIcon sx={{ mr: 0.5 }} /> Week
          </ToggleButton>
          <ToggleButton value="day">
            <DayIcon sx={{ mr: 0.5 }} /> Day
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleDateClick(new Date())}
        >
          Schedule
        </Button>
      </Box>

      {/* Calendar body */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Content menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          navigate(`/content/${selectedContent?._id}/edit`);
          setMenuAnchor(null);
        }}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (onContentSelect) {
            onContentSelect(selectedContent);
          }
          setMenuAnchor(null);
        }}>
          <ScheduleIcon sx={{ mr: 1, fontSize: 18 }} />
          Reschedule
        </MenuItem>
        <Divider />
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={async () => {
            try {
              await api.delete(`/content/${selectedContent?._id}`);
              setContent(prev => prev.filter(c => c._id !== selectedContent._id));
            } catch (err) {
              console.error('Failed to delete:', err);
            }
            setMenuAnchor(null);
          }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 18 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Schedule dialog */}
      <Dialog
        open={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule New Content</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={scheduleForm.title || ''}
              onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="date"
                label="Date"
                fullWidth
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="time"
                label="Time"
                fullWidth
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Platforms</InputLabel>
              <Select
                multiple
                value={scheduleForm.platforms}
                onChange={(e) => setScheduleForm({ ...scheduleForm, platforms: e.target.value })}
                label="Platforms"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {selected.map(p => (
                      <Chip key={p} label={p} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="twitter">Twitter</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleScheduleContent}>
            Create & Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarView;
