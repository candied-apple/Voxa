// API Handler Class
class API {
  constructor() {
    this.baseURL = '/api';
    this.token = Storage.get('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      Storage.set('token', token);
    } else {
      Storage.remove('token');
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic fetch wrapper
  async fetch(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    try {
      const response = await this.fetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (response.token) {
        this.setToken(response.token);
      }

      return response;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async login(credentials) {
    try {
      const response = await this.fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.token) {
        this.setToken(response.token);
      }

      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout() {
    try {
      await this.fetch('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    try {
      return await this.fetch('/auth/me');
    } catch (error) {
      // If token is invalid, clear it
      if (error.message.includes('Token is not valid')) {
        this.setToken(null);
      }
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      return await this.fetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
    } catch (error) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  // Chat/Room methods
  async getRooms() {
    try {
      return await this.fetch('/chat/rooms');
    } catch (error) {
      throw new Error(error.message || 'Failed to load rooms');
    }
  }

  async getMyRooms() {
    try {
      return await this.fetch('/chat/my-rooms');
    } catch (error) {
      throw new Error(error.message || 'Failed to load your rooms');
    }
  }

  async createRoom(roomData) {
    try {
      return await this.fetch('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to create room');
    }
  }

  async joinRoom(roomId) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}/join`, {
        method: 'POST',
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to join room');
    }
  }

  async leaveRoom(roomId) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}/leave`, {
        method: 'POST',
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to leave room');
    }
  }

  async getRoomDetails(roomId) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}`);
    } catch (error) {
      throw new Error(error.message || 'Failed to load room details');
    }
  }
  async sendMessage(roomId, messageData) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to send message');
    }
  }

  // File upload method
  async uploadFile(file, roomId) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);

      const response = await fetch(`${this.baseURL}/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message || 'File upload failed');
    }
  }

  // Update room settings
  async updateRoom(roomId, updateData) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to update room');
    }
  }

  // Update member role
  async updateMemberRole(roomId, userId, role) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to update member role');
    }
  }

  // Remove member from room
  async removeMemberFromRoom(roomId, userId) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}/members/${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to remove member');
    }
  }

  // Delete a room (admin only)
  async deleteRoom(roomId) {
    try {
      return await this.fetch(`/chat/rooms/${roomId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to delete room');
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Handle API errors globally
  handleError(error) {
    console.error('API Error:', error);

    if (error.message.includes('Token is not valid') || 
        error.message.includes('No token provided')) {
      // Token is invalid, redirect to login
      this.setToken(null);
      eventBus.emit('auth:logout');
      return;
    }

    if (error.message.includes('Network')) {
      Toast.error('Network error. Please check your connection.');
      return;
    }

    // Show generic error message
    Toast.error(error.message || 'An error occurred');
  }
}

// Request interceptor for global error handling
const originalFetch = API.prototype.fetch;
API.prototype.fetch = async function(...args) {
  try {
    return await originalFetch.apply(this, args);
  } catch (error) {
    this.handleError(error);
    throw error;
  }
};

// Create global API instance
window.api = new API();
