// Chat Management Class
class ChatManager {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.currentUser = null;
    this.typingTimeout = null;
    this.typingUsers = new Set();
    this.messageCache = new Map();
    this.isConnected = false;

    this.initializeElements();
    this.setupEventListeners();
  }

  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      // Chat container
      chatContainer: document.querySelector('.chat-container'),
      welcomeScreen: document.getElementById('welcome-screen'),
      chatHeader: document.getElementById('chat-header'),
      chatMessages: document.getElementById('chat-messages'),
      messageInputContainer: document.getElementById('message-input-container'),
      typingIndicator: document.getElementById('typing-indicator'),      // Chat header elements
      currentRoomName: document.getElementById('current-room-name'),
      roomMemberCount: document.getElementById('room-member-count'),      roomInfoBtn: document.getElementById('room-info-btn'),
      onlineUsersBtn: document.getElementById('online-users-btn'),
      disconnectRoomBtn: document.getElementById('disconnect-room-btn'),// Room settings modal elements
      roomSettingsModal: document.getElementById('room-settings-modal'),
      roomSettingsForm: document.getElementById('room-settings-form'),
      editRoomName: document.getElementById('edit-room-name'),
      editRoomDescription: document.getElementById('edit-room-description'),
      editRoomPrivate: document.getElementById('edit-room-private'),
      editRoomMaxMembers: document.getElementById('edit-room-max-members'),      roomCreatorInfo: document.getElementById('room-creator-info'),
      roomCreatedDate: document.getElementById('room-created-date'),      roomMembersCount: document.getElementById('room-members-count'),
      roomMessagesCount: document.getElementById('room-messages-count'),
      leaveRoomBtn: document.getElementById('leave-room-btn'),
      deleteRoomBtn: document.getElementById('delete-room-btn'),

      // Online users sidebar elements
      onlineUsersSidebar: document.getElementById('online-users-sidebar'),
      sidebarOverlay: document.getElementById('sidebar-overlay'),
      closeOnlineUsersBtn: document.getElementById('close-online-users'),
      onlineMembersList: document.getElementById('online-members-list'),

      // Message input elements
      messageText: document.getElementById('message-text'),
      sendBtn: document.getElementById('send-btn'),
      attachBtn: document.getElementById('attach-btn'),
      fileInput: document.getElementById('file-input'),
      emojiBtn: document.getElementById('emoji-btn'),

      // Typing indicator
      typingUsers: document.getElementById('typing-users'),
    };
  }

  // Setup event listeners
  setupEventListeners() {
    // Message input events
    this.elements.messageText.addEventListener('input', () => {
      Utils.autoResize(this.elements.messageText);
      this.handleTyping();
    });

    this.elements.messageText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.elements.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // File attachment
    this.elements.attachBtn.addEventListener('click', () => {
      this.elements.fileInput.click();
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files[0]);
    });    // Chat header actions
    this.elements.disconnectRoomBtn.addEventListener('click', () => {
      this.leaveCurrentRoom();
    });this.elements.onlineUsersBtn.addEventListener('click', () => {
      this.showOnlineUsers();
    });

    // Online users sidebar events
    this.elements.closeOnlineUsersBtn.addEventListener('click', () => {
      this.hideOnlineUsers();
    });

    this.elements.sidebarOverlay.addEventListener('click', () => {
      this.hideOnlineUsers();
    });

    this.elements.roomInfoBtn.addEventListener('click', () => {
      this.showRoomSettings();
    });    // Room settings form handler
    this.elements.roomSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRoomSettings();
    });    // Leave room button handler
    this.elements.leaveRoomBtn.addEventListener('click', () => {
      this.handleLeaveRoom();
    });
    
    // Delete room button handler
    this.elements.deleteRoomBtn.addEventListener('click', () => {
      this.handleDeleteRoom();
    });

    // Modal close handlers
    this.setupModalEvents();

    // Global events
    eventBus.on('room:selected', (room) => {
      this.joinRoom(room);
    });

    eventBus.on('user:authenticated', (user) => {
      this.currentUser = user;
      this.initializeSocket();
    });

    eventBus.on('auth:logout', () => {
      this.disconnect();
    });
  }

  // Initialize Socket.IO connection
  initializeSocket() {
    if (!this.currentUser || this.socket) return;

    const token = Storage.get('token');
    if (!token) return;

    this.socket = io({
      auth: { token }
    });

    this.setupSocketEvents();  }
  // Setup modal event handlers
  setupModalEvents() {
    // Room settings modal close handlers
    const modalCloseButtons = this.elements.roomSettingsModal.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.elements.roomSettingsModal.classList.remove('active');
      });
    });

    // Close modal when clicking outside
    this.elements.roomSettingsModal.addEventListener('click', (e) => {
      if (e.target === this.elements.roomSettingsModal) {
        this.elements.roomSettingsModal.classList.remove('active');
      }
    });

    // Close modal and sidebar with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.elements.roomSettingsModal.classList.contains('active')) {
          this.elements.roomSettingsModal.classList.remove('active');
        }
        if (this.elements.onlineUsersSidebar.classList.contains('active')) {
          this.hideOnlineUsers();
        }
      }
    });
  }

  // Setup Socket.IO event listeners
  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      Toast.success('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      Toast.warning('Disconnected from chat server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      Toast.error('Failed to connect to chat server');
    });

    // Message events
    this.socket.on('new_message', (data) => {
      this.handleNewMessage(data.message);
    });

    // Room events
    this.socket.on('user_joined_room', (data) => {
      Toast.info(`${data.username} joined the room`);
      this.updateOnlineUsers();
    });

    this.socket.on('user_left_room', (data) => {
      Toast.info(`${data.username} left the room`);
      this.updateOnlineUsers();
    });

    // User status events
    this.socket.on('user_online', (data) => {
      this.updateUserStatus(data.userId, true);
    });

    this.socket.on('user_offline', (data) => {
      this.updateUserStatus(data.userId, false);
    });

    // Typing events
    this.socket.on('user_typing', (data) => {
      this.handleUserTyping(data);
    });

    this.socket.on('user_stop_typing', (data) => {
      this.handleUserStopTyping(data);
    });

    // Reaction events
    this.socket.on('message_reaction', (data) => {
      this.updateMessageReactions(data);
    });

    // Room management events
    this.socket.on('room_settings_updated', (data) => {
      this.handleRoomSettingsUpdate(data);
    });

    this.socket.on('member_role_changed', (data) => {
      this.handleMemberRoleChange(data);
    });
    
    this.socket.on('room_deleted', (data) => {
      // If this is the current room, show welcome screen
      if (this.currentRoom && this.currentRoom._id === data.roomId) {
        Toast.warning(`This room has been deleted by ${data.deletedBy.username}`);
        this.currentRoom = null;
        this.showWelcomeScreen();
        eventBus.emit('room:deleted', data.roomId);
      }
    });

    this.socket.on('member_removed', (data) => {
      this.handleMemberRemoval(data);
    });

    this.socket.on('removed_from_room', (data) => {
      this.handleRemovedFromRoom(data);
    });

    // Error handling
    this.socket.on('error', (data) => {
      Toast.error(data.message || 'An error occurred');
    });
  }

  // Join a room
  async joinRoom(room) {
    if (!this.socket || !this.isConnected) {
      Toast.error('Not connected to chat server');
      return;
    }

    try {
      // Leave current room if any
      if (this.currentRoom) {
        this.socket.emit('leave_room', { roomId: this.currentRoom._id });
      }

      this.currentRoom = room;
      this.showChatInterface();

      // Update UI
      this.elements.currentRoomName.textContent = room.name;
      this.elements.roomMemberCount.textContent = `${room.activeMembersCount || 0} members`;      // Join room via socket
      this.socket.emit('join_room', { roomId: room._id });

      // Clear any existing messages when joining a new room
      this.clearMessages();

      // Emit room selected event
      eventBus.emit('room:joined', room);

    } catch (error) {
      console.error('Error joining room:', error);
      Toast.error('Failed to join room');
    }
  }

  // Leave current room
  leaveCurrentRoom() {
    if (!this.currentRoom || !this.socket) return;

    this.socket.emit('leave_room', { roomId: this.currentRoom._id });
    this.currentRoom = null;
    this.showWelcomeScreen();
    eventBus.emit('room:left');
  }
  // Send a message
  sendMessage() {
    const content = this.elements.messageText.value.trim();
    if (!content || !this.currentRoom || !this.socket) return;

    // Clear typing indicator
    this.stopTyping();

    // Emit message via socket
    this.socket.emit('send_message', {
      roomId: this.currentRoom._id,
      content,
      type: 'text'
    });

    // Clear input
    this.elements.messageText.value = '';
    Utils.autoResize(this.elements.messageText);
  }

  // Handle file upload
  async handleFileUpload(file) {
    if (!file || !this.currentRoom) return;

    try {
      Toast.info('Uploading file...');
      
      const response = await api.uploadFile(file, this.currentRoom._id);
      
      // Send file message via socket
      this.socket.emit('send_message', {
        roomId: this.currentRoom._id,
        content: `Shared a file: ${file.name}`,
        type: 'file',
        attachments: [response.file]
      });

      Toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      Toast.error('Failed to upload file');
    }

    // Clear file input
    this.elements.fileInput.value = '';
  }

  // Handle typing indicators
  handleTyping() {
    if (!this.currentRoom || !this.socket) return;

    // Emit typing start
    this.socket.emit('typing_start', { roomId: this.currentRoom._id });

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set new timeout to stop typing
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  stopTyping() {
    if (!this.currentRoom || !this.socket) return;

    this.socket.emit('typing_stop', { roomId: this.currentRoom._id });
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }
  // Handle incoming typing events
  handleUserTyping(data) {
    if (String(data.userId) === String(this.currentUser.id)) return;

    this.typingUsers.add(data.username);
    this.updateTypingIndicator();
  }

  handleUserStopTyping(data) {
    this.typingUsers.delete(data.username);
    this.updateTypingIndicator();
  }

  updateTypingIndicator() {
    const typingArray = Array.from(this.typingUsers);
    
    if (typingArray.length === 0) {
      this.elements.typingIndicator.classList.add('hidden');
    } else {
      const text = typingArray.length === 1 
        ? `${typingArray[0]} is typing...`
        : `${typingArray.join(', ')} are typing...`;
      
      this.elements.typingUsers.textContent = text;
      this.elements.typingIndicator.classList.remove('hidden');
    }
  }

  // Handle new incoming message
  handleNewMessage(message) {
    this.renderMessage(message);
    
    // Scroll to bottom if user is near bottom
    const messagesContainer = this.elements.chatMessages;
    const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
    
    if (isNearBottom) {
      setTimeout(() => {
        Utils.scrollToBottom(messagesContainer);
      }, 100);
    }    // Show notification if not in focus
    if (document.hidden && String(message.sender._id) !== String(this.currentUser.id)) {
      this.showNotification(message);
    }
  }
  renderMessage(message, animate = true) {
    const messageElement = this.createMessageElement(message);
    
    if (animate) {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(20px)';
    }

    this.elements.chatMessages.appendChild(messageElement);

    if (animate) {
      requestAnimationFrame(() => {
        messageElement.style.transition = 'all 0.3s ease-out';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
      });
    }
  }  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    // Debug logging to see what we're comparing
    console.log('Message sender._id:', message.sender._id);
    console.log('Current user id:', this.currentUser.id);
    console.log('Current user object:', this.currentUser);
    
    // Ensure both IDs are strings for comparison
    const isOwnMessage = String(message.sender._id) === String(this.currentUser.id);
    console.log('Is own message:', isOwnMessage);
    
    messageDiv.className = `message ${isOwnMessage ? 'own' : ''}`;
    messageDiv.dataset.messageId = message._id;

    const avatarColor = Utils.getAvatarColor(message.sender.userId);
    const initials = Utils.getInitials(message.sender.username);
    const formattedTime = Utils.formatTime(message.createdAt);
    const sanitizedContent = Utils.sanitizeHtml(message.content);
    const linkedContent = Utils.linkifyText(sanitizedContent);

    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="message-avatar" style="background-color: ${avatarColor}">
          ${initials}
        </div>
        <span class="message-author">${Utils.sanitizeHtml(message.sender.username)}</span>
        <span class="message-time">${formattedTime}</span>
      </div>
      <div class="message-content">
        ${linkedContent}
        ${this.renderAttachments(message.attachments)}
      </div>
      ${this.renderReactions(message.reactions)}
    `;

    // Add context menu for message actions
    messageDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showMessageContextMenu(e, message);
    });

    return messageDiv;
  }

  renderAttachments(attachments) {
    if (!attachments || attachments.length === 0) return '';

    return attachments.map(attachment => {
      if (attachment.mimeType.startsWith('image/')) {
        return `
          <div class="message-attachment">
            <img src="${attachment.url}" alt="${attachment.originalName}" 
                 style="max-width: 300px; max-height: 200px; border-radius: 8px;">
          </div>
        `;
      } else {
        return `
          <div class="message-attachment file">
            <span class="material-icons">attach_file</span>
            <a href="${attachment.url}" target="_blank">${attachment.originalName}</a>
            <span class="file-size">(${Utils.formatFileSize(attachment.size)})</span>
          </div>
        `;
      }
    }).join('');
  }

  renderReactions(reactions) {
    if (!reactions || reactions.length === 0) return '';

    const reactionCounts = {};
    reactions.forEach(reaction => {
      if (!reactionCounts[reaction.emoji]) {
        reactionCounts[reaction.emoji] = [];
      }
      reactionCounts[reaction.emoji].push(reaction.user);
    });    const reactionElements = Object.entries(reactionCounts).map(([emoji, users]) => {
      const hasUserReaction = users.some(userId => String(userId) === String(this.currentUser.id));
      return `
        <span class="reaction ${hasUserReaction ? 'own' : ''}" 
              data-emoji="${emoji}">
          ${emoji} ${users.length}
        </span>
      `;
    }).join('');

    return `<div class="message-reactions">${reactionElements}</div>`;
  }

  // Show/hide UI elements
  showWelcomeScreen() {
    this.elements.welcomeScreen.classList.remove('hidden');
    this.elements.chatHeader.classList.add('hidden');
    this.elements.chatMessages.classList.add('hidden');
    this.elements.messageInputContainer.classList.add('hidden');
    this.elements.typingIndicator.classList.add('hidden');
  }

  showChatInterface() {
    this.elements.welcomeScreen.classList.add('hidden');
    this.elements.chatHeader.classList.remove('hidden');
    this.elements.chatMessages.classList.remove('hidden');
    this.elements.messageInputContainer.classList.remove('hidden');
  }
  clearMessages() {
    const messages = this.elements.chatMessages.querySelectorAll('.message');
    messages.forEach(message => message.remove());
  }

  // Show notification for new messages
  showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${message.sender.username} in ${this.currentRoom.name}`, {
        body: message.content,
        icon: '/favicon.ico'
      });
    }
  }

  // Update user online status
  updateUserStatus(userId, isOnline) {
    // Update UI elements that show user status
    eventBus.emit('user:status:changed', { userId, isOnline });
  }

  // Update online users
  updateOnlineUsers() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('get_online_users', { roomId: this.currentRoom._id });
    }
  }

  // Show online users modal  // Show online users sidebar
  async showOnlineUsers() {
    if (!this.currentRoom) {
      Toast.error('No room selected');
      return;
    }

    try {
      // Get detailed room information including members
      const response = await api.getRoomDetails(this.currentRoom._id);
      const room = response.room;

      // Load and display members in sidebar
      this.loadOnlineMembers(room.members);

      // Show sidebar
      this.elements.onlineUsersSidebar.classList.add('active');
      this.elements.sidebarOverlay.classList.add('active');

    } catch (error) {
      console.error('Error loading online users:', error);
      Toast.error('Failed to load online users');
    }
  }

  // Hide online users sidebar
  hideOnlineUsers() {
    this.elements.onlineUsersSidebar.classList.remove('active');
    this.elements.sidebarOverlay.classList.remove('active');
  }
  // Show room settings modal
  async showRoomSettings() {
    if (!this.currentRoom) {
      Toast.error('No room selected');
      return;
    }

    try {
      // Get detailed room information
      const response = await api.getRoomDetails(this.currentRoom._id);
      const room = response.room;

      // Populate form with current room data
      this.elements.editRoomName.value = room.name || '';
      this.elements.editRoomDescription.value = room.description || '';
      this.elements.editRoomPrivate.checked = room.isPrivate || false;
      this.elements.editRoomMaxMembers.value = room.maxMembers || 100;      // Populate room information
      this.elements.roomCreatorInfo.textContent = room.creator?.username || 'Unknown';
      this.elements.roomCreatedDate.textContent = Utils.formatDate(room.createdAt);
      this.elements.roomMembersCount.textContent = room.activeMembersCount || 0;
      this.elements.roomMessagesCount.textContent = room.messageCount || 0;

      // Check user permissions
      const currentUserMember = room.members.find(member => 
        member.user._id === this.currentUser.id
      );
      const isAdmin = currentUserMember?.role === 'admin';
      const isModerator = currentUserMember?.role === 'moderator';
      const canEdit = isAdmin || isModerator;      // Enable/disable form fields based on permissions
      this.elements.editRoomName.disabled = !canEdit;
      this.elements.editRoomDescription.disabled = !canEdit;
      this.elements.editRoomPrivate.disabled = !isAdmin; // Only admin can change privacy
      this.elements.editRoomMaxMembers.disabled = !canEdit;
      
      const saveButton = document.getElementById('save-room-settings');
      saveButton.style.display = canEdit ? 'flex' : 'none';      // Handle leave room button - admins can't leave their own room
      const leaveButton = this.elements.leaveRoomBtn;
      if (isAdmin) {
        leaveButton.disabled = true;
        leaveButton.title = 'Admins cannot leave their own room';
        leaveButton.style.opacity = '0.5';
        leaveButton.style.cursor = 'not-allowed';
        
        // Show delete button for admins
        this.elements.deleteRoomBtn.style.display = 'flex';
      } else {
        leaveButton.disabled = false;
        leaveButton.title = 'Leave Room';
        leaveButton.style.opacity = '1';
        leaveButton.style.cursor = 'pointer';
        
        // Hide delete button for non-admins
        this.elements.deleteRoomBtn.style.display = 'none';
      }

      // Show modal
      this.elements.roomSettingsModal.classList.add('active');

    } catch (error) {
      console.error('Error loading room settings:', error);
      Toast.error('Failed to load room settings');
    }
  }


  // Load and display online members in sidebar
  loadOnlineMembers(members) {
    if (!members || members.length === 0) {
      this.elements.onlineMembersList.innerHTML = '<p class="no-members">No members found</p>';
      return;
    }

    const membersHTML = members.map(member => {
      const avatarColor = Utils.getAvatarColor(member.user._id);
      const initials = Utils.getInitials(member.user.username);
      const isCurrentUser = member.user._id === this.currentUser.id;
      const canManage = this.canManageMember(member);
      
      return `
        <div class="member-item">
          <div class="member-info">
            <div class="member-avatar" style="background-color: ${avatarColor}">
              ${initials}
            </div>
            <div class="member-details">
              <span class="member-name">
                ${Utils.sanitizeHtml(member.user.username)}
                ${isCurrentUser ? ' (You)' : ''}
              </span>
              <span class="member-role">${member.role}</span>
            </div>
          </div>
          <div class="member-actions-wrapper">
            <span class="member-status ${member.user.isOnline ? 'online' : ''}">
              ${member.user.isOnline ? 'Online' : 'Offline'}
            </span>
            ${canManage && !isCurrentUser ? `
              <div class="member-actions">
                ${member.role !== 'admin' ? `
                  <button class="btn btn-small btn-secondary" onclick="chatManager.promoteMember('${member.user._id}')">
                    Promote
                  </button>
                ` : ''}
                <button class="btn btn-small btn-danger" onclick="chatManager.removeMember('${member.user._id}')">
                  Remove
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.elements.onlineMembersList.innerHTML = membersHTML;
  }

  // Check if current user can manage a member
  canManageMember(member) {
    if (!this.currentRoom) return false;
    
    const currentUserMember = this.currentRoom.members?.find(m => 
      m.user._id === this.currentUser.id
    );
    
    if (!currentUserMember) return false;
    
    const currentUserRole = currentUserMember.role;
    const targetRole = member.role;
    
    // Admin can manage anyone except other admins
    if (currentUserRole === 'admin') {
      return targetRole !== 'admin';
    }
    
    // Moderator can manage only members
    if (currentUserRole === 'moderator') {
      return targetRole === 'member';
    }
    
    return false;
  }

  // Save room settings
  async saveRoomSettings() {
    if (!this.currentRoom) return;

    try {
      const formData = {
        name: this.elements.editRoomName.value.trim(),
        description: this.elements.editRoomDescription.value.trim(),
        isPrivate: this.elements.editRoomPrivate.checked,
        maxMembers: parseInt(this.elements.editRoomMaxMembers.value) || 100
      };

      // Validate form data
      if (!formData.name) {
        Toast.error('Room name is required');
        return;
      }

      if (formData.name.length > 50) {
        Toast.error('Room name must be less than 50 characters');
        return;
      }

      if (formData.description.length > 200) {
        Toast.error('Room description must be less than 200 characters');
        return;
      }

      if (formData.maxMembers < 2 || formData.maxMembers > 1000) {
        Toast.error('Max members must be between 2 and 1000');
        return;
      }

      // Show loading state
      const saveButton = document.getElementById('save-room-settings');
      const originalText = saveButton.innerHTML;
      saveButton.innerHTML = '<div class="loading-spinner small"></div> Saving...';
      saveButton.disabled = true;

      // Send update request
      const response = await api.updateRoom(this.currentRoom._id, formData);
      
      // Update current room data
      this.currentRoom = { ...this.currentRoom, ...formData };
      
      // Update UI
      this.elements.currentRoomName.textContent = formData.name;
      
      // Close modal
      this.elements.roomSettingsModal.classList.remove('active');      // Notify other users via socket
      if (this.socket) {
        this.socket.emit('room_updated', {
          roomId: this.currentRoom._id,
          updates: formData
        });
      }

      Toast.success('Room settings updated successfully');

    } catch (error) {
      console.error('Error saving room settings:', error);
      Toast.error(error.message || 'Failed to save room settings');
    } finally {
      // Reset button state
      const saveButton = document.getElementById('save-room-settings');
      saveButton.innerHTML = '<span class="material-icons">save</span> Save Settings';
      saveButton.disabled = false;
    }
  }
  // Promote member to moderator
  async promoteMember(userId) {
    try {
      await api.updateMemberRole(this.currentRoom._id, userId, 'moderator');
      Toast.success('Member promoted successfully');
      
      // Refresh room settings if modal is open
      if (this.elements.roomSettingsModal.classList.contains('active')) {
        await this.showRoomSettings();
      }
      
      // Refresh online users sidebar if open
      if (this.elements.onlineUsersSidebar.classList.contains('active')) {
        await this.showOnlineUsers();
      }
      
    } catch (error) {
      console.error('Error promoting member:', error);
      Toast.error('Failed to promote member');
    }
  }
  // Remove member from room
  async removeMember(userId) {
    // Use custom confirmation dialog instead of browser confirm
    const confirmed = await Dialog.confirm('Are you sure you want to remove this member?', 'Remove Member');
    if (!confirmed) return;

    try {
      await api.removeMemberFromRoom(this.currentRoom._id, userId);
      Toast.success('Member removed successfully');
      
      // Refresh room settings if modal is open
      if (this.elements.roomSettingsModal.classList.contains('active')) {
        await this.showRoomSettings();
      }
      
      // Refresh online users sidebar if open
      if (this.elements.onlineUsersSidebar.classList.contains('active')) {
        await this.showOnlineUsers();
      }
      
    } catch (error) {
      console.error('Error removing member:', error);
      Toast.error('Failed to remove member');
    }
  }

  // Handle leave room from settings modal
  async handleLeaveRoom() {
    if (!this.currentRoom) {
      Toast.error('No room selected');
      return;
    }

    // Use custom dialog instead of browser confirm
    const confirmed = await Dialog.confirm(
      `Are you sure you want to leave "${this.currentRoom.name}"?`, 
      'Leave Room'
    );
    if (!confirmed) {
      return;
    }

    try {
      // Call the API to leave the room
      await api.leaveRoom(this.currentRoom._id);
      
      // Close the settings modal
      this.elements.roomSettingsModal.classList.remove('active');
      
      // Leave the room via socket
      if (this.socket) {
        this.socket.emit('leave_room', { roomId: this.currentRoom._id });
      }
      
      // Clear current room and show welcome screen
      this.currentRoom = null;
      this.showWelcomeScreen();
      
      // Emit room left event to update UI
      eventBus.emit('room:left');
      
      Toast.success('Left room successfully');
      
    } catch (error) {
      console.error('Error leaving room:', error);
      Toast.error(error.message || 'Failed to leave room');
    }
  }

  // Handle delete room
  async handleDeleteRoom() {
    if (!this.currentRoom) {
      Toast.error('No room selected');
      return;
    }      // Use custom dialog to confirm deletion
    const confirmed = await Dialog.confirm(
      `Are you sure you want to permanently delete the room "${this.currentRoom.name}"?\nThis action cannot be undone and all messages will be lost.`,
      'Delete Room'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      // Show loading state on the delete button
      const deleteButton = this.elements.deleteRoomBtn;
      const originalText = deleteButton.innerHTML;
      deleteButton.innerHTML = '<div class="loading-spinner small"></div> Deleting...';
      deleteButton.disabled = true;
      
      // Show loading indicator
      Toast.info('Deleting room...');
      
      // Call the API to delete the room
      await api.deleteRoom(this.currentRoom._id);
      
      // Close the settings modal
      this.elements.roomSettingsModal.classList.remove('active');
        // Notify other users via socket
      if (this.socket) {
        this.socket.emit('room_deleted', { roomId: this.currentRoom._id });
      }
      
      // Remove the room from the room list
      eventBus.emit('room:deleted', this.currentRoom._id);
      
      // Clear current room and show welcome screen
      this.currentRoom = null;
      this.showWelcomeScreen();
        Toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Error deleting room:', error);
      Toast.error(error.message || 'Failed to delete room');
      
      // Reset the delete button
      const deleteButton = this.elements.deleteRoomBtn;
      deleteButton.innerHTML = '<span class="material-icons">delete_forever</span> Delete Room';
      deleteButton.disabled = false;
    }
  }

  // Request notification permissions
  requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            Toast.success('Notifications enabled');
          }
        });
      }
    }
  }
}

// Create global chat manager instance
window.chatManager = new ChatManager();
