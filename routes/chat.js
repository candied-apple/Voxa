const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter function to only allow certain file types
const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, docs, and text files
  if (
    file.mimetype.startsWith('image/') || 
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'text/plain'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only images, PDFs, DOC/DOCX, and TXT files are allowed.'), false);
  }
};

// Initialize multer with storage configuration
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max size
  }
});

const router = express.Router();

// Get all public rooms
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('creator', 'username userId avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's joined rooms
router.get('/my-rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find({
      'members.user': req.user._id
    })
      .populate('creator', 'username userId avatar')
      .populate('lastMessage')
      .populate('members.user', 'username userId avatar isOnline')
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new room
router.post('/rooms', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPrivate = false, maxMembers = 100 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ message: 'Room name must be less than 50 characters' });
    }

    // Check if room name already exists
    const existingRoom = await Room.findOne({ name: name.trim() });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room name already exists' });
    }

    const room = new Room({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user._id,
      isPrivate,
      maxMembers,
      members: [{
        user: req.user._id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await room.save();
    await room.populate('creator', 'username userId avatar');
    await room.populate('members.user', 'username userId avatar isOnline');

    // Add room to user's joined rooms
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedRooms: room._id }
    });

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join room
router.post('/rooms/:roomId/join', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is already a member
    const isMember = room.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    // Check room capacity
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Add user to room
    room.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });

    await room.save();

    // Add room to user's joined rooms
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedRooms: room._id }
    });

    await room.populate('creator', 'username userId avatar');
    await room.populate('members.user', 'username userId avatar isOnline');

    res.json({
      message: 'Joined room successfully',
      room
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave room
router.post('/rooms/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Remove user from room
    room.members = room.members.filter(member => 
      member.user.toString() !== req.user._id.toString()
    );

    await room.save();

    // Remove room from user's joined rooms
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { joinedRooms: room._id }
    });

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    const message = new Message({
      content: content.trim(),
      sender: req.user._id,
      room: roomId,
      type
    });

    await message.save();
    await message.populate('sender', 'username userId avatar');

    // Update room's last message and message count
    room.lastMessage = message._id;
    room.messageCount = (room.messageCount || 0) + 1;
    await room.save();

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room details
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(roomId)
      .populate('creator', 'username userId avatar')
      .populate('members.user', 'username userId avatar isOnline lastSeen')
      .populate('lastMessage');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update room settings
router.put('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, isPrivate, maxMembers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is admin or moderator
    const userMember = room.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!userMember || (userMember.role !== 'admin' && userMember.role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admins and moderators can update room settings' });
    }

    // Only admin can change privacy settings
    if (isPrivate !== undefined && userMember.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change privacy settings' });
    }

    // Validate input
    if (name && name.trim().length === 0) {
      return res.status(400).json({ message: 'Room name cannot be empty' });
    }

    if (name && name.length > 50) {
      return res.status(400).json({ message: 'Room name must be less than 50 characters' });
    }

    if (description && description.length > 200) {
      return res.status(400).json({ message: 'Room description must be less than 200 characters' });
    }

    if (maxMembers && (maxMembers < 2 || maxMembers > 1000)) {
      return res.status(400).json({ message: 'Max members must be between 2 and 1000' });
    }

    // Check if new name already exists (if name is being changed)
    if (name && name.trim() !== room.name) {
      const existingRoom = await Room.findOne({ name: name.trim() });
      if (existingRoom) {
        return res.status(400).json({ message: 'Room name already exists' });
      }
    }

    // Update room
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      updateData,
      { new: true }
    )
      .populate('creator', 'username userId avatar')
      .populate('members.user', 'username userId avatar isOnline lastSeen');

    res.json({
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update member role
router.put('/rooms/:roomId/members/:userId/role', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid room or user ID' });
    }

    if (!['member', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if requester is admin or moderator
    const requesterMember = room.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admins and moderators can change member roles' });
    }

    // Find target member
    const targetMember = room.members.find(member => 
      member.user.toString() === userId
    );

    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in room' });
    }

    // Check permissions: admin can promote anyone except other admins, moderator can only promote members
    if (requesterMember.role === 'moderator') {
      if (targetMember.role !== 'member' || role === 'admin') {
        return res.status(403).json({ message: 'Moderators can only promote members to moderator' });
      }
    }

    if (requesterMember.role === 'admin' && targetMember.role === 'admin' && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot demote other admins' });
    }

    // Update member role
    targetMember.role = role;
    await room.save();

    await room.populate('members.user', 'username userId avatar isOnline lastSeen');

    res.json({
      message: 'Member role updated successfully',
      member: targetMember
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from room
router.delete('/rooms/:roomId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid room or user ID' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if requester is admin or moderator
    const requesterMember = room.members.find(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!requesterMember || (requesterMember.role !== 'admin' && requesterMember.role !== 'moderator')) {
      return res.status(403).json({ message: 'Only admins and moderators can remove members' });
    }

    // Find target member
    const targetMember = room.members.find(member => 
      member.user.toString() === userId
    );

    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in room' });
    }

    // Check permissions: cannot remove other admins, moderators can only remove members
    if (requesterMember.role === 'moderator' && targetMember.role !== 'member') {
      return res.status(403).json({ message: 'Moderators can only remove members' });
    }

    if (targetMember.role === 'admin') {
      return res.status(403).json({ message: 'Cannot remove admin members' });
    }

    // Remove member from room
    room.members = room.members.filter(member => 
      member.user.toString() !== userId
    );

    await room.save();

    // Remove room from user's joined rooms
    await User.findByIdAndUpdate(userId, {
      $pull: { joinedRooms: room._id }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a room (admin only)
router.delete('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check if user is a member of the room
    const memberIndex = room.members.findIndex(
      member => String(member.user) === String(req.user._id)
    );
    
    if (memberIndex === -1) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }
    
    // Check if user is an admin
    if (room.members[memberIndex].role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete rooms' });
    }
    
    // Delete all messages in the room
    await Message.deleteMany({ room: roomId });
    
    // Delete the room
    await Room.findByIdAndDelete(roomId);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the room ID from the request
    const roomId = req.body.roomId;
    
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      // Delete the file if the room ID is invalid
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      // Delete the file if room doesn't exist
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(member => 
      member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      // Delete the file if user isn't a member
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Create a file object with relevant information
    const fileObject = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path.replace(/\\/g, '/'),
      size: file.size,
      mimetype: file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    res.json({ 
      message: 'File uploaded successfully', 
      file: fileObject 
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
