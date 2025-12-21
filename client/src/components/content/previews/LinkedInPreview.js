import React from 'react';
import { Box, Typography, Avatar, IconButton, Button } from '@mui/material';
import {
  ThumbUpOutlined as LikeIcon,
  ChatBubbleOutline as CommentIcon,
  Repeat as RepostIcon,
  Send as SendIcon,
  MoreHoriz as MoreIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * LinkedInPreview Component
 *
 * Realistic LinkedIn post preview matching the platform's professional design
 */
const LinkedInPreview = ({ content, media = [], author, timestamp }) => {
  const formatTime = (date) => {
    if (!date) return 'Just now';
    return formatDistanceToNow(new Date(date), { addSuffix: false }) + ' ago';
  };

  // Parse hashtags and mentions
  const renderContent = (text) => {
    if (!text) return null;

    // Split into lines for "see more" logic
    const lines = text.split('\n');
    const displayLines = lines.slice(0, 3);
    const hasMore = lines.length > 3 || text.length > 250;
    const displayText = hasMore ? displayLines.join('\n').substring(0, 250) : text;

    const parts = displayText.split(/(\s+)/);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Typography
                key={index}
                component="span"
                sx={{ color: '#0a66c2', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
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
                sx={{ color: '#0a66c2', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
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
                sx={{ color: '#0a66c2', cursor: 'pointer' }}
              >
                {part}
              </Typography>
            );
          }
          return part;
        })}
        {hasMore && (
          <Typography
            component="span"
            sx={{ color: '#666666', cursor: 'pointer', '&:hover': { color: '#0a66c2' } }}
          >
            ...see more
          </Typography>
        )}
      </>
    );
  };

  return (
    <Box
      sx={{
        bgcolor: '#ffffff',
        color: '#000000',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Avatar
            src={author?.avatar}
            sx={{ width: 48, height: 48, bgcolor: '#0a66c2' }}
          >
            {author?.name?.[0] || 'U'}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#000000e6', fontSize: 14 }}>
              {author?.name || 'User Name'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#00000099', display: 'block', lineHeight: 1.3 }}>
              Marketing Manager at Company • 500+ connections
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: '#00000099' }}>
                {formatTime(timestamp)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#00000099' }}>•</Typography>
              <PublicIcon sx={{ fontSize: 12, color: '#00000099' }} />
            </Box>
          </Box>

          <IconButton size="small" sx={{ color: '#00000099', alignSelf: 'flex-start' }}>
            <MoreIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: 14,
            lineHeight: 1.5,
            color: '#000000e6',
            whiteSpace: 'pre-wrap'
          }}
        >
          {renderContent(content)}
        </Typography>
      </Box>

      {/* Media */}
      {media.length > 0 && (
        <Box sx={{ bgcolor: '#f3f2ef' }}>
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
          {media.length >= 3 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {media.slice(0, 4).map((m, i) => (
                <Box key={i} sx={{ height: 150, position: 'relative' }}>
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
                        bgcolor: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="h5" color="white">
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

      {/* Reactions bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ display: 'flex' }}>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid white', zIndex: 3 }}>
              <Typography sx={{ fontSize: 10, color: 'white' }}>👍</Typography>
            </Box>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#df704d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid white', ml: -0.5, zIndex: 2 }}>
              <Typography sx={{ fontSize: 10 }}>❤️</Typography>
            </Box>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#7fc15e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid white', ml: -0.5, zIndex: 1 }}>
              <Typography sx={{ fontSize: 10 }}>👏</Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#00000099', ml: 0.5 }}>
            234
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#00000099' }}>
          45 comments • 12 reposts
        </Typography>
      </Box>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          py: 0.5,
          px: 1
        }}
      >
        {[
          { icon: LikeIcon, label: 'Like' },
          { icon: CommentIcon, label: 'Comment' },
          { icon: RepostIcon, label: 'Repost' },
          { icon: SendIcon, label: 'Send' }
        ].map(({ icon: Icon, label }) => (
          <Button
            key={label}
            startIcon={<Icon sx={{ fontSize: 20 }} />}
            sx={{
              color: '#00000099',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              py: 1.5,
              px: 2,
              flex: 1,
              '&:hover': { bgcolor: '#0000000a' }
            }}
          >
            {label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default LinkedInPreview;
