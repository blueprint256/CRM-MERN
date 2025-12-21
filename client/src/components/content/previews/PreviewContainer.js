import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material';
import {
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';
import { SiTiktok, SiThreads } from 'react-icons/si';

import TwitterPreview from './TwitterPreview';
import InstagramPreview from './InstagramPreview';
import FacebookPreview from './FacebookPreview';
import LinkedInPreview from './LinkedInPreview';
import WhatsAppPreview from './WhatsAppPreview';
import TikTokPreview from './TikTokPreview';
import YouTubePreview from './YouTubePreview';

/**
 * PreviewContainer Component
 *
 * Unified container for all platform previews.
 * Handles platform switching and provides consistent layout.
 *
 * Features:
 * - Tab-based platform selection
 * - Responsive preview sizing
 * - Real-time preview updates
 * - Character count validation
 */

const PLATFORM_CONFIG = {
  twitter: {
    name: 'X (Twitter)',
    icon: TwitterIcon,
    color: '#1DA1F2',
    maxLength: 280,
    component: TwitterPreview
  },
  instagram: {
    name: 'Instagram',
    icon: InstagramIcon,
    color: '#E4405F',
    maxLength: 2200,
    component: InstagramPreview
  },
  facebook: {
    name: 'Facebook',
    icon: FacebookIcon,
    color: '#1877F2',
    maxLength: 63206,
    component: FacebookPreview
  },
  linkedin: {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    color: '#0A66C2',
    maxLength: 3000,
    component: LinkedInPreview
  },
  youtube: {
    name: 'YouTube',
    icon: YouTubeIcon,
    color: '#FF0000',
    maxLength: 5000,
    component: YouTubePreview
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    color: '#25D366',
    maxLength: 4096,
    component: WhatsAppPreview
  },
  tiktok: {
    name: 'TikTok',
    icon: () => <SiTiktok size={20} />,
    color: '#000000',
    maxLength: 2200,
    component: TikTokPreview
  }
};

const PreviewContainer = ({
  content = '',
  variants = {},
  media = [],
  author = {},
  platforms = ['twitter'],
  timestamp = new Date(),
  onPlatformChange = () => {},
  showTabs = true,
  singlePlatform = null
}) => {
  const [activePlatform, setActivePlatform] = useState(singlePlatform || platforms[0] || 'twitter');

  // Get content for current platform (variant or fallback to main content)
  const getContentForPlatform = (platform) => {
    if (variants && variants[platform]) {
      // Handle different variant structures
      const variant = variants[platform];
      if (typeof variant === 'string') return variant;
      if (variant.text) return variant.text;
      if (variant.caption) return variant.caption;
      if (variant.message) return variant.message;
      if (variant.description) return variant.description;
    }
    return content;
  };

  // Get media for current platform
  const getMediaForPlatform = (platform) => {
    if (variants && variants[platform]) {
      const variant = variants[platform];
      if (variant.mediaIds && Array.isArray(variant.mediaIds)) {
        // TODO: Resolve media IDs to URLs
        return variant.mediaIds;
      }
    }
    return media;
  };

  const handlePlatformChange = (event, newPlatform) => {
    if (newPlatform) {
      setActivePlatform(newPlatform);
      onPlatformChange(newPlatform);
    }
  };

  const config = PLATFORM_CONFIG[activePlatform];
  const PreviewComponent = config?.component;
  const platformContent = getContentForPlatform(activePlatform);
  const platformMedia = getMediaForPlatform(activePlatform);

  // Character count and validation
  const charCount = platformContent?.length || 0;
  const maxLength = config?.maxLength || 280;
  const isOverLimit = charCount > maxLength;
  const charRemaining = maxLength - charCount;

  // Filter available platforms
  const availablePlatforms = platforms.filter(p => PLATFORM_CONFIG[p]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Platform tabs */}
      {showTabs && availablePlatforms.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={activePlatform}
            exclusive
            onChange={handlePlatformChange}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {availablePlatforms.map((platform) => {
              const pConfig = PLATFORM_CONFIG[platform];
              if (!pConfig) return null;
              const IconComponent = pConfig.icon;

              return (
                <ToggleButton
                  key={platform}
                  value={platform}
                  sx={{
                    px: 2,
                    py: 1,
                    gap: 1,
                    textTransform: 'none',
                    borderColor: activePlatform === platform ? pConfig.color : 'divider',
                    bgcolor: activePlatform === platform ? `${pConfig.color}15` : 'transparent',
                    '&.Mui-selected': {
                      bgcolor: `${pConfig.color}15`,
                      borderColor: pConfig.color,
                      color: pConfig.color,
                      '&:hover': {
                        bgcolor: `${pConfig.color}25`
                      }
                    }
                  }}
                >
                  <IconComponent sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {pConfig.name}
                  </Typography>
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Character count indicator */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          variant="body2"
          sx={{
            color: isOverLimit ? 'error.main' : charRemaining < 20 ? 'warning.main' : 'text.secondary'
          }}
        >
          {charCount} / {maxLength} characters
          {isOverLimit && (
            <Typography component="span" sx={{ color: 'error.main', ml: 1 }}>
              ({Math.abs(charRemaining)} over limit)
            </Typography>
          )}
        </Typography>

        {/* Progress bar */}
        <Box sx={{ flex: 1, maxWidth: 150, height: 4, bgcolor: 'grey.200', borderRadius: 2 }}>
          <Box
            sx={{
              width: `${Math.min((charCount / maxLength) * 100, 100)}%`,
              height: '100%',
              bgcolor: isOverLimit ? 'error.main' : charRemaining < 20 ? 'warning.main' : config?.color || 'primary.main',
              borderRadius: 2,
              transition: 'width 0.2s'
            }}
          />
        </Box>
      </Box>

      {/* Preview area */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'grey.100',
          p: 3,
          borderRadius: 2,
          display: 'flex',
          justifyContent: 'center',
          minHeight: 400
        }}
      >
        <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
          {PreviewComponent ? (
            <PreviewComponent
              content={platformContent}
              media={platformMedia}
              author={{
                name: author.name || author.firstName || 'Your Name',
                handle: author.handle || author.username || '@yourhandle',
                avatar: author.avatar || author.profilePicture
              }}
              timestamp={timestamp}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Preview not available for this platform
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Platform-specific tips */}
      <Box sx={{ mt: 2 }}>
        {activePlatform === 'twitter' && isOverLimit && (
          <Typography variant="body2" color="warning.main">
            Tip: Consider creating a thread for longer content
          </Typography>
        )}
        {activePlatform === 'instagram' && !media.length && (
          <Typography variant="body2" color="info.main">
            Tip: Instagram posts perform better with high-quality images
          </Typography>
        )}
        {activePlatform === 'tiktok' && !media.some(m => m.type === 'video') && (
          <Typography variant="body2" color="info.main">
            Tip: TikTok requires a video - add one to your content
          </Typography>
        )}
        {activePlatform === 'youtube' && (
          <Typography variant="body2" color="info.main">
            Tip: Include relevant keywords in your title and description for discoverability
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PreviewContainer;
