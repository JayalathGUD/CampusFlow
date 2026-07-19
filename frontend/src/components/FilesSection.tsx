import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Image, FolderArchive, Trash2, Search, Download, Folder } from 'lucide-react';

interface FilesSectionProps {
  workspaceId: string;
}

interface WorkspaceFile {
  _id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  folder: string;
  createdAt: string;
  uploadedBy: {
    fullName: string;
  };
}

export const FilesSection: React.FC<FilesSectionProps> = ({ workspaceId }) => {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('/');

  useEffect(() => {
    fetchFiles();
  }, [workspaceId]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`/api/files/${workspaceId}`);
      setFiles(res.data.files);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', selectedFolder);
    setIsUploading(true);

    try {
      const res = await axios.post(`/api/files/${workspaceId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setFiles(prev => [res.data.file, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await axios.delete(`/api/files/detail/${fileId}`);
      setFiles(prev => prev.filter(f => f._id !== fileId));
    } catch (err) {
      console.error(err);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText className="w-8 h-8 text-rose-500" />;
    } else if (mimeType.includes('image')) {
      return <Image className="w-8 h-8 text-emerald-500" />;
    } else if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('octet-stream')) {
      return <FolderArchive className="w-8 h-8 text-amber-500" />;
    }
    return <FileText className="w-8 h-8 text-violet-500" />;
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    f.folder === selectedFolder
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/10 p-6">
      {/* Header section */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-left">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cloud Storage Manager</h2>
          <p className="text-xs text-slate-400">Share coursework sheets, project code ZIP files, and diagrams</p>
        </div>

        {/* Upload action */}
        <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer transition-all shadow-md shadow-violet-500/15">
          <Upload className="w-4.5 h-4.5" />
          <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
          <input type="file" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
        </label>
      </div>

      {/* Directory structure tabs */}
      <div className="flex items-center gap-3 mb-6 bg-slate-100/55 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/45 w-fit">
        <button
          onClick={() => setSelectedFolder('/')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            selectedFolder === '/'
              ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Folder className="w-4 h-4" />
          Root Directory
        </button>
        <button
          onClick={() => setSelectedFolder('/lectures')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            selectedFolder === '/lectures'
              ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Folder className="w-4 h-4" />
          Lectures
        </button>
        <button
          onClick={() => setSelectedFolder('/assignments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            selectedFolder === '/assignments'
              ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Folder className="w-4 h-4" />
          Assignment Outputs
        </button>
      </div>

      {/* Search Input bar */}
      <div className="relative mb-5 w-80 text-left">
        <input
          type="text"
          placeholder="Search folder files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-xs focus:outline-none dark:text-slate-200"
        />
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
      </div>

      {/* Documents Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-10 h-10 text-slate-350 mb-2" />
            <p className="text-sm">No files found in this folder</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file._id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-all text-left relative group"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  {getFileIcon(file.type)}
                  <button
                    onClick={() => handleDeleteFile(file._id)}
                    className="p-1 text-slate-350 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mb-1" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-[10px] text-slate-400 mb-4">{formatBytes(file.size)}</p>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
                  <span className="text-[9px] text-slate-400">By: {file.uploadedBy?.fullName || 'User'}</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
