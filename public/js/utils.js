// Utility Functions
class Utils {
  // Format date/time
  static formatTime(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = Math.abs(now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return messageDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }

  // Format relative time (e.g., "2 minutes ago")
  static formatRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Format date for display
  static formatDate(date) {
    const messageDate = new Date(date);
    return messageDate.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Generate avatar initials
  static getInitials(name) {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  // Generate random color for avatars
  static getAvatarColor(userId) {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
      '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
    ];
    
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Sanitize HTML to prevent XSS
  static sanitizeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Format file size
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Copy text to clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }

  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate username
  static isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  // Auto-resize textarea
  static autoResize(element) {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  }

  // Scroll to bottom of element
  static scrollToBottom(element, smooth = true) {
    if (smooth) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }

  // Check if element is in viewport
  static isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Generate unique ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Parse URLs in text and make them clickable
  static linkifyText(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // Escape regex special characters
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Highlight search terms
  static highlightSearchTerms(text, searchTerm) {
    if (!searchTerm) return text;
    
    const escapedTerm = this.escapeRegex(searchTerm);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Toast Notification System
class Toast {
  static show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span class="material-icons">${icon}</span>
      <span>${Utils.sanitizeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'toastSlideOut 0.3s ease-out forwards';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    });
  }
  
  static getIcon(type) {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
  
  static success(message, duration) {
    this.show(message, 'success', duration);
  }
  
  static error(message, duration) {
    this.show(message, 'error', duration);
  }
  
  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }
  
  static info(message, duration) {
    this.show(message, 'info', duration);
  }
}

// Local Storage Manager
class Storage {
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error getting from localStorage:', error);
      return defaultValue;
    }
  }
  
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting to localStorage:', error);
      return false;
    }
  }
  
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
  
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

// Event Emitter for custom events
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  once(event, listener) {
    const onceListener = (...args) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }
}

// Custom Dialog System
class Dialog {
  static async confirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleElement = document.getElementById('confirm-title');
      const messageElement = document.getElementById('confirm-message');
      const cancelButton = document.getElementById('confirm-cancel');
      const okButton = document.getElementById('confirm-ok');
      
      // Store previously focused element to restore focus later
      const previouslyFocused = document.activeElement;
      
      // Set content
      titleElement.textContent = title;
      messageElement.textContent = message;
      
      // Show modal
      modal.classList.add('active');
      
      // Set focus to the confirm button (better UX for confirm dialogs)
      setTimeout(() => okButton.focus(), 100);
      
      // Event handlers
      const handleCancel = () => {
        modal.classList.remove('active');
        cleanup();
        previouslyFocused?.focus();
        resolve(false);
      };
      
      const handleOk = () => {
        modal.classList.remove('active');
        cleanup();
        previouslyFocused?.focus();
        resolve(true);
      };
      
      // Close modal on ESC or when clicking outside
      const handleModalClick = (e) => {
        if (e.target === modal) {
          handleCancel();
        }
      };
      
      // Handle keyboard navigation
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        } else if (e.key === 'Tab') {
          // Trap focus inside modal
          const focusable = modal.querySelectorAll('button:not([disabled])');
          const firstFocusable = focusable[0];
          const lastFocusable = focusable[focusable.length - 1];
          
          if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        } else if (e.key === 'Enter' && document.activeElement === okButton) {
          handleOk();
        }
      };
      
      // Clean up event listeners
      const cleanup = () => {
        cancelButton.removeEventListener('click', handleCancel);
        okButton.removeEventListener('click', handleOk);
        modal.removeEventListener('click', handleModalClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
      
      // Add event listeners
      cancelButton.addEventListener('click', handleCancel);
      okButton.addEventListener('click', handleOk);
      modal.addEventListener('click', handleModalClick);
      document.addEventListener('keydown', handleKeyDown);
    });
  }
  
  static alert(message, title = 'Notification') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleElement = document.getElementById('confirm-title');
      const messageElement = document.getElementById('confirm-message');
      const cancelButton = document.getElementById('confirm-cancel');
      const okButton = document.getElementById('confirm-ok');
      
      // Store previously focused element
      const previouslyFocused = document.activeElement;
      
      // Set content
      titleElement.textContent = title;
      messageElement.textContent = message;
      
      // Hide the cancel button for alerts
      cancelButton.style.display = 'none';
      
      // Change confirm button text to "OK" for alerts
      okButton.textContent = 'OK';
      
      // Show modal
      modal.classList.add('active');
      
      // Set focus to OK button
      setTimeout(() => okButton.focus(), 100);
      
      const handleOk = () => {
        modal.classList.remove('active');
        cleanup();
        // Restore cancel button display
        cancelButton.style.display = '';
        // Restore confirm button text
        okButton.textContent = 'Confirm';
        // Restore focus
        previouslyFocused?.focus();
        resolve(true);
      };
      
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          handleOk();
        }
      };
      
      const cleanup = () => {
        okButton.removeEventListener('click', handleOk);
        document.removeEventListener('keydown', handleKeyDown);
      };
      
      okButton.addEventListener('click', handleOk);
      document.addEventListener('keydown', handleKeyDown);
    });
  }
}

// Global event emitter instance
window.eventBus = new EventEmitter();

// Add CSS for toast slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);
