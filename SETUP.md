# Voxa Chat - Setup Guide

## 🚀 Quick Start

The Voxa Chat application is now ready to run! Here's what you need to know:

### ✅ Current Status
- ✅ Server running on http://localhost:3001
- ✅ All dependencies installed
- ✅ Frontend and backend integrated
- ✅ Socket.IO real-time communication ready
- ✅ Authentication system implemented
- ✅ Material Design dark theme applied

### 🔧 Database Setup

The application currently expects MongoDB to be running. You have two options:

#### Option 1: Local MongoDB (Recommended for Development)
1. Download and install MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   - Windows: MongoDB should start automatically as a service
   - Or run: `mongod --dbpath /path/to/your/data/directory`
3. The application will connect to `mongodb://localhost:27017/voxa-chat`

#### Option 2: MongoDB Atlas (Cloud)
1. Create a free account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get your connection string
4. Update the `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voxa-chat
   ```

### 🧪 Testing the Application

1. **Basic Test Page**: Visit http://localhost:3001/test.html
   - This page will test all API endpoints
   - Shows real-time connection status
   - Verifies authentication flow

2. **Main Application**: Visit http://localhost:3001
   - Full chat interface
   - User registration and login
   - Real-time messaging
   - Room management

### 🎯 Key Features

#### 🔐 Authentication
- JWT-based authentication
- Bcrypt password hashing
- Secure session management
- 12-digit unique user IDs

#### 💬 Real-time Chat
- Socket.IO integration
- Typing indicators
- Message reactions
- File uploads (with image compression)
- Room-based conversations

#### 🎨 UI/UX
- Material Design dark theme
- Responsive design (desktop/mobile)
- Beautiful animations and transitions
- Toast notifications
- Modern glassmorphism effects

#### 🛡️ Security
- Helmet.js for security headers
- Rate limiting
- CORS configuration
- Input validation and sanitization

### 📱 Mobile Support
The application is fully responsive and works great on:
- Desktop browsers
- Mobile browsers
- Tablets

### 🔧 Development Commands

```bash
# Start development server (auto-restart on changes)
npm run dev

# Start production server
npm start

# Install dependencies
npm install
```

### 🗂️ Project Structure
```
voxa/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── models/                # MongoDB schemas
│   ├── User.js
│   ├── Room.js
│   └── Message.js
├── routes/                # API routes
│   ├── auth.js
│   └── chat.js
├── middleware/            # Express middleware
│   └── auth.js
├── utils/                 # Utilities
│   └── socketHandler.js
├── uploads/               # File uploads directory
└── public/                # Frontend files
    ├── index.html
    ├── test.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── app.js
        ├── api.js
        ├── chat.js
        └── utils.js
```

### 🐛 Troubleshooting

#### Server won't start
- Check if port 3001 is available
- Verify all dependencies are installed: `npm install`
- Check MongoDB connection

#### Database connection issues
- Ensure MongoDB is running
- Check the MONGODB_URI in .env
- Verify database permissions

#### Frontend not loading
- Clear browser cache
- Check console for JavaScript errors
- Verify all static files are accessible

### 🔮 Next Steps

1. **Test the application** using the test page at `/test.html`
2. **Create your first account** on the main page
3. **Create rooms** and start chatting
4. **Invite friends** to test real-time features

### 🌟 Features Overview

- **Real-time messaging** with Socket.IO
- **User authentication** with JWT
- **Room management** (create, join, leave)
- **File sharing** with image compression
- **Typing indicators** and user presence
- **Message reactions** and threading
- **Responsive design** for all devices
- **Dark theme** with Material Design
- **Security** with rate limiting and validation

The application is now ready for use and further development! 🎉
