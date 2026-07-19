import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Plus, Trash2, Edit3, Award, FileBadge, Globe } from 'lucide-react';

interface Project {
  title: string;
  description: string;
  githubUrl: string;
  demoUrl: string;
  tags: string[];
}

interface Certificate {
  title: string;
  issuer: string;
  credentialUrl: string;
}

interface Achievement {
  title: string;
  description: string;
}

interface Portfolio {
  projects: Project[];
  skills: string[];
  certificates: Certificate[];
  achievements: Achievement[];
  githubLink: string;
  linkedinLink: string;
  theme: string;
}

interface PortfolioPageProps {
  userId: string;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ userId }) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit states
  const [githubLink, setGithubLink] = useState('');
  const [linkedinLink, setLinkedinLink] = useState('');
  const [theme, setTheme] = useState('modern');
  const [skills, setSkills] = useState<string[]>([]);
  
  // Modals for adding items
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Project form states
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projGit, setProjGit] = useState('');
  const [projDemo, setProjDemo] = useState('');
  const [projTags, setProjTags] = useState('');

  // Cert form states
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certUrl, setCertUrl] = useState('');

  // Ach form states
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');

  useEffect(() => {
    fetchPortfolio();
  }, [userId]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/portfolios/${userId}`);
      const data = res.data.portfolio;
      setPortfolio(data);
      setGithubLink(data.githubLink || '');
      setLinkedinLink(data.linkedinLink || '');
      setTheme(data.theme || 'modern');
      setSkills(data.skills || []);
      setProjects(data.projects || []);
      setCertificates(data.certificates || []);
      setAchievements(data.achievements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePortfolio = async () => {
    try {
      const res = await axios.put(`/api/portfolios`, {
        githubLink,
        linkedinLink,
        theme,
        skills,
        projects,
        certificates,
        achievements
      });
      setPortfolio(res.data.portfolio);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save portfolio changes.');
    }
  };

  const handleAddProject = () => {
    if (!projTitle) return;
    const newProj: Project = {
      title: projTitle,
      description: projDesc,
      githubUrl: projGit,
      demoUrl: projDemo,
      tags: projTags ? projTags.split(',').map(t => t.trim()) : []
    };
    setProjects(prev => [...prev, newProj]);
    setProjTitle('');
    setProjDesc('');
    setProjGit('');
    setProjDemo('');
    setProjTags('');
  };

  const handleAddCert = () => {
    if (!certTitle || !certIssuer) return;
    const newCert: Certificate = {
      title: certTitle,
      issuer: certIssuer,
      credentialUrl: certUrl
    };
    setCertificates(prev => [...prev, newCert]);
    setCertTitle('');
    setCertIssuer('');
    setCertUrl('');
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (val && !skills.includes(val)) {
        setSkills(prev => [...prev, val]);
        e.currentTarget.value = '';
      }
    }
  };

  const handleAddAch = () => {
    if (!achTitle) return;
    const newAch: Achievement = {
      title: achTitle,
      description: achDesc
    };
    setAchievements(prev => [...prev, newAch]);
    setAchTitle('');
    setAchDesc('');
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading student portfolio...</div>;
  }

  const userProfile = (portfolio as any)?.user;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B1020] h-full text-left">
      {/* Portfolio Viewer Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {/* Profile Card Header */}
        <div className="cf-card p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative text-left">
          {userProfile?.profilePicture ? (
            <img
              src={userProfile.profilePicture}
              alt=""
              className="w-24 h-24 rounded-2xl object-cover border border-violet-500/20 flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-650 text-white font-bold text-3xl flex items-center justify-center flex-shrink-0">
              {userProfile?.fullName?.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-white">{userProfile?.fullName}</h2>
                <p className="text-xs text-violet-400 font-bold">{userProfile?.degreeProgram} &bull; {userProfile?.academicYear}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{userProfile?.university}</p>
              </div>

              <div className="flex gap-2.5">
                {githubLink && (
                  <a href={githubLink} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-[#1A2236]/60 border border-slate-800 text-slate-400 hover:text-white transition-colors" title="GitHub">
                    <Globe className="w-4.5 h-4.5" />
                  </a>
                )}
                {linkedinLink && (
                  <a href={linkedinLink} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-[#1A2236]/60 border border-slate-800 text-slate-400 hover:text-white transition-colors" title="LinkedIn">
                    <Link className="w-4.5 h-4.5" />
                  </a>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="cf-button-primary"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Portfolio
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-2">{userProfile?.bio || 'No profile bio added yet.'}</p>
          </div>
        </div>

        {/* Portfolio Body Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Left Column: Skills & Certifications */}
          <div className="space-y-6">
            {/* Skills */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">Core Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.length === 0 ? (
                  <span className="text-xs text-slate-500">No skills added.</span>
                ) : (
                  skills.map((skill, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Certifications */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">Certifications</h3>
              <div className="space-y-4">
                {certificates.length === 0 ? (
                  <span className="text-xs text-slate-500">No certifications loaded.</span>
                ) : (
                  certificates.map((cert, idx) => (
                    <div key={idx} className="flex gap-3">
                      <FileBadge className="w-7 h-7 text-violet-400 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-xs text-slate-200 block leading-tight">{cert.title}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{cert.issuer}</span>
                        {cert.credentialUrl && (
                          <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="text-[9px] text-violet-400 hover:underline flex items-center gap-0.5 mt-1 font-bold">
                            <Link className="w-2.5 h-2.5" /> View Credential
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Projects & Achievements */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projects list */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">Projects Showcase</h3>
              <div className="space-y-5">
                {projects.length === 0 ? (
                  <span className="text-xs text-slate-500">No academic or side projects added.</span>
                ) : (
                  projects.map((proj, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-[#111827]/40 text-left">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-slate-200">{proj.title}</span>
                        <div className="flex gap-2">
                          {proj.githubUrl && (
                            <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white" title="GitHub">
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                          {proj.demoUrl && (
                            <a href={proj.demoUrl} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white">
                              <Link className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-450 mb-3 leading-relaxed">{proj.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {proj.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-800 text-slate-450 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Achievements list */}
            <div className="cf-card p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 mb-4">Achievements & Awards</h3>
              <div className="space-y-4">
                {achievements.length === 0 ? (
                  <span className="text-xs text-slate-500">No achievements recorded.</span>
                ) : (
                  achievements.map((ach, idx) => (
                    <div key={idx} className="flex gap-3">
                      <Award className="w-7 h-7 text-amber-500 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-xs text-slate-200 block">{ach.title}</span>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ach.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editing Controls Side drawer Overlay & Container */}
      {isEditing && (
        <>
          {/* Backdrop on mobile */}
          <div
            onClick={() => setIsEditing(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-39 lg:hidden animate-fade-in"
          ></div>
          <div className="w-80 fixed lg:relative right-0 inset-y-0 z-40 border-l border-slate-800/80 bg-[#111827] p-5 overflow-y-auto text-left flex flex-col justify-between flex-shrink-0 no-scrollbar shadow-2xl lg:shadow-none transition-all">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Portfolio Editor</h3>
              <button onClick={() => setIsEditing(false)} className="text-xs text-slate-500 font-bold hover:text-white cursor-pointer">Close</button>
            </div>

            {/* Social credentials */}
            <div className="space-y-3.5 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Social Links & Preset</span>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1">GitHub Link</label>
                <input
                  type="text"
                  placeholder="https://github.com/..."
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  className="w-full cf-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1">LinkedIn Link</label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedinLink}
                  onChange={(e) => setLinkedinLink(e.target.value)}
                  className="w-full cf-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 mb-1">Portfolio Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full cf-select"
                >
                  <option value="modern">Modern Glass</option>
                  <option value="compact">Clean Compact</option>
                  <option value="vibrant">Vibrant Indigo</option>
                </select>
              </div>
            </div>

            {/* Skills manager */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Manage Skills</span>
              <input
                type="text"
                placeholder="Type and press Enter..."
                onKeyDown={handleAddSkill}
                className="w-full cf-input"
              />
              <div className="flex flex-wrap gap-1 pt-1.5">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    onClick={() => setSkills(skills.filter(s => s !== skill))}
                    className="text-[9px] px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 cursor-pointer font-bold flex items-center gap-1 border border-rose-500/20"
                  >
                    {skill} &times;
                  </span>
                ))}
              </div>
            </div>

            {/* Projects manager form */}
            <div className="space-y-3 pt-3 border-t border-slate-800 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Add Project</span>
              <input
                type="text"
                placeholder="Project title"
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                className="w-full cf-input"
              />
              <textarea
                placeholder="Description..."
                rows={2}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="w-full cf-input resize-none"
              />
              <input
                type="text"
                placeholder="GitHub Repo URL"
                value={projGit}
                onChange={(e) => setProjGit(e.target.value)}
                className="w-full cf-input"
              />
              <input
                type="text"
                placeholder="Demo URL"
                value={projDemo}
                onChange={(e) => setProjDemo(e.target.value)}
                className="w-full cf-input"
              />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={projTags}
                onChange={(e) => setProjTags(e.target.value)}
                className="w-full cf-input"
              />
              <button
                type="button"
                onClick={handleAddProject}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-650 hover:bg-violet-750 transition-all cursor-pointer shadow-md shadow-violet-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>

              {/* Added list */}
              <div className="space-y-1 mt-2">
                {projects.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#111827]/60 border border-slate-850 p-2 rounded text-[10px]">
                    <span className="font-semibold text-slate-350 truncate max-w-[150px]">{p.title}</span>
                    <button onClick={() => setProjects(projects.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications form */}
            <div className="space-y-3 pt-3 border-t border-slate-800 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Add Certification</span>
              <input
                type="text"
                placeholder="Certification Name"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                className="w-full cf-input"
              />
              <input
                type="text"
                placeholder="Issuer"
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                className="w-full cf-input"
              />
              <input
                type="text"
                placeholder="Verification URL"
                value={certUrl}
                onChange={(e) => setCertUrl(e.target.value)}
                className="w-full cf-input"
              />
              <button
                type="button"
                onClick={handleAddCert}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-650 hover:bg-violet-750 transition-all cursor-pointer shadow-md shadow-violet-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Certificate
              </button>

              <div className="space-y-1 mt-2">
                {certificates.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#111827]/60 border border-slate-850 p-2 rounded text-[10px]">
                    <span className="font-semibold text-slate-350 truncate max-w-[150px]">{c.title}</span>
                    <button onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements form */}
            <div className="space-y-3 pt-3 border-t border-slate-800 text-left">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">Add Achievement</span>
              <input
                type="text"
                placeholder="Achievement title"
                value={achTitle}
                onChange={(e) => setAchTitle(e.target.value)}
                className="w-full cf-input"
              />
              <textarea
                placeholder="Description..."
                rows={2}
                value={achDesc}
                onChange={(e) => setAchDesc(e.target.value)}
                className="w-full cf-input resize-none"
              />
              <button
                type="button"
                onClick={handleAddAch}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-white bg-violet-650 hover:bg-violet-750 transition-all cursor-pointer shadow-md shadow-violet-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Achievement
              </button>

              <div className="space-y-1 mt-2">
                {achievements.map((a, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#111827]/60 border border-slate-850 p-2 rounded text-[10px]">
                    <span className="font-semibold text-slate-350 truncate max-w-[150px]">{a.title}</span>
                    <button onClick={() => setAchievements(achievements.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setIsEditing(false)}
              className="cf-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePortfolio}
              className="cf-button-primary flex-1"
            >
              Save Details
            </button>
          </div>
        </div>
      </>
      )}
    </div>
  );
};
