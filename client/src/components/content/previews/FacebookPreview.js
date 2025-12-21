import React from 'react';
import { Box, Typography, Avatar, IconButton, Button } from '@mui/material';
import {
  ThumbUp as LikeIcon,
  ChatBubble as CommentIcon,
  Share as ShareIcon,
  MoreHoriz as MoreIcon,
  Public as PublicIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * FacebookPreview Component
 *
 * Realistic Facebook post preview matching the platform's current design
 */
const FacebookPreview = ({ content, media = [], author, timestamp }) => {
  const formatTime = (date) => {
    if (!date) return 'Just now';
    const distance = formatDistanceToNow(new Date(date), { addSuffix: false });
    // Shorten format like Facebook does
    return distance
      .replace('about ', '')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd');
  };

  // Parse hashtags and URLs
  const renderContent = (text) => {
    if (!text) return null;

    const maxLength = 300;
    const displayText = text.length > maxLength ? text.substring(0, maxLength) : text;
    const truncated = text.length > maxLength;

    const parts = displayText.split(/(\s+)/);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Typography
                key={index}
                component="span"
                sx={{ color: '#216fdb', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                {part}
              </Typography>
            );
          }
          if (part.match(/https?:\/\/\S+/)) {
            return (
              <Typography
                key={index}
                component="span"
                sx={{ color: '#216fdb', cursor: 'pointer' }}
              >
                {part.length > 40 ? part.substring(0, 40) + '...' : part}
              </Typography>
            );
          }
          return part;
        })}
        {truncated && (
          <Typography
            component="span"
            sx={{ color: '#65676b', cursor: 'pointer', fontWeight: 600 }}
          >
            ... See more
          </Typography>
        )}
      </>
    );
  };

  return (
    <Box
      sx={{
        bgcolor: '#242526',
        color: '#e4e6eb',
        borderRadius: 2,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Avatar
          src={author?.avatar}
          sx={{ width: 40, height: 40, bgcolor: '#1877f2' }}
        >
          {author?.name?.[0] || 'U'}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 15 }}>
            {author?.name || 'User Name'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#b0b3b8', fontSize: 13 }}>
              {formatTime(timestamp)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#b0b3b8' }}>·</Typography>
            <PublicIcon sx={{ fontSize: 12, color: '#b0b3b8' }} />
          </Box>
        </Box>

        <IconButton size="small" sx={{ color: '#b0b3b8' }}>
          <MoreIcon />
        </IconButton>
        <IconButton size="small" sx={{ color: '#b0b3b8' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Typography
          variant="body1"
          sx={{
            fontSize: 15,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap'
          }}
        >
          {renderContent(content)}
        </Typography>
      </Box>

      {/* Media */}
      {media.length > 0 && (
        <Box>
          {media.length === 1 && (
            <img
              src={media[0].url}
              alt=""
              style={{ width: '100%', maxHeight: 500, objectFit: 'cover' }}
            />
          )}
          {media.length === 2 && (
            <Box sx={{ display: 'flex', gap: '2px' }}>
              {media.map((m, i) => (
                <Box key={i} sx={{ flex: 1, height: 250 }}>
                  <img
                    src={m.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
            </Box>
          )}
          {media.length === 3 && (
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Box sx={{ flex: 2, height: 350 }}>
                <img
                  src={media[0].url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {media.slice(1, 3).map((m, i) => (
                  <Box key={i} sx={{ flex: 1 }}>
                    <img
                      src={m.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          {media.length >= 4 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {media.slice(0, 4).map((m, i) => (
                <Box key={i} sx={{ height: 175, position: 'relative' }}>
                  <img
                    src={m.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {i === 3 && media.length > 4 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="h4" sx={{ color: 'white', fontWeight: 300 }}>
                        +{media.length - 4}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Engagement counts */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: '1px solid #3e4042'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ display: 'flex' }}>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #242526', zIndex: 2 }}>
              <LikeIcon sx={{ fontSize: 10, color: 'white' }} />
            </Box>
            <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#f33e58', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #242526', ml: -0.5, zIndex: 1 }}>
              <Typography sx={{ fontSize: 10 }}>❤️</Typography>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: '#b0b3b8', fontSize: 15 }}>
            127
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#b0b3b8', fontSize: 15, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            23 comments
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b3b8', fontSize: 15, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            5 shares
          </Typography>
        </Box>
      </Box>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          px: 1,
          py: 0.5
        }}
      >
        {[
          { icon: LikeIcon, label: 'Like' },
          { icon: CommentIcon, label: 'Comment' },
          { icon: ShareIcon, label: 'Share' }
        ].map(({ icon: Icon, label }) => (
          <Button
            key={label}
            startIcon={<Icon sx={{ fontSize: 18 }} />}
            sx={{
              color: '#b0b3b8',
              textTransform: 'none',
              fontSize: 15,
              fontWeight: 600,
              py: 0.75,
              flex: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: '#3a3b3c' }
            }}
          >
            {label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default FacebookPreview;
