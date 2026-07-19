import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { registerUser, loginUser, loginGoogle } from '../features/authSlice';
import { GraduationCap, ArrowRight, Globe, Mail, Lock, User, School, Book } from 'lucide-react';

export const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error, loading } = useSelector((state: RootState) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginUser({ email, password })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        window.location.href = '/';
      }
    });
  };

  const handleGoogleMock = () => {
    // Simulated Google OAuth login
    dispatch(loginGoogle({
      googleId: 'google_oauth_123',
      email: 'student.oauth@university.edu',
      fullName: 'Oauth Student User',
      profilePicture: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
    })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        window.location.href = '/';
      }
    });
  };

  return (
    <div className="min-screen w-full flex items-center justify-center bg-slate-900 min-h-screen text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/60 rounded-3xl p-8 shadow-xl flex flex-col justify-center space-y-6 relative overflow-hidden backdrop-blur-md">
        
        {/* Brand Banner */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-650 flex items-center justify-center text-white mx-auto shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-wide mt-3 text-slate-50">Log in to CampusFlow</h2>
          <p className="text-xs text-slate-400">All-in-one student workspace platform</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/20 border border-rose-800/50 rounded-xl text-xs text-rose-400 font-semibold text-center">
            {error}
          </div>
        )}

        {/* Input fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-1 mt-6"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase">Or continue with</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        {/* OAuth Buttons */}
        <button
          type="button"
          onClick={handleGoogleMock}
          className="w-full py-2.5 bg-slate-700/40 hover:bg-slate-700 border border-slate-700 text-slate-205 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Globe className="w-4 h-4 text-rose-500" />
          <span>Google Login (University email)</span>
        </button>

        <p className="text-xs text-slate-400 text-center">
          New to CampusFlow?{' '}
          <a href="/register" className="text-violet-400 font-bold hover:underline">
            Create an account
          </a>
        </p>

        <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-violet-500/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};

export const Register: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { error, loading } = useSelector((state: RootState) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [degreeProgram, setDegreeProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(
      registerUser({
        fullName,
        email,
        password,
        university,
        degreeProgram,
        academicYear
      })
    ).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        window.location.href = '/';
      }
    });
  };

  return (
    <div className="min-screen w-full flex items-center justify-center bg-slate-900 min-h-screen text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/60 rounded-3xl p-8 shadow-xl flex flex-col justify-center space-y-6 relative overflow-hidden backdrop-blur-md">
        
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-650 flex items-center justify-center text-white mx-auto shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-wide mt-3 text-slate-50">Create Student Profile</h2>
          <p className="text-xs text-slate-400">Join your classmates and start collaborating</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/20 border border-rose-800/50 rounded-xl text-xs text-rose-400 font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left overflow-y-auto max-h-[50vh] pr-2 no-scrollbar">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Dilshan Fernando"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">University Email</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">University / College</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. University of Moratuwa"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Degree Program</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Sc. Engineering"
                  value={degreeProgram}
                  onChange={(e) => setDegreeProgram(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/30 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <Book className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 tracking-wider uppercase">Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year (Final Year)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-1 mt-6 flex-shrink-0"
          >
            <span>{loading ? 'Processing...' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center flex-shrink-0">
          Already have an account?{' '}
          <a href="/login" className="text-violet-400 font-bold hover:underline">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};
