# CRM-MERN: Marketing Content Management Platform

A comprehensive MERN stack application for marketing teams to manage content creation, collaboration, scheduling, and multi-platform publishing. Inspired by **Frappe CRM** for its flexible data architecture and **Buffer** for its content queue and platform preview system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [User Types](#user-types)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Frontend Components](#frontend-components)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)

---

## Overview

This platform provides a unified solution for marketing content management, supporting three distinct user workflows:

1. **System Administrators** - Full platform control and user management
2. **Hybrid Users (Solo Marketers)** - Individual marketers managing their own content and platforms
3. **Team-Based Users** - Collaborative teams with role-based permissions

### Key Capabilities

- **Multi-platform content publishing** (Twitter, Instagram, LinkedIn, Facebook, TikTok, YouTube, WhatsApp)
- **Visual content pipeline** with Kanban boards and workflow automation
- **Campaign management** with Gantt chart timelines
- **Real-time platform previews** showing how content will appear on each platform
- **Scheduling and queue management** with optimal posting time suggestions
- **Asset library** for organizing images, videos, and design files
- **Team collaboration** with approvals, comments, and activity tracking
- **Canva integration** for design creation
- **AI-powered slogan generation** using OpenAI

---

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- Passport.js for OAuth (Google)
- Cloudinary for image storage
- OpenAI API for AI features
- Nodemailer for emails

### Frontend
- React 18
- React Router v6
- Material UI (MUI)
- react-beautiful-dnd for drag-and-drop
- date-fns for date handling
- Axios for API calls
- Context API for state management

---

## Architecture

```
CRM-MERN/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── content/       # Content-related components
│   │   │   │   ├── ContentEditor.js
│   │   │   │   ├── KanbanBoard.js
│   │   │   │   ├── CalendarView.js
│   │   │   │   └── previews/  # Platform preview components
│   │   │   │       ├── TwitterPreview.js
│   │   │   │       ├── InstagramPreview.js
│   │   │   │       ├── LinkedInPreview.js
│   │   │   │       ├── FacebookPreview.js
│   │   │   │       ├── WhatsAppPreview.js
│   │   │   │       └── TikTokPreview.js
│   │   │   └── campaigns/     # Campaign components
│   │   │       └── GanttChart.js
│   │   ├── pages/             # Page components
│   │   │   ├── Inbox.js       # Action hub dashboard
│   │   │   ├── ContentBoard.js
│   │   │   ├── AssetLibrary.js
│   │   │   └── Campaigns.js
│   │   └── services/          # API services
│   └── public/
│
├── server/                    # Express backend
│   ├── models/                # Mongoose schemas
│   │   ├── User.js            # User accounts
│   │   ├── Workspace.js       # Organizational boundary
│   │   ├── Team.js            # Team collaboration
│   │   ├── Content.js         # Content items
│   │   ├── Campaign.js        # Marketing campaigns
│   │   ├── Asset.js           # Media assets
│   │   ├── Folder.js          # Asset organization
│   │   ├── Label.js           # Gmail-style labels
│   │   ├── WorkflowDefinition.js  # Configurable pipelines
│   │   ├── Activity.js        # Audit trail
│   │   └── PlatformConnection.js  # OAuth tokens
│   ├── routes/                # API endpoints
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── workspaces.js
│   │   ├── teams.js
│   │   ├── content.js
│   │   ├── campaigns.js
│   │   ├── assets.js
│   │   ├── folders.js
│   │   ├── labels.js
│   │   └── canva.js
│   ├── middleware/            # Auth, validation
│   └── utils/                 # Helpers, logger
│
└── package.json
```

---

## User Types

### System Admin (`userType: 'system_admin'`)

- Full platform access and control
- User management and role assignment
- Platform-wide settings and configuration
- Analytics and reporting across all workspaces

### Hybrid User (`userType: 'hybrid'`)

Solo marketers who manage their own content independently:

- Owns a personal workspace
- Can act as both content creator and publisher
- Streamlined workflow without approval gates
- Direct platform connections

### Team Member (`userType: 'team_member'`)

Collaborative users within team workspaces:

| Role | Capabilities |
|------|-------------|
| **Client** | View content, provide feedback, approve/reject |
| **Designer** | Create/edit assets, upload media |
| **Marketeer** | Full content creation, scheduling, publishing |
| **Manager** | Team settings, workflow configuration, user management |
| **Owner** | Full control, billing, workspace deletion |

---

## Features

### Content Management

- **Rich Content Editor** with platform-specific character limits
- **Multi-platform targeting** with content variants per platform
- **Live previews** showing exact appearance on Twitter, Instagram, LinkedIn, etc.
- **Media management** with image/video attachment
- **Scheduling** with calendar integration
- **Version history** and drafts

### Workflow Engine

Configurable content pipelines with three presets:

```
Solo Workflow:     Draft → Scheduled → Published
Team Workflow:     Draft → In Review → Approved → Scheduled → Published
Agency Workflow:   Idea → Draft → Internal Review → Client Review → Approved → Scheduled → Published
```

Each stage has:
- Entry/exit criteria
- Role-based permissions
- Optional time limits
- Automatic notifications

### Views

1. **Inbox** - Gmail-style action hub showing:
   - Items needing your attention
   - Pending approvals
   - Failed publications
   - Upcoming scheduled content

2. **Kanban Board** - Visual workflow management:
   - Drag-and-drop between stages
   - WIP limits per column
   - Filters by platform, priority, label
   - Quick actions

3. **Calendar** - Scheduling view:
   - Month/Week/Day modes
   - Time slot visualization
   - Drag to reschedule
   - Queue management

4. **Gantt Chart** - Campaign timelines:
   - Microsoft Project-style view
   - Progress tracking
   - Dependencies
   - Milestones

5. **Asset Library** - Media management:
   - Folder organization
   - Label tagging
   - Search and filters
   - Integration with Canva

---

## Database Schema

### User

```javascript
{
  // Identity
  username: String (unique, lowercase),
  firstName: String,
  lastName: String,
  email: String (unique),
  profilePicture: String,

  // User Type (New Architecture)
  userType: 'system_admin' | 'hybrid' | 'team_member',
  role: 'system' | 'designer' | 'marketeer' | 'client' | 'hybrid',  // Legacy

  // Workspace (Hybrid Users)
  workspace: ObjectId -> Workspace,

  // Team Memberships
  teamMemberships: [{
    team: ObjectId -> Team,
    workspace: ObjectId -> Workspace,
    role: 'client' | 'designer' | 'marketeer' | 'manager' | 'owner',
    joinedAt: Date,
    isDefault: Boolean
  }],

  // Authentication
  passwordHash: String,
  authProvider: 'local' | 'google' | 'microsoft',
  googleId: String,

  // Integrations
  integrations: {
    canva: { accessToken, refreshToken, tokenExpiresAt, userId },
    google: { accessToken, refreshToken }
  },

  // Preferences
  preferences: {
    timezone: String,
    language: String,
    theme: 'light' | 'dark' | 'system',
    emailNotifications: { ... },
    defaultWorkspace: ObjectId
  },

  // Status
  status: 'active' | 'inactive' | 'suspended' | 'pending',
  lastLoginAt: Date,
  lastActiveAt: Date
}
```

### Workspace

```javascript
{
  name: String,
  type: 'personal' | 'team' | 'hybrid',
  owner: ObjectId -> User,          // For personal/hybrid
  team: ObjectId -> Team,           // For team workspaces

  // Branding
  branding: {
    logo: ObjectId -> Asset,
    primaryColor: String,
    secondaryColor: String
  },

  // Connected Platforms
  platforms: [{
    platform: 'twitter' | 'instagram' | 'linkedin' | 'facebook' | ...,
    enabled: Boolean,
    customName: String,
    customIcon: String
  }],

  // Settings
  defaultWorkflow: ObjectId -> WorkflowDefinition,
  scheduling: {
    timezone: String,
    defaultPostTimes: [{ day, hour, minute }]
  },
  notifications: {
    emailDigest: 'daily' | 'weekly' | 'none',
    slackWebhook: String
  },

  // Stats (Auto-updated)
  stats: {
    totalContent: Number,
    publishedCount: Number,
    scheduledCount: Number,
    lastPublishedAt: Date
  },

  status: 'active' | 'archived' | 'suspended'
}
```

### Team

```javascript
{
  name: String,
  workspace: ObjectId -> Workspace,

  // Members
  members: [{
    user: ObjectId -> User,
    role: 'client' | 'designer' | 'marketeer' | 'manager' | 'owner',
    permissions: {
      canCreateContent: Boolean,
      canEditContent: Boolean,
      canDeleteContent: Boolean,
      canApproveContent: Boolean,
      canPublish: Boolean,
      canManageAssets: Boolean,
      canInviteMembers: Boolean,
      canRemoveMembers: Boolean,
      canChangeRoles: Boolean,
      canEditSettings: Boolean
    },
    status: 'active' | 'inactive',
    joinedAt: Date
  }],

  // Invitations
  pendingInvitations: [{
    email: String,
    role: String,
    token: String,
    invitedBy: ObjectId -> User,
    invitedAt: Date,
    expiresAt: Date
  }],

  // Settings
  settings: {
    requireApproval: Boolean,
    defaultContentStatus: String,
    allowClientComments: Boolean
  }
}
```

### Content

```javascript
{
  workspace: ObjectId -> Workspace,

  // Content
  title: String,
  body: String,

  // Multi-platform
  platforms: ['twitter', 'instagram', ...],
  platformVariants: {
    twitter: { body, media, hashtags },
    instagram: { body, media, caption },
    // ... per platform customization
  },

  // Media
  media: [{
    asset: ObjectId -> Asset,
    url: String,
    type: 'image' | 'video',
    altText: String
  }],

  // Organization
  campaign: ObjectId -> Campaign,
  labels: [ObjectId -> Label],
  folder: ObjectId -> Folder,

  // Workflow
  status: 'idea' | 'draft' | 'in_review' | 'approved' | 'scheduled' |
          'publishing' | 'published' | 'failed' | 'archived',
  workflowStage: ObjectId -> WorkflowDefinition.stages,

  // Scheduling
  scheduledFor: Date,
  publishedAt: Date,

  // Collaboration
  createdBy: ObjectId -> User,
  assignees: [ObjectId -> User],
  reviewers: [ObjectId -> User],

  // Approval tracking
  approvals: [{
    user: ObjectId -> User,
    status: 'pending' | 'approved' | 'rejected',
    comment: String,
    timestamp: Date
  }],

  // Comments
  comments: [{
    user: ObjectId -> User,
    text: String,
    mentions: [ObjectId -> User],
    createdAt: Date
  }],

  // Publishing
  publishResults: [{
    platform: String,
    status: 'success' | 'failed',
    postId: String,
    postUrl: String,
    error: String,
    publishedAt: Date
  }],

  // Metrics
  priority: 'low' | 'medium' | 'high' | 'urgent'
}
```

### Campaign

```javascript
{
  workspace: ObjectId -> Workspace,

  name: String,
  description: String,
  objective: String,

  // Timeline
  startDate: Date,
  endDate: Date,

  // Organization
  labels: [ObjectId -> Label],
  folder: ObjectId -> Folder,

  // Team
  owner: ObjectId -> User,
  members: [ObjectId -> User],

  // Settings
  platforms: ['twitter', 'instagram', ...],
  targetAudience: String,
  budget: { amount: Number, currency: String },

  // Progress
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled',
  progress: Number (0-100),

  // Metrics
  contentCount: Number,
  publishedCount: Number
}
```

### Asset

```javascript
{
  workspace: ObjectId -> Workspace,

  name: String,
  description: String,

  // File
  type: 'image' | 'video' | 'document' | 'audio' | 'design',
  mimeType: String,
  url: String,
  thumbnailUrl: String,
  size: Number,
  dimensions: { width, height },
  duration: Number,  // For video/audio

  // Organization
  folder: ObjectId -> Folder,
  labels: [ObjectId -> Label],

  // Source
  source: 'upload' | 'canva' | 'url' | 'ai_generated',
  canvaDesignId: String,

  // Metadata
  createdBy: ObjectId -> User,
  usageCount: Number,
  lastUsedAt: Date,

  status: 'active' | 'archived'
}
```

### WorkflowDefinition

```javascript
{
  workspace: ObjectId -> Workspace,

  name: String,
  description: String,
  isDefault: Boolean,
  isSystem: Boolean,

  // Stages
  stages: [{
    id: String,
    name: String,
    type: 'initial' | 'working' | 'review' | 'approved' |
          'scheduled' | 'publishing' | 'terminal' | 'error',
    color: String,
    order: Number,

    // Behavior
    autoAssign: Boolean,
    requiresApproval: Boolean,
    approverRoles: ['manager', 'owner'],
    requiredApprovals: Number,

    // Time limits
    slaHours: Number,

    // Notifications
    notifyOnEntry: Boolean,
    notifyRoles: [String]
  }],

  // Transitions
  transitions: [{
    from: String,  // stage id
    to: String,    // stage id

    // Conditions
    allowedRoles: ['marketeer', 'manager'],
    requiresApproval: Boolean,

    // Actions
    autoNotify: Boolean,
    triggerWebhook: String
  }]
}
```

### Activity

```javascript
{
  workspace: ObjectId -> Workspace,

  // Actor
  actor: ObjectId -> User,
  actorSnapshot: { name, email, avatar },

  // Action
  action: String,  // e.g., 'content.created', 'approval.approved'
  description: String,

  // Target
  targetType: 'content' | 'campaign' | 'asset' | 'team' | 'workspace',
  targetId: ObjectId,
  targetName: String,

  // Details
  metadata: Object,  // Action-specific data
  changes: [{
    field: String,
    oldValue: Mixed,
    newValue: Mixed
  }],

  // Visibility
  isSignificant: Boolean,  // Show in main feed

  timestamp: Date  // TTL index for cleanup after 1 year
}
```

### Label

```javascript
{
  workspace: ObjectId -> Workspace,

  name: String,
  color: String,
  description: String,

  // Usage
  usageCount: Number,

  createdBy: ObjectId -> User
}
```

### Folder

```javascript
{
  workspace: ObjectId -> Workspace,

  name: String,
  parent: ObjectId -> Folder,
  path: String,  // e.g., '/Marketing/Q4 Campaign'

  color: String,
  icon: String,

  // Stats
  itemCount: Number,

  createdBy: ObjectId -> User
}
```

### PlatformConnection

```javascript
{
  workspace: ObjectId -> Workspace,

  platform: String,
  accountId: String,
  accountName: String,
  accountHandle: String,
  accountAvatar: String,

  // OAuth
  accessToken: String (encrypted),
  refreshToken: String (encrypted),
  tokenExpiresAt: Date,

  // Platform-specific
  platformSettings: Object,

  // Rate limiting
  rateLimits: {
    postsPerHour: Number,
    postsPerDay: Number,
    currentHourCount: Number,
    currentDayCount: Number,
    lastResetHour: Date,
    lastResetDay: Date
  },

  // Health
  status: 'active' | 'expired' | 'revoked' | 'error',
  lastSuccessfulPost: Date,
  lastError: String,
  errorCount: Number,

  connectedBy: ObjectId -> User,
  connectedAt: Date
}
```

---

## API Routes

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces` | List user's workspaces |
| GET | `/api/workspaces/:id` | Get workspace details |
| POST | `/api/workspaces` | Create workspace |
| PUT | `/api/workspaces/:id` | Update workspace |
| GET | `/api/workspaces/:id/stats` | Get workspace stats |
| GET | `/api/workspaces/:id/activity` | Get activity feed |
| POST | `/api/workspaces/:id/platforms` | Connect platform |
| DELETE | `/api/workspaces/:id/platforms/:platform` | Disconnect platform |
| POST | `/api/workspaces/:id/archive` | Archive workspace |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | List user's teams |
| GET | `/api/teams/:id` | Get team details |
| POST | `/api/teams` | Create team |
| PUT | `/api/teams/:id` | Update team |
| GET | `/api/teams/:id/members` | List team members |
| POST | `/api/teams/:id/invite` | Invite member |
| POST | `/api/teams/accept-invitation` | Accept invitation |
| DELETE | `/api/teams/:id/invitations/:email` | Cancel invitation |
| PUT | `/api/teams/:id/members/:userId` | Update member role |
| DELETE | `/api/teams/:id/members/:userId` | Remove member |
| POST | `/api/teams/:id/transfer-ownership` | Transfer ownership |

### Content

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content` | List content (with filters) |
| GET | `/api/content/:id` | Get content details |
| POST | `/api/content` | Create content |
| PUT | `/api/content/:id` | Update content |
| DELETE | `/api/content/:id` | Delete content |
| POST | `/api/content/:id/approve` | Approve content |
| POST | `/api/content/:id/reject` | Reject content |
| POST | `/api/content/:id/schedule` | Schedule content |
| POST | `/api/content/:id/publish` | Publish immediately |
| POST | `/api/content/:id/comments` | Add comment |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/campaigns/:id` | Get campaign details |
| POST | `/api/campaigns` | Create campaign |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| GET | `/api/campaigns/:id/content` | Get campaign content |
| GET | `/api/campaigns/:id/timeline` | Get Gantt data |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets |
| GET | `/api/assets/:id` | Get asset details |
| POST | `/api/assets` | Upload asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| POST | `/api/assets/:id/move` | Move to folder |

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List folders |
| GET | `/api/folders/:id` | Get folder with contents |
| POST | `/api/folders` | Create folder |
| PUT | `/api/folders/:id` | Rename/move folder |
| DELETE | `/api/folders/:id` | Delete folder |

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labels` | List labels |
| POST | `/api/labels` | Create label |
| PUT | `/api/labels/:id` | Update label |
| DELETE | `/api/labels/:id` | Delete label |

### Canva Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canva/connect` | Start Canva OAuth |
| GET | `/api/canva/callback` | Canva OAuth callback |
| GET | `/api/canva/status` | Check connection status |
| GET | `/api/canva/designs` | List Canva designs |
| POST | `/api/canva/export/:designId` | Export design as asset |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get admin statistics |
| GET | `/api/stats/user` | Get user-specific statistics |

---

## Frontend Components

### Content Editor (`ContentEditor.js`)

Full-featured editor with:
- Rich text input with character counting per platform
- Multi-platform targeting
- Platform-specific content variants
- Media attachment management
- Label and campaign association
- Schedule picker

### Platform Previews

Realistic previews matching each platform's current UI:
- `TwitterPreview.js` - Tweet with media grid, engagement UI
- `InstagramPreview.js` - Post with carousel, stories format
- `LinkedInPreview.js` - Professional post format
- `FacebookPreview.js` - Facebook post appearance
- `WhatsAppPreview.js` - Broadcast message format
- `TikTokPreview.js` - Video post format

### Kanban Board (`KanbanBoard.js`)

- Drag-and-drop content between workflow stages
- WIP limits per column
- Quick search and filters
- Quick add cards
- Collapsible columns

### Calendar View (`CalendarView.js`)

- Month/Week/Day views
- Content scheduling by drag
- Time slot visualization
- Platform color coding

### Gantt Chart (`GanttChart.js`)

- Campaign timelines
- Zoom levels (day/week/month)
- Progress bars
- Today marker
- Collapsible campaign groups

### Inbox (`Inbox.js`)

Action hub dashboard showing:
- Items needing attention
- Pending approvals
- Failed publications
- Upcoming schedule
- Quick stats

---

## Installation

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/blueprint256/CRM-MERN.git
cd CRM-MERN

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Configure environment
cd ../server
cp .env.example .env
# Edit .env with your configuration

# Run development servers (from project root)
cd ..
npm run dev
```

---

## Configuration

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crm_mern

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
SESSION_SECRET=your-session-secret

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Canva Integration
CANVA_CLIENT_ID=
CANVA_CLIENT_SECRET=
CANVA_REDIRECT_URI=http://localhost:5000/api/canva/callback

# Cloudinary (Image Storage)
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=

# OpenAI (AI Features)
OPENAI_API_KEY=

# Email (Nodemailer)
EMAIL_USER=
EMAIL_PASS=

# Client
CLIENT_URL=http://localhost:3000
```

---

## Usage

### Creating a Workspace

1. Register or login to your account
2. Navigate to Workspaces
3. Click "Create Workspace"
4. Choose type (Personal or Team)
5. Connect social media platforms

### Managing Content

1. Go to Content Board or Inbox
2. Create new content with "+" button
3. Write content and select target platforms
4. Preview how it will appear on each platform
5. Add to campaign if applicable
6. Schedule or submit for review

### Team Collaboration

1. Create or join a team workspace
2. Invite team members with appropriate roles
3. Content flows through workflow stages
4. Managers/clients can approve/reject
5. Activity feed tracks all changes

---

## License

MIT License - See LICENSE file for details.

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/blueprint256/CRM-MERN/issues) page.
