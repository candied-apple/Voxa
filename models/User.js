const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({  userId: {
    type: String,
    unique: true,
    length: 12
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  joinedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }]
}, {
  timestamps: true
});

// Generate unique 12-digit user ID
userSchema.pre('save', async function(next) {
  if (!this.userId) {
    let isUnique = false;
    let userId;
    
    while (!isUnique) {
      userId = Math.random().toString().slice(2, 14).padStart(12, '0');
      const existingUser = await mongoose.model('User').findOne({ userId });
      if (!existingUser) {
        isUnique = true;
      }
    }
    
    this.userId = userId;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
