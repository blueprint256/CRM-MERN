import React, { useState } from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import {
  FavoriteBorder as LikeIcon,
  Favorite as LikedIcon,
  ChatBubbleOutline as CommentIcon,
  Send as ShareIcon,
  BookmarkBorder as SaveIcon,
  MoreHoriz as MoreIcon,
  Circle as DotIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

/**
 * InstagramPreview Component
 *
 * Realistic Instagram post preview with carousel support
 */
const InstagramPreview = ({ content, media = [], author, timestamp }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liked, setLiked] = useState(false);

  const formatTime = (date) => {
    if (!date) return 'now';
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  };

  // Parse hashtags
  const renderContent = (text) => {
    if (!text) return null;

    // Truncate long captions
    const maxLength = 125;
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
                sx={{ color: '#e0f1ff', cursor: 'pointer' }}
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
                sx={{ color: '#e0f1ff', cursor: 'pointer' }}
              >
                {part}
              </Typography>
            );
          }
          return part;
        })}
        {truncated && (
          <Typography
            component="span"
            sx={{ color: '#a8a8a8', cursor: 'pointer' }}
          >
            ... more
          </Typography>
        )}
      </>
    );
  };

  const nextSlide = () => {
    if (currentSlide < media.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#000000',
        color: '#ffffff',
        borderRadius: 2,
        border: '1px solid #262626',
        overflow: 'hidden',
        maxWidth: 468,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          gap: 1.5
        }}
      >
        <Box
          sx={{
            p: '2px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'
          }}
        >
          <Avatar
            src={author?.avatar}
            sx={{ width: 32, height: 32, border: '2px solid #000' }}
          >
            {author?.name?.[0] || 'U'}
          </Avatar>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
            {author?.handle?.replace('@', '') || 'username'}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: '#ffffff' }}>
          <MoreIcon />
        </IconButton>
      </Box>

      {/* Image/Carousel */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: '#262626',
          aspectRatio: '1/1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {media.length > 0 ? (
          <>
            <img
              src={media[currentSlide]?.url}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Carousel navigation */}
            {media.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <IconButton
                    onClick={prevSlide}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: 'white' },
                      width: 26,
                      height: 26
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>‹</Typography>
                  </IconButton>
                )}
                {currentSlide < media.length - 1 && (
                  <IconButton
                    onClick={nextSlide}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      '&:hover': { bgcolor: 'white' },
                      width: 26,
                      height: 26
                    }}
                  >
                    <Typography sx={{ fontSize: 12 }}>›</Typography>
                  </IconButton>
                )}

                {/* Dots indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 0.5
                  }}
                >
                  {media.map((_, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: idx === currentSlide ? '#0095f6' : 'rgba(255,255,255,0.4)'
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              Add an image or video
            </Typography>
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton
            size="small"
            onClick={() => setLiked(!liked)}
            sx={{
              color: liked ? '#ed4956' : '#ffffff',
              p: 1,
              '&:hover': { color: liked ? '#ed4956' : '#a8a8a8' }
            }}
          >
            {liked ? <LikedIcon /> : <LikeIcon />}
          </IconButton>
          <IconButton size="small" sx={{ color: '#ffffff', p: 1 }}>
            <CommentIcon />
          </IconButton>
          <IconButton size="small" sx={{ color: '#ffffff', p: 1 }}>
            <ShareIcon sx={{ transform: 'rotate(-30deg)' }} />
          </IconButton>
          <Box sx={{ flex: 1 }} />

          {/* Carousel indicators in action bar */}
          {media.length > 1 && (
            <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
              {media.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: idx === currentSlide ? '#0095f6' : '#a8a8a8'
                  }}
                />
              ))}
            </Box>
          )}

          <IconButton size="small" sx={{ color: '#ffffff', p: 1 }}>
            <SaveIcon />
          </IconButton>
        </Box>

        {/* Likes */}
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>
          1,234 likes
        </Typography>

        {/* Caption */}
        <Typography variant="body2" sx={{ fontSize: 14, lineHeight: 1.4 }}>
          <Typography component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
            {author?.handle?.replace('@', '') || 'username'}
          </Typography>
          {renderContent(content)}
        </Typography>

        {/* Comments */}
        <Typography
          variant="body2"
          sx={{ color: '#a8a8a8', fontSize: 14, mt: 0.5, cursor: 'pointer' }}
        >
          View all 42 comments
        </Typography>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{ color: '#a8a8a8', fontSize: 10, textTransform: 'uppercase', mt: 0.5, display: 'block' }}
        >
          {formatTime(timestamp)} ago
        </Typography>
      </Box>
    </Box>
  );
};

export default InstagramPreview;
