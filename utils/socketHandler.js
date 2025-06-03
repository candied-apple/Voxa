const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

const connectedUsers = new Map();

const socketHandler = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ User ${socket.user.username} connected`);

    // Store connected user
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      joinedRooms: new Set()
    });

    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Join user's rooms
    const userRooms = await Room.find({
      'members.user': socket.userId
    }).select('_id name');

    for (const room of userRooms) {
      socket.join(room._id.toString());
      connectedUsers.get(socket.userId).joinedRooms.add(room._id.toString());
      
      // Notify room members that user is online
      socket.to(room._id.toString()).emit('user_online', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar
      });
    }

    // Handle joining a room
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        
        // Verify user is a member of the room
        const room = await Room.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        const isMember = room.members.some(member => 
          member.user.toString() === socket.userId
        );

        if (!isMember) {
          return socket.emit('error', { message: 'You are not a member of this room' });
        }

        socket.join(roomId);
        connectedUsers.get(socket.userId).joinedRooms.add(roomId);

        // Notify room members
        socket.to(roomId).emit('user_joined_room', {
          userId: socket.userId,
          username: socket.user.username,
          avatar: socket.user.avatar,
          roomId
        });

        socket.emit('joined_room', { roomId, message: 'Successfully joined room' });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle leaving a room
    socket.on('leave_room', async (data) => {
      try {
        const { roomId } = data;
        
        socket.leave(roomId);
        connectedUsers.get(socket.userId).joinedRooms.delete(roomId);

        // Notify room members
        socket.to(roomId).emit('user_left_room', {
          userId: socket.userId,
          username: socket.user.username,
          roomId
        });

        socket.emit('left_room', { roomId, message: 'Successfully left room' });
      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text' } = data;

        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        // Verify user is in the room
        if (!connectedUsers.get(socket.userId).joinedRooms.has(roomId)) {
          return socket.emit('error', { message: 'You are not in this room' });
        }

        // Create and save message
        const message = new Message({
          content: content.trim(),
          sender: socket.userId,
          room: roomId,
          type
        });

        await message.save();
        await message.populate('sender', 'username userId avatar');

        // Update room's last message
        await Room.findByIdAndUpdate(roomId, {
          lastMessage: message._id,
          $inc: { messageCount: 1 }
        });

        // Emit to all room members
        io.to(roomId).emit('new_message', {
          message: {
            _id: message._id,
            content: message.content,
            sender: message.sender,
            room: message.room,
            type: message.type,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt
          }
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        roomId
      });
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.userId,
        username: socket.user.username,
        roomId
      });
    });

    // Handle message reactions
    socket.on('add_reaction', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        // Check if user already reacted with this emoji
        const existingReaction = message.reactions.find(
          reaction => reaction.user.toString() === socket.userId && reaction.emoji === emoji
        );

        if (existingReaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(
            reaction => !(reaction.user.toString() === socket.userId && reaction.emoji === emoji)
          );
        } else {
          // Add reaction
          message.reactions.push({
            user: socket.userId,
            emoji,
            createdAt: new Date()
          });
        }

        await message.save();

        // Emit to room members
        io.to(message.room.toString()).emit('message_reaction', {
          messageId,
          reactions: message.reactions,
          userId: socket.userId,
          emoji,
          action: existingReaction ? 'remove' : 'add'
        });

      } catch (error) {
        console.error('Reaction error:', error);
        socket.emit('error', { message: 'Failed to update reaction' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User ${socket.user.username} disconnected`);

      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Notify all rooms the user was in
      const userConnectedData = connectedUsers.get(socket.userId);
      if (userConnectedData) {
        userConnectedData.joinedRooms.forEach(roomId => {
          socket.to(roomId).emit('user_offline', {
            userId: socket.userId,
            username: socket.user.username,
            lastSeen: new Date()
          });
        });
      }

      // Remove from connected users
      connectedUsers.delete(socket.userId);
    });

    // Handle getting online users in a room
    socket.on('get_online_users', async (data) => {
      try {
        const { roomId } = data;
        
        const room = await Room.findById(roomId)
          .populate('members.user', 'username userId avatar isOnline lastSeen');

        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        const onlineUsers = room.members
          .filter(member => member.user.isOnline)
          .map(member => ({
            userId: member.user._id,
            username: member.user.username,
            avatar: member.user.avatar,
            role: member.role
          }));

        socket.emit('online_users', { roomId, users: onlineUsers });
      } catch (error) {
        console.error('Get online users error:', error);
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });

    // Handle room updates
    socket.on('room_updated', async (data) => {
      try {
        const { roomId, updates } = data;
        
        // Verify user is a member and has permission
        const room = await Room.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        const userMember = room.members.find(member => 
          member.user.toString() === socket.userId
        );

        if (!userMember || (userMember.role !== 'admin' && userMember.role !== 'moderator')) {
          return socket.emit('error', { message: 'Not authorized to update room' });
        }

        // Broadcast room update to all room members
        socket.to(roomId).emit('room_settings_updated', {
          roomId,
          updates,
          updatedBy: {
            userId: socket.userId,
            username: socket.user.username
          }
        });

      } catch (error) {
        console.error('Room update error:', error);
        socket.emit('error', { message: 'Failed to update room' });
      }
    });

    // Handle member role updates
    socket.on('member_role_updated', async (data) => {
      try {
        const { roomId, userId, newRole } = data;
        
        // Broadcast to room members
        socket.to(roomId).emit('member_role_changed', {
          roomId,
          userId,
          newRole,
          updatedBy: {
            userId: socket.userId,
            username: socket.user.username
          }
        });

      } catch (error) {
        console.error('Member role update error:', error);
        socket.emit('error', { message: 'Failed to update member role' });
      }
    });

    // Handle member removal
    socket.on('member_removed', async (data) => {
      try {
        const { roomId, userId } = data;
        
        // Notify the removed user
        const removedUserSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId === userId);
        
        if (removedUserSocket) {
          removedUserSocket.leave(roomId);
          removedUserSocket.emit('removed_from_room', {
            roomId,
            removedBy: {
              userId: socket.userId,
              username: socket.user.username
            }
          });
        }

        // Broadcast to remaining room members
        socket.to(roomId).emit('member_removed_from_room', {
          roomId,
          userId,
          removedBy: {
            userId: socket.userId,
            username: socket.user.username
          }
        });

      } catch (error) {
        console.error('Member removal error:', error);
        socket.emit('error', { message: 'Failed to remove member' });
      }
    });

    // Handle room deletion
    socket.on('room_deleted', async (data) => {
      try {
        const { roomId } = data;
        
        // Notify all room members
        io.to(roomId).emit('room_deleted', {
          roomId,
          deletedBy: {
            userId: socket.userId,
            username: socket.user.username
          }
        });

        // Everyone leaves the room
        const roomSockets = await io.in(roomId).fetchSockets();
        for (const roomSocket of roomSockets) {
          roomSocket.leave(roomId);
          const userId = roomSocket.userId;
          if (connectedUsers.has(userId)) {
            connectedUsers.get(userId).joinedRooms.delete(roomId);
          }
        }

      } catch (error) {
        console.error('Room deletion error:', error);
        socket.emit('error', { message: 'Failed to process room deletion' });
      }
    });

  });  // End of io.on('connection')

  return io;
};

module.exports = socketHandler;
