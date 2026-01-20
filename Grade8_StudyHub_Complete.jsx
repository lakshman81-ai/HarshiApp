import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, memo, useRef } from 'react';
import { BookOpen, FlaskConical, Calculator, Leaf, FileText, HelpCircle, ClipboardList, Settings, ChevronRight, ChevronLeft, Lightbulb, AlertTriangle, Globe, X, Download, RefreshCw, Flame, Trophy, Star, Target, Check, Clock, Bookmark, StickyNote, Copy, Zap, Award, CheckCircle2, Circle, CircleDot, Moon, Sun, Menu, AlertCircle, Wifi, WifiOff, Save, RotateCcw, Loader2, ExternalLink, Database, Cloud, CloudOff } from 'lucide-react';

// ============================================================================
// GOOGLE SHEETS CONFIGURATION
// ============================================================================

const GOOGLE_SHEETS_CONFIG = {
  // ===========================================
  // 🔧 CONFIGURE THESE VALUES FOR YOUR SETUP
  // ===========================================
  
  // Your Google Sheet ID (from the URL)
  // URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
  
  // Your Google API Key (from Google Cloud Console)
  API_KEY: 'AIzaSyCyYBK051jN0Ndr1bi6269z4EGJo3MyzTs',
  
  // ===========================================
  // ⚙️ OPTIONAL SETTINGS
  // ===========================================
  
  // How often to check for updates (milliseconds)
  REFRESH_INTERVAL: 60000, // 1 minute
  
  // Enable automatic refresh
  AUTO_REFRESH: true,
  
  // Show debug info in console
  DEBUG: true,
  
  // Sheet tab names (must match your Google Sheet)
  SHEETS: {
    SUBJECTS: 'Subjects',
    TOPICS: 'Topics',
    TOPIC_SECTIONS: 'Topic_Sections',
    LEARNING_OBJECTIVES: 'Learning_Objectives',
    KEY_TERMS: 'Key_Terms',
    STUDY_CONTENT: 'Study_Content',
    FORMULAS: 'Formulas',
    QUIZ_QUESTIONS: 'Quiz_Questions',
    ACHIEVEMENTS: 'Achievements'
  }
};

// ============================================================================
// UTILITIES
// ============================================================================

const cn = (...classes) => classes.flat().filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const log = (...args) => {
  if (GOOGLE_SHEETS_CONFIG.DEBUG) {
    console.log('[StudyHub]', ...args);
  }
};

// ============================================================================
// GOOGLE SHEETS DATA SERVICE
// ============================================================================

class GoogleSheetsService {
  constructor(config) {
    this.sheetId = config.SHEET_ID;
    this.apiKey = config.API_KEY;
    this.sheets = config.SHEETS;
    this.cache = new Map();
    this.lastFetch = null;
  }

  // Build API URL for a specific sheet
  getSheetUrl(sheetName) {
    return `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${encodeURIComponent(sheetName)}?key=${this.apiKey}`;
  }

  // Fetch a single sheet and convert to array of objects
  async fetchSheet(sheetName) {
    const url = this.getSheetUrl(sheetName);
    log(`Fetching sheet: ${sheetName}`);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length < 2) {
        log(`Sheet ${sheetName} is empty or has only headers`);
        return [];
      }

      // First row = headers, convert to snake_case
      const headers = rows[0].map(h => 
        String(h).trim().toLowerCase().replace(/\s+/g, '_')
      );

      // Convert remaining rows to objects
      const result = rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 }; // Track original row for debugging
        headers.forEach((header, i) => {
          obj[header] = row[i] !== undefined ? String(row[i]).trim() : '';
        });
        return obj;
      });

      log(`Fetched ${result.length} rows from ${sheetName}`);
      return result;

    } catch (error) {
      console.error(`Error fetching ${sheetName}:`, error);
      throw error;
    }
  }

  // Fetch all sheets in parallel
  async fetchAllSheets() {
    log('Fetching all sheets...');
    const startTime = Date.now();

    const sheetNames = Object.values(this.sheets);
    const results = await Promise.allSettled(
      sheetNames.map(name => this.fetchSheet(name))
    );

    // Build result object
    const data = {};
    Object.keys(this.sheets).forEach((key, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        data[key] = result.value;
      } else {
        console.error(`Failed to fetch ${this.sheets[key]}:`, result.reason);
        data[key] = [];
      }
    });

    this.lastFetch = new Date();
    log(`All sheets fetched in ${Date.now() - startTime}ms`);
    
    return data;
  }

  // Check if configuration is valid
  isConfigured() {
    return (
      this.sheetId && 
      this.sheetId !== 'YOUR_GOOGLE_SHEET_ID_HERE' &&
      this.apiKey && 
      this.apiKey !== 'YOUR_GOOGLE_API_KEY_HERE'
    );
  }
}

// Create singleton instance
const sheetsService = new GoogleSheetsService(GOOGLE_SHEETS_CONFIG);

// ============================================================================
// DATA TRANSFORMER - Converts raw sheet data to app structure
// ============================================================================

class DataTransformer {
  // Transform subjects sheet
  static transformSubjects(rows) {
    const subjects = {};
    
    rows.forEach(row => {
      const key = row.subject_key;
      if (!key) return;

      subjects[key] = {
        id: row.subject_id || key,
        name: row.name || key,
        icon: row.icon || 'BookOpen',
        color: row.color_hex || '#6366F1',
        lightBg: row.light_bg || 'bg-slate-50',
        gradient: `from-${row.gradient_from || 'slate-500'} to-${row.gradient_to || 'slate-600'}`,
        darkGlow: row.dark_glow || 'shadow-slate-500/20',
        topics: []
      };
    });

    return subjects;
  }

  // Transform topics and attach to subjects
  static transformTopics(rows, subjects) {
    rows.forEach(row => {
      const subjectKey = row.subject_key;
      if (!subjectKey || !subjects[subjectKey]) return;

      subjects[subjectKey].topics.push({
        id: row.topic_id,
        name: row.topic_name,
        duration: parseInt(row.duration_minutes) || 20,
        orderIndex: parseInt(row.order_index) || 0
      });
    });

    // Sort topics by order index
    Object.values(subjects).forEach(subject => {
      subject.topics.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return subjects;
  }

  // Transform sections (grouped by topic_id)
  static transformSections(rows) {
    const sections = {};

    rows.forEach(row => {
      const topicId = row.topic_id;
      if (!topicId) return;

      if (!sections[topicId]) {
        sections[topicId] = [];
      }

      sections[topicId].push({
        id: row.section_id,
        title: row.section_title,
        icon: row.section_icon || 'FileText',
        type: row.section_type || 'content',
        orderIndex: parseInt(row.order_index) || 0
      });
    });

    // Sort by order index
    Object.values(sections).forEach(arr => {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return sections;
  }

  // Transform learning objectives (grouped by topic_id)
  static transformObjectives(rows) {
    const objectives = {};

    rows.forEach(row => {
      const topicId = row.topic_id;
      if (!topicId) return;

      if (!objectives[topicId]) {
        objectives[topicId] = [];
      }

      objectives[topicId].push({
        id: row.objective_id,
        text: row.objective_text,
        orderIndex: parseInt(row.order_index) || 0
      });
    });

    Object.values(objectives).forEach(arr => {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return objectives;
  }

  // Transform key terms (grouped by topic_id)
  static transformKeyTerms(rows) {
    const terms = {};

    rows.forEach(row => {
      const topicId = row.topic_id;
      if (!topicId) return;

      if (!terms[topicId]) {
        terms[topicId] = [];
      }

      terms[topicId].push({
        id: row.term_id,
        term: row.term,
        definition: row.definition
      });
    });

    return terms;
  }

  // Transform study content (grouped by section_id)
  static transformContent(rows) {
    const content = {};

    rows.forEach(row => {
      const sectionId = row.section_id;
      if (!sectionId) return;

      if (!content[sectionId]) {
        content[sectionId] = [];
      }

      content[sectionId].push({
        id: row.content_id,
        type: row.content_type || 'text',
        title: row.content_title || '',
        text: row.content_text || '',
        orderIndex: parseInt(row.order_index) || 0
      });
    });

    Object.values(content).forEach(arr => {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return content;
  }

  // Transform formulas (grouped by topic_id)
  static transformFormulas(rows) {
    const formulas = {};

    rows.forEach(row => {
      const topicId = row.topic_id;
      if (!topicId) return;

      if (!formulas[topicId]) {
        formulas[topicId] = [];
      }

      const variables = [];
      for (let i = 1; i <= 5; i++) {
        const symbol = row[`variable_${i}_symbol`];
        if (symbol) {
          variables.push({
            symbol,
            name: row[`variable_${i}_name`] || '',
            unit: row[`variable_${i}_unit`] || ''
          });
        }
      }

      formulas[topicId].push({
        id: row.formula_id,
        formula: row.formula_text,
        label: row.formula_label || '',
        variables
      });
    });

    return formulas;
  }

  // Transform quiz questions (grouped by topic_id)
  static transformQuizzes(rows) {
    const quizzes = {};

    rows.forEach(row => {
      const topicId = row.topic_id;
      if (!topicId) return;

      if (!quizzes[topicId]) {
        quizzes[topicId] = [];
      }

      quizzes[topicId].push({
        id: row.question_id,
        question: row.question_text,
        options: [
          { label: 'A', text: row.option_a || '' },
          { label: 'B', text: row.option_b || '' },
          { label: 'C', text: row.option_c || '' },
          { label: 'D', text: row.option_d || '' }
        ].filter(opt => opt.text),
        correctAnswer: row.correct_answer?.toUpperCase() || 'A',
        explanation: row.explanation || '',
        xpReward: parseInt(row.xp_reward) || 10
      });
    });

    return quizzes;
  }

  // Transform achievements
  static transformAchievements(rows) {
    return rows.map(row => ({
      id: row.achievement_id,
      icon: row.icon || 'Star',
      name: row.name,
      desc: row.description,
      condition: row.unlock_condition || ''
    }));
  }

  // Transform all data
  static transformAll(rawData) {
    log('Transforming data...');

    // Build subjects with topics
    let subjects = this.transformSubjects(rawData.SUBJECTS || []);
    subjects = this.transformTopics(rawData.TOPICS || [], subjects);

    return {
      subjects,
      sections: this.transformSections(rawData.TOPIC_SECTIONS || []),
      objectives: this.transformObjectives(rawData.LEARNING_OBJECTIVES || []),
      keyTerms: this.transformKeyTerms(rawData.KEY_TERMS || []),
      studyContent: this.transformContent(rawData.STUDY_CONTENT || []),
      formulas: this.transformFormulas(rawData.FORMULAS || []),
      quizQuestions: this.transformQuizzes(rawData.QUIZ_QUESTIONS || []),
      achievements: this.transformAchievements(rawData.ACHIEVEMENTS || [])
    };
  }
}

// ============================================================================
// DEFAULT/FALLBACK DATA
// ============================================================================

const DEFAULT_SUBJECTS = {
  physics: {
    id: 'phys-001', name: 'Physics', icon: 'Zap', color: '#3B82F6',
    lightBg: 'bg-blue-50', gradient: 'from-blue-500 to-blue-600', darkGlow: 'shadow-blue-500/20',
    topics: [
      { id: 'phys-t001', name: "Newton's Laws of Motion", duration: 25 },
      { id: 'phys-t002', name: 'Work and Energy', duration: 30 },
      { id: 'phys-t003', name: 'Light and Optics', duration: 20 }
    ]
  },
  math: {
    id: 'math-001', name: 'Mathematics', icon: 'Calculator', color: '#10B981',
    lightBg: 'bg-emerald-50', gradient: 'from-emerald-500 to-emerald-600', darkGlow: 'shadow-emerald-500/20',
    topics: [
      { id: 'math-t001', name: 'Exponents', duration: 20 },
      { id: 'math-t002', name: 'Probability', duration: 25 },
      { id: 'math-t003', name: 'Linear Equations', duration: 30 }
    ]
  },
  chemistry: {
    id: 'chem-001', name: 'Chemistry', icon: 'FlaskConical', color: '#F59E0B',
    lightBg: 'bg-amber-50', gradient: 'from-amber-500 to-amber-600', darkGlow: 'shadow-amber-500/20',
    topics: [
      { id: 'chem-t001', name: 'Atomic Structure', duration: 25 },
      { id: 'chem-t002', name: 'Chemical Reactions', duration: 30 },
      { id: 'chem-t003', name: 'Periodic Table', duration: 20 }
    ]
  },
  biology: {
    id: 'bio-001', name: 'Biology', icon: 'Leaf', color: '#8B5CF6',
    lightBg: 'bg-violet-50', gradient: 'from-violet-500 to-violet-600', darkGlow: 'shadow-violet-500/20',
    topics: [
      { id: 'bio-t001', name: 'Cell Structure', duration: 25 },
      { id: 'bio-t002', name: 'Human Body Systems', duration: 35 },
      { id: 'bio-t003', name: 'Reproduction', duration: 30 }
    ]
  }
};

const DEFAULT_SECTIONS = {
  'phys-t001': [
    { id: 'phys-t001-s001', title: 'Learning Objectives', icon: 'Target', type: 'objectives', orderIndex: 1 },
    { id: 'phys-t001-s002', title: 'Introduction', icon: 'BookOpen', type: 'intro', orderIndex: 2 },
    { id: 'phys-t001-s003', title: "Newton's First Law", icon: 'Zap', type: 'content', orderIndex: 3 },
    { id: 'phys-t001-s004', title: "Newton's Second Law", icon: 'Zap', type: 'content', orderIndex: 4 },
    { id: 'phys-t001-s005', title: "Newton's Third Law", icon: 'Zap', type: 'content', orderIndex: 5 },
    { id: 'phys-t001-s006', title: 'Real-World Applications', icon: 'Globe', type: 'applications', orderIndex: 6 },
    { id: 'phys-t001-s007', title: 'Topic Quiz', icon: 'HelpCircle', type: 'quiz', orderIndex: 7 }
  ]
};

const DEFAULT_OBJECTIVES = {
  'phys-t001': [
    { id: 'obj-001', text: 'Explain the concept of inertia and how it relates to mass', orderIndex: 1 },
    { id: 'obj-002', text: 'Apply the formula F = ma to solve real-world problems', orderIndex: 2 },
    { id: 'obj-003', text: 'Identify action-reaction force pairs in various scenarios', orderIndex: 3 },
    { id: 'obj-004', text: "Analyze motion using all three of Newton's Laws", orderIndex: 4 }
  ]
};

const DEFAULT_KEY_TERMS = {
  'phys-t001': [
    { id: 'term-001', term: 'Force', definition: 'A push or pull on an object' },
    { id: 'term-002', term: 'Mass', definition: 'Amount of matter in an object (kg)' },
    { id: 'term-003', term: 'Acceleration', definition: 'Rate of change of velocity (m/s²)' },
    { id: 'term-004', term: 'Inertia', definition: 'Resistance to change in motion' },
    { id: 'term-005', term: 'Newton (N)', definition: 'SI unit of force (kg·m/s²)' }
  ]
};

const DEFAULT_CONTENT = {
  'phys-t001-s004': [
    { id: 'cont-001', type: 'introduction', title: 'Introduction', text: "Newton's Second Law describes what happens when an unbalanced force acts on an object. It quantifies the relationship between force, mass, and acceleration.", orderIndex: 1 },
    { id: 'cont-002', type: 'formula', title: 'The Formula', text: 'F = m × a', orderIndex: 2 },
    { id: 'cont-003', type: 'concept_helper', title: 'Concept Helper', text: 'Think of it like pushing a shopping cart. An empty cart (less mass) accelerates quickly with a small push. A full cart (more mass) needs more force for the same acceleration!', orderIndex: 3 },
    { id: 'cont-004', type: 'warning', title: 'Common Misunderstanding', text: 'Students often confuse mass and weight. Mass is the amount of matter (measured in kg) and stays constant. Weight is the force of gravity on that mass (measured in N) and changes based on location!', orderIndex: 4 },
    { id: 'cont-005', type: 'real_world', title: 'Real-World Application', text: 'Car engineers use F = ma to calculate braking distances. More massive vehicles need stronger brakes!', orderIndex: 5 }
  ]
};

const DEFAULT_FORMULAS = {
  'phys-t001': [
    { id: 'formula-001', formula: 'F = m × a', label: "Newton's Second Law", variables: [
      { symbol: 'F', name: 'Force', unit: 'N' },
      { symbol: 'm', name: 'Mass', unit: 'kg' },
      { symbol: 'a', name: 'Acceleration', unit: 'm/s²' }
    ]}
  ]
};

const DEFAULT_QUIZZES = {
  'phys-t001': [
    { id: 'quiz-001', question: 'If a 10 kg object accelerates at 2 m/s², what is the force?', options: [
      { label: 'A', text: '5 N' }, { label: 'B', text: '20 N' }, { label: 'C', text: '12 N' }, { label: 'D', text: '8 N' }
    ], correctAnswer: 'B', explanation: 'Using F = m × a: F = 10 × 2 = 20 N', xpReward: 10 },
    { id: 'quiz-002', question: "Newton's First Law is also known as the law of:", options: [
      { label: 'A', text: 'Acceleration' }, { label: 'B', text: 'Action-Reaction' }, { label: 'C', text: 'Inertia' }, { label: 'D', text: 'Gravity' }
    ], correctAnswer: 'C', explanation: "Newton's First Law describes inertia - objects resist changes in motion", xpReward: 10 },
    { id: 'quiz-003', question: "Which statement best describes Newton's Third Law?", options: [
      { label: 'A', text: 'F = ma' }, { label: 'B', text: 'Objects at rest stay at rest' }, { label: 'C', text: 'Every action has an equal and opposite reaction' }, { label: 'D', text: 'Heavier objects fall faster' }
    ], correctAnswer: 'C', explanation: "Newton's Third Law states that forces come in pairs", xpReward: 10 }
  ]
};

const DEFAULT_ACHIEVEMENTS = [
  { id: 'first-login', icon: 'Zap', name: 'First Login', desc: 'Welcome to StudyHub!' },
  { id: 'first-quiz', icon: 'HelpCircle', name: 'First Quiz', desc: 'Complete your first quiz' },
  { id: 'streak-5', icon: 'Flame', name: '5-Day Streak', desc: 'Study 5 days in a row' },
  { id: 'streak-10', icon: 'Flame', name: '10-Day Streak', desc: 'Study 10 days in a row' },
  { id: 'topic-complete', icon: 'CheckCircle2', name: 'Topic Master', desc: 'Complete any topic' },
  { id: 'subject-50', icon: 'Trophy', name: 'Halfway There', desc: '50% in any subject' },
  { id: 'perfect-quiz', icon: 'Star', name: 'Perfect Score', desc: 'Score 100% on a quiz' },
  { id: 'all-subjects', icon: 'Award', name: 'Well Rounded', desc: 'Study all 4 subjects' }
];

const DEFAULT_PROGRESS = {
  topics: {},
  xp: 0,
  streak: 1,
  lastStudyDate: null,
  studyTimeMinutes: 0,
  quizScores: {},
  bookmarks: [],
  notes: {},
  achievements: ['first-login']
};

const ICON_MAP = {
  Zap, Calculator, FlaskConical, Leaf, Trophy, Star, Award, Flame,
  HelpCircle, CheckCircle2, Target, BookOpen, FileText, Clock, Globe,
  Lightbulb, AlertTriangle, Database, Cloud, CloudOff
};

const STORAGE_KEY = 'studyhub_v6_data';

// ============================================================================
// DATA CONTEXT - Provides synced data to all components
// ============================================================================

const DataContext = createContext(null);
const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

const DataProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error, offline

  // Check if using demo mode (not configured)
  const isDemoMode = !sheetsService.isConfigured();

  // Load data from Google Sheets
  const loadFromSheets = useCallback(async (isManualRefresh = false) => {
    if (isDemoMode) {
      log('Demo mode - using default data');
      setData({
        subjects: DEFAULT_SUBJECTS,
        sections: DEFAULT_SECTIONS,
        objectives: DEFAULT_OBJECTIVES,
        keyTerms: DEFAULT_KEY_TERMS,
        studyContent: DEFAULT_CONTENT,
        formulas: DEFAULT_FORMULAS,
        quizQuestions: DEFAULT_QUIZZES,
        achievements: DEFAULT_ACHIEVEMENTS
      });
      setSyncStatus('offline');
      setIsLoading(false);
      return;
    }

    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setSyncStatus('syncing');
    setError(null);

    try {
      const rawData = await sheetsService.fetchAllSheets();
      const transformed = DataTransformer.transformAll(rawData);
      
      // Validate we got some data
      if (Object.keys(transformed.subjects).length === 0) {
        throw new Error('No subjects found in spreadsheet');
      }

      setData(transformed);
      setLastSync(new Date());
      setSyncStatus('success');
      log('Data synced successfully');

    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
      setSyncStatus('error');
      
      // Use fallback data if no data loaded yet
      if (!data) {
        setData({
          subjects: DEFAULT_SUBJECTS,
          sections: DEFAULT_SECTIONS,
          objectives: DEFAULT_OBJECTIVES,
          keyTerms: DEFAULT_KEY_TERMS,
          studyContent: DEFAULT_CONTENT,
          formulas: DEFAULT_FORMULAS,
          quizQuestions: DEFAULT_QUIZZES,
          achievements: DEFAULT_ACHIEVEMENTS
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isDemoMode, data]);

  // Initial load
  useEffect(() => {
    loadFromSheets();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!GOOGLE_SHEETS_CONFIG.AUTO_REFRESH || isDemoMode) return;

    const interval = setInterval(() => {
      loadFromSheets();
    }, GOOGLE_SHEETS_CONFIG.REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isDemoMode, loadFromSheets]);

  const value = {
    ...data,
    isLoading,
    isRefreshing,
    error,
    lastSync,
    syncStatus,
    isDemoMode,
    refresh: () => loadFromSheets(true)
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// ============================================================================
// STUDY CONTEXT - User progress and settings
// ============================================================================

const StudyContext = createContext(null);
const useStudy = () => {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
};

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn('localStorage error:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

const StudyProvider = ({ children }) => {
  const data = useData();
  const [savedData, setSavedData] = useLocalStorage(STORAGE_KEY, {
    progress: DEFAULT_PROGRESS,
    settings: { darkMode: false, notifications: true, soundEffects: true }
  });
  const [toast, setToast] = useState(null);

  const progress = savedData.progress;
  const settings = savedData.settings;

  const updateProgress = useCallback((updates) => {
    setSavedData(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        ...updates,
        topics: updates.topics ? { ...prev.progress.topics, ...updates.topics } : prev.progress.topics,
        notes: updates.notes ? { ...prev.progress.notes, ...updates.notes } : prev.progress.notes
      }
    }));
  }, [setSavedData]);

  const toggleDarkMode = useCallback(() => {
    setSavedData(prev => ({
      ...prev,
      settings: { ...prev.settings, darkMode: !prev.settings.darkMode }
    }));
  }, [setSavedData]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Update streak on load
  useEffect(() => {
    const today = new Date().toDateString();
    if (progress.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const newStreak = progress.lastStudyDate === yesterday.toDateString() ? progress.streak + 1 : 1;
      
      const newAchievements = [...progress.achievements];
      if (newStreak >= 5 && !newAchievements.includes('streak-5')) newAchievements.push('streak-5');
      if (newStreak >= 10 && !newAchievements.includes('streak-10')) newAchievements.push('streak-10');
      
      updateProgress({ streak: newStreak, lastStudyDate: today, achievements: newAchievements });
    }
  }, []);

  const value = {
    progress,
    settings,
    subjects: data?.subjects || DEFAULT_SUBJECTS,
    sections: data?.sections || DEFAULT_SECTIONS,
    objectives: data?.objectives || DEFAULT_OBJECTIVES,
    keyTerms: data?.keyTerms || DEFAULT_KEY_TERMS,
    studyContent: data?.studyContent || DEFAULT_CONTENT,
    formulas: data?.formulas || DEFAULT_FORMULAS,
    quizQuestions: data?.quizQuestions || DEFAULT_QUIZZES,
    achievements: data?.achievements || DEFAULT_ACHIEVEMENTS,
    updateProgress,
    toggleDarkMode,
    showToast,
    toast,
    setToast
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </StudyContext.Provider>
  );
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-amber-500' };

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2", colors[type])}>
      {type === 'success' && <CheckCircle2 className="w-5 h-5" />}
      {type === 'error' && <AlertCircle className="w-5 h-5" />}
      {message}
    </div>
  );
};

const SyncStatusBadge = memo(({ darkMode }) => {
  const { syncStatus, lastSync, isRefreshing, error, isDemoMode, refresh } = useData();

  const statusConfig = {
    idle: { icon: Cloud, color: 'text-slate-400', bg: darkMode ? 'bg-slate-700' : 'bg-slate-100', text: 'Ready' },
    syncing: { icon: Loader2, color: 'text-blue-500', bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-50', text: 'Syncing...' },
    success: { icon: Wifi, color: 'text-emerald-500', bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-50', text: 'Synced' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: darkMode ? 'bg-red-900/30' : 'bg-red-50', text: 'Error' },
    offline: { icon: CloudOff, color: 'text-amber-500', bg: darkMode ? 'bg-amber-900/30' : 'bg-amber-50', text: 'Demo Mode' }
  };

  const config = statusConfig[syncStatus] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={refresh}
        disabled={isRefreshing || isDemoMode}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
          config.bg,
          darkMode ? "text-slate-200" : "text-slate-700",
          !isDemoMode && "hover:opacity-80 cursor-pointer"
        )}
        title={error || (lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Click to refresh')}
      >
        <Icon className={cn("w-4 h-4", config.color, syncStatus === 'syncing' && "animate-spin")} />
        <span className="hidden sm:inline">{config.text}</span>
      </button>
    </div>
  );
});

const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color, showLabel = true, darkMode = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} stroke={darkMode ? '#374151' : '#E5E7EB'} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-lg font-bold", darkMode ? "text-slate-200" : "text-slate-700")}>{progress}%</span>
        </div>
      )}
    </div>
  );
};

const Card = memo(({ children, className, darkMode, glowColor, onClick, ...props }) => {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={cn(
        "rounded-2xl border transition-all",
        darkMode ? `bg-slate-800 border-slate-700 ${glowColor || 'shadow-lg shadow-slate-900/50'}` : "bg-white border-slate-200 shadow-sm",
        onClick && (darkMode ? "hover:border-slate-600" : "hover:border-slate-300 hover:shadow-lg"),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

const AchievementBadge = memo(({ achievement, unlocked, darkMode }) => {
  const IconComponent = ICON_MAP[achievement.icon] || Star;
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-3 rounded-xl transition-all min-w-[80px]",
      unlocked ? darkMode ? "bg-slate-700 shadow-lg shadow-amber-500/10" : "bg-white shadow-md" : darkMode ? "bg-slate-800 opacity-50" : "bg-slate-100 opacity-50"
    )} title={achievement.desc}>
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", unlocked ? "bg-gradient-to-br from-amber-400 to-amber-600" : darkMode ? "bg-slate-600" : "bg-slate-300")}>
        <IconComponent className={cn("w-6 h-6", unlocked ? "text-white" : "text-slate-500")} />
      </div>
      <span className={cn("text-xs font-medium text-center", darkMode ? "text-slate-300" : "text-slate-600")}>{achievement.name}</span>
    </div>
  );
});

const NotesEditor = memo(({ topicId, darkMode }) => {
  const { progress, updateProgress } = useStudy();
  const [notes, setNotes] = useState(progress.notes[topicId] || '');
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setNotes(progress.notes[topicId] || '');
  }, [topicId, progress.notes]);

  const handleChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateProgress({ notes: { [topicId]: value } });
    }, 1000);
  };

  const handleSave = () => {
    setSaving(true);
    updateProgress({ notes: { [topicId]: notes } });
    setTimeout(() => setSaving(false), 500);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleSave}
        placeholder="Type your notes here..."
        className={cn(
          "w-full h-32 p-3 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2",
          darkMode ? "bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 focus:ring-amber-500/50" : "bg-amber-50 border-amber-200 text-amber-900 placeholder-amber-400 focus:ring-amber-300"
        )}
      />
      <button onClick={handleSave} className={cn("w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2", darkMode ? "bg-slate-700 hover:bg-slate-600 text-amber-400" : "bg-amber-100 hover:bg-amber-200 text-amber-800")}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Notes</>}
      </button>
    </div>
  );
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const calculateLevel = (xp) => Math.floor(xp / 200) + 1;
const xpToNextLevel = (xp) => 200 - (xp % 200);
const formatStudyTime = (mins) => mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60 > 0 ? `${mins%60}m` : ''}`;

const calculateSubjectProgress = (subjectKey, topicsProgress, topics) => {
  if (!topics?.length) return 0;
  const total = topics.reduce((sum, t) => sum + (topicsProgress[t.id]?.progress || 0), 0);
  return Math.round(total / topics.length);
};

const countCompletedTopics = (subjects, topicsProgress) => {
  let count = 0;
  Object.values(subjects).forEach(s => {
    s.topics.forEach(t => { if (topicsProgress[t.id]?.progress === 100) count++; });
  });
  return count;
};

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

const Dashboard = memo(({ onSelectSubject, onOpenSettings }) => {
  const { progress, settings, subjects, achievements, toggleDarkMode } = useStudy();
  const { isDemoMode } = useData();
  const darkMode = settings.darkMode;

  const totalXP = progress.xp;
  const level = calculateLevel(totalXP);
  const completedTopics = countCompletedTopics(subjects, progress.topics);

  const allAchievements = achievements.map(a => ({ ...a, unlocked: progress.achievements.includes(a.id) }));

  return (
    <div className={cn("min-h-screen", darkMode ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100")}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm">
          <strong>Demo Mode:</strong> Configure your Google Sheet ID and API Key in the code to enable live sync.
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="ml-2 underline inline-flex items-center gap-1">
            Get API Key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Header */}
      <header className={cn("px-4 sm:px-6 py-4 border-b", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-slate-800")}>StudyHub</h1>
              <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>Grade 8 • {isDemoMode ? 'Demo' : 'Live Sync'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SyncStatusBadge darkMode={darkMode} />
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg", darkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700")}>
              <Star className="w-4 h-4" />
              <span className="font-bold">Lv.{level}</span>
            </div>
            <button onClick={toggleDarkMode} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600")}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={onOpenSettings} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600")}>
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total XP', value: totalXP, icon: Star, color: 'text-amber-500' },
            { label: 'Day Streak', value: progress.streak, icon: Flame, color: 'text-orange-500' },
            { label: 'Topics Done', value: completedTopics, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Study Time', value: formatStudyTime(progress.studyTimeMinutes), icon: Clock, color: 'text-blue-500' }
          ].map((stat, i) => (
            <Card key={i} darkMode={darkMode} className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={cn("w-6 h-6", stat.color)} />
                <div>
                  <div className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-800")}>{stat.value}</div>
                  <div className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>{stat.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Subjects Grid */}
        <h2 className={cn("text-xl font-bold mb-4", darkMode ? "text-white" : "text-slate-800")}>Your Subjects</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {Object.entries(subjects).map(([key, subject]) => {
            const IconComponent = ICON_MAP[subject.icon] || BookOpen;
            const subjectProgress = calculateSubjectProgress(key, progress.topics, subject.topics);

            return (
              <Card key={key} onClick={() => onSelectSubject(key)} darkMode={darkMode} glowColor={darkMode && subject.darkGlow} className="p-6 text-left group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br", subject.gradient)}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-slate-800")}>{subject.name}</h3>
                    <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>{subject.topics.length} topics • {subjectProgress}% complete</p>
                  </div>
                  <ProgressRing progress={subjectProgress} size={50} strokeWidth={4} color={subject.color} showLabel={false} darkMode={darkMode} />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Achievements */}
        <Card darkMode={darkMode} className="p-6">
          <h3 className={cn("font-bold text-lg mb-4 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
            <Trophy className="w-5 h-5 text-amber-500" /> Achievements
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {allAchievements.map(a => (
              <AchievementBadge key={a.id} achievement={a} unlocked={a.unlocked} darkMode={darkMode} />
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
});

// ============================================================================
// SUBJECT OVERVIEW COMPONENT
// ============================================================================

const SubjectOverview = memo(({ subject, onBack, onSelectTopic, onOpenSettings }) => {
  const { progress, subjects, settings } = useStudy();
  const darkMode = settings.darkMode;
  const [activeTab, setActiveTab] = useState('topics');

  const config = subjects[subject];
  const IconComponent = ICON_MAP[config.icon] || BookOpen;
  const subjectProgress = calculateSubjectProgress(subject, progress.topics, config.topics);
  const completedCount = config.topics.filter(t => progress.topics[t.id]?.progress === 100).length;

  return (
    <div className={cn("min-h-screen", darkMode ? "bg-slate-900" : "bg-slate-50")}>
      {/* Hero Header */}
      <div className={cn("bg-gradient-to-br text-white", config.gradient)}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white">
              <ChevronLeft className="w-5 h-5" /><span className="font-medium">Dashboard</span>
            </button>
            <button onClick={onOpenSettings} className="p-2 hover:bg-white/20 rounded-xl"><Settings className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <IconComponent className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{config.name}</h1>
              <p className="text-white/80">{completedCount} of {config.topics.length} topics completed</p>
            </div>
            <div className="hidden sm:block">
              <ProgressRing progress={subjectProgress} size={80} strokeWidth={6} color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("border-b sticky top-0 z-10", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            {[{ id: 'topics', label: 'Topics', icon: FileText }, { id: 'quiz', label: 'Quizzes', icon: HelpCircle }, { id: 'handout', label: 'Handout', icon: ClipboardList }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all",
                  activeTab === tab.id ? "border-current" : cn("border-transparent", darkMode ? "text-slate-400" : "text-slate-500")
                )}
                style={activeTab === tab.id ? { borderColor: config.color, color: config.color } : {}}
              >
                <tab.icon className="w-5 h-5" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'topics' && (
          <div className="space-y-4">
            {config.topics.map((topic, i) => {
              const topicProgress = progress.topics[topic.id]?.progress || 0;
              return (
                <Card key={topic.id} onClick={() => onSelectTopic(i)} darkMode={darkMode} glowColor={darkMode && config.darkGlow} className="p-6 text-left group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      topicProgress === 100 ? "bg-emerald-500" : topicProgress > 0 ? cn("bg-gradient-to-br", config.gradient) : darkMode ? "bg-slate-700" : "bg-slate-200"
                    )}>
                      {topicProgress === 100 ? <CheckCircle2 className="w-6 h-6 text-white" /> : topicProgress > 0 ? <CircleDot className="w-6 h-6 text-white" /> : <Circle className={cn("w-6 h-6", darkMode ? "text-slate-500" : "text-slate-400")} />}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn("font-bold mb-1", darkMode ? "text-white" : "text-slate-800")}>{topic.name}</h3>
                      <div className={cn("flex items-center gap-4 text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{topic.duration} min</span>
                        {topicProgress > 0 && topicProgress < 100 && <span style={{ color: config.color }}>{topicProgress}% complete</span>}
                        {topicProgress === 100 && <span className="text-emerald-600 font-medium flex items-center gap-1"><Check className="w-4 h-4" />Completed</span>}
                      </div>
                    </div>
                    <ChevronRight className={cn("w-6 h-6 group-hover:translate-x-1 transition-all", darkMode ? "text-slate-500" : "text-slate-400")} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'quiz' && (
          <Card darkMode={darkMode} className="p-8 text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              <HelpCircle className={cn("w-8 h-8", darkMode ? "text-slate-500" : "text-slate-400")} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-slate-700")}>Subject Quiz</h3>
            <p className={cn("mb-6", darkMode ? "text-slate-400" : "text-slate-500")}>Test your knowledge across all topics in {config.name}</p>
            <button className={cn("px-8 py-3 bg-gradient-to-r text-white rounded-xl font-bold hover:shadow-lg transition-all", config.gradient)}>Start Quiz</button>
          </Card>
        )}

        {activeTab === 'handout' && (
          <Card darkMode={darkMode} className="p-8 text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              <Download className={cn("w-8 h-8", darkMode ? "text-slate-500" : "text-slate-400")} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-slate-700")}>Quick Reference Sheet</h3>
            <p className={cn("mb-6", darkMode ? "text-slate-400" : "text-slate-500")}>Download a summary of all {config.name} topics</p>
            <button className={cn("px-8 py-3 bg-gradient-to-r text-white rounded-xl font-bold hover:shadow-lg transition-all", config.gradient)}>Download PDF</button>
          </Card>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// STUDY GUIDE COMPONENT
// ============================================================================

const StudyGuide = memo(({ subject, topicIndex, onBack, onOpenSettings }) => {
  const { progress, subjects, sections, objectives, keyTerms, studyContent, formulas, quizQuestions, updateProgress, settings } = useStudy();
  const darkMode = settings.darkMode;

  const config = subjects[subject];
  const topic = config.topics[topicIndex];
  const topicKey = topic.id;
  const IconComponent = ICON_MAP[config.icon] || BookOpen;

  // Get data for this topic
  const topicSections = sections[topicKey] || DEFAULT_SECTIONS[topicKey] || [];
  const topicObjectives = objectives[topicKey] || DEFAULT_OBJECTIVES[topicKey] || [];
  const topicTerms = keyTerms[topicKey] || DEFAULT_KEY_TERMS[topicKey] || [];
  const topicFormulas = formulas[topicKey] || DEFAULT_FORMULAS[topicKey] || [];
  const topicQuizzes = quizQuestions[topicKey] || DEFAULT_QUIZZES[topicKey] || [];

  const [activeSection, setActiveSection] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [xpGain, setXpGain] = useState(null);

  const currentSection = topicSections[activeSection];
  const sectionContent = currentSection ? (studyContent[currentSection.id] || DEFAULT_CONTENT[currentSection.id] || []) : [];

  const progressPercent = progress.topics[topicKey]?.progress || 0;
  const bookmarked = progress.bookmarks.filter(b => b.startsWith(topicKey));

  const copyFormula = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSectionComplete = (sectionIndex) => {
    const currentProgress = progress.topics[topicKey]?.progress || 0;
    const newProgress = Math.min(100, Math.round(((sectionIndex + 1) / topicSections.length) * 100));

    if (newProgress > currentProgress) {
      const xpEarned = 10;
      setXpGain(xpEarned);

      const newAchievements = [...progress.achievements];
      if (newProgress === 100 && !newAchievements.includes('topic-complete')) {
        newAchievements.push('topic-complete');
      }

      updateProgress({
        xp: progress.xp + xpEarned,
        topics: { [topicKey]: { progress: newProgress, xp: (progress.topics[topicKey]?.xp || 0) + xpEarned, lastAccessed: new Date().toISOString() } },
        studyTimeMinutes: progress.studyTimeMinutes + 2,
        achievements: newAchievements
      });

      setTimeout(() => setXpGain(null), 1500);
    }
  };

  const handleQuizSubmit = () => {
    if (quizAnswer === null) return;
    setQuizSubmitted(true);

    const currentQuiz = topicQuizzes[0];
    if (currentQuiz && quizAnswer === currentQuiz.correctAnswer) {
      const xpEarned = currentQuiz.xpReward;
      setXpGain(xpEarned);
      updateProgress({ xp: progress.xp + xpEarned });
      setTimeout(() => setXpGain(null), 1500);
    }
  };

  const toggleBookmark = (sectionId) => {
    const key = `${topicKey}-${sectionId}`;
    const newBookmarks = progress.bookmarks.includes(key)
      ? progress.bookmarks.filter(b => b !== key)
      : [...progress.bookmarks, key];
    updateProgress({ bookmarks: newBookmarks });
  };

  return (
    <div className={cn("min-h-screen flex", darkMode ? "bg-slate-900" : "bg-slate-50")}>
      {/* XP Animation */}
      {xpGain && (
        <div className="fixed top-20 right-8 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2">
            <Star className="w-5 h-5" />+{xpGain} XP
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn("hidden lg:flex w-72 flex-col border-r", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        {/* Header */}
        <div className={cn("p-4 border-b", darkMode ? "border-slate-700" : "border-slate-200")}>
          <button onClick={onBack} className={cn("flex items-center gap-2 mb-4", darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-800")}>
            <ChevronLeft className="w-5 h-5" /><span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", config.gradient)}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={cn("font-bold truncate", darkMode ? "text-white" : "text-slate-800")}>{topic.name}</h2>
              <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>{config.name}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className={cn("p-4 border-b", darkMode ? "border-slate-700" : "border-slate-200")}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-600")}>Progress</span>
            <span className="text-sm font-bold" style={{ color: config.color }}>{progressPercent}%</span>
          </div>
          <div className={cn("w-full h-2 rounded-full overflow-hidden", darkMode ? "bg-slate-700" : "bg-slate-100")}>
            <div className={cn("h-full rounded-full transition-all bg-gradient-to-r", config.gradient)} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto p-4">
          <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3", darkMode ? "text-slate-500" : "text-slate-400")}>Outline</h3>
          <div className="space-y-1">
            {topicSections.map((section, i) => {
              const SectionIcon = ICON_MAP[section.icon] || FileText;
              const isCompleted = i < Math.floor((progressPercent / 100) * topicSections.length);
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(i)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                    activeSection === i ? cn("bg-gradient-to-r text-white shadow-lg", config.gradient)
                      : isCompleted ? darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                      : darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", activeSection === i ? "bg-white/20" : isCompleted ? "bg-emerald-500 text-white" : darkMode ? "border-2 border-slate-600" : "border-2 border-slate-300")}>
                    {isCompleted && activeSection !== i ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <span className="font-medium text-sm flex-1">{section.title}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* XP Earned */}
        <div className={cn("p-4 border-t", darkMode ? "border-slate-700" : "border-slate-200")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", darkMode ? "bg-amber-900/50" : "bg-amber-100")}>
              <Star className={cn("w-5 h-5", darkMode ? "text-amber-400" : "text-amber-600")} />
            </div>
            <div>
              <p className={cn("font-bold", darkMode ? "text-white" : "text-slate-800")}>+{progress.topics[topicKey]?.xp || 0} XP</p>
              <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>Earned this topic</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className={cn("px-4 sm:px-8 py-4 border-b flex items-center justify-between", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={onBack} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className={cn("font-bold", darkMode ? "text-white" : "text-slate-800")}>{topic.name}</h2>
          </div>
          <div className="hidden lg:block">
            <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>{currentSection?.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => currentSection && toggleBookmark(currentSection.id)} className={cn("p-2 rounded-lg", bookmarked.includes(`${topicKey}-${currentSection?.id}`) ? "bg-amber-100 text-amber-600" : darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
              <Bookmark className="w-5 h-5" />
            </button>
            <button onClick={() => setShowNotes(!showNotes)} className={cn("p-2 rounded-lg", showNotes ? "bg-blue-100 text-blue-600" : darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
              <StickyNote className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-prose mx-auto">
            {/* Learning Objectives */}
            {currentSection?.type === 'objectives' && (
              <div className={cn("rounded-2xl p-6 border mb-8", darkMode ? "bg-indigo-900/30 border-indigo-700" : "bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200")}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className={cn("w-6 h-6", darkMode ? "text-indigo-400" : "text-indigo-600")} />
                  <h2 className={cn("text-lg font-bold", darkMode ? "text-indigo-300" : "text-indigo-800")}>After this lesson, you will be able to:</h2>
                </div>
                <ul className="space-y-3">
                  {topicObjectives.map((obj, i) => (
                    <li key={obj.id || i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className={darkMode ? "text-indigo-200" : "text-indigo-800"}>{obj.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Content Sections */}
            {(currentSection?.type === 'content' || currentSection?.type === 'intro' || currentSection?.type === 'applications') && (
              <>
                {sectionContent.map((content, i) => (
                  <div key={content.id || i} className="mb-6">
                    {content.type === 'introduction' && (
                      <p className={cn("text-lg leading-relaxed", darkMode ? "text-slate-300" : "text-slate-600")}>{content.text}</p>
                    )}

                    {content.type === 'formula' && (
                      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                        <div className="relative">
                          <p className="text-blue-300 text-sm font-medium mb-2">{content.title}</p>
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="text-4xl sm:text-5xl font-bold text-white font-mono">{content.text}</span>
                          </div>
                          {topicFormulas[0]?.variables && (
                            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                              {topicFormulas[0].variables.map((v, j) => (
                                <div key={j}>
                                  <div className={cn("text-2xl font-bold", j === 0 ? "text-blue-400" : j === 1 ? "text-emerald-400" : "text-amber-400")}>{v.symbol}</div>
                                  <div className="text-sm text-slate-400">{v.name} ({v.unit})</div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button onClick={() => copyFormula(content.text)} className="flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
                            <Copy className="w-4 h-4" />{copied ? 'Copied!' : 'Copy equation'}
                          </button>
                        </div>
                      </div>
                    )}

                    {content.type === 'concept_helper' && (
                      <div className={cn("rounded-2xl p-5 border-l-4", darkMode ? "bg-blue-900/30 border-blue-500" : "bg-blue-50 border-blue-500")}>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className={cn("w-5 h-5", darkMode ? "text-blue-400" : "text-blue-600")} />
                          <span className={cn("font-bold", darkMode ? "text-blue-300" : "text-blue-800")}>💡 {content.title}</span>
                        </div>
                        <p className={darkMode ? "text-blue-200" : "text-blue-900"}>{content.text}</p>
                      </div>
                    )}

                    {content.type === 'warning' && (
                      <div className={cn("rounded-2xl p-5 border-l-4", darkMode ? "bg-red-900/30 border-red-500" : "bg-red-50 border-red-500")}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className={cn("w-5 h-5", darkMode ? "text-red-400" : "text-red-600")} />
                          <span className={cn("font-bold", darkMode ? "text-red-300" : "text-red-800")}>⚠️ {content.title}</span>
                        </div>
                        <p className={darkMode ? "text-red-200" : "text-red-900"}>{content.text}</p>
                      </div>
                    )}

                    {content.type === 'real_world' && (
                      <div className={cn("rounded-2xl p-5 border-l-4", darkMode ? "bg-emerald-900/30 border-emerald-500" : "bg-emerald-50 border-emerald-500")}>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className={cn("w-5 h-5", darkMode ? "text-emerald-400" : "text-emerald-600")} />
                          <span className={cn("font-bold", darkMode ? "text-emerald-300" : "text-emerald-800")}>🌍 {content.title}</span>
                        </div>
                        <p className={darkMode ? "text-emerald-200" : "text-emerald-900"}>{content.text}</p>
                      </div>
                    )}
                  </div>
                ))}

                {sectionContent.length === 0 && (
                  <div className={cn("text-center py-12", darkMode ? "text-slate-400" : "text-slate-500")}>
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Content for this section is being prepared.</p>
                    <p className="text-sm mt-2">Update your Google Sheet to add content!</p>
                  </div>
                )}
              </>
            )}

            {/* Quiz Section */}
            {currentSection?.type === 'quiz' && topicQuizzes.length > 0 && (
              <div className={cn("rounded-2xl p-6 border", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                <h3 className={cn("text-lg font-bold mb-4", darkMode ? "text-white" : "text-slate-800")}>Quick Quiz</h3>
                <p className={cn("mb-6", darkMode ? "text-slate-300" : "text-slate-600")}>{topicQuizzes[0].question}</p>
                <div className="space-y-3 mb-6">
                  {topicQuizzes[0].options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => !quizSubmitted && setQuizAnswer(opt.label)}
                      disabled={quizSubmitted}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all flex items-center gap-3",
                        quizSubmitted
                          ? opt.label === topicQuizzes[0].correctAnswer
                            ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-800"
                            : opt.label === quizAnswer
                              ? "bg-red-100 border-2 border-red-500 text-red-800"
                              : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
                          : quizAnswer === opt.label
                            ? cn("border-2 bg-gradient-to-r text-white", config.gradient)
                            : darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      )}
                    >
                      <span className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", quizAnswer === opt.label && !quizSubmitted ? "bg-white/20" : darkMode ? "bg-slate-600" : "bg-slate-200")}>
                        {opt.label}
                      </span>
                      <span>{opt.text}</span>
                      {quizSubmitted && opt.label === topicQuizzes[0].correctAnswer && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-600" />}
                    </button>
                  ))}
                </div>

                {!quizSubmitted ? (
                  <button onClick={handleQuizSubmit} disabled={quizAnswer === null} className={cn("w-full py-3 rounded-xl font-bold transition-all", quizAnswer === null ? darkMode ? "bg-slate-700 text-slate-500" : "bg-slate-200 text-slate-400" : cn("bg-gradient-to-r text-white", config.gradient))}>
                    Submit Answer
                  </button>
                ) : (
                  <div className={cn("p-4 rounded-xl", quizAnswer === topicQuizzes[0].correctAnswer ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                    <p className="font-bold mb-1">{quizAnswer === topicQuizzes[0].correctAnswer ? '🎉 Correct!' : '❌ Not quite!'}</p>
                    <p>{topicQuizzes[0].explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                disabled={activeSection === 0}
                className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium", activeSection === 0 ? darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400" : darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700")}
              >
                <ChevronLeft className="w-5 h-5" />Previous
              </button>
              <div className="flex items-center gap-1">
                {topicSections.map((_, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full", i === activeSection ? cn("bg-gradient-to-r", config.gradient) : i < activeSection ? "bg-emerald-500" : darkMode ? "bg-slate-600" : "bg-slate-300")} />
                ))}
              </div>
              <button
                onClick={() => { handleSectionComplete(activeSection); setActiveSection(Math.min(topicSections.length - 1, activeSection + 1)); }}
                disabled={activeSection === topicSections.length - 1}
                className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium", activeSection === topicSections.length - 1 ? darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400" : cn("bg-gradient-to-r text-white", config.gradient))}
              >
                Next<ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        {showNotes && (
          <div className={cn("border-t p-4", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className="max-w-prose mx-auto">
              <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                <StickyNote className="w-5 h-5 text-amber-500" />Your Notes
              </h3>
              <NotesEditor topicId={topicKey} darkMode={darkMode} />
            </div>
          </div>
        )}
      </main>

      {/* Key Terms Sidebar */}
      <aside className={cn("hidden xl:block w-72 border-l p-4 overflow-y-auto", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
        <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2", darkMode ? "text-slate-500" : "text-slate-400")}>
          <BookOpen className="w-4 h-4" />Key Terms
        </h3>
        <div className="space-y-2">
          {topicTerms.map((item, i) => (
            <div key={item.id || i} className={cn("rounded-xl p-3", darkMode ? "bg-slate-700" : "bg-slate-50")}>
              <p className={cn("font-bold text-sm", darkMode ? "text-white" : "text-slate-800")}>{item.term}</p>
              <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>{item.definition}</p>
            </div>
          ))}
        </div>

        {/* Bookmarks */}
        <h3 className={cn("text-xs font-bold uppercase tracking-wider mt-6 mb-3 flex items-center gap-2", darkMode ? "text-slate-500" : "text-slate-400")}>
          <Bookmark className="w-4 h-4" />Bookmarks
        </h3>
        {bookmarked.length > 0 ? (
          <div className="space-y-2">
            {bookmarked.map((b, i) => {
              const sectionId = b.split('-').pop();
              const section = topicSections.find(s => s.id === sectionId);
              return (
                <button key={i} onClick={() => setActiveSection(topicSections.findIndex(s => s.id === sectionId))} className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left", darkMode ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50" : "bg-amber-50 text-amber-800 hover:bg-amber-100")}>
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  <span className="truncate">{section?.title || sectionId}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={cn("text-sm", darkMode ? "text-slate-500" : "text-slate-400")}>No bookmarks yet</p>
        )}
      </aside>
    </div>
  );
});

// ============================================================================
// SETTINGS PANEL
// ============================================================================

const SettingsPanel = memo(({ onClose }) => {
  const { settings, toggleDarkMode } = useStudy();
  const { isDemoMode, refresh, lastSync, syncStatus } = useData();
  const darkMode = settings.darkMode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={cn("w-full max-w-lg rounded-2xl shadow-xl overflow-hidden", darkMode ? "bg-slate-800" : "bg-white")}>
        <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
          <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>Settings</h2>
          <button onClick={onClose} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Data Source */}
          <div>
            <h3 className={cn("font-bold mb-3", darkMode ? "text-white" : "text-slate-800")}>Data Source</h3>
            <div className={cn("p-4 rounded-xl", isDemoMode ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
              <div className="flex items-center gap-2 mb-2">
                {isDemoMode ? <CloudOff className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
                <span className="font-bold">{isDemoMode ? 'Demo Mode' : 'Google Sheets Connected'}</span>
              </div>
              <p className="text-sm">{isDemoMode ? 'Configure your Sheet ID and API Key to enable live sync.' : `Last synced: ${lastSync?.toLocaleString() || 'Never'}`}</p>
              {!isDemoMode && (
                <button onClick={refresh} className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                  <RefreshCw className="w-4 h-4 inline mr-2" />Sync Now
                </button>
              )}
            </div>
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("font-medium", darkMode ? "text-white" : "text-slate-800")}>Dark Mode</p>
              <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Toggle dark theme</p>
            </div>
            <button onClick={toggleDarkMode} className={cn("w-12 h-7 rounded-full p-1 transition-colors", darkMode ? "bg-indigo-600" : "bg-slate-300")}>
              <div className={cn("w-5 h-5 rounded-full bg-white shadow-md transform transition-transform", darkMode && "translate-x-5")} />
            </button>
          </div>

          {/* Setup Instructions */}
          {isDemoMode && (
            <div className={cn("p-4 rounded-xl", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              <h4 className={cn("font-bold mb-2", darkMode ? "text-white" : "text-slate-800")}>Setup Instructions</h4>
              <ol className={cn("text-sm space-y-2", darkMode ? "text-slate-300" : "text-slate-600")}>
                <li>1. Upload the Excel template to Google Sheets</li>
                <li>2. Get your Sheet ID from the URL</li>
                <li>3. Create a Google Cloud API key</li>
                <li>4. Update the config in the code</li>
              </ol>
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-indigo-500 hover:underline text-sm">
                Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className={cn("p-6 border-t", darkMode ? "border-slate-700" : "border-slate-200")}>
          <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Done</button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN APP
// ============================================================================

export default function Grade8StudyHub() {
  return (
    <DataProvider>
      <StudyProvider>
        <AppContent />
      </StudyProvider>
    </DataProvider>
  );
}

const AppContent = () => {
  const { isLoading } = useData();
  const { settings } = useStudy();
  const darkMode = settings.darkMode;

  const [view, setView] = useState('dashboard');
  const [subject, setSubject] = useState(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  if (isLoading) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center", darkMode ? "bg-slate-900" : "bg-slate-50")}>
        <Loader2 className={cn("w-12 h-12 animate-spin mb-4", darkMode ? "text-blue-400" : "text-blue-600")} />
        <p className={cn("text-lg", darkMode ? "text-slate-300" : "text-slate-600")}>Loading from Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className={cn("font-sans antialiased", darkMode && "dark")}>
      {view === 'dashboard' && (
        <Dashboard onSelectSubject={(s) => { setSubject(s); setView('subject'); }} onOpenSettings={() => setShowSettings(true)} />
      )}

      {view === 'subject' && subject && (
        <SubjectOverview subject={subject} onBack={() => setView('dashboard')} onSelectTopic={(i) => { setTopicIndex(i); setView('study'); }} onOpenSettings={() => setShowSettings(true)} />
      )}

      {view === 'study' && subject && (
        <StudyGuide subject={subject} topicIndex={topicIndex} onBack={() => setView('subject')} onOpenSettings={() => setShowSettings(true)} />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};
