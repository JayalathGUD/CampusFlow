import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { createWorkspace, joinWorkspaceWithCode, setActiveWorkspace } from '../features/workspaceSlice';
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  Plus,
  ChevronRight,
  Shield,
  Layers,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  closeSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, closeSidebar }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { workspaces, activeWorkspace } = useSelector((state: RootState) => state.workspace);

  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [workspaceSemester, setWorkspaceSemester] = useState('');
  const [workspaceDepartment, setWorkspaceDepartment] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isJoinMode, setIsJoinMode] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName) return;

    await dispatch(createWorkspace({
      name: workspaceName,
      description: workspaceDesc,
      semester: workspaceSemester,
      department: workspaceDepartment
    }));
    setShowWorkspaceModal(false);
    setWorkspaceName('');
    setWorkspaceDesc('');
    setWorkspaceSemester('');
    setWorkspaceDepartment('');
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;

    await dispatch(joinWorkspaceWithCode(inviteCode));
    setShowWorkspaceModal(false);
    setInviteCode('');
  };

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#111827] h-screen flex flex-col justify-between py-6 flex-shrink-0">
      {/* Brand Header */}
      <div className="px-6 flex items-center justify-between mb-8 text-left">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-650 to-indigo-650 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-violet-500/20">
            CF
          </div>
          <div className="text-left">
            <span className="font-bold text-slate-100 block text-sm tracking-wide">CAMPUSFLOW</span>
            <span className="text-[10px] font-semibold text-slate-500 block tracking-wider uppercase">SaaS Academic Portal</span>
          </div>
        </div>
        {closeSidebar && (
          <button
            onClick={closeSidebar}
            className="md:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-3 space-y-1 text-left">
        <span className="px-3 text-[10px] font-bold text-slate-500 block tracking-wider uppercase mb-2">Main Menu</span>
        
        <button
          onClick={() => {
            setCurrentTab('dashboard');
            dispatch(setActiveWorkspace(null));
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentTab === 'dashboard' && !activeWorkspace
              ? 'bg-violet-500/10 text-violet-400'
              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Dashboard</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        <button
          onClick={() => {
            if (!user) {
              window.location.href = '/login';
              return;
            }
            setCurrentTab('portfolio');
            dispatch(setActiveWorkspace(null));
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentTab === 'portfolio'
              ? 'bg-violet-500/10 text-violet-400'
              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-4.5 h-4.5" />
            <span>My Portfolio</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        <button
          onClick={() => {
            setCurrentTab('resources');
            dispatch(setActiveWorkspace(null));
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            currentTab === 'resources'
              ? 'bg-violet-500/10 text-violet-400'
              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4.5 h-4.5" />
            <span>Study Resources</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setCurrentTab('admin');
              dispatch(setActiveWorkspace(null));
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'admin'
                ? 'bg-rose-500/10 text-rose-400'
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4.5 h-4.5" />
              <span>Admin Panel</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        )}

        {/* Workspaces Section */}
        {user && (
          <div className="pt-6 space-y-2">
            <div className="flex items-center justify-between px-3">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Active Workspaces</span>
              <button
                onClick={() => {
                  setIsJoinMode(false);
                  setShowWorkspaceModal(true);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
              {workspaces.map((w) => (
                <button
                  key={w._id}
                  onClick={() => {
                    dispatch(setActiveWorkspace(w));
                    setCurrentTab('workspace');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors cursor-pointer ${
                    activeWorkspace?._id === w._id
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Layers className="w-4 h-4 text-violet-500" />
                  <span className="truncate flex-1">{w.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Create/Join Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-left">
            <div className="flex border-b border-slate-800 pb-3 mb-5 justify-between">
              <button
                onClick={() => setIsJoinMode(false)}
                className={`flex-1 text-center font-bold text-sm pb-2 border-b-2 transition-colors cursor-pointer ${
                  !isJoinMode ? 'border-violet-600 text-violet-400' : 'border-transparent text-slate-500'
                }`}
              >
                Create Workspace
              </button>
              <button
                onClick={() => setIsJoinMode(true)}
                className={`flex-1 text-center font-bold text-sm pb-2 border-b-2 transition-colors cursor-pointer ${
                  isJoinMode ? 'border-violet-600 text-violet-400' : 'border-transparent text-slate-500'
                }`}
              >
                Join Workspace
              </button>
            </div>

            {!isJoinMode ? (
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Workspace Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineering Assignment"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full cf-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about targets or course module code..."
                    value={workspaceDesc}
                    onChange={(e) => setWorkspaceDesc(e.target.value)}
                    className="w-full cf-input resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Semester</label>
                    <input
                      type="text"
                      placeholder="e.g. Semester 2"
                      value={workspaceSemester}
                      onChange={(e) => setWorkspaceSemester(e.target.value)}
                      className="w-full cf-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Eng."
                      value={workspaceDepartment}
                      onChange={(e) => setWorkspaceDepartment(e.target.value)}
                      className="w-full cf-input"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceModal(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cf-button-primary"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinWorkspace} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Workspace Invite Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter invite code (e.g. XYZ123)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full cf-input uppercase"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceModal(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cf-button-primary"
                  >
                    Join Group
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
