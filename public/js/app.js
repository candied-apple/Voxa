// Main Application Class
class VoxaApp {  constructor() {
    this.currentUser = null;
    this.rooms = [];
    this.myRooms = [];
    this.currentTab = 'my-rooms';
    this.searchTerm = '';

    this.initializeElements();
    this.setupEventListeners();
    this.checkAuthentication();
  }  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      // Loading screen
      loadingScreen: document.getElementById('loading-screen'),
      
      // Authentication modal
      authModal: document.getElementById('auth-modal'),
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      showRegisterBtn: document.getElementById('show-register'),
      showLoginBtn: document.getElementById('show-login'),
      
      // App container
      app: document.getElementById('app'),
      
      // Sidebar elements
      currentUsername: document.getElementById('current-username'),
      currentUserId: document.getElementById('current-user-id'),
      userMenuBtn: document.getElementById('user-menu-btn'),
      userMenu: document.getElementById('user-menu'),
      roomSearch: document.getElementById('room-search'),
      createRoomBtn: document.getElementById('create-room-btn'),
      welcomeCreateRoomBtn: document.getElementById('welcome-create-room'),
      
      // Room tabs and lists
      tabBtns: document.querySelectorAll('.tab-btn'),
      myRoomsList: document.getElementById('my-rooms'),
      publicRoomsList: document.getElementById('public-rooms'),
      
      // Create room modal
      createRoomModal: document.getElementById('create-room-modal'),
      createRoomForm: document.getElementById('create-room-form'),
      
      // Menu items
      profileMenu: document.getElementById('profile-menu'),
      settingsMenu: document.getElementById('settings-menu'),
      logoutMenu: document.getElementById('logout-menu'),
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Authentication form events
    this.elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    this.elements.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    this.elements.showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });

    this.elements.showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // User menu events
    this.elements.userMenuBtn.addEventListener('click', () => {
      this.toggleUserMenu();
    });

    this.elements.logoutMenu.addEventListener('click', () => {
      this.handleLogout();
    });

    // Room management events
    this.elements.createRoomBtn.addEventListener('click', () => {
      this.showCreateRoomModal();
    });

    this.elements.welcomeCreateRoomBtn.addEventListener('click', () => {
      this.showCreateRoomModal();
    });

    this.elements.createRoomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateRoom();
    });

    // Room search
    this.elements.roomSearch.addEventListener('input', 
      Utils.debounce((e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterRooms();
      }, 300)
    );

    // Room tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Modal close events
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close') || 
          e.target.closest('.modal-close')) {
        this.closeModals();
      }
      
      if (e.target.classList.contains('modal') && 
          !e.target.querySelector('.modal-content').contains(e.target)) {
        this.closeModals();
      }

      // Close user menu if clicking outside
      if (!this.elements.userMenuBtn.contains(e.target) && 
          !this.elements.userMenu.contains(e.target)) {
        this.closeUserMenu();
      }
    });

    // Global events
    eventBus.on('user:authenticated', (user) => {
      this.currentUser = user;
      this.showApp();
      this.loadRooms();
    });

    eventBus.on('auth:logout', () => {
      this.handleLogout();
    });

    eventBus.on('room:joined', (room) => {
      this.updateActiveRoom(room);
    });

    eventBus.on('room:left', () => {
      this.clearActiveRoom();
    });
    
    eventBus.on('room:deleted', (roomId) => {
      // Remove the room from both lists
      if (this.myRooms) {
        this.myRooms = this.myRooms.filter(room => room._id !== roomId);
        this.renderRoomList(this.myRooms, this.elements.myRoomsList, true);
      }
      
      if (this.publicRooms) {
        this.publicRooms = this.publicRooms.filter(room => room._id !== roomId);
        this.renderRoomList(this.publicRooms, this.elements.publicRoomsList, false);
      }
      
      this.clearActiveRoom();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals();
        this.closeUserMenu();
      }
    });
  }  // Check if user is already authenticated
  async checkAuthentication() {
    const token = Storage.get('token');
    
    if (!token) {
      this.hideLoadingScreen();
      this.showAuthModal();
      return;
    }

    try {
      const response = await api.getCurrentUser();
      this.currentUser = response.user;
      eventBus.emit('user:authenticated', this.currentUser);
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.showAuthModal();
    } finally {
      this.hideLoadingScreen();
    }
  }

  // Authentication handlers
  async handleLogin() {
    const formData = new FormData(this.elements.loginForm);
    const credentials = {
      emailOrUsername: formData.get('emailOrUsername') || 
                      document.getElementById('login-email').value,
      password: formData.get('password') || 
               document.getElementById('login-password').value,
    };

    if (!credentials.emailOrUsername || !credentials.password) {
      Toast.error('Please fill in all fields');
      return;
    }

    try {
      this.setFormLoading(this.elements.loginForm, true);
      
      const response = await api.login(credentials);
      this.currentUser = response.user;
      
      Toast.success('Welcome back!');
      eventBus.emit('user:authenticated', this.currentUser);
      
    } catch (error) {
      console.error('Login error:', error);
      Toast.error(error.message || 'Login failed');
    } finally {
      this.setFormLoading(this.elements.loginForm, false);
    }
  }
  async handleRegister() {
    const formData = new FormData(this.elements.registerForm);
    const userData = {
      username: formData.get('username') || 
               document.getElementById('register-username').value,
      email: formData.get('email') || 
            document.getElementById('register-email').value,
      password: formData.get('password') || 
               document.getElementById('register-password').value,
    };
    
    const confirmPassword = document.getElementById('register-confirm-password').value;

    // Validation
    if (!userData.username || !userData.email || !userData.password || !confirmPassword) {
      Toast.error('Please fill in all fields');
      return;
    }

    if (!Utils.isValidUsername(userData.username)) {
      Toast.error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return;
    }

    if (!Utils.isValidEmail(userData.email)) {
      Toast.error('Please enter a valid email address');
      return;
    }

    if (userData.password.length < 6) {
      Toast.error('Password must be at least 6 characters long');
      return;
    }
    
    if (userData.password !== confirmPassword) {
      Toast.error('Passwords do not match');
      return;
    }

    try {
      this.setFormLoading(this.elements.registerForm, true);
      
      const response = await api.register(userData);
      this.currentUser = response.user;
      
      Toast.success('Account created successfully!');
      eventBus.emit('user:authenticated', this.currentUser);
      
    } catch (error) {
      console.error('Registration error:', error);
      Toast.error(error.message || 'Registration failed');
    } finally {
      this.setFormLoading(this.elements.registerForm, false);
    }
  }

  async handleLogout() {
    try {
      await api.logout();
      this.currentUser = null;
      this.rooms = [];
      this.myRooms = [];
      
      // Disconnect chat
      if (window.chatManager) {
        chatManager.disconnect();
      }
      
      this.showAuthModal();
      Toast.success('Logged out successfully');
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      this.currentUser = null;
      this.showAuthModal();
    }
  }
  // Room management
  async loadRooms() {
    try {
      // Load my rooms first, then load public rooms (filtered)
      await this.loadMyRooms();
      await this.loadPublicRooms();
    } catch (error) {
      console.error('Error loading rooms:', error);
      Toast.error('Failed to load rooms');
    }
  }

  async loadMyRooms() {
    try {
      this.setRoomListLoading(this.elements.myRoomsList, true);
      
      const response = await api.getMyRooms();
      this.myRooms = response.rooms || [];
      
      this.renderRoomList(this.myRooms, this.elements.myRoomsList, true);
      
    } catch (error) {
      console.error('Error loading my rooms:', error);
      this.showRoomListError(this.elements.myRoomsList, 'Failed to load your rooms');
    } finally {
      this.setRoomListLoading(this.elements.myRoomsList, false);
    }
  }
  async loadPublicRooms() {
    try {
      this.setRoomListLoading(this.elements.publicRoomsList, true);
      
      const response = await api.getRooms();
      let allPublicRooms = response.rooms || [];
      
      // Filter out rooms that the user is already a member of
      const myRoomIds = this.myRooms.map(room => room._id);
      this.rooms = allPublicRooms.filter(room => !myRoomIds.includes(room._id));
      
      this.renderRoomList(this.rooms, this.elements.publicRoomsList, false);
      
    } catch (error) {
      console.error('Error loading public rooms:', error);
      this.showRoomListError(this.elements.publicRoomsList, 'Failed to load public rooms');
    } finally {
      this.setRoomListLoading(this.elements.publicRoomsList, false);
    }
  }

  async handleCreateRoom() {
    const formData = new FormData(this.elements.createRoomForm);
    const roomData = {
      name: formData.get('name') || 
            document.getElementById('new-room-name').value,
      description: formData.get('description') || 
                  document.getElementById('new-room-description').value,
      isPrivate: document.getElementById('room-private').checked,
      maxMembers: parseInt(document.getElementById('room-max-members').value) || 100,
    };

    if (!roomData.name) {
      Toast.error('Room name is required');
      return;
    }

    try {
      this.setFormLoading(this.elements.createRoomForm, true);
      
      const response = await api.createRoom(roomData);
      const newRoom = response.room;
      
      // Add to my rooms list
      this.myRooms.unshift(newRoom);
      this.renderRoomList(this.myRooms, this.elements.myRoomsList, true);
      
      // Switch to my rooms tab
      this.switchTab('my-rooms');
      
      // Close modal
      this.closeCreateRoomModal();
      
      // Join the room
      eventBus.emit('room:selected', newRoom);
      
      Toast.success('Room created successfully!');
      
    } catch (error) {
      console.error('Create room error:', error);
      Toast.error(error.message || 'Failed to create room');
    } finally {
      this.setFormLoading(this.elements.createRoomForm, false);
    }
  }

  // Render room list
  renderRoomList(rooms, container, isMyRooms) {
    const filteredRooms = this.filterRoomsBySearch(rooms);
    
    if (filteredRooms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-icons">forum</span>
          <p>${this.searchTerm ? 'No rooms found' : isMyRooms ? 'No rooms joined yet' : 'No public rooms available'}</p>
          ${!this.searchTerm && isMyRooms ? '<button class="btn btn-primary" onclick="app.showCreateRoomModal()">Create Your First Room</button>' : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = filteredRooms.map(room => 
      this.createRoomItemHTML(room, isMyRooms)
    ).join('');

    // Add event listeners to room items
    container.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        const roomId = item.dataset.roomId;
        const room = rooms.find(r => r._id === roomId);
        if (room) {
          eventBus.emit('room:selected', room);
        }
      });
    });    // Add event listeners to action buttons
    container.querySelectorAll('.join-room-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleJoinRoom(btn.dataset.roomId);
      });
    });
  }

  createRoomItemHTML(room, isMyRooms) {
    const avatarColor = Utils.getAvatarColor(room._id);
    const initials = Utils.getInitials(room.name);
    const memberCount = room.activeMembersCount || 0;
    const lastActivity = room.updatedAt ? Utils.formatRelativeTime(room.updatedAt) : '';
    
    return `
      <div class="room-item" data-room-id="${room._id}">
        <div class="room-header">
          <div class="room-avatar" style="background-color: ${avatarColor}">
            ${initials}
          </div>
          <div class="room-info">
            <div class="room-name">${Utils.sanitizeHtml(room.name)}</div>
            <div class="room-meta">
              <span><span class="material-icons">people</span> ${memberCount}</span>
              ${lastActivity ? `<span>${lastActivity}</span>` : ''}
              ${room.isPrivate ? '<span class="material-icons">lock</span>' : ''}
            </div>
          </div>
        </div>
        ${room.description ? `<div class="room-description">${Utils.sanitizeHtml(room.description)}</div>` : ''}        <div class="room-actions">
          ${!isMyRooms ? 
            `<button class="btn btn-primary join-room-btn" data-room-id="${room._id}">
              <span class="material-icons">add</span> Join
            </button>` : ''
          }
        </div>
      </div>
    `;
  }

  // Handle joining/leaving rooms
  async handleJoinRoom(roomId) {
    try {
      const response = await api.joinRoom(roomId);
      const room = response.room;
      
      // Move room from public to my rooms
      this.rooms = this.rooms.filter(r => r._id !== roomId);
      this.myRooms.unshift(room);
      
      // Re-render lists
      this.renderRoomList(this.rooms, this.elements.publicRoomsList, false);
      this.renderRoomList(this.myRooms, this.elements.myRoomsList, true);
      
      Toast.success('Joined room successfully!');
      
    } catch (error) {
      console.error('Join room error:', error);
      Toast.error(error.message || 'Failed to join room');
    }  }

  // UI helper methods
  showApp() {
    this.hideLoadingScreen();
    this.closeAuthModal();
    this.elements.app.classList.remove('hidden');
    
    // Update user info
    this.elements.currentUsername.textContent = this.currentUser.username;
    this.elements.currentUserId.textContent = `ID: ${this.currentUser.userId}`;
    
    // Request notification permission
    if (window.chatManager) {
      chatManager.requestNotificationPermission();
    }
  }  showAuthModal() {
    this.elements.app.classList.add('hidden');
    this.elements.authModal.classList.add('active');
  }

  closeAuthModal() {
    this.elements.authModal.classList.remove('active');
  }

  showLoginForm() {
    this.elements.loginForm.classList.add('active');
    this.elements.registerForm.classList.remove('active');
  }

  showRegisterForm() {
    this.elements.registerForm.classList.add('active');
    this.elements.loginForm.classList.remove('active');
  }  hideLoadingScreen() {
    this.elements.loadingScreen.classList.add('hidden');
  }

  showCreateRoomModal() {
    this.elements.createRoomModal.classList.add('active');
  }

  closeCreateRoomModal() {
    this.elements.createRoomModal.classList.remove('active');
    this.elements.createRoomForm.reset();
  }

  closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  toggleUserMenu() {
    this.elements.userMenu.classList.toggle('active');
  }

  closeUserMenu() {
    this.elements.userMenu.classList.remove('active');
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    this.elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update room lists
    document.querySelectorAll('.room-list').forEach(list => {
      list.classList.toggle('active', list.id === tabName);
    });
  }

  filterRooms() {
    if (this.currentTab === 'my-rooms') {
      this.renderRoomList(this.myRooms, this.elements.myRoomsList, true);
    } else {
      this.renderRoomList(this.rooms, this.elements.publicRoomsList, false);
    }
  }

  filterRoomsBySearch(rooms) {
    if (!this.searchTerm) return rooms;
    
    return rooms.filter(room => 
      room.name.toLowerCase().includes(this.searchTerm) ||
      (room.description && room.description.toLowerCase().includes(this.searchTerm))
    );
  }

  updateActiveRoom(room) {
    // Update visual state of active room
    document.querySelectorAll('.room-item').forEach(item => {
      item.classList.toggle('active', item.dataset.roomId === room._id);
    });
  }

  clearActiveRoom() {
    document.querySelectorAll('.room-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  setFormLoading(form, loading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="loading-spinner small"></div> Loading...';
    } else {
      submitBtn.disabled = false;
      // Restore original button content
      const isLogin = form.id === 'login-form';
      submitBtn.innerHTML = isLogin ? 
        '<span class="material-icons">login</span> Sign In' :
        '<span class="material-icons">person_add</span> Sign Up';
    }
  }

  setRoomListLoading(container, loading) {
    const loadingElement = container.querySelector('.room-list-loading');
    if (loadingElement) {
      loadingElement.style.display = loading ? 'flex' : 'none';
    }
  }

  showRoomListError(container, message) {
    container.innerHTML = `
      <div class="error-state">
        <span class="material-icons">error</span>
        <p>${message}</p>
        <button class="btn btn-secondary" onclick="app.loadRooms()">
          <span class="material-icons">refresh</span> Retry
        </button>
      </div>
    `;
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if required dependencies are loaded
  if (typeof Utils === 'undefined' || typeof API === 'undefined' || 
      typeof Storage === 'undefined' || typeof Toast === 'undefined') {
    console.error('Required dependencies not loaded');
    return;
  }
  
  // Initialize global API instance
  if (typeof window.api === 'undefined') {
    window.api = new API();
  }
  
  // Initialize app
  window.app = new VoxaApp();
});

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('JavaScript Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});
