import React from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import {
  Favorite as HeartIcon,
  ChatBubble as CommentIcon,
  Bookmark as SaveIcon,
  Share as ShareIcon,
  MusicNote as MusicIcon,
  Add as AddIcon
} from '@mui/icons-material';

/**
 * TikTokPreview Component
 *
 * Realistic TikTok video post preview
 */
const TikTokPreview = ({ content, media = [], author, timestamp }) => {
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  // Parse hashtags
  const renderContent = (text) => {
    if (!text) return null;

    // Limit caption length like TikTok
    const maxLength = 100;
    const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    const parts = displayText.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{ fontWeight: 600, cursor: 'pointer' }}
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
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          >
            {part}
          </Typography>
        );
      }
      return part;
    });
  };

  return (
    <Box
      sx={{
        bgcolor: '#000000',
        color: '#ffffff',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        height: 550,
        fontFamily: 'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      {/* Video placeholder */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: '#161823',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {media.length > 0 && media[0].type === 'video' ? (
          <video
            src={media[0].url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
            loop
          />
        ) : media.length > 0 ? (
          <img
            src={media[0].url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <MusicIcon sx={{ fontSize: 60, color: '#ffffff33', mb: 2 }} />
            <Typography color="text.secondary">
              Add a video
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right sidebar actions */}
      <Box
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}
      >
        {/* Profile */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar
            src={author?.avatar}
            sx={{
              width: 48,
              height: 48,
              border: '2px solid white'
            }}
          >
            {author?.name?.[0] || 'U'}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: '#fe2c55',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AddIcon sx={{ fontSize: 14, color: 'white' }} />
          </Box>
        </Box>

        {/* Like */}
        <Box sx={{ textAlign: 'center' }}>
          <IconButton sx={{ color: 'white', p: 0.5 }}>
            <HeartIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {formatNumber(128400)}
          </Typography>
        </Box>

        {/* Comment */}
        <Box sx={{ textAlign: 'center' }}>
          <IconButton sx={{ color: 'white', p: 0.5 }}>
            <CommentIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {formatNumber(2341)}
          </Typography>
        </Box>

        {/* Save */}
        <Box sx={{ textAlign: 'center' }}>
          <IconButton sx={{ color: 'white', p: 0.5 }}>
            <SaveIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {formatNumber(15600)}
          </Typography>
        </Box>

        {/* Share */}
        <Box sx={{ textAlign: 'center' }}>
          <IconButton sx={{ color: 'white', p: 0.5 }}>
            <ShareIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {formatNumber(892)}
          </Typography>
        </Box>

        {/* Music disc */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: '#333',
            border: '8px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'spin 3s linear infinite',
            '@keyframes spin': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' }
            }
          }}
        >
          <MusicIcon sx={{ fontSize: 14 }} />
        </Box>
      </Box>

      {/* Bottom content */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 60,
          bottom: 0,
          p: 2,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
        }}
      >
        {/* Username */}
        <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 0.5 }}>
          @{author?.handle?.replace('@', '') || 'username'}
        </Typography>

        {/* Caption */}
        <Typography sx={{ fontSize: 14, lineHeight: 1.3, mb: 1 }}>
          {renderContent(content)}
        </Typography>

        {/* Music */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MusicIcon sx={{ fontSize: 14 }} />
          <Typography
            sx={{
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Original Sound - {author?.name || 'username'}
          </Typography>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: 'rgba(255,255,255,0.3)'
        }}
      >
        <Box
          sx={{
            width: '30%',
            height: '100%',
            bgcolor: 'white'
          }}
        />
      </Box>
    </Box>
  );
};

export default TikTokPreview;
