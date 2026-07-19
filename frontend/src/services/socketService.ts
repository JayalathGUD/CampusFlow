import { io, Socket } from 'socket.io-client';

class SocketService {
  public socket: Socket | null = null;

  // Establish connection with Backend
  public connect(userId: string) {
    if (this.socket) return;

    this.socket = io('');

    this.socket.on('connect', () => {
      console.log('Socket connected to server');
      this.socket?.emit('register_user', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  // Join a Workspace room
  public joinWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('join_workspace', workspaceId);
    }
  }

  // Leave a Workspace room
  public leaveWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('leave_workspace', workspaceId);
    }
  }

  // Emit a real-time message
  public sendMessage(message: any) {
    if (this.socket) {
      this.socket.emit('send_message', message);
    }
  }

  // Emit typing indicator
  public emitTyping(workspaceId: string, userId: string, fullName: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit('typing', { workspaceId, userId, fullName, isTyping });
    }
  }

  // Emit note edits
  public emitNoteEdit(noteId: string, workspaceId: string, content: string) {
    if (this.socket) {
      this.socket.emit('edit_note', { noteId, workspaceId, content });
    }
  }

  // Emit task adjustments (Kanban updates)
  public emitTaskChange(workspaceId: string, taskId: string, action: string, task: any) {
    if (this.socket) {
      this.socket.emit('task_change', { workspaceId, taskId, action, task });
    }
  }

  // Join Group Call in a Workspace
  public joinCall(workspaceId: string, userId: string, fullName: string, profilePicture?: string) {
    if (this.socket) {
      this.socket.emit('join_call', { workspaceId, userId, fullName, profilePicture });
    }
  }

  // Leave Group Call in a Workspace
  public leaveCall(workspaceId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('leave_call', { workspaceId, userId });
    }
  }

  // Send WebRTC signaling packet to a specific peer
  public sendWebrtcSignal(toUserId: string, fromUserId: string, signalData: any) {
    if (this.socket) {
      this.socket.emit('webrtc_signal', { toUserId, fromUserId, signalData });
    }
  }

  // Broadcast track states (camera or audio mute)
  public emitCallTrackState(workspaceId: string, userId: string, audioOn?: boolean, videoOn?: boolean) {
    if (this.socket) {
      this.socket.emit('call_track_state_changed', { workspaceId, userId, audioOn, videoOn });
    }
  }

  // Check if there is an active call in a workspace
  public checkActiveCall(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('check_active_call', workspaceId);
    }
  }

  // Close connection
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export default socketService;
