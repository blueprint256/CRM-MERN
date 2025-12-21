import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  Done as SingleCheckIcon,
  DoneAll as DoubleCheckIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

/**
 * WhatsAppPreview Component
 *
 * Realistic WhatsApp message preview for broadcast/status content
 */
const WhatsAppPreview = ({ content, media = [], author, timestamp }) => {
  const formatTime = (date) => {
    if (!date) return format(new Date(), 'HH:mm');
    return format(new Date(date), 'HH:mm');
  };

  // Parse URLs and emojis
  const renderContent = (text) => {
    if (!text) return null;

    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.match(/https?:\/\/\S+/)) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{ color: '#53bdeb', textDecoration: 'underline', cursor: 'pointer' }}
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
        // WhatsApp chat background pattern
        bgcolor: '#0b141a',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        p: 2,
        borderRadius: 2,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* Chat header (simplified) */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: '#202c33',
          p: 1.5,
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: '#00a884',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600 }}>
            {author?.name?.[0] || 'B'}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: '#e9edef', fontSize: 16, fontWeight: 500 }}>
            {author?.name || 'Business Name'}
          </Typography>
          <Typography sx={{ color: '#8696a0', fontSize: 13 }}>
            Broadcast List
          </Typography>
        </Box>
      </Box>

      {/* Message bubble */}
      <Box
        sx={{
          maxWidth: '85%',
          alignSelf: 'flex-end',
          mt: 6
        }}
      >
        <Box
          sx={{
            bgcolor: '#005c4b',
            borderRadius: '7.5px',
            borderTopRightRadius: 0,
            p: 1,
            position: 'relative',
            // Tail
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: -8,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '0 0 8px 8px',
              borderColor: 'transparent transparent transparent #005c4b'
            }
          }}
        >
          {/* Media */}
          {media.length > 0 && (
            <Box
              sx={{
                mb: 1,
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <img
                src={media[0].url}
                alt=""
                style={{
                  width: '100%',
                  maxWidth: 300,
                  borderRadius: 6
                }}
              />
            </Box>
          )}

          {/* Text content */}
          <Typography
            sx={{
              color: '#e9edef',
              fontSize: 14.2,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              pr: 5
            }}
          >
            {renderContent(content)}
          </Typography>

          {/* Timestamp and read status */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.25,
              mt: 0.25,
              position: 'relative',
              bottom: -2,
              right: -2
            }}
          >
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11
              }}
            >
              {formatTime(timestamp)}
            </Typography>
            <DoubleCheckIcon sx={{ fontSize: 16, color: '#53bdeb' }} />
          </Box>
        </Box>
      </Box>

      {/* Input area preview */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: '#2a3942',
          borderRadius: 3,
          p: 1,
          px: 1.5
        }}
      >
        <Typography sx={{ color: '#8696a0', fontSize: 15, flex: 1 }}>
          Type a message
        </Typography>
      </Box>
    </Box>
  );
};

export default WhatsAppPreview;
