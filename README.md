# CRM-MERN

A full-stack Customer Relationship Management (CRM) application built with the MERN stack (MongoDB, Express.js, React, Node.js). This application is designed for Blueprint Marketing to manage campaigns, projects, and client relationships.

## Features

- **User Authentication**: Secure login/signup with JWT tokens
- **Role-Based Access Control**: System admin, Designer, Marketeer, Hybrid, and Client roles
- **Project Management**: Create, update, and track marketing campaigns
- **Calendar View**: Visual calendar for project scheduling
- **AI Slogan Generation**: Generate marketing slogans using OpenAI
- **Image Upload**: Cloudinary integration for design uploads
- **Email Notifications**: Automated welcome emails with temporary passwords
- **Statistics Dashboard**: Visual analytics for project and user metrics

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- Cloudinary for image storage
- OpenAI API for AI features
- Nodemailer for emails

### Frontend
- React 18
- React Router v6
- Bootstrap 5 with Bootstrap Icons
- Axios for API calls
- Context API for state management

## Project Structure

```
CRM-MERN/
├── server/                 # Backend
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── utils/             # Helper functions
│   └── server.js          # Entry point
├── client/                # Frontend
│   ├── public/            # Static files
│   └── src/
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       ├── context/       # Auth context
│       └── services/      # API service
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Cloudinary account
- OpenAI API key
- Gmail account (for emails)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/blueprint256/CRM-MERN.git
cd CRM-MERN
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Create `.env` file in the server directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/crm_mern
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CLOUD_NAME=your_cloudinary_name
CLOUD_API_KEY=your_cloudinary_key
CLOUD_API_SECRET=your_cloudinary_secret
OPENAI_API_KEY=your_openai_key
```

4. Install frontend dependencies:
```bash
cd ../client
npm install
```

### Running the Application

1. Start MongoDB

2. Start the backend server:
```bash
cd server
npm run dev
```

3. Start the frontend (in a new terminal):
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## User Roles

| Role | Description |
|------|-------------|
| **System** | Full admin access, can manage users and all projects |
| **Designer** | Can view and update assigned design projects |
| **Marketeer** | Can view and update assigned marketing projects |
| **Hybrid** | Combined designer and marketeer access |
| **Client** | Can view own projects and submit feedback |

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/by-role/:role` - Get users by role

### Projects
- `GET /api/projects` - Get projects (filtered by role)
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (admin only)
- `POST /api/projects/:id/generate-slogan` - Generate AI slogan
- `POST /api/projects/:id/upload-image` - Upload design image

### Statistics
- `GET /api/stats` - Get admin statistics
- `GET /api/stats/user` - Get user-specific statistics

## License

MIT License - feel free to use this project for your own purposes.
