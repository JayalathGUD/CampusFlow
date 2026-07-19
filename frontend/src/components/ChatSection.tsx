import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import { 
  Send, 
  Paperclip, 
  Circle, 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

interface ChatSectionProps {
  workspaceId: string;
  members: any[];
  currentUser: any;
}

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    fullName: string;
    profilePicture: string;
  };
  recipient?: string | null;
  workspace?: string | null;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

const VideoWindow: React.FC<{
  stream: MediaStream;
  userName: string;
  videoOn: boolean;
  audioOn: boolean;
  isLocal?: boolean;
}> = ({ stream, userName, videoOn, audioOn, isLocal }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/30 shadow-md group flex items-center justify-center">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${videoOn ? 'opacity-100' : 'opacity-0 absolute'}`}
      />

      {/* Avatar fallback if camera is deactivated */}
      {!videoOn && (
        <div className="w-16 h-16 rounded-full bg-violet-650 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-500/25">
          {userName.split(' ').map((n) => n[0]).join('').toUpperCase() || 'CF'}
        </div>
      )}

      {/* Profile indicators */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/5">
        <span className="text-white text-[10px] font-bold truncate max-w-[100px]">{userName} {isLocal && "(You)"}</span>
        <div className="flex items-center gap-1">
          {!audioOn && (
            <span className="p-0.5 rounded bg-rose-500/25 text-rose-400">
              <MicOff className="w-3 h-3" />
            </span>
          )}
          {!videoOn && (
            <span className="p-0.5 rounded bg-slate-500/25 text-slate-400">
              <VideoOff className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatSection: React.FC<ChatSectionProps> = ({ workspaceId, members, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  
  // DM peer state: null represents general workspace channel, otherwise contains selected member object
  const [activePeer, setActivePeer] = useState<any | null>(null);
  
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Group Call States ---
  const [activeCallParticipants, setActiveCallParticipants] = useState<any[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [callViewMode, setCallViewMode] = useState<'maximized' | 'minimized' | 'inactive'>('inactive');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [localVideoOn, setLocalVideoOn] = useState(true);
  const [hasActiveWorkspaceCall, setHasActiveWorkspaceCall] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // --- Group Call WebRTC & Signaling Sync ---
  useEffect(() => {
    // Reset call status whenever workspace changes
    leaveGroupCall(false);
    setHasActiveWorkspaceCall(false);
    setActiveCallParticipants([]);

    if (socketService.socket) {
      socketService.checkActiveCall(workspaceId);

      socketService.socket.on('active_call_status', ({ workspaceId: wsId, active, participants }) => {
        if (wsId === workspaceId) {
          setHasActiveWorkspaceCall(active);
          setActiveCallParticipants(participants);
        }
      });

      socketService.socket.on('call_participants_updated', ({ workspaceId: wsId, participants }) => {
        if (wsId === workspaceId) {
          setActiveCallParticipants(participants);
          setHasActiveWorkspaceCall(participants.length > 0);
          
          // Verify if user is still allowed/registered in the call
          const isSelfInCall = participants.some((p: any) => p.userId === currentUser.id);
          if (localStreamRef.current && !isSelfInCall) {
            leaveGroupCall(false);
          }
        }
      });

      socketService.socket.on('call_joined_ack', async ({ workspaceId: wsId, participants }) => {
        if (wsId === workspaceId) {
          console.log("Joined call ack, existing participants:", participants);
          for (const p of participants) {
            await initiatePeerConnection(p.userId, true);
          }
        }
      });

      socketService.socket.on('webrtc_signal', async ({ fromUserId, signalData }) => {
        await handleSignalingMessage(fromUserId, signalData);
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('active_call_status');
        socketService.socket.off('call_participants_updated');
        socketService.socket.off('call_joined_ack');
        socketService.socket.off('webrtc_signal');
      }
      
      // Clean up local media and WebRTC connections
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      
      // Notify backend if we were active
      socketService.leaveCall(workspaceId, currentUser.id);
    };
  }, [workspaceId]);

  const initiatePeerConnection = async (peerId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(peerId)) {
      peerConnections.current.get(peerId)?.close();
      peerConnections.current.delete(peerId);
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnections.current.set(peerId, pc);

    // Forward local media tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendWebrtcSignal(peerId, currentUser.id, {
          type: 'candidate',
          candidate: event.candidate
        });
      }
    };

    // Remote stream track added
    pc.ontrack = (event) => {
      console.log("Remote track added from peer:", peerId);
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.sendWebrtcSignal(peerId, currentUser.id, {
          type: 'offer',
          sdp: offer.sdp
        });
      } catch (err) {
        console.error("Failed to generate WebRTC offer:", err);
      }
    }

    return pc;
  };

  const handleSignalingMessage = async (peerId: string, signal: any) => {
    let pc = peerConnections.current.get(peerId);

    if (signal.type === 'offer') {
      if (!pc) {
        pc = await initiatePeerConnection(peerId, false);
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketService.sendWebrtcSignal(peerId, currentUser.id, {
          type: 'answer',
          sdp: answer.sdp
        });
      } catch (err) {
        console.error("Failed to handle remote offer:", err);
      }
    } else if (signal.type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } catch (err) {
          console.error("Failed to handle remote answer:", err);
        }
      }
    } else if (signal.type === 'candidate') {
      if (!pc) {
        pc = await initiatePeerConnection(peerId, false);
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (err) {
        console.error("Failed to process remote ICE candidate:", err);
      }
    }
  };

  const startGroupCall = async () => {
    setIsInCall(true);
    setCallViewMode('maximized');
    setLocalAudioOn(true);
    setLocalVideoOn(true);

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      console.log("Hardware stream obtained successfully");
    } catch (err) {
      console.warn("Media devices not found or permission denied, fallback to mock canvas stream", err);
      
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      let angle = 0;

      const timerId = setInterval(() => {
        if (!localStreamRef.current) {
          clearInterval(timerId);
          return;
        }
        if (ctx) {
          // background slate-900
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 480, 360);

          // animated radial gradient circle
          const grad = ctx.createRadialGradient(240, 180, 10, 240, 180, 150);
          grad.addColorStop(0, '#7c3aed'); // violet-600
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(240, 180, 100 + Math.sin(angle) * 15, 0, Math.PI * 2);
          ctx.fill();

          // User Name Initials text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initials = currentUser.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CF';
          ctx.fillText(initials, 240, 160);

          ctx.fillStyle = '#a78bfa'; // violet-400
          ctx.font = '16px sans-serif';
          ctx.fillText("Mock Call Stream Active", 240, 210);

          angle += 0.08;
        }
      }, 100);

      const canvasStream = canvas.captureStream(12);

      // Silent Oscillator Audio Track Fallback
      let audioTrack: MediaStreamTrack | null = null;
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        osc.connect(dest);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.0001; // silent oscillator
        osc.connect(gainNode);
        gainNode.connect(dest);
        osc.start();
        audioTrack = dest.stream.getAudioTracks()[0];
      } catch (e) {
        console.error("Failed to instantiate mock audio node:", e);
      }

      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      stream = canvasStream;
      (stream as any).isMock = true;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    socketService.joinCall(workspaceId, currentUser.id, currentUser.fullName, currentUser.profilePicture);
  };

  const joinGroupCall = async () => {
    await startGroupCall();
  };

  const leaveGroupCall = (emitEvent = true) => {
    setIsInCall(false);
    setCallViewMode('inactive');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams({});

    if (emitEvent) {
      socketService.leaveCall(workspaceId, currentUser.id);
    }
  };

  const toggleLocalAudio = () => {
    const nextAudio = !localAudioOn;
    setLocalAudioOn(nextAudio);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = nextAudio);
    }
    socketService.emitCallTrackState(workspaceId, currentUser.id, nextAudio, undefined);
  };

  const toggleLocalVideo = () => {
    const nextVideo = !localVideoOn;
    setLocalVideoOn(nextVideo);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = nextVideo);
    }
    socketService.emitCallTrackState(workspaceId, currentUser.id, undefined, nextVideo);
  };

  useEffect(() => {
    fetchChatHistory();

    // Socket.IO event bindings
    if (socketService.socket) {
      socketService.socket.on('new_message', (msg: Message) => {
        // Append message if it matches current channel or DM partner
        const isWorkspaceMessage = !activePeer && msg.workspace === workspaceId;
        const isDMFromPeer = activePeer && msg.sender._id === activePeer.user._id && !msg.workspace;
        const isDMFromSelf = activePeer && msg.sender._id === currentUser.id && msg.recipient === activePeer.user._id && !msg.workspace;

        if (isWorkspaceMessage || isDMFromPeer || isDMFromSelf) {
          setMessages(prev => [...prev, msg]);
        }
      });

      socketService.socket.on('typing', ({ userId, fullName, isTyping }) => {
        if (isTyping && userId !== currentUser.id) {
          setTypingUser(fullName);
        } else {
          setTypingUser(null);
        }
      });

      // Simple presence tracking
      socketService.socket.on('user_status_changed', ({ userId, status }) => {
        if (status === 'online') {
          setOnlineMembers(prev => [...new Set([...prev, userId])]);
        } else {
          setOnlineMembers(prev => prev.filter(id => id !== userId));
        }
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('new_message');
        socketService.socket.off('typing');
        socketService.socket.off('user_status_changed');
      }
    };
  }, [workspaceId, activePeer]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      let url = `/api/chat/workspace/${workspaceId}`;
      if (activePeer) {
        url = `/api/chat/direct/${activePeer.user._id}`;
      }
      const res = await axios.get(url);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      const payload: any = {
        content: text,
        type: 'text'
      };

      if (activePeer) {
        payload.recipientId = activePeer.user._id;
      } else {
        payload.workspaceId = workspaceId;
      }

      const res = await axios.post('/api/chat', payload);
      const newMsg = res.data.message;

      // Append locally
      setMessages(prev => [...prev, newMsg]);

      // Broadcast through WebSockets
      socketService.sendMessage(newMsg);
      
      // Stop typing emitter
      socketService.emitTyping(workspaceId, currentUser.id, currentUser.fullName, false);
      setText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    // Broadcast typing indicator
    if (e.target.value.trim().length > 0) {
      socketService.emitTyping(workspaceId, currentUser.id, currentUser.fullName, true);
    } else {
      socketService.emitTyping(workspaceId, currentUser.id, currentUser.fullName, false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (!activePeer) {
      formData.append('workspaceId', workspaceId);
    } else {
      formData.append('recipientId', activePeer.user._id);
    }

    try {
      // Direct mock upload that responds with file details
      const uploadRes = await axios.post(`/api/files/${workspaceId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileData = uploadRes.data.file;

      // Now create chat message for file
      const payload: any = {
        content: `Shared file: ${fileData.name}`,
        type: 'file',
        fileUrl: fileData.url,
        fileName: fileData.name
      };

      if (activePeer) {
        payload.recipientId = activePeer.user._id;
      } else {
        payload.workspaceId = workspaceId;
      }

      const chatRes = await axios.post('/api/chat', payload);
      const newMsg = chatRes.data.message;

      setMessages(prev => [...prev, newMsg]);
      socketService.sendMessage(newMsg);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl overflow-hidden m-6 shadow-sm">
      {/* Members Directory Column */}
      <div className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-800/20 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 text-left">Workspace Chat</h3>
          <p className="text-[10px] text-slate-400 text-left">Connect with team members</p>
        </div>
        
        {/* Navigation directories */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-left">
          <button
            onClick={() => setActivePeer(null)}
            className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              !activePeer 
                ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center text-white font-bold">#</div>
            <span>General Channel</span>
          </button>

          <span className="px-3 py-2 text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Direct Messages</span>
          
          {members
            .filter(m => m.user._id !== currentUser.id)
            .map((m) => {
              const isOnline = onlineMembers.includes(m.user._id);
              return (
                <button
                  key={m.user._id}
                  onClick={() => setActivePeer(m)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                    activePeer?.user._id === m.user._id
                      ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {m.user.profilePicture ? (
                      <img src={m.user.profilePicture} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-[9px]">
                        {m.user.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[100px]">{m.user.fullName}</span>
                  </div>
                  <Circle className={`w-2 h-2 ${isOnline ? 'text-emerald-500 fill-emerald-500' : 'text-slate-300 dark:text-slate-700'}`} />
                </button>
              );
            })}
        </div>
      </div>

      {/* Main Conversation Logs Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/40 relative min-w-0">
        {/* Active Session Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2.5 text-left">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {activePeer ? activePeer.user.fullName : '# General Workspace Chat'}
            </span>
            {activePeer && (
              <span className="text-[10px] text-slate-400">{activePeer.user.degreeProgram || 'Student'}</span>
            )}
          </div>

          {/* Group Call Header Actions */}
          {!activePeer && (
            <div className="flex items-center gap-2">
              {isInCall ? (
                <button
                  type="button"
                  onClick={() => setCallViewMode(prev => prev === 'maximized' ? 'minimized' : 'maximized')}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-[11px] font-bold transition-all shadow-md shadow-violet-500/10 flex items-center gap-1.5"
                >
                  {callViewMode === 'maximized' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{callViewMode === 'maximized' ? 'Minimize Call' : 'Maximize Call'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startGroupCall}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-slate-650 dark:text-slate-350 hover:text-violet-600 dark:hover:text-violet-400 transition-all flex items-center gap-1.5 font-bold text-[11px]"
                  title="Start Workspace Video Call"
                >
                  <Video className="w-4 h-4 text-violet-500" />
                  <span>Start Call</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active Call Notification Banner */}
        {hasActiveWorkspaceCall && !isInCall && (
          <div className="bg-gradient-to-r from-violet-650 to-indigo-650 px-6 py-3 text-white flex items-center justify-between shadow-md select-none border-b border-violet-700/30 flex-shrink-0 animate-pulse-subtle">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <div className="text-left">
                <p className="text-xs font-bold tracking-wide">Live Group Call Active</p>
                <p className="text-[10px] text-violet-100 mt-0.5">
                  {activeCallParticipants.length} participant{activeCallParticipants.length !== 1 ? 's' : ''} currently connected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={joinGroupCall}
              className="px-4 py-1.5 bg-white hover:bg-violet-50 text-violet-700 text-[11px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Join Call</span>
            </button>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isSelf = msg.sender._id === currentUser.id;
            return (
              <div key={msg._id} className={`flex gap-3 max-w-[85%] text-left ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}>
                {/* Profile Avatar */}
                {!isSelf && (
                  msg.sender.profilePicture ? (
                    <img src={msg.sender.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover mt-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-605 dark:text-violet-400 font-bold text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                      {msg.sender.fullName.charAt(0).toUpperCase()}
                    </div>
                  )
                )}

                {/* Bubble Container */}
                <div>
                  {!isSelf && <span className="text-[10px] font-semibold text-slate-505 block mb-0.5">{msg.sender.fullName}</span>}
                  
                  <div className={`p-3 rounded-2xl text-xs ${
                    isSelf 
                      ? 'bg-violet-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.type === 'file' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium underline italic truncate max-w-xs">{msg.fileName}</span>
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-[10px] font-bold uppercase tracking-wider block border px-2.5 py-1 rounded-lg ${
                            isSelf ? 'border-violet-400/50 hover:bg-violet-700' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-200/50 dark:hover:bg-slate-700'
                          }`}
                        >
                          View File Attachment
                        </a>
                      </div>
                    ) : (
                      <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                    )}
                  </div>
                  <span className={`text-[9px] text-slate-400 mt-1 block ${isSelf ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* User Typing Alert */}
        {typingUser && (
          <div className="absolute bottom-16 left-6 text-[10px] text-slate-400 italic">
            {typingUser} is typing...
          </div>
        )}

        {/* Input box form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2.5 items-center flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-650 transition-colors"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          
          <input
            type="text"
            placeholder={activePeer ? `Message ${activePeer.user.fullName}...` : 'Message # General...'}
            value={text}
            onChange={handleInputChange}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-2 text-xs focus:ring-2 focus:ring-violet-550 focus:outline-none dark:text-slate-100"
          />

          <button
            type="submit"
            className="p-2.5 rounded-full bg-violet-605 hover:bg-violet-700 text-white shadow-md shadow-violet-500/10 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Maximized Call Screen Overlay */}
        {isInCall && callViewMode === 'maximized' && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col p-6 animate-fade-in text-white">
            {/* Call Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-left">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span>Workspace Team Call</span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-rose-600 text-white rounded-full uppercase tracking-wider animate-pulse">Live</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Connected: {activeCallParticipants.length} member{activeCallParticipants.length !== 1 ? 's' : ''} in session
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCallViewMode('minimized')}
                className="px-3.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold border border-white/10 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Minimize to Chat</span>
              </button>
            </div>

            {/* Video Stream Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-center justify-items-center">
              {/* Local Stream */}
              {localStream && (
                <VideoWindow
                  stream={localStream}
                  userName={currentUser.fullName}
                  videoOn={localVideoOn}
                  audioOn={localAudioOn}
                  isLocal={true}
                />
              )}

              {/* Remote Streams */}
              {activeCallParticipants
                .filter(p => p.userId !== currentUser.id)
                .map(p => {
                  const stream = remoteStreams[p.userId];
                  return stream ? (
                    <VideoWindow
                      key={p.userId}
                      stream={stream}
                      userName={p.fullName}
                      videoOn={p.videoOn}
                      audioOn={p.audioOn}
                    />
                  ) : (
                    <div key={p.userId} className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md flex items-center justify-center flex-col gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-850 flex items-center justify-center text-slate-400 text-sm font-bold border border-slate-800 animate-pulse">
                        {p.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'CF'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{p.fullName} (Connecting...)</span>
                    </div>
                  );
                })}
            </div>

            {/* Controls Toolbar */}
            <div className="h-16 flex items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 px-6 max-w-sm mx-auto w-full flex-shrink-0">
              <button
                type="button"
                onClick={toggleLocalAudio}
                className={`p-3 rounded-full transition-all border cursor-pointer ${
                  localAudioOn 
                    ? 'bg-slate-850 hover:bg-slate-800 border-white/10 text-white' 
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-500/20 text-white shadow-lg shadow-rose-500/20'
                }`}
                title={localAudioOn ? "Mute Mic" : "Unmute Mic"}
              >
                {localAudioOn ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
              </button>

              <button
                type="button"
                onClick={toggleLocalVideo}
                className={`p-3 rounded-full transition-all border cursor-pointer ${
                  localVideoOn 
                    ? 'bg-slate-850 hover:bg-slate-800 border-white/10 text-white' 
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-500/20 text-white shadow-lg shadow-rose-500/20'
                }`}
                title={localVideoOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {localVideoOn ? <Video className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
              </button>

              <button
                type="button"
                onClick={() => leaveGroupCall(true)}
                className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 border border-rose-550 text-white shadow-lg shadow-rose-500/30 transition-all flex items-center justify-center cursor-pointer"
                title="Leave Call"
              >
                <PhoneOff className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* Minimized Call Floating Card */}
        {isInCall && callViewMode === 'minimized' && (
          <div className="absolute bottom-20 right-6 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-4 w-60 text-white text-left animate-slide-in flex flex-col gap-3 animate-fade-in">
            {/* Card Header */}
            <div className="flex justify-between items-center">
              <div className="min-w-0">
                <span className="block text-[9px] font-bold text-violet-400 uppercase tracking-wider">Active Call</span>
                <span className="block text-xs font-semibold truncate mt-0.5">{activeCallParticipants.length} participant{activeCallParticipants.length !== 1 ? 's' : ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setCallViewMode('maximized')}
                className="p-1 rounded-lg bg-slate-850 border border-white/5 hover:bg-slate-800 text-white cursor-pointer"
                title="Maximize Call Window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Small Participants List */}
            <div className="max-h-24 overflow-y-auto space-y-1.5 no-scrollbar py-1 pr-1">
              {localStream && (
                <div className="flex items-center justify-between text-[10px] bg-slate-850 px-2 py-1.5 rounded-lg border border-white/5">
                  <span className="truncate font-semibold text-slate-350">{currentUser.fullName} (You)</span>
                  <div className="flex gap-1">
                    {localAudioOn ? <Mic className="w-3 h-3 text-emerald-500" /> : <MicOff className="w-3 h-3 text-rose-500" />}
                    {localVideoOn ? <Video className="w-3 h-3 text-emerald-500" /> : <VideoOff className="w-3 h-3 text-rose-500" />}
                  </div>
                </div>
              )}
              {activeCallParticipants
                .filter(p => p.userId !== currentUser.id)
                .map(p => (
                  <div key={p.userId} className="flex items-center justify-between text-[10px] bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-900">
                    <span className="truncate text-slate-300">{p.fullName}</span>
                    <div className="flex gap-1">
                      {p.audioOn ? <Mic className="w-3 h-3 text-emerald-500" /> : <MicOff className="w-3 h-3 text-rose-500" />}
                      {p.videoOn ? <Video className="w-3 h-3 text-emerald-500" /> : <VideoOff className="w-3 h-3 text-rose-500" />}
                    </div>
                  </div>
                ))}
            </div>

            {/* Floating Control Bar */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={toggleLocalAudio}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${localAudioOn ? 'bg-slate-850 hover:bg-slate-800' : 'bg-rose-600 text-white'}`}
                  title={localAudioOn ? "Mute" : "Unmute"}
                >
                  {localAudioOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={toggleLocalVideo}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${localVideoOn ? 'bg-slate-850 hover:bg-slate-800' : 'bg-rose-600 text-white'}`}
                  title={localVideoOn ? "Camera Off" : "Camera On"}
                >
                  {localVideoOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => leaveGroupCall(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                title="Leave Call"
              >
                <PhoneOff className="w-3 h-3" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
