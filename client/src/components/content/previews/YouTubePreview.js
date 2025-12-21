import React from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import {
  ThumbUpOffAlt as LikeIcon,
  ThumbDownOffAlt as DislikeIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  MoreHoriz as MoreIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * YouTubePreview Component
 *
 * Realistic YouTube video preview matching current platform design
 * Supports regular videos and Shorts
 */
const YouTubePreview = ({ content, media = [], author, timestamp, isShort = false }) => {
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K views`;
    return `${views} views`;
  };

  const formatTime = (date) => {
    if (!date) return 'Just now';
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const thumbnail = media.find(m => m.type === 'image')?.url;
  const video = media.find(m => m.type === 'video');

  if (isShort) {
    return (
      <Box
        sx={{
          width: 270,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#0f0f0f',
          fontFamily: 'Roboto, Arial, sans-serif'
        }}
      >
        {/* Short thumbnail */}
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '9/16',
            bgcolor: '#272727',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <PlayIcon sx={{ fontSize: 48, color: '#fff' }} />
          )}

          {/* Play overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PlayIcon sx={{ fontSize: 40, color: '#fff' }} />
            </Box>
          </Box>

          {/* Shorts badge */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: '#ff0000',
              color: '#fff',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: 12,
              fontWeight: 500
            }}
          >
            SHORTS
          </Box>
        </Box>

        {/* Title */}
        <Box sx={{ p: 1.5 }}>
          <Typography
            sx={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {content || 'Short video title'}
          </Typography>
          <Typography sx={{ color: '#aaa', fontSize: 12, mt: 0.5 }}>
            56K views
          </Typography>
        </Box>
      </Box>
    );
  }

  // Regular video preview
  return (
    <Box
      sx={{
        bgcolor: '#0f0f0f',
        color: '#fff',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 640,
        fontFamily: 'Roboto, Arial, sans-serif'
      }}
    >
      {/* Video player area */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '16/9',
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Typography sx={{ color: '#aaa' }}>No thumbnail</Typography>
        )}

        {/* Play button overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.4)',
            cursor: 'pointer'
          }}
        >
          <Box
            sx={{
              width: 68,
              height: 48,
              borderRadius: 2,
              bgcolor: 'rgba(255, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': { bgcolor: '#ff0000' }
            }}
          >
            <PlayIcon sx={{ fontSize: 36, color: '#fff', ml: 0.5 }} />
          </Box>
        </Box>

        {/* Duration badge */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            bgcolor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: 12,
            fontWeight: 500
          }}
        >
          12:34
        </Box>
      </Box>

      {/* Video info */}
      <Box sx={{ p: 1.5 }}>
        {/* Title */}
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.4,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {content || 'Video title goes here'}
        </Typography>

        {/* Channel and metadata */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Avatar
            src={author?.avatar}
            sx={{ width: 36, height: 36, bgcolor: '#ff0000' }}
          >
            {author?.name?.[0] || 'C'}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 14, color: '#aaa' }}>
                {author?.name || 'Channel Name'}
              </Typography>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: '#aaa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10
                }}
              >
                ✓
              </Box>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#aaa' }}>
              {formatViews(45600)} • {formatTime(timestamp)}
            </Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'flex',
              bgcolor: '#272727',
              borderRadius: 5,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 2,
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: '#3f3f3f' }
              }}
            >
              <LikeIcon sx={{ fontSize: 20 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>4.5K</Typography>
            </Box>
            <Box sx={{ width: 1, bgcolor: '#3f3f3f' }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: '#3f3f3f' }
              }}
            >
              <DislikeIcon sx={{ fontSize: 20 }} />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: '#272727',
              borderRadius: 5,
              px: 2,
              py: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#3f3f3f' }
            }}
          >
            <ShareIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Share</Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: '#272727',
              borderRadius: 5,
              px: 2,
              py: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#3f3f3f' }
            }}
          >
            <DownloadIcon sx={{ fontSize: 20 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Download</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default YouTubePreview;
