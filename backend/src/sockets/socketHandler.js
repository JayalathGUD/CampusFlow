const onlineUsers = new Map();

// Group Call Registries:
// Map of workspaceId -> Map of userId -> { socketId, fullName, profilePicture, videoOn, audioOn }
const activeCalls = new Map();
// Map of socketId -> { workspaceId, userId }
const activeSocketCalls = new Map();


export const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`New Socket Client Connected: ${socket.id}`);

    // Register active user session
    socket.on('register_user', (userId) => {
      if (userId) {
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        
        // Join self-room for private direct messages and notifications
        socket.join(userId);
        
        // Broadcast that user is online
        io.emit('user_status_changed', {
          userId,
          status: 'online'
        });
        
        console.log(`User ${userId} registered online`);
      }
    });

    // Join a Workspace room for shared team chat, notes, tasks, etc.
    socket.on('join_workspace', (workspaceId) => {
      if (workspaceId) {
        socket.join(workspaceId);
        console.log(`Socket ${socket.id} joined workspace room: ${workspaceId}`);
      }
    });

    // Leave Workspace room
    socket.on('leave_workspace', (workspaceId) => {
      if (workspaceId) {
        socket.leave(workspaceId);
        console.log(`Socket ${socket.id} left workspace room: ${workspaceId}`);
      }
    });

    // Real-time Chat typing indicator
    socket.on('typing', ({ workspaceId, userId, fullName, isTyping }) => {
      socket.to(workspaceId).emit('typing', { userId, fullName, isTyping });
    });

    // Real-time Chat message broadcast
    socket.on('send_message', (message) => {
      const { workspace, recipient } = message;
      
      if (workspace) {
        // Broadcast to entire workspace channel room
        socket.to(workspace).emit('new_message', message);
      } else if (recipient) {
        // Emit to recipient's private room
        socket.to(recipient).emit('new_message', message);
        // Also emit to sender (in case they have multiple tabs)
        socket.to(message.sender).emit('new_message', message);
      }
    });

    // Collaborative Notes: Note locking for concurrent safety
    socket.on('note_lock', ({ noteId, userId, userName, lock }) => {
      if (lock) {
        socket.to(socket.userId).emit('note_locked_by', { noteId, userId, userName });
        io.to(socket.rooms).emit('note_status', { noteId, lockedBy: userId, userName });
      } else {
        io.to(socket.rooms).emit('note_status', { noteId, lockedBy: null, userName: '' });
      }
    });

    // Collaborative Notes: Content sync broadcast
    socket.on('edit_note', ({ noteId, workspaceId, content }) => {
      socket.to(workspaceId).emit('note_content_updated', { noteId, content });
    });

    // Task Board Sync: Kanban status changes
    socket.on('task_change', ({ workspaceId, taskId, action, task }) => {
      socket.to(workspaceId).emit('task_updated', { taskId, action, task });
    });

    // --- Group Call Sockets Event Handlers ---
    // Check call active status
    socket.on('check_active_call', (workspaceId) => {
      if (workspaceId) {
        const workspaceCalls = activeCalls.get(workspaceId);
        const participants = workspaceCalls ? Array.from(workspaceCalls.values()) : [];
        socket.emit('active_call_status', {
          workspaceId,
          active: participants.length > 0,
          participants
        });
      }
    });

    // Join Group Call
    socket.on('join_call', ({ workspaceId, userId, fullName, profilePicture }) => {
      if (workspaceId && userId) {
        if (!activeCalls.has(workspaceId)) {
          activeCalls.set(workspaceId, new Map());
        }
        const workspaceCalls = activeCalls.get(workspaceId);
        const participantInfo = {
          socketId: socket.id,
          userId,
          fullName,
          profilePicture,
          videoOn: true,
          audioOn: true
        };
        workspaceCalls.set(userId, participantInfo);
        activeSocketCalls.set(socket.id, { workspaceId, userId });

        console.log(`User ${fullName} (${userId}) joined call in workspace ${workspaceId}`);

        const participants = Array.from(workspaceCalls.values());
        
        // Broadcast updated list to the entire workspace
        io.to(workspaceId).emit('call_participants_updated', {
          workspaceId,
          participants
        });

        // Send confirmation back to joiner with existing participants in the call (excluding self)
        const otherParticipants = participants.filter(p => p.userId !== userId);
        socket.emit('call_joined_ack', {
          workspaceId,
          participants: otherParticipants
        });
      }
    });

    // Leave Group Call
    socket.on('leave_call', ({ workspaceId, userId }) => {
      if (workspaceId && userId) {
        const workspaceCalls = activeCalls.get(workspaceId);
        if (workspaceCalls) {
          workspaceCalls.delete(userId);
          if (workspaceCalls.size === 0) {
            activeCalls.delete(workspaceId);
          }
        }
        activeSocketCalls.delete(socket.id);

        console.log(`User ${userId} left call in workspace ${workspaceId}`);

        const remainingParticipants = workspaceCalls ? Array.from(workspaceCalls.values()) : [];
        io.to(workspaceId).emit('call_participants_updated', {
          workspaceId,
          participants: remainingParticipants
        });
      }
    });

    // Relay WebRTC Signaling message
    socket.on('webrtc_signal', ({ toUserId, fromUserId, signalData }) => {
      const targetSocketId = onlineUsers.get(toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_signal', {
          fromUserId,
          signalData
        });
      }
    });

    // Track state changed (Mute / Camera off)
    socket.on('call_track_state_changed', ({ workspaceId, userId, audioOn, videoOn }) => {
      const workspaceCalls = activeCalls.get(workspaceId);
      if (workspaceCalls) {
        const pInfo = workspaceCalls.get(userId);
        if (pInfo) {
          if (audioOn !== undefined) pInfo.audioOn = audioOn;
          if (videoOn !== undefined) pInfo.videoOn = videoOn;
          workspaceCalls.set(userId, pInfo);
          
          io.to(workspaceId).emit('call_participants_updated', {
            workspaceId,
            participants: Array.from(workspaceCalls.values())
          });
        }
      }
    });


    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`Socket Client Disconnected: ${socket.id}`);
      
      // Clean up call session if in one
      const callInfo = activeSocketCalls.get(socket.id);
      if (callInfo) {
        const { workspaceId, userId } = callInfo;
        activeSocketCalls.delete(socket.id);
        const workspaceCalls = activeCalls.get(workspaceId);
        if (workspaceCalls) {
          workspaceCalls.delete(userId);
          if (workspaceCalls.size === 0) {
            activeCalls.delete(workspaceId);
          }
          io.to(workspaceId).emit('call_participants_updated', {
            workspaceId,
            participants: workspaceCalls ? Array.from(workspaceCalls.values()) : []
          });
        }
      }

      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_status_changed', {
          userId: socket.userId,
          status: 'offline'
        });
      }
    });
  });
};
