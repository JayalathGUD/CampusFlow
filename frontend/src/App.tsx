import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store/store';
import { fetchMe } from './features/authSlice';
import { fetchWorkspaces, fetchWorkspaceMembers } from './features/workspaceSlice';
import socketService from './services/socketService';

import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

import { Dashboard } from './pages/Dashboard';
import { StudyLibrary } from './pages/StudyLibrary';
import { PortfolioPage } from './pages/PortfolioPage';
import { AdminPanel } from './pages/AdminPanel';
import { Login, Register } from './pages/AuthPages';
import { WorkspaceDashboard } from './pages/WorkspaceDashboard';

import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { activeWorkspace, members } = useSelector((state: RootState) => state.workspace);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cf_dark_mode');
    return saved ? saved === 'true' : true;
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('cf_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const isLoginPage = window.location.pathname === '/login';
  const isRegisterPage = window.location.pathname === '/register';

  useEffect(() => {
    if (token) {
      dispatch(fetchMe());
      dispatch(fetchWorkspaces());
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (user) {
      socketService.connect(user.id);
    }
    return () => {
      socketService.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (activeWorkspace) {
      dispatch(fetchWorkspaceMembers(activeWorkspace._id));
      socketService.joinWorkspace(activeWorkspace._id);
    }
    return () => {
      if (activeWorkspace) {
        socketService.leaveWorkspace(activeWorkspace._id);
      }
    };
  }, [dispatch, activeWorkspace]);

  if (isLoginPage) return <Login />;
  if (isRegisterPage) return <Register />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0B1020] text-slate-800 dark:text-slate-100 font-sans relative transition-colors duration-300">
      
      {/* Mobile Top Bar */}
      <div className="flex md:hidden h-14 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800/80 items-center px-4 justify-between w-full flex-shrink-0 absolute top-0 left-0 z-30 transition-colors duration-300">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-white">CAMPUSFLOW</span>
        <div className="w-9 h-9 flex items-center justify-center">
          {/* User profile picture mini fallback */}
          {user && (
            <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
              {user.fullName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-39 md:hidden"
        ></div>
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            setSidebarOpen(false); // Close sidebar on mobile navigation
          }}
          closeSidebar={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-14 md:pt-0">
        {currentTab !== 'workspace' && (
          <Navbar darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
        )}

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Main sections */}
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'resources' && <StudyLibrary />}
          {currentTab === 'portfolio' && user && <PortfolioPage userId={user.id} />}
          {currentTab === 'admin' && <AdminPanel />}

          {/* Workspace Channel details container */}
          {currentTab === 'workspace' && activeWorkspace && (
            <WorkspaceDashboard
              workspace={activeWorkspace}
              user={user}
              members={members}
              darkMode={darkMode}
              toggleDarkMode={() => setDarkMode(!darkMode)}
              toggleSidebar={() => setSidebarOpen(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
