import React from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import {
  ChatBubbleOutline as ReplyIcon,
  Repeat as RetweetIcon,
  FavoriteBorder as LikeIcon,
  IosShare as ShareIcon,
  MoreHoriz as MoreIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * TwitterPreview Component
 *
 * Realistic Twitter/X post preview matching the platform's current design
 */
const TwitterPreview = ({ content, media = [], author, timestamp }) => {
  const formatTime = (date) => {
    if (!date) return 'now';
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  };

  // Parse hashtags and mentions
  const renderContent = (text) => {
    if (!text) return null;

    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{ color: '#1d9bf0', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            {part}
          </Typography>
        );
      }
      if (part.startsWith('@')) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{ color: '#1d9bf0', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
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
            sx={{ color: '#1d9bf0', cursor: 'pointer' }}
          >
            {part.length > 30 ? part.substring(0, 30) + '...' : part}
          </Typography>
        );
      }
      return part;
    });
  };

  const renderMedia = () => {
    if (!media || media.length === 0) return null;

    const imageCount = media.filter(m => m.type === 'image').length;

    return (
      <Box
        sx={{
          mt: 1.5,
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #2f3336'
        }}
      >
        {imageCount === 1 && (
          <Box sx={{ height: 280 }}>
            <img
              src={media[0].url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}
        {imageCount === 2 && (
          <Box sx={{ display: 'flex', height: 280, gap: '2px' }}>
            {media.slice(0, 2).map((m, i) => (
              <Box key={i} sx={{ flex: 1 }}>
                <img
                  src={m.url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ))}
          </Box>
        )}
        {imageCount === 3 && (
          <Box sx={{ display: 'flex', height: 280, gap: '2px' }}>
            <Box sx={{ flex: 1 }}>
              <img
                src={media[0].url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px' }}>
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
        {imageCount >= 4 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 280, gap: '2px' }}>
            {media.slice(0, 4).map((m, i) => (
              <Box key={i} sx={{ position: 'relative' }}>
                <img
                  src={m.url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {i === 3 && imageCount > 4 && (
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
                    <Typography variant="h5" color="white">
                      +{imageCount - 4}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        bgcolor: '#000000',
        color: '#e7e9ea',
        p: 2,
        borderRadius: 2,
        border: '1px solid #2f3336',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Avatar
          src={author?.avatar}
          sx={{ width: 40, height: 40, bgcolor: '#1d9bf0' }}
        >
          {author?.name?.[0] || 'U'}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Author info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: '#e7e9ea' }}
            >
              {author?.name || 'User'}
            </Typography>
            <VerifiedIcon sx={{ fontSize: 16, color: '#1d9bf0' }} />
            <Typography
              variant="body2"
              sx={{ color: '#71767b', ml: 0.5 }}
            >
              {author?.handle || '@user'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#71767b' }}>
              · {formatTime(timestamp)}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" sx={{ color: '#71767b' }}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Content */}
          <Typography
            variant="body1"
            sx={{
              mt: 0.5,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {renderContent(content)}
          </Typography>

          {/* Media */}
          {renderMedia()}

          {/* Engagement */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 2,
              maxWidth: 400
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#71767b' }}>
              <IconButton size="small" sx={{ color: 'inherit', '&:hover': { color: '#1d9bf0', bgcolor: 'rgba(29, 155, 240, 0.1)' } }}>
                <ReplyIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">12</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#71767b' }}>
              <IconButton size="small" sx={{ color: 'inherit', '&:hover': { color: '#00ba7c', bgcolor: 'rgba(0, 186, 124, 0.1)' } }}>
                <RetweetIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">34</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#71767b' }}>
              <IconButton size="small" sx={{ color: 'inherit', '&:hover': { color: '#f91880', bgcolor: 'rgba(249, 24, 128, 0.1)' } }}>
                <LikeIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">128</Typography>
            </Box>
            <IconButton size="small" sx={{ color: '#71767b', '&:hover': { color: '#1d9bf0', bgcolor: 'rgba(29, 155, 240, 0.1)' } }}>
              <ShareIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TwitterPreview;
