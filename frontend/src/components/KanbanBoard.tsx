import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import axios from 'axios';
import socketService from '../services/socketService';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUpDown,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import type { Task } from '../pages/WorkspaceDashboard';

interface Comment {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

interface Attachment {
  _id: string;
  name: string;
  url: string;
  fileType: string;
  createdAt: string;
}

interface KanbanBoardProps {
  workspace: any;
  workspaceId: string;
  members: any[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const COLUMNS: { id: 'todo' | 'in_progress' | 'review' | 'completed'; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'review', title: 'In Review', color: 'bg-indigo-550' },
  { id: 'completed', title: 'Completed', color: 'bg-emerald-500' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ workspace, workspaceId, members, tasks, setTasks }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Modals / Inputs
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState<{ title: string; assigneeId?: string }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Interactive expanded checklists tracker
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Local persistence of task comments & attachments
  const [taskComments, setTaskComments] = useState<Record<string, Comment[]>>({});
  const [taskAttachments, setTaskAttachments] = useState<Record<string, Attachment[]>>({});

  // Active modal/drawer targets
  const [activeCommentsTask, setActiveCommentsTask] = useState<Task | null>(null);
  const [activeAttachmentsTask, setActiveAttachmentsTask] = useState<Task | null>(null);
  
  // Comment and attachment form fields
  const [newCommentText, setNewCommentText] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  useEffect(() => {
    // Generate initial comments & attachments for tasks if not already present
    const newComments = { ...taskComments };
    const newAttachments = { ...taskAttachments };
    let changed = false;

    tasks.forEach((t) => {
      if (!newComments[t._id]) {
        const seedIndex = t._id.charCodeAt(t._id.length - 1) || 0;
        const count = (seedIndex % 3) + 1; // 1 to 3 comments
        const mockComments: Comment[] = [];
        for (let i = 0; i < count; i++) {
          const author = members[(seedIndex + i) % members.length]?.user || { fullName: 'Collaborator', profilePicture: '' };
          mockComments.push({
            _id: `${t._id}-c-${i}`,
            authorName: author.fullName,
            authorAvatar: author.profilePicture,
            content: i === 0 ? "Let's review the rubric for this assignment." : i === 1 ? "I uploaded the initial files to the shared folder." : "Looks good, I will finish my subtask tonight.",
            createdAt: new Date(Date.now() - (3 - i) * 3600 * 1000).toLocaleString()
          });
        }
        newComments[t._id] = mockComments;
        changed = true;
      }

      if (!newAttachments[t._id]) {
        const seedIndex = t._id.charCodeAt(t._id.length - 1) || 0;
        const count = seedIndex % 2; // 0 or 1 attachment
        const mockAttachments: Attachment[] = [];
        if (count > 0) {
          mockAttachments.push({
            _id: `${t._id}-a-0`,
            name: 'Assignment_Requirements.pdf',
            url: '#',
            fileType: 'pdf',
            createdAt: new Date(Date.now() - 5 * 3600 * 1000).toLocaleString()
          });
        }
        newAttachments[t._id] = mockAttachments;
        changed = true;
      }
    });

    if (changed) {
      setTaskComments(newComments);
      setTaskAttachments(newAttachments);
    }
  }, [tasks, members]);

  const getTeamMembers = (task: Task) => {
    const team: { _id: string; fullName: string; profilePicture?: string }[] = [];
    const seenIds = new Set<string>();

    if (task.assignee) {
      team.push({
        _id: task.assignee._id,
        fullName: task.assignee.fullName,
        profilePicture: task.assignee.profilePicture
      });
      seenIds.add(task.assignee._id);
    }

    if (task.subtasks) {
      task.subtasks.forEach(sub => {
        if (sub.assignee && !seenIds.has(sub.assignee._id)) {
          team.push({
            _id: sub.assignee._id,
            fullName: sub.assignee.fullName,
            profilePicture: sub.assignee.profilePicture
          });
          seenIds.add(sub.assignee._id);
        }
      });
    }

    return team;
  };

  const handleAddSubtaskInput = () => {
    if (!subtaskInput.trim()) return;
    setNewTaskSubtasks(prev => [...prev, { title: subtaskInput.trim(), assigneeId: subtaskAssignee || undefined }]);
    setSubtaskInput('');
    setSubtaskAssignee('');
  };

  const handleRemoveNewSubtask = (index: number) => {
    setNewTaskSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(s => 
      s._id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    );

    // Optimistic UI update
    setTasks(prev => prev.map(t => 
      t._id === taskId ? { ...t, subtasks: updatedSubtasks } : t
    ));

    try {
      const res = await axios.put(`/api/tasks/detail/${taskId}`, {
        subtasks: updatedSubtasks
      });
      const updatedTask = res.data.task;
      setTasks(prev => prev.map(t => t._id === taskId ? {
        ...updatedTask,
        commentsCount: t.commentsCount,
        attachmentsCount: t.attachmentsCount
      } : t));

      socketService.emitTaskChange(workspaceId, taskId, 'update', updatedTask);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update sub-task.');
    }
  };

  const handleUpdateSubtaskAssignee = async (taskId: string, subtaskId: string, newAssigneeId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map(s => {
      if (s._id === subtaskId) {
        const member = members.find(m => m.user._id === newAssigneeId);
        return {
          ...s,
          assignee: member ? {
            _id: member.user._id,
            fullName: member.user.fullName,
            profilePicture: member.user.profilePicture
          } : undefined
        };
      }
      return s;
    });

    setTasks(prev => prev.map(t => 
      t._id === taskId ? { ...t, subtasks: updatedSubtasks } : t
    ));

    try {
      const res = await axios.put(`/api/tasks/detail/${taskId}`, {
        subtasks: updatedSubtasks.map(s => ({
          _id: s._id,
          title: s.title,
          isCompleted: s.isCompleted,
          assignee: s.assignee?._id || null
        }))
      });

      const updatedTask = res.data.task;
      setTasks(prev => prev.map(t => t._id === taskId ? {
        ...updatedTask,
        commentsCount: t.commentsCount,
        attachmentsCount: t.attachmentsCount
      } : t));

      socketService.emitTaskChange(workspaceId, taskId, 'update', updatedTask);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to reassign sub-task.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    try {
      const res = await axios.post(`/api/tasks/${workspaceId}`, {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        assignee: newTaskAssignee || undefined,
        dueDate: newTaskDueDate || undefined,
        status: 'todo',
        subtasks: newTaskSubtasks.map(s => ({
          title: s.title,
          isCompleted: false,
          assignee: s.assigneeId || undefined
        }))
      });

      const createdTask = {
        ...res.data.task,
        commentsCount: 0,
        attachmentsCount: 0
      };
      setTasks(prev => [createdTask, ...prev]);

      socketService.emitTaskChange(workspaceId, createdTask._id, 'create', createdTask);

      setShowAddModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      setNewTaskSubtasks([]);
      setSubtaskInput('');
      setSubtaskAssignee('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (taskId: string, nextStatus: 'todo' | 'in_progress' | 'review' | 'completed') => {
    try {
      const res = await axios.put(`/api/tasks/detail/${taskId}`, {
        status: nextStatus
      });

      const updatedTask = res.data.task;
      setTasks(prev => prev.map(t => t._id === taskId ? {
        ...updatedTask,
        commentsCount: t.commentsCount,
        attachmentsCount: t.attachmentsCount
      } : t));

      socketService.emitTaskChange(workspaceId, taskId, 'update', updatedTask);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleClaimTask = async (taskId: string) => {
    const userId = user?.id || (user as any)?._id;
    if (!userId) return;
    try {
      const res = await axios.put(`/api/tasks/detail/${taskId}`, {
        assignee: userId
      });

      const updatedTask = res.data.task;
      setTasks(prev => prev.map(t => t._id === taskId ? {
        ...updatedTask,
        commentsCount: t.commentsCount,
        attachmentsCount: t.attachmentsCount
      } : t));

      socketService.emitTaskChange(workspaceId, taskId, 'update', updatedTask);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to claim task.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await axios.delete(`/api/tasks/detail/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      socketService.emitTaskChange(workspaceId, taskId, 'delete', null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Math Statistics
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const dueTodayCount = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    return new Date(t.dueDate).toDateString() === new Date().toDateString();
  }).length;
  const upcomingCount = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    return new Date(t.dueDate) > new Date();
  }).length;

  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Local Filtering
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    let matchesAssignee = true;
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'me') {
        matchesAssignee = task.assignee?._id === user?.id;
      } else {
        matchesAssignee = task.assignee?._id === assigneeFilter;
      }
    }
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  // Local Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comp = 0;
    if (sortField === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      comp = dateA - dateB;
    } else if (sortField === 'priority') {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      comp = priorityWeight[b.priority] - priorityWeight[a.priority];
    } else {
      comp = a.title.localeCompare(b.title);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Upcoming Deadlines (Sorted, pending, with dueDate)
  const deadlineTasks = tasks
    .filter(t => t.dueDate && t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  // Dynamic Recent Activities log generator
  const generatedActivities: { title: string; desc: string; time: string }[] = [];
  tasks.slice(0, 5).forEach((t) => {
    if (t.status === 'completed') {
      generatedActivities.push({
        title: 'Assignment Completed',
        desc: `"${t.title}" was moved to completed column.`,
        time: 'Just now'
      });
    } else if (t.status === 'review') {
      generatedActivities.push({
        title: 'In Review Sprint',
        desc: `"${t.title}" was submitted for review.`,
        time: '10m ago'
      });
    }
    if (t.subtasks) {
      t.subtasks.forEach(sub => {
        if (sub.isCompleted) {
          generatedActivities.push({
            title: 'Subtask Checked Off',
            desc: `"${sub.title}" check item completed.`,
            time: '2h ago'
          });
        }
      });
    }
  });
  const activities = generatedActivities.slice(0, 4);

  const getDaysCountdown = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  };

  const getChecklistPercentage = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return task.status === 'completed' ? 100 : 0;
    const completed = task.subtasks.filter(s => s.isCompleted).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0B1020] p-6 overflow-y-auto no-scrollbar text-left">
      
      {/* 1. ASSIGNMENT HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 flex-shrink-0">
        <div className="text-left">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Assignment Hub <FolderOpen className="w-5 h-5 text-violet-400" />
          </h2>
          <p className="text-xs text-slate-500">Track milestones, check syllabus tasklists, and collaborate with your cohort</p>
        </div>

        {/* Filters and Actions Group */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 pl-8 pr-4 py-2 border border-slate-700/60 rounded-xl bg-[#1A2236]/40 text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none placeholder-slate-500"
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="cf-select"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="cf-select"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="cf-select"
          >
            <option value="all">All Members</option>
            <option value="me">Assigned to Me</option>
            {members.map(m => (
              <option key={m.user._id} value={m.user._id}>{m.user.fullName}</option>
            ))}
          </select>

          {/* Sorting */}
          <button
            onClick={() => {
              if (sortField === 'dueDate') setSortField('priority');
              else if (sortField === 'priority') setSortField('title');
              else setSortField('dueDate');
            }}
            className="cf-button-secondary !py-2 !px-3.5"
            title={`Sorting by ${sortField}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortField === 'dueDate' ? 'Due Date' : sortField}</span>
          </button>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="cf-button-secondary !p-2"
          >
            <span className="text-[10px] uppercase font-black">{sortOrder}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="cf-button-primary cursor-pointer justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Assignment
          </button>
        </div>
      </div>

      {/* 2. QUICK STATISTICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0">
        <div className="cf-card p-4 bg-gradient-to-br from-violet-550/5 to-transparent border border-violet-500/10">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total Assignments</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-extrabold text-white">{totalCount}</span>
            <Layers className="w-4.5 h-4.5 text-violet-400" />
          </div>
          {/* mini bar */}
          <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
            <div className="bg-violet-500 h-full w-full"></div>
          </div>
        </div>

        <div className="cf-card p-4 bg-gradient-to-br from-rose-550/5 to-transparent border border-rose-500/10">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Due Today</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-extrabold text-white">{dueTodayCount}</span>
            <AlertCircle className="w-4.5 h-4.5 text-rose-450 animate-pulse" />
          </div>
          {/* mini bar */}
          <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
            <div
              className="bg-rose-500 h-full"
              style={{ width: totalCount > 0 ? `${(dueTodayCount / totalCount) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        <div className="cf-card p-4 bg-gradient-to-br from-amber-550/5 to-transparent border border-amber-500/10">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Upcoming Tasks</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-extrabold text-white">{upcomingCount}</span>
            <Clock className="w-4.5 h-4.5 text-amber-400" />
          </div>
          {/* mini bar */}
          <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
            <div
              className="bg-amber-500 h-full"
              style={{ width: totalCount > 0 ? `${(upcomingCount / totalCount) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        <div className="cf-card p-4 bg-gradient-to-br from-emerald-550/5 to-transparent border border-emerald-500/10">
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Completed (Rate)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xl font-extrabold text-white">{completedCount} <span className="text-[10px] text-slate-500 font-semibold">({progressPercentage}%)</span></span>
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-450" />
          </div>
          {/* mini bar */}
          <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Grid Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Deadlines & Assignments Grid (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* 3. UPCOMING DEADLINES WIDGET */}
          <div className="cf-card p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" /> Priority Assignment Timelines
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {deadlineTasks.length === 0 ? (
                <div className="md:col-span-3 py-6 text-center text-xs text-slate-500">No upcoming task deadlines found.</div>
              ) : (
                deadlineTasks.map((task) => {
                  const daysLeft = getDaysCountdown(task.dueDate);
                  const progress = getChecklistPercentage(task);
                  return (
                    <div
                      key={task._id}
                      className="p-4 rounded-xl border border-slate-850 bg-[#111827]/40 hover:bg-[#111827]/75 transition-all text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            daysLeft.includes('Overdue')
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          }`}>
                            {daysLeft}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs text-white line-clamp-1 mb-1">{task.title}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Module: {workspace?.name || 'Milestone'}</p>
                      </div>

                      <div className="space-y-2">
                        {/* progress bar */}
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>

                        {/* Assignee / Priority Stack */}
                        <div className="flex justify-between items-center pt-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                            task.priority === 'high'
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                              : task.priority === 'medium'
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                          }`}>
                            {task.priority}
                          </span>
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {getTeamMembers(task).map((member) => (
                              member.profilePicture ? (
                                <img
                                  key={member._id}
                                  src={member.profilePicture}
                                  alt={member.fullName}
                                  className="inline-block h-5 w-5 rounded-full ring-2 ring-[#111827] object-cover"
                                  title={member.fullName}
                                />
                              ) : (
                                <div
                                  key={member._id}
                                  title={member.fullName}
                                  className="inline-block h-5 w-5 rounded-full bg-violet-650 ring-2 ring-[#111827] text-white flex items-center justify-center text-[8px] font-bold"
                                >
                                  {member.fullName.charAt(0).toUpperCase()}
                                </div>
                              ))
                            )}
                            {getTeamMembers(task).length === 0 && (
                              <span className="text-[9px] text-slate-500 font-semibold italic">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. MY ASSIGNMENTS RESPONSIVE GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Workspace Syllabus Board ({sortedTasks.length})
              </h3>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="cf-card p-12 text-center flex flex-col items-center justify-center">
                <CheckSquare className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-xs text-slate-500">No active assignments match your search filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedTasks.map((task) => {
                  const daysLeft = getDaysCountdown(task.dueDate);
                  const progress = getChecklistPercentage(task);
                  const isExpanded = !!expandedCards[task._id];
                  
                  return (
                    <div
                      key={task._id}
                      className="cf-card p-5 relative overflow-hidden flex flex-col justify-between group"
                    >
                      {/* Priority, delete triggers */}
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-455'
                              : task.priority === 'medium'
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                          }`}>
                            {task.priority} Priority
                          </span>
                          
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title, desc */}
                        <h4 className="font-extrabold text-sm text-white line-clamp-1 mb-1">{task.title}</h4>
                        <p className="text-xs text-slate-450 line-clamp-2 mb-4 leading-relaxed">{task.description || 'No descriptive details logged.'}</p>
                      </div>

                      {/* Progress widget */}
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Checklist Progress</span>
                          <span>
                            {task.subtasks?.filter(s => s.isCompleted).length || 0} of {task.subtasks?.length || 0} ({progress}%)
                          </span>
                        </div>
                        
                        <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-violet-600 h-full rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Interactive Subtask toggle list */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-850">
                          <button
                            onClick={() => toggleExpandCard(task._id)}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            <span>Toggle Task List</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="space-y-2.5 mt-3 max-h-44 overflow-y-auto no-scrollbar animate-fade-in text-left">
                              {task.subtasks.map((sub) => (
                                <div key={sub._id} className="flex items-center justify-between gap-3 text-xs bg-[#111827]/40 border border-slate-850 p-2 rounded-xl">
                                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={sub.isCompleted}
                                      onChange={() => handleToggleSubtask(task._id, sub._id)}
                                      className="w-4 h-4 rounded border-slate-800 text-violet-600 focus:ring-violet-500 accent-violet-650 cursor-pointer"
                                    />
                                    <span className={`truncate text-xs ${sub.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                      {sub.title}
                                    </span>
                                  </label>

                                  <select
                                    value={sub.assignee?._id || ''}
                                    onChange={(e) => handleUpdateSubtaskAssignee(task._id, sub._id, e.target.value)}
                                    className="text-[9px] bg-[#1A2236] border border-slate-800 text-slate-400 py-0.5 px-1.5 rounded-lg focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Assignee</option>
                                    {members.map(m => (
                                      <option key={m.user._id} value={m.user._id}>{m.user.fullName?.split(' ')[0]}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer: Date, Avatars, Counts, Quick Actions */}
                      <div className="border-t border-slate-850 mt-4 pt-3 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="flex items-center gap-3">
                          {/* Due Date */}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className={daysLeft.includes('Overdue') ? 'text-rose-400 font-bold' : ''}>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No due date'}
                            </span>
                          </div>

                          {/* Comments, Attachments */}
                          <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold">
                            <button
                              onClick={() => setActiveCommentsTask(task)}
                              className="flex items-center gap-1 hover:text-violet-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
                              title="View Comments"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                              <span>{taskComments[task._id]?.length || 0}</span>
                            </button>
                            <button
                              onClick={() => setActiveAttachmentsTask(task)}
                              className="flex items-center gap-1 hover:text-violet-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
                              title="View Attachments"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                              <span>{taskAttachments[task._id]?.length || 0}</span>
                            </button>
                          </div>
                        </div>

                        {/* Assignee / Action / Team Avatars */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
                          {/* Team Avatars Stack */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {getTeamMembers(task).map((member) => (
                              member.profilePicture ? (
                                <img
                                  key={member._id}
                                  src={member.profilePicture}
                                  alt={member.fullName}
                                  className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-[#1A2236] object-cover"
                                  title={member.fullName}
                                />
                              ) : (
                                <div
                                  key={member._id}
                                  title={member.fullName}
                                  className="inline-block h-5.5 w-5.5 rounded-full bg-violet-650 ring-2 ring-[#1A2236] text-white flex items-center justify-center text-[8px] font-bold"
                                >
                                  {member.fullName.charAt(0).toUpperCase()}
                                </div>
                              ))
                            )}
                            {getTeamMembers(task).length === 0 && (
                              <span className="text-[9px] text-slate-500 font-semibold italic">Unassigned</span>
                            )}
                          </div>

                          {/* Quick Actions (Claim or Next Status) */}
                          <div className="flex items-center gap-1.5">
                            {!task.assignee ? (
                              <button
                                onClick={() => handleClaimTask(task._id)}
                                className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 cursor-pointer"
                              >
                                Claim
                              </button>
                            ) : (
                              task.assignee._id === (user?.id || (user as any)?._id) && task.status !== 'completed' && (
                                <button
                                  onClick={() => {
                                    const flow: Record<string, 'todo' | 'in_progress' | 'review' | 'completed'> = {
                                      todo: 'in_progress',
                                      in_progress: 'review',
                                      review: 'completed'
                                    };
                                    if (flow[task.status]) handleUpdateStatus(task._id, flow[task.status]);
                                  }}
                                  className="text-[9px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-lg hover:bg-violet-500/20 cursor-pointer"
                                >
                                  Next Stage &rarr;
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Activities list (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="cf-card p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-violet-400" /> Recent Assignment Feed
            </h3>

            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No recent assignment updates logged.</p>
              ) : (
                activities.map((act, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs text-left">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <span className="font-extrabold text-slate-350 block leading-tight">{act.title}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{act.desc}</span>
                      <span className="text-[9px] text-slate-600 block mt-1">{act.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. COMPACT KANBAN BOARD (Footer section) */}
      <div className="mt-8 pt-8 border-t border-slate-850 text-left flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4.5 h-4.5 text-violet-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Compact Kanban View</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-[#1A2236]/35 border border-slate-850 rounded-2xl p-4 flex flex-col min-h-[140px] text-left"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                    <span className="text-xs font-bold text-slate-300">{col.title}</span>
                  </div>
                  <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded-full font-mono text-slate-500">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto no-scrollbar max-h-40">
                  {colTasks.length === 0 ? (
                    <span className="text-[10px] text-slate-650 italic block py-2">Empty column</span>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t._id}
                        onClick={() => {
                          const flow: Record<string, 'todo' | 'in_progress' | 'review' | 'completed'> = {
                            todo: 'in_progress',
                            in_progress: 'review',
                            review: 'completed'
                          };
                          if (flow[t.status]) {
                            handleUpdateStatus(t._id, flow[t.status]);
                          } else {
                            handleUpdateStatus(t._id, 'todo'); // toggle complete back to todo
                          }
                        }}
                        className="p-2 border border-slate-850 rounded-xl bg-[#0B1020]/45 hover:border-violet-500/25 transition-all text-left flex justify-between items-center cursor-pointer group"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-[11px] text-slate-300 block truncate group-hover:text-violet-400 transition-colors">
                            {t.title}
                          </span>
                          <span className="text-[8px] text-slate-500 uppercase font-black block mt-0.5">{t.priority}</span>
                        </div>
                        {t.assignee && (
                          <div className="w-4 h-4 rounded-full bg-violet-650 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                            {t.assignee.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-left animate-fade-in">
            <h3 className="font-extrabold text-sm text-white mb-4 uppercase tracking-wider">Add Workspace Assignment</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Final Milestone"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full cf-input"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of syllabus items and tasks..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full cf-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full cf-select"
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
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full cf-input"
                  />
                </div>
              </div>

              {/* Subtasks (Checklist) Section */}
              <div className="border-t border-slate-800 pt-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Syllabus Tasks Checklist
                </label>
                
                {/* Input row */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Task item name..."
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskInput();
                      }
                    }}
                    className="flex-1 cf-input"
                  />
                  <select
                    value={subtaskAssignee}
                    onChange={(e) => setSubtaskAssignee(e.target.value)}
                    className="w-28 cf-select"
                  >
                    <option value="">Assignee</option>
                    {members.map((m) => (
                      <option key={m.user._id} value={m.user._id}>
                        {m.user.fullName?.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSubtaskInput}
                    className="cf-button-secondary !py-1.5 !px-3"
                  >
                    Add
                  </button>
                </div>

                {/* Checklist Preview */}
                {newTaskSubtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar border border-slate-800 p-2.5 rounded-xl bg-[#111827]/40">
                    {newTaskSubtasks.map((st, index) => {
                      const memberName = members.find(m => m.user._id === st.assigneeId)?.user.fullName?.split(' ')[0];
                      return (
                        <div key={index} className="flex justify-between items-center text-[10px] text-slate-350">
                          <span className="truncate pr-2">
                            {index + 1}. {st.title}
                            {memberName && (
                              <span className="text-[10px] text-violet-400 ml-1.5 font-bold">
                                (@{memberName})
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewSubtask(index)}
                            className="text-[9px] text-rose-455 font-bold hover:underline flex-shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-850 text-slate-500 hover:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cf-button-primary cursor-pointer"
                >
                  Add Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. INTERACTIVE COMMENTS DIALOG */}
      {activeCommentsTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-left flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Assignment Discussion</h3>
                <p className="text-[11px] text-slate-500 mt-1">Cohort comments for: <span className="text-violet-400 font-bold">{activeCommentsTask.title}</span></p>
              </div>
              <button
                onClick={() => {
                  setActiveCommentsTask(null);
                  setNewCommentText('');
                }}
                className="text-slate-500 hover:text-white cursor-pointer transition-colors text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4 min-h-0">
              {(taskComments[activeCommentsTask._id] || []).length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">No comments logged yet. Start the conversation!</div>
              ) : (
                (taskComments[activeCommentsTask._id] || []).map((comm) => (
                  <div key={comm._id} className="flex gap-3 text-xs">
                    {comm.authorAvatar ? (
                      <img src={comm.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-650 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {comm.authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 bg-[#111827]/40 border border-slate-850 p-3 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-350">{comm.authorName}</span>
                        <span className="text-[9px] text-slate-650">{comm.createdAt}</span>
                      </div>
                      <p className="text-slate-450 leading-relaxed break-words">{comm.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCommentText.trim()) return;
                const author = user || { fullName: 'Collaborator', profilePicture: '' };
                const newComm: Comment = {
                  _id: `comment-${Date.now()}`,
                  authorName: author.fullName || 'Me',
                  authorAvatar: author.profilePicture,
                  content: newCommentText.trim(),
                  createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                };
                setTaskComments((prev) => ({
                  ...prev,
                  [activeCommentsTask._id]: [...(prev[activeCommentsTask._id] || []), newComm]
                }));
                setNewCommentText('');
              }}
              className="pt-4 border-t border-slate-800 flex gap-2 flex-shrink-0"
            >
              <input
                type="text"
                placeholder="Type your comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 cf-input"
                required
              />
              <button type="submit" className="cf-button-primary cursor-pointer whitespace-nowrap">
                Comment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. INTERACTIVE ATTACHMENTS DIALOG */}
      {activeAttachmentsTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 text-left flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Assignment Resources & Attachments</h3>
                <p className="text-[11px] text-slate-500 mt-1">Shared files for: <span className="text-violet-400 font-bold">{activeAttachmentsTask.title}</span></p>
              </div>
              <button
                onClick={() => {
                  setActiveAttachmentsTask(null);
                  setNewAttachmentName('');
                  setNewAttachmentUrl('');
                }}
                className="text-slate-500 hover:text-white cursor-pointer transition-colors text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Attachments List */}
            <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3 min-h-0">
              {(taskAttachments[activeAttachmentsTask._id] || []).length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">No attachments uploaded yet. Share notes or guidelines!</div>
              ) : (
                (taskAttachments[activeAttachmentsTask._id] || []).map((att) => (
                  <div key={att._id} className="flex justify-between items-center p-3 rounded-xl bg-[#111827]/40 border border-slate-850 hover:border-slate-800 transition-all">
                    <div className="min-w-0 pr-3">
                      <span className="font-bold text-slate-350 block truncate" title={att.name}>{att.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{att.createdAt}</span>
                    </div>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase text-violet-400 hover:text-violet-300 flex-shrink-0 hover:underline cursor-pointer"
                    >
                      Download
                    </a>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAttachmentName.trim()) return;
                const newAtt: Attachment = {
                  _id: `attachment-${Date.now()}`,
                  name: newAttachmentName.trim(),
                  url: newAttachmentUrl.trim() || '#',
                  fileType: newAttachmentName.toLowerCase().split('.').pop() || 'file',
                  createdAt: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                };
                setTaskAttachments((prev) => ({
                  ...prev,
                  [activeAttachmentsTask._id]: [...(prev[activeAttachmentsTask._id] || []), newAtt]
                }));
                setNewAttachmentName('');
                setNewAttachmentUrl('');
              }}
              className="pt-4 border-t border-slate-800 space-y-3 flex-shrink-0"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Document Name (e.g. syllabus.pdf)..."
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  className="cf-input"
                  required
                />
                <input
                  type="text"
                  placeholder="Document URL (Optional)..."
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  className="cf-input"
                />
              </div>
              <button type="submit" className="w-full cf-button-primary cursor-pointer">
                Add Shared Attachment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

