import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Sparkles, CheckSquare, Percent } from 'lucide-react';

interface AssignmentsSectionProps {
  workspaceId: string;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  progress: number;
}

export const AssignmentsSection: React.FC<AssignmentsSectionProps> = ({ workspaceId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // AI Assistant Overlay states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStructure, setAiStructure] = useState<string | null>(null);
  const [aiTarget, setAiTarget] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [workspaceId]);

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`/api/assignments/${workspaceId}`);
      setAssignments(res.data.assignments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    try {
      const res = await axios.post(`/api/assignments/${workspaceId}`, {
        title,
        description,
        dueDate
      });
      setAssignments(prev => [...prev, res.data.assignment]);
      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (id: string, progress: number) => {
    let status = 'pending';
    if (progress === 100) {
      status = 'submitted';
    }
    try {
      const res = await axios.put(`/api/assignments/detail/${id}`, {
        progress,
        status
      });
      setAssignments(prev => prev.map(a => a._id === id ? res.data.assignment : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAiAssistant = async (assignment: Assignment) => {
    setAiTarget(assignment);
    setAiLoading(true);
    setAiStructure(null);

    try {
      const res = await axios.post('/api/ai/structure', {
        title: assignment.title,
        description: assignment.description
      });
      setAiStructure(res.data.structure);
    } catch (err) {
      console.error(err);
      setAiStructure('Failed to generate assignment suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  const getDeadlineAlertColor = (dueDateStr: string) => {
    const diff = new Date(dueDateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days <= 2) return 'bg-rose-500';
    if (days <= 5) return 'bg-amber-500';
    return 'bg-violet-600';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/10 p-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-left">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Assignment Deadlines</h2>
          <p className="text-xs text-slate-400">Track final submission metrics and draft schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-md shadow-violet-500/15"
        >
          <Plus className="w-4.5 h-4.5" />
          Add Assignment
        </button>
      </div>

      {/* Grid of assignments */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckSquare className="w-10 h-10 text-slate-350 mb-2" />
            <p className="text-sm">No assignment deadlines logged yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all text-left"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{assignment.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${getDeadlineAlertColor(assignment.dueDate)}`}>
                      Due {new Date(assignment.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{assignment.description || 'No description provided.'}</p>
                </div>

                {/* Progress bar and AI details */}
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5 text-violet-500" /> Progress</span>
                      <span>{assignment.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={assignment.progress}
                      onChange={(e) => handleUpdateProgress(assignment._id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      assignment.status === 'submitted'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950/20 text-amber-655 dark:text-amber-400'
                    }`}>
                      {assignment.status === 'submitted' ? 'Submitted' : 'Pending'}
                    </span>

                    <button
                      onClick={() => handleRunAiAssistant(assignment)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-violet-650 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      AI Assistant
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-2xl shadow-xl p-6 text-left">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-4">Add Assignment Target</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Assignment title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent dark:text-slate-100 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task overview / reference guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent dark:text-slate-100 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent dark:text-slate-100 dark:bg-slate-800 text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md shadow-violet-500/10"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Assistant Structure Overlay */}
      {aiTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden p-6 text-left flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">AI Assignment Assistant</h3>
              </div>
              <button
                onClick={() => setAiTarget(null)}
                className="text-slate-400 hover:text-slate-650 text-xs font-semibold"
              >
                Close Panel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-250 mb-1">Target assignment:</p>
              <h4 className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-4">{aiTarget.title}</h4>

              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  AI is creating report structures and templates...
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800">
                  {aiStructure}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
