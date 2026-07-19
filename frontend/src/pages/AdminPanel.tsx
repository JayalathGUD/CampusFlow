import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Users, Layers, FileText, BrainCircuit, Trash2 } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalWorkspaces: number;
  totalNotes: number;
  totalTasks: number;
  totalFiles: number;
  totalResources: number;
  totalAIRequests: number;
  universityDemographics: { _id: string; count: number }[];
  aiRequestBreakdown: { _id: string; count: number }[];
}

export const AdminPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'workspaces'>('stats');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const analyticRes = await axios.get('/api/admin/analytics');
      setAnalytics(analyticRes.data.analytics);

      const userRes = await axios.get('/api/admin/users');
      setUsers(userRes.data.users);

      const workRes = await axios.get('/api/admin/workspaces');
      setWorkspaces(workRes.data.workspaces);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this student profile?')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!window.confirm('Are you sure you want to moderate and delete this workspace?')) return;
    try {
      await axios.delete(`/api/admin/workspaces/${workspaceId}`);
      setWorkspaces(workspaces.filter(w => w._id !== workspaceId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading admin panel...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B1020] p-6 space-y-6 text-left no-scrollbar">
      {/* Header banner */}
      <div className="flex items-center gap-3">
        <span className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-455">
          <ShieldAlert className="w-6 h-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-100">System Administration</h2>
          <p className="text-xs text-slate-500">Moderate platform assets, users, and audit active workloads</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 flex-shrink-0 overflow-x-auto no-scrollbar flex-nowrap w-full">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${
            activeTab === 'stats' ? 'border-rose-500 text-rose-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Analytics Dashboard
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${
            activeTab === 'users' ? 'border-rose-500 text-rose-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Students Manager ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('workspaces')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex-shrink-0 ${
            activeTab === 'workspaces' ? 'border-rose-500 text-rose-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          Workspaces Manager ({workspaces.length})
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && analytics && (
        <div className="space-y-6">
          {/* Card aggregates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="cf-card p-5 bg-gradient-to-br from-rose-500/5 to-transparent border border-rose-500/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2">Total Registrations</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-white">{analytics.totalUsers}</span>
                <Users className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div className="cf-card p-5 bg-gradient-to-br from-violet-500/5 to-transparent border border-violet-500/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2">Workspace Folders</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-white">{analytics.totalWorkspaces}</span>
                <Layers className="w-5 h-5 text-violet-550" />
              </div>
            </div>
            <div className="cf-card p-5 bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2">Cloud Files</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-white">{analytics.totalFiles + analytics.totalResources}</span>
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="cf-card p-5 bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2">AI Prompts Logs</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-white">{analytics.totalAIRequests}</span>
                <BrainCircuit className="w-5 h-5 text-emerald-450" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demographics */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">University Breakdown</h3>
              <div className="space-y-3">
                {analytics.universityDemographics.map((demo, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-350 font-semibold">{demo._id || 'Not Specified'}</span>
                    <span className="font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full font-bold">{demo.count} students</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Breakdown */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">AI Inquiries breakdown</h3>
              <div className="space-y-3">
                {analytics.aiRequestBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-350 font-semibold uppercase">{item._id}</span>
                    <span className="font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full font-bold">{item.count} audits</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#111827]/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 text-left">Full Name</th>
                  <th className="px-5 py-3 text-left">Email Address</th>
                  <th className="px-5 py-3 text-left">Degree details</th>
                  <th className="px-5 py-3 text-left">Platform Role</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-350 bg-[#1A2236]/20">
                {users.map((userObj) => (
                  <tr key={userObj._id} className="hover:bg-slate-800/15 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-200">{userObj.fullName}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{userObj.email}</td>
                    <td className="px-5 py-3">{userObj.degreeProgram || 'None'}</td>
                    <td className="px-5 py-3 uppercase text-[9px] font-black">
                      <span className={`px-2.5 py-0.5 rounded-full border ${
                        userObj.role === 'admin' 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-slate-800 border-slate-800 text-slate-500'
                      }`}>
                        {userObj.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleDeleteUser(userObj._id)}
                        className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 hover:bg-rose-500/25 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workspaces Tab */}
      {activeTab === 'workspaces' && (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#111827]/60 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 text-left">Workspace Title</th>
                  <th className="px-5 py-3 text-left">Invite Code</th>
                  <th className="px-5 py-3 text-left">Owner</th>
                  <th className="px-5 py-3 text-left">Created Date</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-350 bg-[#1A2236]/20">
                {workspaces.map((work) => (
                  <tr key={work._id} className="hover:bg-slate-800/15 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-200">{work.name}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{work.inviteCode}</td>
                    <td className="px-5 py-3">{work.owner?.fullName || 'Deleted User'}</td>
                    <td className="px-5 py-3">{new Date(work.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleDeleteWorkspace(work._id)}
                        className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 hover:bg-rose-500/25 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
