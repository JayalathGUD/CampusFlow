import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import {
  Search,
  Bell,
  User,
  Plus,
  BookOpen,
  Upload,
  FilePlus,
  Video,
  Layers,
  Calendar,
  MessageSquare,
  Users,
  Briefcase,
  Clock,
  Trash2,
  Copy,
  Check,
  Megaphone,
  PlusCircle,
  CircleDot
} from 'lucide-react';
import { NotesSection } from '../components/NotesSection';
import { FilesSection } from '../components/FilesSection';
import { ChatSection } from '../components/ChatSection';
import { KanbanBoard } from '../components/KanbanBoard';

interface WorkspaceDashboardProps {
  workspace: {
    _id: string;
    name: string;
    description: string;
    inviteCode: string;
    semester?: string;
    department?: string;
    owner: any;
  };
  user: any;
  members: any[];
  darkMode: boolean;
  toggleDarkMode: () => void;
  toggleSidebar?: () => void;
}

export interface Subtask {
  _id: string;
  title: string;
  isCompleted: boolean;
  assignee?: {
    _id: string;
    fullName: string;
    profilePicture?: string;
  };
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignee?: {
    _id: string;
    fullName: string;
    profilePicture?: string;
  };
  subtasks?: Subtask[];
  commentsCount?: number;
  attachmentsCount?: number;
}

interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    fullName: string;
    profilePicture?: string;
  };
  createdAt: string;
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  workspace,
  user,
  members
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<
    'overview' | 'assignments' | 'notes' | 'files' | 'calendar' | 'chat' | 'members' | 'announcements'
  >('overview');

  // Backend state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentChat, setRecentChat] = useState<any[]>([]);

  // Modals state
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [subtasks, setSubtasks] = useState<{ title: string; assigneeId?: string }[]>([]);
  const [subtaskText, setSubtaskText] = useState('');
  const [subtaskUser, setSubtaskUser] = useState('');

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Search/Copy states
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // User Profile Dropdown state
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchWorkspaceStats();
    fetchAnnouncements();
    fetchTasks();
    fetchRecentChat();

    // Listen for WebSocket updates on tasks
    if (socketService.socket) {
      socketService.socket.on('task_updated', ({ taskId, action, task }) => {
        if (action === 'create') {
          setTasks(prev => [task, ...prev]);
        } else if (action === 'update') {
          setTasks(prev => prev.map(t => t._id === taskId ? task : t));
        } else if (action === 'delete') {
          setTasks(prev => prev.filter(t => t._id !== taskId));
        }
      });

      socketService.socket.on('new_message', (msg) => {
        if (msg.workspace === workspace._id) {
          setRecentChat(prev => [msg, ...prev.slice(0, 4)]);
        }
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('task_updated');
        socketService.socket.off('new_message');
      }
    };
  }, [workspace._id]);

  const fetchWorkspaceStats = async () => {
    try {
      const notesRes = await axios.get(`/api/notes/${workspace._id}`);
      setNotesCount(notesRes.data.notes?.length || 0);

      const filesRes = await axios.get(`/api/files/${workspace._id}`);
      setFilesCount(filesRes.data.files?.length || 0);
    } catch (err) {
      console.error('Error fetching workspace stats', err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`/api/announcements/${workspace._id}`);
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error('Error fetching announcements', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`/api/tasks/${workspace._id}`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Error fetching tasks', err);
    }
  };

  const fetchRecentChat = async () => {
    try {
      const res = await axios.get(`/api/chat/workspace/${workspace._id}`);
      setRecentChat(res.data.messages?.slice(-5).reverse() || []);
    } catch (err) {
      console.error('Error fetching recent chat messages', err);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workspace.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Task creation handler
  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await axios.post(`/api/tasks/${workspace._id}`, {
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        assignee: newAssignee || undefined,
        dueDate: newDueDate || undefined,
        status: 'todo',
        subtasks: subtasks.map(s => ({
          title: s.title,
          isCompleted: false,
          assignee: s.assigneeId || undefined
        }))
      });

      const createdTask = res.data.task;
      setTasks(prev => [createdTask, ...prev]);

      if (socketService.socket) {
        socketService.socket.emit('task_change', {
          workspaceId: workspace._id,
          taskId: createdTask._id,
          action: 'create',
          task: createdTask
        });
      }

      setShowAddAssignment(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewAssignee('');
      setNewDueDate('');
      setSubtasks([]);
    } catch (err) {
      console.error(err);
      alert('Failed to create assignment');
    }
  };

  const handleAddSubtaskInput = () => {
    if (!subtaskText.trim()) return;
    setSubtasks(prev => [...prev, { title: subtaskText.trim(), assigneeId: subtaskUser || undefined }]);
    setSubtaskText('');
    setSubtaskUser('');
  };


  // Announcement creation
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      const res = await axios.post(`/api/announcements/${workspace._id}`, {
        title: annTitle,
        content: annContent
      });

      setAnnouncements(prev => [res.data.announcement, ...prev]);
      setShowCreateAnnouncement(false);
      setAnnTitle('');
      setAnnContent('');
    } catch (err) {
      console.error(err);
      alert('Failed to post announcement');
    }
  };

  // Derived states
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const upcomingDeadlines = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= new Date() && t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0B1020] text-slate-100 font-sans">
      
      {/* Redesigned Premium Cover & Banner Area */}
      <div className="relative flex-shrink-0">
        
        {/* Cover Photo with Soft Gradients */}
        <div className="h-44 w-full bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent opacity-60"></div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0B1020] to-transparent"></div>
          
          {/* Cover Floating Dots / Abstract design */}
          <div className="absolute top-8 left-1/4 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl"></div>
          <div className="absolute top-12 right-1/3 w-40 h-40 rounded-full bg-violet-600/15 blur-3xl"></div>

          {/* Header Action Navbar overlay */}
          <div className="absolute top-4 left-6 right-6 hidden md:flex items-center justify-between z-10">
            {/* Search */}
            <div className="relative max-w-md w-72">
              <input
                type="text"
                placeholder="Search resources, chat, assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-full text-xs bg-[#1A2236]/80 border border-slate-700/60 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-200 placeholder-slate-500 transition-all backdrop-blur-md"
              />
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Profile / Notifications */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full bg-[#1A2236]/60 border border-slate-700/50 text-slate-400 hover:text-white transition-all backdrop-blur-md relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400"></span>
              </button>

              {/* User Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-[#1A2236]/80 border border-slate-700/50 hover:bg-[#1A2236] transition-all backdrop-blur-md focus:outline-none"
                >
                  {user.profilePicture ? (
                    <img src={user.profilePicture} className="w-6 h-6 rounded-full object-cover" alt="Profile" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.fullName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-350 pr-1 hidden sm:inline">
                    {user.fullName?.split(' ')[0]}
                  </span>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1A2236] border border-slate-800 shadow-2xl py-1.5 z-50 text-left">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-slate-250 truncate">{user.fullName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        window.location.href = `/portfolio/${user.id}`;
                      }}
                      className="w-full px-4 py-2 text-xs text-slate-300 hover:bg-slate-850 hover:text-white flex items-center gap-2 text-left"
                    >
                      <User className="w-3.5 h-3.5 text-slate-450" />
                      My Portfolio
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('cf_token');
                        window.location.href = '/login';
                      }}
                      className="w-full px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/20 flex items-center gap-2 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Info Banner Overlay (SaaS Layout) */}
        <div className="px-4 md:px-8 -mt-10 relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 text-left">
            {/* Workspace Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 shadow-xl shadow-black/40 flex-shrink-0">
              <div className="w-full h-full bg-[#111827] rounded-[14px] flex items-center justify-center font-black text-2xl text-white tracking-widest">
                {workspace.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
            
            {/* Metadata info */}
            <div className="pb-1 min-w-0">
              <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight truncate max-w-xs sm:max-w-md">
                  {workspace.name}
                </h1>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-violet-500/10 border border-violet-500/30 text-violet-400">
                    {workspace.semester || 'Semester 1'}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    {workspace.department || 'Software Engineering'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-450 mt-1 max-w-xl truncate">{workspace.description || 'No description provided.'}</p>
            </div>
          </div>

          {/* Join Code Copy Banner */}
          <div className="flex items-center gap-3 pb-1 self-start md:self-end">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#1A2236]/80 border border-slate-700/50 flex items-center gap-3 backdrop-blur-md">
              <div className="text-left">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Join Code</span>
                <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider mt-0.5 block">{workspace.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-450 hover:text-white transition-all cursor-pointer"
                title="Copy Join Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Glassmorphic Toolbar) */}
      <div className="px-4 md:px-8 mt-6 flex-shrink-0">
        <div className="border-b border-slate-800/80 flex items-center justify-between">
          <nav className="flex flex-row flex-nowrap gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: 'overview', title: 'Overview', icon: Layers },
              { id: 'assignments', title: 'Assignments', icon: Briefcase },
              { id: 'notes', title: 'Notes', icon: BookOpen },
              { id: 'files', title: 'Files', icon: FilePlus },
              { id: 'calendar', title: 'Calendar', icon: Calendar },
              { id: 'chat', title: 'Chat', icon: MessageSquare },
              { id: 'members', title: 'Members', icon: Users },
              { id: 'announcements', title: 'Announcements', icon: Megaphone }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 relative -mb-[2px] ${
                    isActive
                      ? 'border-violet-500 text-white font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-350 hover:border-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                  <span>{tab.title}</span>
                  {tab.id === 'announcements' && announcements.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Workspace Statistics Ribbon */}
      <div className="px-4 md:px-8 mt-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            { label: 'Assignments', val: tasks.length, color: 'text-violet-400', border: 'border-violet-500/20', bg: 'from-violet-650/5' },
            { label: 'Completed Tasks', val: completedTasksCount, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'from-emerald-650/5' },
            { label: 'Upcoming Deadlines', val: upcomingDeadlines.length, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'from-amber-650/5' },
            { label: 'Shared Notes', val: notesCount, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'from-cyan-650/5' },
            { label: 'Files Shared', val: filesCount, color: 'text-pink-400', border: 'border-pink-500/20', bg: 'from-pink-650/5' },
            { label: 'Members', val: members.length, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'from-blue-650/5' }
          ].map((stat, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl bg-[#1A2236]/40 border ${stat.border} flex flex-col items-start bg-gradient-to-br ${stat.bg} to-transparent hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20 transition-all cursor-default text-left`}
            >
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-lg font-black mt-1 ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Tab Render Container */}
      <div className="flex-1 overflow-hidden p-4 md:p-8 min-h-0">
        
        {/* TAB 1: OVERVIEW */}
        {currentSubTab === 'overview' && (
          <div className="h-full flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden min-h-0 no-scrollbar">
            {/* Left Content Area (Welcome + Quick Actions + Activity Feed) */}
            <div className="w-full lg:flex-1 lg:overflow-y-auto no-scrollbar flex flex-col gap-6 pr-1 text-left min-h-0">
              
              {/* Welcome Section */}
              <div className="p-6 rounded-2xl bg-gradient-to-tr from-[#1A2236] to-[#111827] border border-slate-800/80 shadow-xl relative overflow-hidden">
                <div className="z-10 relative space-y-1.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    Welcome back, {user.fullName?.split(' ')[0]} 👋
                  </h2>
                  <p className="text-xs text-slate-400 max-w-lg">
                    Check your workspace schedule, coordinate sprint notes, upload assignments checklist, and collaborate on documents for your academic project.
                  </p>
                </div>
                
                {/* Floating graphic overlay */}
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-violet-600/10 to-transparent pointer-events-none"></div>
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-violet-650/10 blur-2xl"></div>
              </div>

              {/* Quick Actions Card Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'New Assignment', desc: 'Add new tasks checklist', icon: PlusCircle, click: () => setShowAddAssignment(true), color: 'text-violet-400 bg-violet-500/10 hover:bg-violet-500/20' },
                  { label: 'Upload Notes', desc: 'Document notes with AI', icon: Upload, click: () => setCurrentSubTab('notes'), color: 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20' },
                  { label: 'Share File', desc: 'Sync files to storage', icon: FilePlus, click: () => setCurrentSubTab('files'), color: 'text-pink-400 bg-pink-500/10 hover:bg-pink-500/20' },
                  { label: 'Create Meeting', desc: 'Start live student call', icon: Video, click: () => setShowMeetingModal(true), color: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' }
                ].map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={act.click}
                      className="p-4 rounded-2xl bg-[#1A2236]/60 border border-slate-800/80 hover:border-slate-700/80 flex flex-col items-start text-left hover:scale-[1.02] hover:-translate-y-0.5 transition-all shadow-md cursor-pointer group"
                    >
                      <div className={`p-2.5 rounded-xl ${act.color} transition-all`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-extrabold text-xs text-white mt-4 block">{act.label}</span>
                      <span className="text-[10px] text-slate-500 mt-1 block">{act.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Today's Schedule & Activity Feed Wrapper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Schedule Card List */}
                <div className="p-5 rounded-2xl bg-[#1A2236]/30 border border-slate-800/70 text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Upcoming Assignment Deadlines</h3>
                  </div>
                  <div className="space-y-3">
                    {upcomingDeadlines.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">No upcoming deadlines logged.</div>
                    ) : (
                      upcomingDeadlines.slice(0, 3).map((dl) => (
                        <div key={dl._id} className="flex justify-between items-center p-3 rounded-xl bg-[#1A2236]/60 border border-slate-800/80">
                          <div>
                            <span className="font-bold text-xs text-white block truncate max-w-[180px]">{dl.title}</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 block">{dl.priority} Priority</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {new Date(dl.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Announcements Feed */}
                <div className="p-5 rounded-2xl bg-[#1A2236]/30 border border-slate-800/70 text-left">
                  <div className="flex items-center gap-2 mb-4">
                    <Megaphone className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Recent Workspace Announcement</h3>
                  </div>
                  <div className="space-y-3">
                    {announcements.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">No announcements posted yet.</div>
                    ) : (
                      announcements.slice(0, 1).map((ann) => (
                        <div key={ann._id} className="p-3.5 rounded-xl bg-[#1A2236]/80 border border-slate-800/80 relative overflow-hidden">
                          <span className="font-extrabold text-xs text-white block mb-1">{ann.title}</span>
                          <p className="text-[11px] text-slate-450 leading-relaxed line-clamp-2">{ann.content}</p>
                          <div className="flex items-center gap-1.5 mt-3 text-[9px] text-slate-500">
                            <span>Posted by {ann.author.fullName}</span>
                            <span>&bull;</span>
                            <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="p-5 rounded-2xl bg-[#1A2236]/30 border border-slate-800/70 text-left">
                <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-violet-500" />
                  Workspace Timeline Activity
                </h3>
                
                <div className="space-y-6 relative border-l border-slate-800 pl-4 ml-2.5">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-violet-500 border border-[#0B1020]"></span>
                    <span className="text-xs font-bold text-slate-350 block">Recent Notes Created</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Students added lecture items and exam code snippets in the Shared Notes document.</span>
                  </div>
                  
                  {tasks.length > 0 && (
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border border-[#0B1020]"></span>
                      <span className="text-xs font-bold text-slate-350 block">Workspace Assignments Active</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{tasks.length} assignments tracked on Kanban assignments board.</span>
                    </div>
                  )}

                  <div className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-cyan-500 border border-[#0B1020]"></span>
                    <span className="text-xs font-bold text-slate-350 block">Active Team Members Connected</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{members.length} members synced inside this batch group workspace.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sticky Sidebar (Sticky Widgets) */}
            <div className="w-full lg:w-80 lg:flex-shrink-0 flex flex-col gap-6 lg:overflow-y-auto no-scrollbar min-h-0 text-left">
              
              {/* Online Members Widget */}
              <div className="p-5 rounded-2xl bg-[#1A2236]/50 border border-slate-800/80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Group Members ({members.length})</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                  {members.map((m) => (
                    <div key={m.user._id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.user.profilePicture ? (
                          <img src={m.user.profilePicture} className="w-7 h-7 rounded-lg object-cover" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-violet-650 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {m.user.fullName?.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-slate-300 truncate">{m.user.fullName}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-800/40 border border-slate-800 px-2 py-0.5 rounded-full">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini Calendar & Events */}
              <div className="p-5 rounded-2xl bg-[#1A2236]/50 border border-slate-800/80">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Workspace Calendar</h3>
                
                {/* Mini Calendar Representation */}
                <div className="p-3.5 rounded-xl bg-[#111827]/60 border border-slate-850 text-center">
                  <div className="grid grid-cols-7 gap-1.5 text-[10px] font-bold text-slate-500 mb-2">
                    <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-[10px] text-slate-350">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const isToday = i + 1 === new Date().getDate();
                      return (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-semibold ${
                            isToday ? 'bg-violet-600 text-white font-black' : ''
                          }`}
                        >
                          {i + 1}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Chat Widget */}
              <div className="p-5 rounded-2xl bg-[#1A2236]/50 border border-slate-800/80 flex flex-col min-h-0 max-h-64">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex-shrink-0">Live Team Feed</h3>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1 min-h-0">
                  {recentChat.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-500 py-6">No recent chat messages.</div>
                  ) : (
                    recentChat.map((msg) => (
                      <div key={msg._id} className="text-xs text-left bg-[#111827]/40 p-2.5 rounded-xl border border-slate-850">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-300">{msg.sender?.fullName?.split(' ')[0]}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-450 leading-relaxed truncate">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENTS (Premium Kanban Redesign) */}
        {currentSubTab === 'assignments' && (
          <KanbanBoard
            workspace={workspace}
            workspaceId={workspace._id}
            members={members}
            tasks={tasks}
            setTasks={setTasks}
          />
        )}

        {/* TAB 3: NOTES */}
        {currentSubTab === 'notes' && (
          <div className="h-full bg-[#0B1020] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col min-h-0">
            <NotesSection workspaceId={workspace._id} currentUser={user} />
          </div>
        )}

        {/* TAB 4: FILES */}
        {currentSubTab === 'files' && (
          <div className="h-full bg-[#0B1020] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col min-h-0">
            <FilesSection workspaceId={workspace._id} />
          </div>
        )}

        {/* TAB 5: CALENDAR */}
        {currentSubTab === 'calendar' && (
          <div className="h-full overflow-y-auto no-scrollbar flex flex-col gap-6 text-left min-h-0">
            <div className="text-left">
              <h3 className="text-base font-bold text-white">Upcoming Events & Schedule</h3>
              <p className="text-xs text-slate-500">Keep track of upcoming deadlines, exams, and team meetings</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-[#1A2236]/30 border border-slate-800/70">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Deadlines Calendar</h4>
                <div className="space-y-3.5">
                  {upcomingDeadlines.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">No deadlines in view. Create an assignment to log a date.</div>
                  ) : (
                    upcomingDeadlines.map((dl) => (
                      <div key={dl._id} className="p-3.5 rounded-xl bg-[#1A2236]/80 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-white block">{dl.title}</span>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 block">{dl.priority} priority</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                            {new Date(dl.dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Event / Meeting List */}
              <div className="p-5 rounded-2xl bg-[#1A2236]/30 border border-slate-800/70">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Workspace Calendar Events</h4>
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-[#1A2236]/80 border border-slate-800/80">
                    <span className="font-bold text-xs text-white block">Project Kickoff Meeting</span>
                    <span className="text-[9px] text-slate-500 mt-1 block">Live collaborative team planning call</span>
                    <span className="text-[10px] text-cyan-400 mt-3.5 block font-bold">14:00 - Tomorrow</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CHAT */}
        {currentSubTab === 'chat' && (
          <div className="h-full bg-[#0B1020] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col min-h-0">
            <ChatSection workspaceId={workspace._id} members={members} currentUser={user} />
          </div>
        )}

        {/* TAB 7: MEMBERS */}
        {currentSubTab === 'members' && (
          <div className="h-full overflow-y-auto no-scrollbar text-left flex flex-col gap-6 min-h-0">
            <div>
              <h3 className="text-base font-bold text-white">Workspace Classmates</h3>
              <p className="text-xs text-slate-500">Collaborating student members inside this academic cohort</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((m) => (
                <div key={m.user._id} className="p-4 rounded-2xl bg-[#1A2236]/40 border border-slate-850 flex items-center gap-3">
                  {m.user.profilePicture ? (
                    <img src={m.user.profilePicture} className="w-10 h-10 rounded-xl object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-violet-650 text-white flex items-center justify-center font-bold uppercase text-sm">
                      {m.user.fullName?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-white block truncate">{m.user.fullName}</span>
                    <span className="text-[9px] text-slate-500 block truncate">{m.user.email}</span>
                    <span className="text-[9px] uppercase font-bold text-violet-400 mt-1.5 block leading-none">{m.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: ANNOUNCEMENTS */}
        {currentSubTab === 'announcements' && (
          <div className="h-full flex flex-col overflow-hidden min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Workspace Board Announcements</h3>
                <p className="text-xs text-slate-500">Important notices, test guidelines, or lecture news posted by workspace members</p>
              </div>
              <button
                onClick={() => setShowCreateAnnouncement(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-md shadow-violet-500/15 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Post Notice
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 min-h-0 text-left">
              {announcements.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-16">
                  <Megaphone className="w-12 h-12 text-slate-650 mb-3" />
                  <span className="font-bold text-sm text-slate-400">Announcements Board Empty</span>
                  <span className="text-xs text-slate-600 mt-1">No announcement posts have been logged for this cohort.</span>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann._id} className="p-5 rounded-2xl bg-[#1A2236]/40 border border-slate-800/80">
                    <div className="flex items-center gap-2.5 mb-3.5">
                      {ann.author.profilePicture ? (
                        <img src={ann.author.profilePicture} className="w-8 h-8 rounded-lg object-cover" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-violet-650 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {ann.author.fullName?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-xs text-white block">{ann.author.fullName}</span>
                        <span className="text-[9px] text-slate-500 block">{new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-200 mb-1.5">{ann.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Assignment / Task */}
      {showAddAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-left">
            <h3 className="font-extrabold text-sm text-white mb-4 uppercase tracking-wider">Add Workspace Assignment</h3>
            <form onSubmit={handleCreateAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Systems Lab"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide brief details..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-700/60 rounded-xl bg-[#1A2236] text-white text-xs focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-700/60 rounded-xl bg-[#1A2236] text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Checklist Subtasks */}
              <div className="border-t border-slate-800 pt-3">
                <label className="block text-[10px] font-bold text-slate-450 mb-2 uppercase tracking-wider">Assignment Subtasks Checklist</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Task item name..."
                    value={subtaskText}
                    onChange={(e) => setSubtaskText(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:outline-none"
                  />
                  <select
                    value={subtaskUser}
                    onChange={(e) => setSubtaskUser(e.target.value)}
                    className="w-24 px-2 py-1.5 border border-slate-700/60 rounded-xl bg-[#1A2236] text-[10px] focus:outline-none"
                  >
                    <option value="">Assignee</option>
                    {members.map(m => (
                      <option key={m.user._id} value={m.user._id}>{m.user.fullName?.split(' ')[0]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSubtaskInput}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Add
                  </button>
                </div>
                
                {subtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar border border-slate-800 p-2.5 rounded-xl bg-[#111827]/40">
                    {subtasks.map((st, i) => (
                      <div key={i} className="flex justify-between items-center text-xs text-slate-400">
                        <span className="truncate max-w-[200px]">{st.title}</span>
                        {st.assigneeId && (
                          <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            {members.find(m => m.user._id === st.assigneeId)?.user.fullName?.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAssignment(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/10 cursor-pointer"
                >
                  Add Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Announcement */}
      {showCreateAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-left">
            <h3 className="font-extrabold text-sm text-white mb-4 uppercase tracking-wider">Post Cohort Announcement</h3>
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Title / Heading</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exam Timetable Released"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter details for the cohort..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnouncement(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/10 cursor-pointer"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Meeting */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
            <Video className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <h3 className="font-extrabold text-sm text-white mb-2 uppercase tracking-wider">Create Live Study Meeting</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">Create a live, student-to-student workspace meeting inside this batch. Video calling utilizes Jitsi/WebRTC.</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMeetingModal(false);
                  alert('Launching WebRTC study room call...');
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white shadow-md cursor-pointer"
              >
                Create Study Call
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
