# 🌟 Voxa Chat - Modern Group Chat Application

A beautiful, real-time group chat application built with Node.js, Socket.IO, and Material Design. Features a sleek dark theme, responsive design, and comprehensive real-time messaging capabilities.

![Voxa Chat](https://img.shields.io/badge/Voxa-Chat-purple?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-blue?style=for-the-badge)
![Material Design](https://img.shields.io/badge/Material-Design-orange?style=for-the-badge)

## ✨ Features

### 🔐 Authentication & Security
- **JWT Authentication** with secure token management
- **BCrypt Password Hashing** for enhanced security
- **Unique 12-digit User IDs** for easy identification
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization

### 💬 Real-time Messaging
- **Socket.IO Integration** for instant messaging
- **Typing Indicators** to show who's currently typing
- **Message Reactions** with emoji support
- **File Uploads** with automatic image compression
- **Room-based Conversations** with join/leave functionality

### 🎨 Modern UI/UX
- **Material Design Dark Theme** with beautiful aesthetics
- **Responsive Design** working perfectly on desktop and mobile
- **Smooth Animations** and transitions
- **Toast Notifications** for user feedback
- **Glassmorphism Effects** for modern visual appeal

### 🏠 Room Management
- **Create & Join Rooms** with custom names and descriptions
- **Room Member Management** with real-time user lists
- **Private & Public Rooms** support
- **Room Information** panels with member counts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB (local or Atlas cloud)
- Modern web browser

### Installation

1. **Navigate to the project:**
   ```bash
   cd voxa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Update `MONGODB_URI` in `.env` if needed
   - Default settings work with local MongoDB

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   - Main app: http://localhost:3001
   - API tests: http://localhost:3001/test.html

## 🧪 Testing

### Automated API Testing
Visit `http://localhost:3001/test.html` for comprehensive testing:
- Server connectivity
- User registration & login
- Room creation & management
- Socket.IO real-time features

### Manual Testing
1. **Register a new account** on the main page
2. **Create or join a room** to start chatting
3. **Open multiple browser tabs** to test real-time features
4. **Test on mobile devices** for responsive design

**Built with ❤️ by the Voxa Team** - *Creating beautiful, real-time communication experiences for everyone.*
