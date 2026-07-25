import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { logoutUser } from '../features/authSlice';
import { Bell, Sun, Moon, LogOut, User, Search, Settings } from 'lucide-react';
import axios from 'axios';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { activeWorkspace } = useSelector((state: RootState) => state.workspace);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (showProfileMenu && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showProfileMenu]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    window.location.href = '/login';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] flex items-center justify-between px-6 relative z-30 text-left flex-shrink-0 transition-colors duration-300">
      {/* Title or Workspace name */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-400">
          {activeWorkspace ? activeWorkspace.name : 'CampusFlow'}
        </h1>
        {activeWorkspace && (
          <span className="hidden sm:inline text-xs px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30 text-violet-400 font-mono">
            Code: {activeWorkspace.inviteCode}
          </span>
        )}
      </div>

      {/* Action items */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search notes, tasks, library..."
            className="w-64 pl-9 pr-4 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-[#1A2236]/80 border border-slate-250 dark:border-slate-850 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
          />
          <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications (Only for logged in users) */}
        {user && (
          <div ref={notifRef} className="relative">
            <button
              onClick={toggleNotifications}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white relative cursor-pointer transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2236] overflow-hidden z-20 transition-all">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#111827]/50">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Notifications</span>
                  {unreadCount > 0 && <span className="text-[10px] text-violet-400 font-bold">{unreadCount} new</span>}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => markNotificationRead(n._id)}
                        className={`px-4 py-3 cursor-pointer text-left hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors ${
                          !n.isRead ? 'bg-violet-500/5' : ''
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{n.title}</p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Menu Dropdown / Sign In Button */}
        {user ? (
          <div ref={profileRef} className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center gap-2 focus:outline-none cursor-pointer"
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-violet-550/30"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                  {user.fullName?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:block text-xs font-bold text-slate-650 dark:text-slate-350 pr-1">
                {user.fullName?.split(' ')[0]}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-48 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2236] py-1.5 overflow-hidden z-20">
                <a
                  href={`/portfolio/${user.id}`}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-450" />
                  My Portfolio
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-450" />
                  Settings
                </a>
                <hr className="my-1 border-slate-200 dark:border-slate-800" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-750 rounded-xl transition-all shadow-md shadow-violet-500/10 cursor-pointer animate-fade-in"
          >
            Sign In
          </button>
        )}

      </div>
    </header>
  );
};
