import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import axios from 'axios';
import {
  Calendar,
  CheckSquare,
  Layers,
  Clock,
  Award,
  Star,
  GraduationCap,
  Activity,
  Percent,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface TaskDistribution {
  todo: number;
  in_progress: number;
  review: number;
  completed: number;
  total: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { workspaces } = useSelector((state: RootState) => state.workspace);

  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [personalTasks, setPersonalTasks] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [taskDistribution, setTaskDistribution] = useState<TaskDistribution>({
    todo: 0,
    in_progress: 0,
    review: 0,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, [workspaces]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Fetch upcoming assignments across all user workspaces
      const deadRes = await axios.get('/api/assignments/calendar/me');
      setDeadlines(deadRes.data.assignments.slice(0, 4));

      // 2. Fetch recent activity (Notifications log)
      const activityRes = await axios.get('/api/notifications');
      setRecentActivity(activityRes.data.notifications.slice(0, 5));

      // 3. Fetch workspace tasks to compute personal tasks & task distribution metrics
      let myTasks: any[] = [];
      let todoCount = 0;
      let inProgressCount = 0;
      let reviewCount = 0;
      let completedCount = 0;
      let totalCount = 0;

      for (const workspace of workspaces) {
        const taskRes = await axios.get(`/api/tasks/${workspace._id}`);
        const list = taskRes.data.tasks;

        list.forEach((t: any) => {
          totalCount++;
          if (t.status === 'todo') todoCount++;
          else if (t.status === 'in_progress') inProgressCount++;
          else if (t.status === 'review') reviewCount++;
          else if (t.status === 'completed') completedCount++;
        });

        list.forEach((t: any) => {
          if (t.subtasks && t.subtasks.length > 0) {
            t.subtasks.forEach((sub: any) => {
              if (sub.assignee?._id === user?.id && !sub.isCompleted) {
                myTasks.push({
                  _id: `${t._id}-${sub._id}`, // compound ID for dashboard keying
                  taskId: t._id,
                  subtaskId: sub._id,
                  title: `${t.title}: ${sub.title}`,
                  priority: t.priority,
                  status: t.status,
                  dueDate: t.dueDate,
                  workspaceName: workspace.name,
                  isSubtask: true
                });
              }
            });
          }
          if (t.assignee?._id === user?.id && t.status !== 'completed') {
            myTasks.push({
              ...t,
              workspaceName: workspace.name
            });
          }
        });
      }

      setPersonalTasks(myTasks.slice(0, 5));
      setTaskDistribution({
        todo: todoCount,
        in_progress: inProgressCount,
        review: reviewCount,
        completed: completedCount,
        total: totalCount
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysLeft = (dueDateStr: string) => {
    const diff = new Date(dueDateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    return `${days} days left`;
  };

  const handleToggleTaskLocal = (taskId: string) => {
    setPersonalTasks(prev => prev.filter(t => t._id !== taskId));
    setTaskDistribution(prev => ({
      ...prev,
      completed: prev.completed + 1
    }));
  };

  const completeTaskAPI = async (taskId: string) => {
    try {
      const taskItem = personalTasks.find(t => t._id === taskId);
      handleToggleTaskLocal(taskId);
      if (taskItem?.isSubtask) {
        await axios.put(`/api/tasks/detail/${taskItem.taskId}`, {
          subtaskId: taskItem.subtaskId,
          subtaskCompleted: true
        });
      } else {
        await axios.put(`/api/tasks/detail/${taskId}`, {
          status: 'completed'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalClosed = taskDistribution.completed;
  const completionPercentage =
    taskDistribution.total > 0
      ? Math.round((totalClosed / taskDistribution.total) * 100)
      : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B1020] p-6 space-y-6 text-left no-scrollbar">
      
      {/* Welcome Banner */}
      {user ? (
        <div className="p-6 rounded-[20px] bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden shadow-lg border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-2 z-10 text-left">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Welcome back, {user.fullName || 'Student'}! <GraduationCap className="w-6 h-6 text-violet-300 animate-bounce" />
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              Here is your academic overview for {user.university || 'University'}. You have {deadlines.length} upcoming deadlines this week.
            </p>
          </div>
          
          {/* Visual progress wheel */}
          <div className="hidden lg:flex items-center gap-4 z-10 bg-[#1A2236]/80 backdrop-blur-md border border-slate-800 px-5 py-4 rounded-2xl">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-slate-800 fill-none"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="stroke-violet-500 fill-none transition-all duration-500"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercentage / 100)}`}
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-slate-200">{completionPercentage}%</span>
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white">Academic Pace</span>
              <span className="block text-[9px] text-slate-450 uppercase font-semibold">Tasks Completed</span>
            </div>
          </div>
          <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-violet-500/10 blur-2xl"></div>
        </div>
      ) : (
        <div className="p-8 rounded-[20px] bg-gradient-to-r from-violet-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 z-10 text-left max-w-2xl">
            <h2 className="text-3xl font-black flex items-center gap-2 tracking-tight">
              CampusFlow Academic Workspace <GraduationCap className="w-8 h-8 text-violet-300" />
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Welcome to CampusFlow, the all-in-one platform to organize your study life. Join peer-to-peer workspace groups to collaborate on notes, coordinate task boards, share documents, and build a beautiful digital student portfolio.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.href = '/login'}
                className="cf-button-primary"
              >
                Log In to Get Started
              </button>
              <button
                onClick={() => window.location.href = '/register'}
                className="cf-button-secondary"
              >
                Create Account
              </button>
            </div>
          </div>
          <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-violet-500/10 blur-2xl"></div>
        </div>
      )}

      {/* Grid Layout widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines Widget */}
        <div className="cf-card p-5 lg:col-span-2 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Upcoming Deadlines</h3>
          </div>

          <div className="space-y-3.5">
            {deadlines.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No upcoming deadlines logged.</p>
            ) : (
              deadlines.map((dl) => (
                <div
                  key={dl._id}
                  className="flex justify-between items-center p-3 rounded-xl border border-slate-800/80 bg-[#111827]/40 hover:bg-[#111827]/70 transition-all text-left"
                >
                  <div className="text-left">
                    <p className="font-bold text-xs text-slate-200">{dl.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{dl.workspace?.name || 'Workspace'}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        getDaysLeft(dl.dueDate).includes('Overdue')
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {getDaysLeft(dl.dueDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <Calendar className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Upcoming Deadlines</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[240px]">Log in to automatically track and aggregate exam dates and task deadlines from all your active workspaces.</span>
            </div>
          )}
        </div>

        {/* Workspace Quick list Card */}
        <div className="cf-card p-5 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Joined Workspaces</h3>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto no-scrollbar">
            {workspaces.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No collaborative groups joined yet.</p>
            ) : (
              workspaces.map((w) => (
                <div
                  key={w._id}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#111827]/40 transition-colors cursor-default text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {w.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <span className="font-bold text-xs text-slate-200 block truncate">
                      {w.name}
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      Code: {w.inviteCode}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <Layers className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Collaborative Workspaces</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Log in to join your class study groups, coordinate assignments, and chat in real-time.</span>
            </div>
          )}
        </div>
      </div>

      {/* Second Row Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal assigned Tasks widget (Checkable) */}
        <div className="cf-card p-5 lg:col-span-2 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Tasks Assigned to Me</h3>
          </div>

          <div className="space-y-3">
            {personalTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No pending tasks assigned to you.</p>
            ) : (
              personalTasks.map((t) => (
                <div
                  key={t._id}
                  className="flex justify-between items-center p-3 border border-slate-800 rounded-xl hover:border-violet-500/30 transition-all bg-[#111827]/40 text-left group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <button
                      onClick={() => completeTaskAPI(t._id)}
                      className="w-5 h-5 rounded-md border border-slate-700 flex items-center justify-center hover:border-violet-500 hover:bg-violet-500/10 text-transparent hover:text-violet-400 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </button>
                    <div>
                      <span className="font-bold text-xs text-slate-250 block group-hover:text-violet-400 transition-colors">
                        {t.title}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5 block">{t.workspaceName}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      t.priority === 'high'
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : t.priority === 'medium'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <CheckSquare className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Tasks Assigned to Me</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[240px]">Log in to check off tasks, view your personal study backlog, and coordinate items with classmates.</span>
            </div>
          )}
        </div>

        {/* Team Performance Widget (Task distributions metrics) */}
        <div className="cf-card p-5 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Team Performance</h3>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Total Workspaces Tasks</span>
              <span className="font-bold text-slate-200">{taskDistribution.total}</span>
            </div>

            {/* Combined progress stack bar */}
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
              {taskDistribution.total > 0 && (
                <>
                  <div
                    style={{
                      width: `${(taskDistribution.completed / taskDistribution.total) * 100}%`
                    }}
                    className="bg-emerald-500 h-full"
                    title={`Completed: ${taskDistribution.completed}`}
                  ></div>
                  <div
                    style={{
                      width: `${(taskDistribution.review / taskDistribution.total) * 100}%`
                    }}
                    className="bg-indigo-500 h-full"
                    title={`In Review: ${taskDistribution.review}`}
                  ></div>
                  <div
                    style={{
                      width: `${(taskDistribution.in_progress / taskDistribution.total) * 100}%`
                    }}
                    className="bg-amber-500 h-full"
                    title={`In Progress: ${taskDistribution.in_progress}`}
                  ></div>
                  <div
                    style={{
                      width: `${(taskDistribution.todo / taskDistribution.total) * 100}%`
                    }}
                    className="bg-slate-650 h-full"
                    title={`Todo: ${taskDistribution.todo}`}
                  ></div>
                </>
              )}
            </div>

            {/* Indicators legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 block"></span>
                <span>Todo: {taskDistribution.todo}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                <span>Progress: {taskDistribution.in_progress}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>
                <span>Review: {taskDistribution.review}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                <span>Done: {taskDistribution.completed}</span>
              </div>
            </div>
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <Percent className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Team Progress & Performance</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Log in to view task distributions, review statistics, and monitor group sprint statuses.</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Activity & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="cf-card p-5 lg:col-span-2 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Recent Activity Feed</h3>
          </div>

          <div className="space-y-4 text-left">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent activity logged yet.</p>
            ) : (
              recentActivity.map((activity, idx) => (
                <div key={idx} className="flex gap-3 text-xs items-start">
                  <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-300 block">
                      {activity.title}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {activity.message} &bull;{' '}
                      {new Date(activity.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <Activity className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Recent Activity Feed</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[240px]">Log in to see live audit logs, file uploads, notes changes, and comments in real-time.</span>
            </div>
          )}
        </div>

        {/* Milestone Tracker Card */}
        <div className="cf-card p-5 relative overflow-hidden min-h-[220px]">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-sm text-slate-200">Milestones & Stars</h3>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex gap-3">
              <Star className="w-7 h-7 text-amber-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-slate-200 block">
                  Cooperative Master
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Join and activate 3 or more research workspaces.
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="w-7 h-7 text-violet-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-slate-200 block">
                  Deadline Navigator
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Complete assignments ahead of time consistently.
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Flame className="w-7 h-7 text-rose-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-slate-200 block">
                  Study Streak
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Active notes edit locks daily for 5 consecutive days.
                </span>
              </div>
            </div>
          </div>

          {!user && (
            <div className="absolute inset-0 bg-[#0B1020]/90 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center z-10">
              <Award className="w-8 h-8 text-violet-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Milestones & Stars</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Log in to verify achievements, earn study streak stars, and highlight accomplishments.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
