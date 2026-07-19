import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import { Plus, Save, Sparkles, BookOpen, BrainCircuit, Lock, Unlock, HelpCircle } from 'lucide-react';

interface NotesSectionProps {
  workspaceId: string;
  currentUser: any;
}

interface Note {
  _id: string;
  title: string;
  content: string;
  lockedBy?: string | null;
  userName?: string;
  tags: string[];
}

export const NotesSection: React.FC<NotesSectionProps> = ({ workspaceId, currentUser }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedByName, setLockedByName] = useState('');

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [aiMode, setAiMode] = useState<'summary' | 'quiz' | 'flashcards' | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardBack, setShowFlashcardBack] = useState(false);

  useEffect(() => {
    fetchNotes();

    // Listen for WebSocket updates on note edits and locking
    if (socketService.socket) {
      socketService.socket.on('note_content_updated', ({ noteId, content: newContent }) => {
        setNotes(prev => prev.map(n => n._id === noteId ? { ...n, content: newContent } : n));
        if (selectedNote?._id === noteId) {
          setContent(newContent);
        }
      });

      socketService.socket.on('note_status', ({ noteId, lockedBy: userLockId, userName }) => {
        setNotes(prev => prev.map(n => n._id === noteId ? { ...n, lockedBy: userLockId, userName } : n));
        if (selectedNote?._id === noteId) {
          setLockedBy(userLockId);
          setLockedByName(userName || '');
        }
      });
    }

    return () => {
      if (socketService.socket) {
        socketService.socket.off('note_content_updated');
        socketService.socket.off('note_status');
      }
    };
  }, [workspaceId, selectedNote]);

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`/api/notes/${workspaceId}`);
      setNotes(res.data.notes);
      if (res.data.notes.length > 0 && !selectedNote) {
        handleSelectNote(res.data.notes[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setLockedBy(note.lockedBy || null);
    setLockedByName(note.userName || '');
    // Reset AI panel
    setAiMode(null);
    setAiOutput('');
  };

  const handleCreateNote = async () => {
    try {
      const res = await axios.post(`/api/notes/${workspaceId}`, {
        title: 'Untitled Note',
        content: ''
      });
      const newNote = res.data.note;
      setNotes(prev => [...prev, newNote]);
      handleSelectNote(newNote);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (selectedNote) {
      // Sync change locally in list
      setNotes(prev => prev.map(n => n._id === selectedNote._id ? { ...n, content: val } : n));
      // Broadcast note content edit
      socketService.emitNoteEdit(selectedNote._id, workspaceId, val);
    }
  };

  const handleLockNote = (lock: boolean) => {
    if (selectedNote) {
      socketService.socket?.emit('note_lock', {
        noteId: selectedNote._id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        lock
      });
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;

    try {
      await axios.put(`/api/notes/detail/${selectedNote._id}`, {
        title,
        content
      });
      // Save version snapshot
      await axios.post(`/api/notes/detail/${selectedNote._id}/version`, {
        content
      });
      fetchNotes();
      alert('Note saved and version snapshotted successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  // AI Feature Calls
  const handleAiSummarize = async () => {
    if (!content) return;
    setAiLoading(true);
    setAiMode('summary');
    setAiOutput('');

    try {
      const res = await axios.post('/api/ai/summarize', { content });
      setAiOutput(res.data.summary);
    } catch (err) {
      console.error(err);
      setAiOutput('Failed to summarize note.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiQuiz = async () => {
    if (!content) return;
    setAiLoading(true);
    setAiMode('quiz');
    setShowQuizResults(false);
    setSelectedAnswers({});
    setQuizQuestions([]);

    try {
      const res = await axios.post('/api/ai/quiz', { content });
      setQuizQuestions(res.data.quiz);
    } catch (err) {
      console.error(err);
      alert('Failed to generate MCQ Quiz.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFlashcards = async () => {
    if (!content) return;
    setAiLoading(true);
    setAiMode('flashcards');
    setFlashcards([]);
    setCurrentFlashcardIndex(0);
    setShowFlashcardBack(false);

    try {
      const res = await axios.post('/api/ai/flashcards', { content });
      setFlashcards(res.data.flashcards);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Flashcards.');
    } finally {
      setAiLoading(false);
    }
  };

  const isEditingBlocked = lockedBy !== null && lockedBy !== currentUser.id;

  return (
    <div className="flex-1 flex min-h-0 bg-slate-50/50 dark:bg-slate-900/10 m-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 overflow-hidden shadow-sm">
      {/* Notes Directory Column */}
      <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-800/20 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="text-left">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Study Notes</h3>
            <p className="text-[10px] text-slate-400">Manage learning pages</p>
          </div>
          <button
            onClick={handleCreateNote}
            className="p-1 rounded-lg bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 text-violet-600 dark:text-violet-400"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-left">
          {notes.length === 0 ? (
            <span className="text-xs text-slate-400 block px-3 py-4">No notes created yet.</span>
          ) : (
            notes.map((n) => (
              <button
                key={n._id}
                onClick={() => handleSelectNote(n)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                  selectedNote?._id === n._id
                    ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
                }`}
              >
                {n.lockedBy ? (
                  <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                )}
                <span className="truncate flex-1">{n.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor & AI split screen */}
      <div className="flex-1 flex min-w-0 bg-white dark:bg-slate-900/40 relative">
        {selectedNote ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Note Editor Header */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50/50 dark:bg-slate-800/20">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (selectedNote) {
                    setNotes(prev => prev.map(n => n._id === selectedNote._id ? { ...n, title: e.target.value } : n));
                  }
                }}
                disabled={isEditingBlocked}
                className="font-bold text-sm bg-transparent border-none outline-none dark:text-slate-100 text-slate-800 focus:ring-0 max-w-sm"
              />

              <div className="flex items-center gap-3">
                {/* Lock Status indicators */}
                {isEditingBlocked ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full font-semibold">
                    <Lock className="w-3 h-3 animate-pulse" />
                    Locked by {lockedByName}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full font-semibold">
                    <Unlock className="w-3 h-3" />
                    Shared Edit Mode
                  </span>
                )}

                <button
                  onClick={handleSaveNote}
                  disabled={isEditingBlocked}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-md shadow-violet-500/10"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>
              </div>
            </div>

            {/* Note text editor body */}
            <div className="flex-1 flex min-h-0">
              <textarea
                value={content}
                onChange={handleContentChange}
                onFocus={() => handleLockNote(true)}
                onBlur={() => handleLockNote(false)}
                disabled={isEditingBlocked}
                placeholder="Start typing your collaborative notes here..."
                className="flex-1 p-6 text-sm resize-none bg-transparent outline-none focus:ring-0 text-slate-700 dark:text-slate-200 border-none leading-relaxed h-full overflow-y-auto"
              />

              {/* AI Features Side Toolbar */}
              <div className="w-14 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 gap-3 bg-slate-50/50 dark:bg-slate-800/10 flex-shrink-0">
                <button
                  onClick={handleAiSummarize}
                  title="AI Note Summarizer"
                  className={`p-2.5 rounded-full transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/40 text-violet-500 ${aiMode === 'summary' ? 'bg-violet-100 dark:bg-violet-950/40' : ''}`}
                >
                  <Sparkles className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleAiQuiz}
                  title="AI Quiz Generator"
                  className={`p-2.5 rounded-full transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/40 text-violet-500 ${aiMode === 'quiz' ? 'bg-violet-100 dark:bg-violet-950/40' : ''}`}
                >
                  <HelpCircle className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleAiFlashcards}
                  title="AI Flashcards Generator"
                  className={`p-2.5 rounded-full transition-colors hover:bg-violet-100 dark:hover:bg-violet-950/40 text-violet-500 ${aiMode === 'flashcards' ? 'bg-violet-100 dark:bg-violet-950/40' : ''}`}
                >
                  <BrainCircuit className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* AI Render Panel (if active) */}
              {aiMode && (
                <div className="w-80 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-900/60 p-4 overflow-y-auto text-left flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-2">
                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {aiMode === 'summary' && 'AI Note Summary'}
                      {aiMode === 'quiz' && 'AI MCQ Quiz'}
                      {aiMode === 'flashcards' && 'AI Flashcards'}
                    </span>
                  </div>

                  {aiLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400">
                      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Generating AI study materials...
                    </div>
                  ) : (
                    <div className="flex-1 text-xs space-y-4">
                      {/* Render Summary */}
                      {aiMode === 'summary' && (
                        <div className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                          {aiOutput}
                        </div>
                      )}

                      {/* Render Quiz */}
                      {aiMode === 'quiz' && (
                        <div className="space-y-4">
                          {quizQuestions.map((q, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 space-y-2">
                              <p className="font-bold text-slate-700 dark:text-slate-200">{idx+1}. {q.question}</p>
                              <div className="space-y-1">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <label key={oIdx} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`quiz-${idx}`}
                                      value={opt}
                                      disabled={showQuizResults}
                                      checked={selectedAnswers[idx] === opt}
                                      onChange={() => setSelectedAnswers(prev => ({ ...prev, [idx]: opt }))}
                                      className="text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="text-slate-600 dark:text-slate-350">{opt}</span>
                                  </label>
                                ))}
                              </div>
                              {showQuizResults && (
                                <div className={`p-2 rounded text-[10px] ${
                                  selectedAnswers[idx] === q.answer 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                                }`}>
                                  <p className="font-bold">Correct: {q.answer}</p>
                                  <p className="mt-0.5 text-slate-400">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                          {!showQuizResults ? (
                            <button
                              onClick={() => setShowQuizResults(true)}
                              className="w-full py-2 bg-violet-600 hover:bg-violet-750 text-white rounded-lg text-xs font-semibold"
                            >
                              Submit Answers
                            </button>
                          ) : (
                            <button
                              onClick={handleAiQuiz}
                              className="w-full py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold"
                            >
                              Retake Quiz
                            </button>
                          )}
                        </div>
                      )}

                      {/* Render Flashcards */}
                      {aiMode === 'flashcards' && flashcards.length > 0 && (
                        <div className="flex flex-col items-center space-y-4">
                          {/* Flip Card */}
                          <div
                            onClick={() => setShowFlashcardBack(!showFlashcardBack)}
                            className="w-full h-44 cursor-pointer relative bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl p-6 flex flex-col justify-between items-center text-center shadow-lg transition-transform hover:scale-[1.02]"
                          >
                            <span className="text-[10px] tracking-wider uppercase font-semibold text-violet-200">
                              {!showFlashcardBack ? 'Front (Click to Flip)' : 'Back (Click to Flip)'}
                            </span>
                            <p className="font-bold text-sm leading-relaxed">
                              {!showFlashcardBack ? flashcards[currentFlashcardIndex].front : flashcards[currentFlashcardIndex].back}
                            </p>
                            <span className="text-[10px] text-violet-200 font-mono">
                              {currentFlashcardIndex + 1} / {flashcards.length}
                            </span>
                          </div>

                          {/* Navigation */}
                          <div className="flex gap-2 w-full justify-between">
                            <button
                              disabled={currentFlashcardIndex === 0}
                              onClick={() => {
                                setCurrentFlashcardIndex(prev => prev - 1);
                                setShowFlashcardBack(false);
                              }}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 rounded text-[10px] font-semibold text-slate-650 dark:text-slate-300 disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              disabled={currentFlashcardIndex === flashcards.length - 1}
                              onClick={() => {
                                setCurrentFlashcardIndex(prev => prev + 1);
                                setShowFlashcardBack(false);
                              }}
                              className="px-3 py-1 bg-violet-600 hover:bg-violet-750 rounded text-[10px] font-semibold text-white disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm">Select or create a study note to start writing</p>
          </div>
        )}
      </div>
    </div>
  );
};
