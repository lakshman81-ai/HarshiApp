import React, { useState, useEffect } from 'react';

// ============================================================================
// STUDYHUB APP - Fixed Version
// ============================================================================

const ADMIN_PASSWORD = 'Superdad';

const STORAGE = {
  CONFIG: 'studyhub_config',
  PROGRESS: 'studyhub_progress',
  DARK: 'studyhub_dark'
};

// Default subjects (used when Google Sheets not connected)
const DEFAULT_SUBJECTS = [
  { id: 'physics', name: 'Physics', color: '#3B82F6', topics: ["Newton's Laws of Motion", "Work and Energy", "Light and Optics"] },
  { id: 'math', name: 'Mathematics', color: '#10B981', topics: ["Exponents", "Probability", "Linear Equations"] },
  { id: 'chemistry', name: 'Chemistry', color: '#F59E0B', topics: ["Atomic Structure", "Chemical Reactions", "Periodic Table"] },
  { id: 'biology', name: 'Biology', color: '#8B5CF6', topics: ["Cell Structure", "Human Body Systems", "Reproduction"] }
];

// Helper functions
function loadStorage(key, defaultVal) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch { return defaultVal; }
}

function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function StudyHubApp() {
  const [darkMode, setDarkMode] = useState(() => loadStorage(STORAGE.DARK, false));
  const [config, setConfig] = useState(() => loadStorage(STORAGE.CONFIG, { sheetId: '', apiKey: '', autoRefresh: true, refreshInterval: 60 }));
  const [progress, setProgress] = useState(() => loadStorage(STORAGE.PROGRESS, { xp: 150, streak: 3, studyTime: 45, achievements: ['first-login'] }));
  
  const [view, setView] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);

  useEffect(() => { saveStorage(STORAGE.DARK, darkMode); }, [darkMode]);
  useEffect(() => { saveStorage(STORAGE.CONFIG, config); }, [config]);
  useEffect(() => { saveStorage(STORAGE.PROGRESS, progress); }, [progress]);

  // Theme classes
  const theme = {
    bg: darkMode ? 'bg-slate-900' : 'bg-gray-50',
    card: darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-slate-400' : 'text-gray-500',
    input: darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900',
  };

  // ========== HOME VIEW ==========
  if (view === 'home') {
    return (
      <div className={`min-h-screen ${theme.bg}`}>
        {!config.sheetId && (
          <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
            ⚠️ Demo Mode - Click ⚙️ to configure Google Sheets
          </div>
        )}

        <header className={`px-4 py-4 border-b ${theme.card}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">S</div>
              <div>
                <h1 className={`font-bold text-lg ${theme.text}`}>StudyHub</h1>
                <p className={`text-xs ${theme.textMuted}`}>Grade 8</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-sm font-bold">
                ⭐ Lv.{Math.floor(progress.xp / 200) + 1}
              </span>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-10 h-10 rounded-lg text-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={() => { setView('settings'); setSettingsUnlocked(false); }} className={`w-10 h-10 rounded-lg text-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                ⚙️
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: 'XP', value: progress.xp, icon: '⭐' },
              { label: 'Streak', value: `${progress.streak}d`, icon: '🔥' },
              { label: 'Time', value: `${progress.studyTime}m`, icon: '⏱️' },
              { label: 'Badges', value: progress.achievements.length, icon: '🏆' },
            ].map((s, i) => (
              <div key={i} className={`p-3 rounded-xl border text-center ${theme.card}`}>
                <div className="text-2xl">{s.icon}</div>
                <div className={`text-lg font-bold ${theme.text}`}>{s.value}</div>
                <div className={`text-xs ${theme.textMuted}`}>{s.label}</div>
              </div>
            ))}
          </div>

          <h2 className={`text-lg font-bold mb-4 ${theme.text}`}>📚 Your Subjects</h2>
          <div className="space-y-3">
            {DEFAULT_SUBJECTS.map((subj) => (
              <button
                key={subj.id}
                type="button"
                onClick={() => { setSelectedSubject(subj); setView('subject'); }}
                className={`w-full p-4 rounded-xl border text-left transition hover:shadow-md ${theme.card}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: subj.color }}>
                    {subj.name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold ${theme.text}`}>{subj.name}</h3>
                    <p className={`text-sm ${theme.textMuted}`}>{subj.topics.length} topics</p>
                  </div>
                  <span className={`text-2xl ${theme.textMuted}`}>›</span>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ========== SUBJECT VIEW ==========
  if (view === 'subject' && selectedSubject) {
    return (
      <div className={`min-h-screen ${theme.bg}`}>
        <header className="text-white px-4 py-6" style={{ backgroundColor: selectedSubject.color }}>
          <div className="max-w-2xl mx-auto">
            <button type="button" onClick={() => setView('home')} className="text-white/80 hover:text-white mb-2">
              ← Back
            </button>
            <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
            <p className="text-white/80">{selectedSubject.topics.length} topics</p>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {selectedSubject.topics.map((topic, i) => (
            <div key={i} className={`p-4 rounded-xl border ${theme.card}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: selectedSubject.color }}>
                  {i + 1}
                </div>
                <div>
                  <h3 className={`font-medium ${theme.text}`}>{topic}</h3>
                  <p className={`text-sm ${theme.textMuted}`}>20 min • Ready to start</p>
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // ========== SETTINGS VIEW ==========
  if (view === 'settings') {
    // Password screen
    if (!settingsUnlocked) {
      return (
        <PasswordScreen
          theme={theme}
          onUnlock={() => setSettingsUnlocked(true)}
          onCancel={() => setView('home')}
        />
      );
    }

    // Settings panel
    return (
      <SettingsPanel
        theme={theme}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        config={config}
        setConfig={setConfig}
        progress={progress}
        setProgress={setProgress}
        onClose={() => setView('home')}
      />
    );
  }

  return <div className="p-8 text-center">Loading...</div>;
}

// ============================================================================
// PASSWORD SCREEN - Simplified
// ============================================================================
function PasswordScreen({ theme, onUnlock, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  const handleUnlock = () => {
    console.log('Attempting unlock with:', password);
    console.log('Expected:', ADMIN_PASSWORD);
    console.log('Match:', password === ADMIN_PASSWORD);
    
    if (password === ADMIN_PASSWORD) {
      console.log('Password correct!');
      onUnlock();
    } else {
      console.log('Password incorrect');
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-sm rounded-2xl border p-6 ${theme.card}`}>
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className={`text-xl font-bold ${theme.text}`}>Admin Settings</h2>
          <p className={`text-sm ${theme.textMuted}`}>Enter password to access</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
              placeholder="Enter password"
              className={`w-full px-4 py-3 rounded-xl border pr-12 ${theme.input} ${error ? 'border-red-500' : ''}`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xl"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">❌ {error}</p>}

          <button
            type="button"
            onClick={handleUnlock}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg"
          >
            🔓 Unlock
          </button>

          <button
            type="button"
            onClick={onCancel}
            className={`w-full py-3 rounded-xl font-medium ${theme.card} border`}
          >
            Cancel
          </button>
        </div>

        <p className={`text-xs text-center mt-4 ${theme.textMuted}`}>
          Hint: Password is "Superdad"
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS PANEL
// ============================================================================
function SettingsPanel({ theme, darkMode, setDarkMode, config, setConfig, progress, setProgress, onClose }) {
  const [openSection, setOpenSection] = useState('connection');

  const Section = ({ id, title, children }) => (
    <div className={`rounded-xl border overflow-hidden ${theme.card}`}>
      <button
        type="button"
        onClick={() => setOpenSection(openSection === id ? '' : id)}
        className={`w-full p-4 flex items-center justify-between text-left ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}`}
      >
        <span className={`font-bold ${theme.text}`}>{title}</span>
        <span>{openSection === id ? '▲' : '▼'}</span>
      </button>
      {openSection === id && (
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          {children}
        </div>
      )}
    </div>
  );

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full p-1 transition ${checked ? 'bg-green-500' : 'bg-gray-400'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <header className={`px-4 py-4 border-b ${theme.card}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className={`font-bold text-lg ${theme.text}`}>⚙️ Settings</h1>
            <p className={`text-sm ${theme.textMuted}`}>Admin Panel</p>
          </div>
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg ${theme.card} border`}>
            ✕ Close
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Connection */}
        <Section id="connection" title="🔗 Google Sheets Connection">
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme.text}`}>Sheet ID</label>
              <input
                type="text"
                value={config.sheetId}
                onChange={(e) => setConfig({ ...config, sheetId: e.target.value })}
                placeholder="1ABC123xyz..."
                className={`w-full px-4 py-3 rounded-xl border ${theme.input}`}
              />
              <p className={`text-xs mt-1 ${theme.textMuted}`}>From: docs.google.com/spreadsheets/d/<b>SHEET_ID</b>/edit</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme.text}`}>API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className={`w-full px-4 py-3 rounded-xl border ${theme.input}`}
              />
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <p className={`font-medium ${theme.text}`}>
                Status: {config.sheetId && config.apiKey ? '✅ Configured' : '⚠️ Not configured'}
              </p>
            </div>
          </div>
        </Section>

        {/* Sync */}
        <Section id="sync" title="🔄 Sync Settings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${theme.text}`}>Auto Refresh</p>
                <p className={`text-sm ${theme.textMuted}`}>Auto sync data</p>
              </div>
              <Toggle checked={config.autoRefresh} onChange={(v) => setConfig({ ...config, autoRefresh: v })} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme.text}`}>Interval (seconds)</label>
              <input
                type="number"
                value={config.refreshInterval}
                onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 60 })}
                className={`w-full px-4 py-3 rounded-xl border ${theme.input}`}
              />
            </div>
          </div>
        </Section>

        {/* Stats */}
        <Section id="stats" title="📊 Statistics & Reset">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'XP', value: progress.xp },
                { label: 'Streak', value: `${progress.streak}d` },
                { label: 'Time', value: `${progress.studyTime}m` },
                { label: 'Badges', value: progress.achievements.length },
              ].map((s, i) => (
                <div key={i} className={`p-2 rounded-lg text-center ${darkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <div className={`font-bold ${theme.text}`}>{s.value}</div>
                  <div className={`text-xs ${theme.textMuted}`}>{s.label}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all progress?')) {
                  setProgress({ xp: 0, streak: 1, studyTime: 0, achievements: ['first-login'] });
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
            >
              🗑️ Reset All Progress
            </button>
          </div>
        </Section>

        {/* Display */}
        <Section id="display" title="🎨 Display">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${theme.text}`}>Dark Mode</p>
              <p className={`text-sm ${theme.textMuted}`}>Toggle theme</p>
            </div>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
        </Section>

        {/* Instructions */}
        <Section id="help" title="📋 Work Instructions">
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
              <h4 className="font-bold text-cyan-700 mb-2">Quick Setup</h4>
              <ol className="text-sm text-cyan-800 space-y-1">
                <li>1. Upload Excel to Google Sheets</li>
                <li>2. Copy Sheet ID from URL</li>
                <li>3. Get API key from Google Cloud</li>
                <li>4. Enter both above</li>
                <li>5. Save and edit your sheet!</li>
              </ol>
            </div>
            <div>
              <p className={`font-medium mb-2 ${theme.text}`}>Required Tabs:</p>
              <p className={`text-sm ${theme.textMuted}`}>Subjects, Topics, Topic_Sections, Study_Content, Quiz_Questions, Achievements, App_Settings</p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
