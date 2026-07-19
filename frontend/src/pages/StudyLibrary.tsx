import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import axios from 'axios';
import { BookOpen, Search, Download, Upload, Check, Trash2 } from 'lucide-react';

interface Resource {
  _id: string;
  title: string;
  category: 'notes' | 'past_paper' | 'presentation' | 'other';
  subject: string;
  fileUrl: string;
  downloadsCount: number;
  tags: string[];
  uploadedBy: {
    _id: string;
    fullName: string;
    email?: string;
  };
  isApproved: boolean;
  createdAt: string;
}

export const StudyLibrary: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'notes' | 'past_paper' | 'presentation' | 'other'>('notes');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchResources();
  }, [categoryFilter, search]);

  const fetchResources = async () => {
    try {
      const res = await axios.get(`/api/resources`, {
        params: {
          category: categoryFilter || undefined,
          q: search || undefined
        }
      });
      setResources(res.data.resources);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !file) {
      alert('Please fill in all fields and select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('category', category);
    formData.append('file', file);

    setIsUploading(true);
    try {
      await axios.post('/api/resources', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Study resource uploaded successfully! Admin approval is required before listing.');
      setShowUploadModal(false);
      setTitle('');
      setSubject('');
      setCategory('notes');
      setFile(null);
      fetchResources();
    } catch (err) {
      console.error(err);
      alert('Failed to upload study library asset.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (resourceId: string, fileUrl: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      await axios.put(`/api/resources/${resourceId}/download`);
      setResources(prev => prev.map(r => r._id === resourceId ? { ...r, downloadsCount: r.downloadsCount + 1 } : r));
      // Open download in a new window
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (resourceId: string) => {
    try {
      const res = await axios.put(`/api/resources/${resourceId}/approve`);
      if (res.data.success) {
        setResources(prev =>
          prev.map(r => (r._id === resourceId ? { ...r, isApproved: true } : r))
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve study resource.');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this study resource?')) return;
    try {
      const res = await axios.delete(`/api/resources/${resourceId}`);
      if (res.data.success) {
        setResources(prev => prev.filter(r => r._id !== resourceId));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete study resource.');
    }
  };

  const displayedResources = showPendingOnly
    ? resources.filter(item => !item.isApproved)
    : resources;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0B1020] p-6 text-left no-scrollbar">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 flex-shrink-0">
        <div className="text-left">
          <h2 className="text-lg font-bold text-slate-100">Study Resource Library</h2>
          <p className="text-xs text-slate-500">Share lecture notes, past exam question sheets, and classroom slides</p>
        </div>
        <button
          onClick={() => {
            if (!user) {
              window.location.href = '/login';
              return;
            }
            setShowUploadModal(true);
          }}
          className="cf-button-primary w-full sm:w-auto justify-center"
        >
          <Upload className="w-4.5 h-4.5" />
          Upload Notes / Papers
        </button>
      </div>

      {/* Filter and search parameters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center flex-shrink-0 w-full">
        {/* Search */}
        <div className="relative w-full md:w-80 text-left">
          <input
            type="text"
            placeholder="Search by title, subject or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-700/60 rounded-xl bg-transparent text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto pb-1 flex-nowrap">
          {[
            { id: '', title: 'All Resources' },
            { id: 'notes', title: 'Notes' },
            { id: 'past_paper', title: 'Past Papers' },
            { id: 'presentation', title: 'Presentations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-violet-650 text-white'
                  : 'bg-[#1A2236]/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Admin pending items toggle */}
      {user?.role === 'admin' && (
        <div className="mb-4 flex justify-start flex-shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer">
            <input
              type="checkbox"
              checked={showPendingOnly}
              onChange={(e) => setShowPendingOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 text-violet-600 focus:ring-violet-500 accent-violet-650"
            />
            Show Pending Admin Approval items
          </label>
        </div>
      )}

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        {displayedResources.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl">
            <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-xs text-slate-500">No resources logged matching the active query parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {displayedResources.map((item) => (
              <div
                key={item._id}
                className="cf-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[200px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      {item.category.replace('_', ' ')}
                    </span>
                    
                    {user?.role === 'admin' && (
                      <div className="flex gap-1">
                        {!item.isApproved && (
                          <button
                            onClick={() => handleApprove(item._id)}
                            className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Approve Resource"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-white mb-1 line-clamp-1">{item.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4">{item.subject}</p>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-center mt-4">
                  <div className="text-left min-w-0">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Uploaded by</span>
                    <span className="font-semibold text-[10px] text-slate-350 truncate block max-w-[140px] mt-1">{item.uploadedBy?.fullName}</span>
                  </div>
                  <button
                    onClick={() => handleDownload(item._id, item.fileUrl)}
                    className="cf-button-primary !py-1.5 !px-3"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A2236] border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 text-left">
            <h3 className="font-extrabold text-sm text-white mb-4 uppercase tracking-wider">Upload Study Resource</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Asset Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Exam Prep Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full cf-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Course Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS4112 Distributed Systems"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full cf-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full cf-select"
                  >
                    <option value="notes">Notes</option>
                    <option value="past_paper">Past Paper</option>
                    <option value="presentation">Presentation</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">File Attachment</label>
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    className="w-full text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-violet-500/10 file:text-violet-400 hover:file:bg-violet-500/20 text-[10px] border border-slate-700/60 rounded-xl px-2 py-1.5 cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="cf-button-primary"
                >
                  {isUploading ? 'Uploading...' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
