import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, memo, useRef } from 'react';
import { BookOpen, FlaskConical, Calculator, Leaf, FileText, HelpCircle, ClipboardList, Settings, ChevronRight, ChevronLeft, Lightbulb, AlertTriangle, Globe, X, Download, RefreshCw, Flame, Trophy, Star, Target, Check, Clock, Bookmark, StickyNote, Copy, Zap, Award, CheckCircle2, Circle, CircleDot, Moon, Sun, Menu, AlertCircle, Wifi, WifiOff, Save, RotateCcw, Loader2, ExternalLink, Database, Cloud, CloudOff, Calendar, Sparkles, Play, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

// Import modular StudyGuide component
import StudyGuideNew from './components/StudyGuide';

// Import DailyChallenge component
import DailyChallenge from './components/DailyChallenge';

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
    ACHIEVEMENTS: 'Achievements',
    DAILY_CHALLENGES: 'Daily_Challenges',
    APP_SETTINGS: 'App_Settings'
  },

  // AI Configuration for generating questions/challenges
  AI_CONFIG: {
    ENABLED: true,
    // Set your AI API endpoint here (optional - for AI-generated content)
    API_ENDPOINT: '',
    API_KEY: ''
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
  // Supports video_url, image_url, and description from Google Sheets
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
        // Video support - URL from Google Sheets
        videoUrl: row.video_url || '',
        // Image support - URL from Google Sheets
        imageUrl: row.image_url || '',
        // Optional description for images/videos
        description: row.description || '',
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
        formulaDisplay: row.formula_display || row.formula_text, // For MathFormula rendering
        label: row.formula_label || '',
        orderIndex: parseInt(row.order_index) || 0,
        variables,
        category: row.category || '',
        difficulty: row.difficulty || 'basic',
        notes: row.notes || ''
      });
    });

    // Sort by order index
    Object.values(formulas).forEach(arr => {
      arr.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return formulas;
  }

  // Transform quiz questions (grouped by topic_id)
  // Supports difficulty levels and hints from Google Sheets
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
        // Difficulty level: easy, medium, hard (from Google Sheets)
        difficulty: row.difficulty?.toLowerCase() || 'medium',
        // Hint text (from Google Sheets)
        hint: row.hint || '',
        // Image URL for question (from Google Sheets)
        imageUrl: row.image_url || '',
        xpReward: parseInt(row.xp_reward) || 10
      });
    });

    return quizzes;
  }

  // Transform daily challenges from Google Sheets
  static transformDailyChallenges(rows) {
    const challenges = {};

    rows.forEach(row => {
      const date = row.date; // Format: YYYY-MM-DD
      if (!date) return;

      challenges[date] = {
        id: row.challenge_id || `dc-${date}`,
        date: date,
        type: row.challenge_type || 'quiz', // quiz, math_puzzle, word_problem
        subjectKey: row.subject_key || 'math',
        question: row.question_text || '',
        options: [
          { label: 'A', text: row.option_a || '' },
          { label: 'B', text: row.option_b || '' },
          { label: 'C', text: row.option_c || '' },
          { label: 'D', text: row.option_d || '' }
        ].filter(opt => opt.text),
        correctAnswer: row.correct_answer?.toUpperCase() || 'A',
        explanation: row.explanation || '',
        hint: row.hint || '',
        xpReward: parseInt(row.xp_reward) || 25,
        imageUrl: row.image_url || '',
        difficulty: row.difficulty?.toLowerCase() || 'medium'
      };
    });

    return challenges;
  }

  // Transform app settings from Google Sheets
  static transformSettings(rows) {
    const settings = {};

    rows.forEach(row => {
      const key = row.setting_key;
      if (!key) return;

      settings[key] = {
        value: row.setting_value || '',
        description: row.description || ''
      };
    });

    return settings;
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
      achievements: this.transformAchievements(rawData.ACHIEVEMENTS || []),
      // New: Daily challenges from Google Sheets
      dailyChallenges: this.transformDailyChallenges(rawData.DAILY_CHALLENGES || []),
      // New: App settings from Google Sheets
      appSettings: this.transformSettings(rawData.APP_SETTINGS || [])
    };
  }
}

// ============================================================================
// AI SERVICE - For generating questions and challenges
// ============================================================================

class AIService {
  // Generate a daily challenge using AI when none exists in Google Sheets
  static generateDailyChallenge(subjects, existingQuestions) {
    // Fallback challenges when no AI API is configured
    const fallbackChallenges = [
      {
        type: 'math_puzzle',
        subjectKey: 'math',
        question: 'What is 2^10?',
        options: [
          { label: 'A', text: '512' },
          { label: 'B', text: '1024' },
          { label: 'C', text: '2048' },
          { label: 'D', text: '4096' }
        ],
        correctAnswer: 'B',
        explanation: '2^10 = 2×2×2×2×2×2×2×2×2×2 = 1024',
        hint: 'Remember: 2^10 is also known as 1 kilobyte in computing!',
        difficulty: 'medium',
        xpReward: 25
      },
      {
        type: 'physics',
        subjectKey: 'physics',
        question: 'If a 5 kg object accelerates at 4 m/s², what force is acting on it?',
        options: [
          { label: 'A', text: '9 N' },
          { label: 'B', text: '1.25 N' },
          { label: 'C', text: '20 N' },
          { label: 'D', text: '25 N' }
        ],
        correctAnswer: 'C',
        explanation: 'Using F = ma: F = 5 kg × 4 m/s² = 20 N',
        hint: 'Use Newton\'s Second Law: F = m × a',
        difficulty: 'easy',
        xpReward: 25
      },
      {
        type: 'chemistry',
        subjectKey: 'chemistry',
        question: 'What is the chemical symbol for Gold?',
        options: [
          { label: 'A', text: 'Go' },
          { label: 'B', text: 'Gd' },
          { label: 'C', text: 'Au' },
          { label: 'D', text: 'Ag' }
        ],
        correctAnswer: 'C',
        explanation: 'Au comes from the Latin word "Aurum" meaning gold.',
        hint: 'It comes from the Latin word for gold.',
        difficulty: 'easy',
        xpReward: 25
      },
      {
        type: 'biology',
        subjectKey: 'biology',
        question: 'Which organelle is known as the "powerhouse of the cell"?',
        options: [
          { label: 'A', text: 'Nucleus' },
          { label: 'B', text: 'Mitochondria' },
          { label: 'C', text: 'Ribosome' },
          { label: 'D', text: 'Golgi Body' }
        ],
        correctAnswer: 'B',
        explanation: 'Mitochondria produce ATP, the energy currency of cells, through cellular respiration.',
        hint: 'It produces ATP through cellular respiration.',
        difficulty: 'easy',
        xpReward: 25
      }
    ];

    // Pick a challenge based on the day of year (cycles through)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challenge = fallbackChallenges[dayOfYear % fallbackChallenges.length];

    const today = new Date().toISOString().split('T')[0];
    return {
      id: `ai-dc-${today}`,
      date: today,
      ...challenge,
      isAIGenerated: true
    };
  }

  // Generate additional quiz questions using AI
  static generateQuizQuestions(topicId, topicName, subjectKey, count = 3) {
    // Fallback questions when no AI API is configured
    const fallbackQuestions = {
      physics: [
        {
          question: 'What is the SI unit of force?',
          options: [
            { label: 'A', text: 'Joule' },
            { label: 'B', text: 'Newton' },
            { label: 'C', text: 'Watt' },
            { label: 'D', text: 'Pascal' }
          ],
          correctAnswer: 'B',
          explanation: 'The Newton (N) is the SI unit of force, named after Sir Isaac Newton.',
          hint: 'Named after a famous scientist who studied gravity.',
          difficulty: 'easy'
        }
      ],
      math: [
        {
          question: 'What is the value of π (pi) to 2 decimal places?',
          options: [
            { label: 'A', text: '3.12' },
            { label: 'B', text: '3.14' },
            { label: 'C', text: '3.16' },
            { label: 'D', text: '3.18' }
          ],
          correctAnswer: 'B',
          explanation: 'π ≈ 3.14159... which rounds to 3.14',
          hint: 'It starts with 3.1...',
          difficulty: 'easy'
        }
      ],
      chemistry: [
        {
          question: 'What is the atomic number of Carbon?',
          options: [
            { label: 'A', text: '4' },
            { label: 'B', text: '6' },
            { label: 'C', text: '8' },
            { label: 'D', text: '12' }
          ],
          correctAnswer: 'B',
          explanation: 'Carbon has 6 protons, so its atomic number is 6.',
          hint: 'Count the protons in a Carbon atom.',
          difficulty: 'easy'
        }
      ],
      biology: [
        {
          question: 'What is the basic unit of life?',
          options: [
            { label: 'A', text: 'Atom' },
            { label: 'B', text: 'Molecule' },
            { label: 'C', text: 'Cell' },
            { label: 'D', text: 'Organ' }
          ],
          correctAnswer: 'C',
          explanation: 'The cell is the basic structural and functional unit of all living organisms.',
          hint: 'Robert Hooke first discovered them in 1665.',
          difficulty: 'easy'
        }
      ]
    };

    const questions = fallbackQuestions[subjectKey] || fallbackQuestions.math;
    return questions.slice(0, count).map((q, i) => ({
      id: `ai-q-${topicId}-${i}`,
      ...q,
      xpReward: 10,
      isAIGenerated: true
    }));
  }

  // Storage key for generated content
  static STORAGE_KEY = 'studyhub_generated_content';

  // Get API key from environment or localStorage
  static getApiKey() {
    // Check environment variable first (set in .env file)
    const envKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (envKey && envKey !== 'your_gemini_api_key_here') {
      return envKey;
    }
    // Fallback to localStorage
    return localStorage.getItem('studyhub_ai_api_key') || '';
  }

  // Check if API key is from environment
  static isEnvKeyConfigured() {
    const envKey = process.env.REACT_APP_GEMINI_API_KEY;
    return envKey && envKey !== 'your_gemini_api_key_here';
  }

  // Load stored generated content
  static loadStoredContent() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Save generated content to storage
  static saveContent(content) {
    try {
      const stored = this.loadStoredContent();
      stored.unshift(content); // Add to beginning
      // Keep only last 50 items
      const trimmed = stored.slice(0, 50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
      return trimmed;
    } catch (error) {
      console.error('Error saving generated content:', error);
      return [];
    }
  }

  // Clear all stored content
  static clearStoredContent() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Generate content using Google Gemini API
  static async generateContent(topicId, subTopic, contentType, apiKey, topicName = '', subjectName = '') {
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    // Use provided key or get from env/storage
    const finalApiKey = apiKey || this.getApiKey();

    if (!finalApiKey) {
      throw new Error('No API key provided. Set REACT_APP_GEMINI_API_KEY in .env or enter manually.');
    }

    // Build the prompt based on content type
    let prompt = '';
    const topicContext = topicName ? `Topic: ${topicName}` : `Topic ID: ${topicId}`;
    const subjectContext = subjectName ? `Subject: ${subjectName}` : '';
    const subTopicContext = subTopic ? `Sub-topic focus: ${subTopic}` : '';

    switch (contentType) {
      case 'questions':
        prompt = `You are an educational content generator for Grade 8 students.
${subjectContext}
${topicContext}
${subTopicContext}

Generate 5 multiple-choice quiz questions about this topic. Each question should have 4 options (A, B, C, D) with exactly one correct answer.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        {"label": "A", "text": "Option A text"},
        {"label": "B", "text": "Option B text"},
        {"label": "C", "text": "Option C text"},
        {"label": "D", "text": "Option D text"}
      ],
      "correctAnswer": "B",
      "explanation": "Brief explanation of why B is correct",
      "difficulty": "easy|medium|hard",
      "hint": "A helpful hint for students"
    }
  ]
}`;
        break;

      case 'studyguide':
        prompt = `You are an educational content generator for Grade 8 students.
${subjectContext}
${topicContext}
${subTopicContext}

Generate a comprehensive study guide for this topic. Include key concepts, definitions, formulas (if applicable), and examples.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "studyGuide": {
    "title": "Study Guide: [Topic Name]",
    "introduction": "Brief introduction paragraph",
    "keyConceptsList": ["Concept 1", "Concept 2", "Concept 3"],
    "sections": [
      {
        "heading": "Section Title",
        "content": "Section content with explanations..."
      }
    ],
    "keyTerms": [
      {"term": "Term", "definition": "Definition"}
    ],
    "formulas": ["Formula 1 if applicable"],
    "summary": "Brief summary of main points"
  }
}`;
        break;

      case 'handout':
        prompt = `You are an educational content generator for Grade 8 students.
${subjectContext}
${topicContext}
${subTopicContext}

Generate a one-page handout/cheat sheet for this topic. Make it concise, easy to scan, with bullet points and key facts.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "handout": {
    "title": "Quick Reference: [Topic Name]",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "definitions": [
      {"term": "Term", "definition": "Brief definition"}
    ],
    "formulas": ["Formula 1 = explanation"],
    "examples": ["Example 1 with solution"],
    "tips": ["Study tip 1", "Study tip 2"],
    "commonMistakes": ["Common mistake to avoid"]
  }
}`;
        break;

      default:
        throw new Error('Unknown content type');
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${finalApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();

      // Extract text from Gemini response
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('No content in API response');
      }

      // Parse JSON from response (handle potential markdown code blocks)
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Transform response based on content type
      const timestamp = Date.now();
      let result;

      switch (contentType) {
        case 'questions':
          result = {
            id: `gen-q-${timestamp}`,
            type: 'questions',
            topicId,
            topicName: topicName || topicId,
            subjectName: subjectName || '',
            subTopic: subTopic || '',
            generatedAt: new Date().toISOString(),
            count: parsed.questions?.length || 0,
            items: (parsed.questions || []).map((q, i) => ({
              id: `ai-gen-${timestamp}-${i}`,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty || 'medium',
              hint: q.hint || '',
              xpReward: q.difficulty === 'hard' ? 15 : q.difficulty === 'easy' ? 5 : 10,
              isAIGenerated: true
            }))
          };
          break;

        case 'studyguide':
          result = {
            id: `gen-sg-${timestamp}`,
            type: 'studyguide',
            topicId,
            topicName: topicName || topicId,
            subjectName: subjectName || '',
            subTopic: subTopic || '',
            generatedAt: new Date().toISOString(),
            count: 1,
            items: [{
              id: `ai-sg-${timestamp}`,
              ...parsed.studyGuide,
              isAIGenerated: true
            }]
          };
          break;

        case 'handout':
          result = {
            id: `gen-ho-${timestamp}`,
            type: 'handout',
            topicId,
            topicName: topicName || topicId,
            subjectName: subjectName || '',
            subTopic: subTopic || '',
            generatedAt: new Date().toISOString(),
            count: 1,
            items: [{
              id: `ai-ho-${timestamp}`,
              ...parsed.handout,
              format: 'structured',
              isAIGenerated: true
            }]
          };
          break;

        default:
          throw new Error('Unknown content type');
      }

      // Save to storage
      this.saveContent(result);

      return result;

    } catch (error) {
      console.error('Gemini API error:', error);

      // Provide more helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key.');
      }
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse AI response. Please try again.');
      }

      throw error;
    }
  }
}

// ============================================================================
// AI SERVICE - For generating questions and challenges
// ============================================================================

class AIService {
  // Generate a daily challenge using AI when none exists in Google Sheets
  static generateDailyChallenge(subjects, existingQuestions) {
    // Fallback challenges when no AI API is configured
    const fallbackChallenges = [
      {
        type: 'math_puzzle',
        subjectKey: 'math',
        question: 'What is 2^10?',
        options: [
          { label: 'A', text: '512' },
          { label: 'B', text: '1024' },
          { label: 'C', text: '2048' },
          { label: 'D', text: '4096' }
        ],
        correctAnswer: 'B',
        explanation: '2^10 = 2×2×2×2×2×2×2×2×2×2 = 1024',
        hint: 'Remember: 2^10 is also known as 1 kilobyte in computing!',
        difficulty: 'medium',
        xpReward: 25
      },
      {
        type: 'physics',
        subjectKey: 'physics',
        question: 'If a 5 kg object accelerates at 4 m/s², what force is acting on it?',
        options: [
          { label: 'A', text: '9 N' },
          { label: 'B', text: '1.25 N' },
          { label: 'C', text: '20 N' },
          { label: 'D', text: '25 N' }
        ],
        correctAnswer: 'C',
        explanation: 'Using F = ma: F = 5 kg × 4 m/s² = 20 N',
        hint: 'Use Newton\'s Second Law: F = m × a',
        difficulty: 'easy',
        xpReward: 25
      },
      {
        type: 'chemistry',
        subjectKey: 'chemistry',
        question: 'What is the chemical symbol for Gold?',
        options: [
          { label: 'A', text: 'Go' },
          { label: 'B', text: 'Gd' },
          { label: 'C', text: 'Au' },
          { label: 'D', text: 'Ag' }
        ],
        correctAnswer: 'C',
        explanation: 'Au comes from the Latin word "Aurum" meaning gold.',
        hint: 'It comes from the Latin word for gold.',
        difficulty: 'easy',
        xpReward: 25
      },
      {
        type: 'biology',
        subjectKey: 'biology',
        question: 'Which organelle is known as the "powerhouse of the cell"?',
        options: [
          { label: 'A', text: 'Nucleus' },
          { label: 'B', text: 'Mitochondria' },
          { label: 'C', text: 'Ribosome' },
          { label: 'D', text: 'Golgi Body' }
        ],
        correctAnswer: 'B',
        explanation: 'Mitochondria produce ATP, the energy currency of cells, through cellular respiration.',
        hint: 'It produces ATP through cellular respiration.',
        difficulty: 'easy',
        xpReward: 25
      }
    ];

    // Pick a challenge based on the day of year (cycles through)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challenge = fallbackChallenges[dayOfYear % fallbackChallenges.length];

    const today = new Date().toISOString().split('T')[0];
    return {
      id: `ai-dc-${today}`,
      date: today,
      ...challenge,
      isAIGenerated: true
    };
  }

  // Generate additional quiz questions using AI
  static generateQuizQuestions(topicId, topicName, subjectKey, count = 3) {
    // Fallback questions when no AI API is configured
    const fallbackQuestions = {
      physics: [
        {
          question: 'What is the SI unit of force?',
          options: [
            { label: 'A', text: 'Joule' },
            { label: 'B', text: 'Newton' },
            { label: 'C', text: 'Watt' },
            { label: 'D', text: 'Pascal' }
          ],
          correctAnswer: 'B',
          explanation: 'The Newton (N) is the SI unit of force, named after Sir Isaac Newton.',
          hint: 'Named after a famous scientist who studied gravity.',
          difficulty: 'easy'
        }
      ],
      math: [
        {
          question: 'What is the value of π (pi) to 2 decimal places?',
          options: [
            { label: 'A', text: '3.12' },
            { label: 'B', text: '3.14' },
            { label: 'C', text: '3.16' },
            { label: 'D', text: '3.18' }
          ],
          correctAnswer: 'B',
          explanation: 'π ≈ 3.14159... which rounds to 3.14',
          hint: 'It starts with 3.1...',
          difficulty: 'easy'
        }
      ],
      chemistry: [
        {
          question: 'What is the atomic number of Carbon?',
          options: [
            { label: 'A', text: '4' },
            { label: 'B', text: '6' },
            { label: 'C', text: '8' },
            { label: 'D', text: '12' }
          ],
          correctAnswer: 'B',
          explanation: 'Carbon has 6 protons, so its atomic number is 6.',
          hint: 'Count the protons in a Carbon atom.',
          difficulty: 'easy'
        }
      ],
      biology: [
        {
          question: 'What is the basic unit of life?',
          options: [
            { label: 'A', text: 'Atom' },
            { label: 'B', text: 'Molecule' },
            { label: 'C', text: 'Cell' },
            { label: 'D', text: 'Organ' }
          ],
          correctAnswer: 'C',
          explanation: 'The cell is the basic structural and functional unit of all living organisms.',
          hint: 'Robert Hooke first discovered them in 1665.',
          difficulty: 'easy'
        }
      ]
    };

    const questions = fallbackQuestions[subjectKey] || fallbackQuestions.math;
    return questions.slice(0, count).map((q, i) => ({
      id: `ai-q-${topicId}-${i}`,
      ...q,
      xpReward: 10,
      isAIGenerated: true
    }));
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
    {
      id: 'formula-001', formula: 'F = m × a', label: "Newton's Second Law", variables: [
        { symbol: 'F', name: 'Force', unit: 'N' },
        { symbol: 'm', name: 'Mass', unit: 'kg' },
        { symbol: 'a', name: 'Acceleration', unit: 'm/s²' }
      ]
    }
  ]
};

const DEFAULT_QUIZZES = {
  'phys-t001': [
    {
      id: 'quiz-001',
      question: 'If a 10 kg object accelerates at 2 m/s², what is the force?',
      options: [
        { label: 'A', text: '5 N' }, { label: 'B', text: '20 N' }, { label: 'C', text: '12 N' }, { label: 'D', text: '8 N' }
      ],
      correctAnswer: 'B',
      explanation: 'Using F = m × a: F = 10 × 2 = 20 N',
      difficulty: 'easy',
      hint: 'Use the formula F = m × a and multiply the values.',
      xpReward: 10
    },
    {
      id: 'quiz-002',
      question: "Newton's First Law is also known as the law of:",
      options: [
        { label: 'A', text: 'Acceleration' }, { label: 'B', text: 'Action-Reaction' }, { label: 'C', text: 'Inertia' }, { label: 'D', text: 'Gravity' }
      ],
      correctAnswer: 'C',
      explanation: "Newton's First Law describes inertia - objects resist changes in motion",
      difficulty: 'easy',
      hint: 'It describes how objects resist changes in their state of motion.',
      xpReward: 10
    },
    {
      id: 'quiz-003',
      question: "Which statement best describes Newton's Third Law?",
      options: [
        { label: 'A', text: 'F = ma' }, { label: 'B', text: 'Objects at rest stay at rest' }, { label: 'C', text: 'Every action has an equal and opposite reaction' }, { label: 'D', text: 'Heavier objects fall faster' }
      ],
      correctAnswer: 'C',
      explanation: "Newton's Third Law states that forces come in pairs",
      difficulty: 'medium',
      hint: 'Think about what happens when you push against a wall.',
      xpReward: 10
    },
    {
      id: 'quiz-004',
      question: "A car of mass 1500 kg accelerates from rest to 20 m/s in 10 seconds. What is the net force acting on the car?",
      options: [
        { label: 'A', text: '1500 N' }, { label: 'B', text: '3000 N' }, { label: 'C', text: '30000 N' }, { label: 'D', text: '750 N' }
      ],
      correctAnswer: 'B',
      explanation: 'First find acceleration: a = (20-0)/10 = 2 m/s². Then F = ma = 1500 × 2 = 3000 N',
      difficulty: 'hard',
      hint: 'First calculate the acceleration using a = Δv/t, then use F = ma.',
      xpReward: 15
    }
  ]
};

// Default daily challenges (fallback when Google Sheets is empty)
const DEFAULT_DAILY_CHALLENGES = {
  // Today's date will be generated dynamically
};

// Default app settings
const DEFAULT_APP_SETTINGS = {
  'placeholder_image': { value: 'https://via.placeholder.com/400x300?text=Image+Coming+Soon', description: 'Default placeholder for images' },
  'placeholder_video': { value: 'https://www.youtube.com/embed/dQw4w9WgXcQ', description: 'Default placeholder for videos' },
  'ai_enabled': { value: 'true', description: 'Enable AI-generated content' },
  'daily_challenge_xp': { value: '25', description: 'XP reward for daily challenge' }
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
  achievements: ['first-login'],
  dailyChallengeCompleted: null // Tracks last completed daily challenge date (YYYY-MM-DD)
};

const ICON_MAP = {
  Zap, Calculator, FlaskConical, Leaf, Trophy, Star, Award, Flame,
  HelpCircle, CheckCircle2, Target, BookOpen, FileText, Clock, Globe,
  Lightbulb, AlertTriangle, Database, Cloud, CloudOff, Calendar, Sparkles,
  Play, ImageIcon
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
      log('Demo mode - attempting to load local Excel content');
      try {
        const filePath = (process.env.PUBLIC_URL || '') + '/StudyHub_Data.xlsx';
        const response = await fetch(filePath + '?v=' + new Date().getTime());
        if (!response.ok) throw new Error(`Local file not found at ${filePath}`);

        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const rawData = {};

        // Map sheet names from config to rawData keys expected by transformer
        // The transformer looks for keys like 'Subjects', 'Topics' which match the internal Sheet names
        // defined in GOOGLE_SHEETS_CONFIG.SHEETS values
        Object.entries(GOOGLE_SHEETS_CONFIG.SHEETS).forEach(([key, sheetName]) => {
          if (workbook.Sheets[sheetName]) {
            rawData[key] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          } else {
            // Fallback for missing sheets?
            rawData[sheetName] = [];
          }
        });

        // Use a slight variation of transformAll that expects dict keys to be Sheet Names directly
        // The existing transformAll expects rawData.SUBJECTS etc, but those keys come from 
        // sheetsService.fetchAllSheets which maps them.

        // Actually sheetsService.fetchAllSheets returns an object where keys are the specific sheet names like 'Subjects', 'Topics'
        // DataTransformer.transformAll accesses rawData.SUBJECTS (which is 'Subjects' value from config)
        // Wait, review DataTransformer.transformAll (line 484)
        // It accesses rawData.SUBJECTS ? No, it accesses rawData[GOOGLE_SHEETS_CONFIG.SHEETS.SUBJECTS] ??
        // Let's check line 488: subjects = this.transformSubjects(rawData.SUBJECTS || []); 
        // This implies rawData has keys like 'SUBJECTS', 'TOPICS'.
        // BUT fetchAllSheets usually returns data keyed by how it was fetched.
        // Let's re-read GoogleSheetsService.fetchAllSheets to see what keys it returns.

        // I can't check it right now inside this tool call. 
        // Based on line 488 `rawData.SUBJECTS`, the DataTransformer expects keys named 'SUBJECTS', 'TOPICS' etc.
        // So I should map them:

        const transformedRawData = {};
        Object.entries(GOOGLE_SHEETS_CONFIG.SHEETS).forEach(([configKey, sheetName]) => {
          // configKey is 'SUBJECTS', 'TOPICS' etc.
          if (workbook.Sheets[sheetName]) {
            transformedRawData[configKey] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          }
        });

        const transformed = DataTransformer.transformAll(transformedRawData);
        if (Object.keys(transformed.subjects).length === 0) {
          throw new Error('No subjects found in local Excel file');
        }

        setData(transformed);
        setSyncStatus('offline'); // using local file is still technically 'offline' relative to Google Sheets
        setIsLoading(false);
        log('Loaded data from local Excel file');
        return;

      } catch (err) {
        console.warn('Could not load local Excel file, falling back to defaults:', err);
        // Fallthrough to defaults
      }

      log('Demo mode - using default data');
      setData({
        subjects: DEFAULT_SUBJECTS,
        sections: DEFAULT_SECTIONS,
        objectives: DEFAULT_OBJECTIVES,
        keyTerms: DEFAULT_KEY_TERMS,
        studyContent: DEFAULT_CONTENT,
        formulas: DEFAULT_FORMULAS,
        quizQuestions: DEFAULT_QUIZZES,
        achievements: DEFAULT_ACHIEVEMENTS,
        dailyChallenges: DEFAULT_DAILY_CHALLENGES,
        appSettings: DEFAULT_APP_SETTINGS
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
          achievements: DEFAULT_ACHIEVEMENTS,
          dailyChallenges: DEFAULT_DAILY_CHALLENGES,
          appSettings: DEFAULT_APP_SETTINGS
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

  // Get today's daily challenge (from Google Sheets or AI-generated)
  const getTodayChallenge = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const challenges = data?.dailyChallenges || DEFAULT_DAILY_CHALLENGES;

    // Check if we have a challenge for today in Google Sheets
    if (challenges[today]) {
      return challenges[today];
    }

    // Generate AI challenge as fallback
    return AIService.generateDailyChallenge(data?.subjects || DEFAULT_SUBJECTS, data?.quizQuestions || DEFAULT_QUIZZES);
  }, [data]);

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
    dailyChallenges: data?.dailyChallenges || DEFAULT_DAILY_CHALLENGES,
    appSettings: data?.appSettings || DEFAULT_APP_SETTINGS,
    getTodayChallenge,
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
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={darkMode ? '#374151' : '#E5E7EB'} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
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

// Level calculation removed - XP tracking retained for progress
const formatStudyTime = (mins) => mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`;

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
  const { progress, settings, subjects, achievements, toggleDarkMode, getTodayChallenge, updateProgress, showToast } = useStudy();
  const { isDemoMode } = useData();
  const darkMode = settings.darkMode;

  const totalXP = progress.xp;
  const completedTopics = countCompletedTopics(subjects, progress.topics);

  const allAchievements = achievements.map(a => ({ ...a, unlocked: progress.achievements.includes(a.id) }));

  // Get today's challenge
  const todayChallenge = getTodayChallenge();
  const today = new Date().toISOString().split('T')[0];
  const challengeCompleted = progress.dailyChallengeCompleted === today;

  // Handle daily challenge completion
  const handleChallengeComplete = useCallback((xpEarned, isCorrect) => {
    updateProgress({
      xp: progress.xp + xpEarned,
      dailyChallengeCompleted: today
    });

    if (isCorrect) {
      showToast(`Daily Challenge completed! +${xpEarned} XP`, 'success');
    } else {
      showToast('Better luck tomorrow!', 'info');
    }
  }, [progress.xp, today, updateProgress, showToast]);

  return (
    <div className={cn("min-h-screen", darkMode ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100")}>

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

        {/* Daily Challenge Section */}
        {todayChallenge && (
          <div className="mb-8">
            <DailyChallenge
              challenge={todayChallenge}
              darkMode={darkMode}
              completed={challengeCompleted}
              onComplete={handleChallengeComplete}
            />
          </div>
        )}

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
  const { progress, subjects, settings, quizQuestions, updateProgress } = useStudy();
  const darkMode = settings.darkMode;
  const [activeTab, setActiveTab] = useState('topics');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizState, setQuizState] = useState({ currentIndex: 0, answers: {}, submitted: false, score: 0 });

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
            <button
              onClick={() => {
                setQuizState({ currentIndex: 0, answers: {}, submitted: false, score: 0 });
                setShowQuizModal(true);
              }}
              className={cn("px-8 py-3 bg-gradient-to-r text-white rounded-xl font-bold hover:shadow-lg transition-all", config.gradient)}
            >
              Start Quiz
            </button>
          </Card>
        )}

        {/* Subject Quiz Modal */}
        {showQuizModal && (() => {
          // Gather all quiz questions from all topics in this subject
          const allQuestions = config.topics.flatMap(topic =>
            (quizQuestions[topic.id] || DEFAULT_QUIZZES[topic.id] || []).map(q => ({ ...q, topicId: topic.id, topicName: topic.name }))
          );

          if (allQuestions.length === 0) {
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className={cn("w-full max-w-lg rounded-2xl shadow-xl p-8 text-center", darkMode ? "bg-slate-800" : "bg-white")}>
                  <HelpCircle className={cn("w-16 h-16 mx-auto mb-4", darkMode ? "text-slate-500" : "text-slate-400")} />
                  <h3 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-slate-700")}>No Quiz Questions</h3>
                  <p className={cn("mb-6", darkMode ? "text-slate-400" : "text-slate-500")}>Add quiz questions to your Google Sheet to enable the quiz.</p>
                  <button onClick={() => setShowQuizModal(false)} className="px-6 py-2 bg-slate-200 rounded-lg font-medium">Close</button>
                </div>
              </div>
            );
          }

          const currentQ = allQuestions[quizState.currentIndex];
          const isLastQuestion = quizState.currentIndex === allQuestions.length - 1;

          const handleSelectAnswer = (label) => {
            if (quizState.submitted) return;
            setQuizState(prev => ({ ...prev, answers: { ...prev.answers, [currentQ.id]: label } }));
          };

          const handleSubmitQuiz = () => {
            let score = 0;
            allQuestions.forEach(q => {
              if (quizState.answers[q.id] === q.correctAnswer) score++;
            });
            const xpEarned = score * 15;
            const newAchievements = [...progress.achievements];
            if (!newAchievements.includes('first-quiz')) newAchievements.push('first-quiz');
            if (score === allQuestions.length && !newAchievements.includes('perfect-quiz')) newAchievements.push('perfect-quiz');
            updateProgress({ xp: progress.xp + xpEarned, achievements: newAchievements });
            setQuizState(prev => ({ ...prev, submitted: true, score }));
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className={cn("w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden", darkMode ? "bg-slate-800" : "bg-white")}>
                {/* Header */}
                <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
                  <div>
                    <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>{config.name} Quiz</h2>
                    <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                      {quizState.submitted ? `Score: ${quizState.score}/${allQuestions.length}` : `Question ${quizState.currentIndex + 1} of ${allQuestions.length}`}
                    </p>
                  </div>
                  <button onClick={() => setShowQuizModal(false)} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {!quizState.submitted ? (
                    <>
                      <p className={cn("text-xs mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>From: {currentQ.topicName}</p>
                      <p className={cn("text-lg mb-6", darkMode ? "text-white" : "text-slate-800")}>{currentQ.question}</p>
                      <div className="space-y-3 mb-6">
                        {currentQ.options.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleSelectAnswer(opt.label)}
                            className={cn(
                              "w-full p-4 rounded-xl text-left transition-all flex items-center gap-3",
                              quizState.answers[currentQ.id] === opt.label
                                ? cn("border-2 bg-gradient-to-r text-white", config.gradient)
                                : darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            )}
                          >
                            <span className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", quizState.answers[currentQ.id] === opt.label ? "bg-white/20" : darkMode ? "bg-slate-600" : "bg-slate-200")}>
                              {opt.label}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4", quizState.score === allQuestions.length ? "bg-emerald-100" : "bg-amber-100")}>
                        {quizState.score === allQuestions.length ? <Trophy className="w-10 h-10 text-emerald-600" /> : <Star className="w-10 h-10 text-amber-600" />}
                      </div>
                      <h3 className={cn("text-2xl font-bold mb-2", darkMode ? "text-white" : "text-slate-800")}>
                        {quizState.score === allQuestions.length ? "Perfect Score! 🎉" : "Quiz Complete!"}
                      </h3>
                      <p className={cn("text-lg mb-4", darkMode ? "text-slate-300" : "text-slate-600")}>
                        You scored {quizState.score} out of {allQuestions.length}
                      </p>
                      <p className="text-amber-500 font-bold">+{quizState.score * 15} XP Earned!</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={cn("p-6 border-t flex justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
                  {!quizState.submitted ? (
                    <>
                      <button
                        onClick={() => setQuizState(prev => ({ ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) }))}
                        disabled={quizState.currentIndex === 0}
                        className={cn("px-6 py-2 rounded-lg font-medium", quizState.currentIndex === 0 ? "bg-slate-200 text-slate-400" : "bg-slate-200 hover:bg-slate-300 text-slate-700")}
                      >
                        Previous
                      </button>
                      {isLastQuestion ? (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(quizState.answers).length < allQuestions.length}
                          className={cn("px-6 py-2 rounded-lg font-medium", Object.keys(quizState.answers).length < allQuestions.length ? "bg-slate-200 text-slate-400" : cn("bg-gradient-to-r text-white", config.gradient))}
                        >
                          Submit Quiz
                        </button>
                      ) : (
                        <button
                          onClick={() => setQuizState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }))}
                          disabled={!quizState.answers[currentQ.id]}
                          className={cn("px-6 py-2 rounded-lg font-medium", !quizState.answers[currentQ.id] ? "bg-slate-200 text-slate-400" : cn("bg-gradient-to-r text-white", config.gradient))}
                        >
                          Next
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setShowQuizModal(false)} className={cn("w-full py-3 rounded-xl font-bold bg-gradient-to-r text-white", config.gradient)}>
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

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
// SETTINGS PANEL
// ============================================================================

const SettingsPanel = memo(({ onClose }) => {
  const { settings, subjects } = useStudy();
  const { isDemoMode, refresh, lastSync } = useData();
  const darkMode = settings.darkMode;

  // AI Generation state
  const [aiApiKey, setAiApiKey] = useState(() => {
    // Use env key if available, otherwise localStorage
    return AIService.isEnvKeyConfigured() ? '' : (localStorage.getItem('studyhub_ai_api_key') || '');
  });
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState('');
  const [contentType, setContentType] = useState('questions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [storedContent, setStoredContent] = useState(() => AIService.loadStoredContent());
  const [showStoredContent, setShowStoredContent] = useState(false);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Check if env key is configured
  const isEnvKeyConfigured = AIService.isEnvKeyConfigured();

  // Get subjects list for dropdown
  const subjectsList = useMemo(() => {
    return Object.entries(subjects).map(([key, subject]) => ({
      key,
      name: subject.name
    }));
  }, [subjects]);

  // Get topics for dropdown (filtered by selected subject)
  const filteredTopics = useMemo(() => {
    if (!selectedSubject) return [];
    const subject = subjects[selectedSubject];
    if (!subject) return [];
    return subject.topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      subjectName: subject.name,
      subjectKey: selectedSubject
    }));
  }, [subjects, selectedSubject]);

  // Save API key to localStorage
  const handleApiKeyChange = (e) => {
    const key = e.target.value;
    setAiApiKey(key);
    localStorage.setItem('studyhub_ai_api_key', key);
  };

  // Get linked Google Sheet URLs
  const linkedSheets = useMemo(() => {
    const sheets = [];
    if (GOOGLE_SHEETS_CONFIG.SHEET_ID && GOOGLE_SHEETS_CONFIG.SHEET_ID !== 'YOUR_GOOGLE_SHEET_ID_HERE') {
      sheets.push(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/edit`);
    }
    return sheets;
  }, []);

  // Handle AI generation
  const handleGenerateAI = async () => {
    const effectiveApiKey = isEnvKeyConfigured ? null : aiApiKey;
    if (!isEnvKeyConfigured && !aiApiKey) {
      alert('Please enter an API key or set REACT_APP_GEMINI_API_KEY in .env file');
      return;
    }
    if (!selectedTopic) {
      alert('Please select a topic');
      return;
    }

    // Get topic and subject names for better prompts
    const selectedTopicObj = filteredTopics.find(t => t.id === selectedTopic);
    const topicName = selectedTopicObj?.name || '';
    const subjectName = subjects[selectedSubject]?.name || '';

    setIsGenerating(true);
    setGenerationResult(null);
    setGenerationError(null);
    try {
      const result = await AIService.generateContent(
        selectedTopic,
        selectedSubTopic,
        contentType,
        effectiveApiKey,
        topicName,
        subjectName
      );
      if (isMounted.current) {
        setGenerationResult(result);
        // Refresh stored content list
        setStoredContent(AIService.loadStoredContent());
      }
    } catch (error) {
      console.error('AI Generation error:', error);
      if (isMounted.current) {
        setGenerationError(error.message);
      }
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  };

  // Clear all stored content
  const handleClearContent = () => {
    if (window.confirm('Are you sure you want to delete all generated content?')) {
      AIService.clearStoredContent();
      setStoredContent([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={cn("w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col", darkMode ? "bg-slate-800" : "bg-white")}>
        {/* Header */}
        <div className={cn("p-6 border-b flex items-center justify-between flex-shrink-0", darkMode ? "border-slate-700" : "border-slate-200")}>
          <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>Settings</h2>
          <button onClick={onClose} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}><X className="w-5 h-5" /></button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Data Source Section */}
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

          {/* Linked Google Sheets Section */}
          <div>
            <h3 className={cn("font-bold mb-3", darkMode ? "text-white" : "text-slate-800")}>Linked Google Sheets</h3>
            <div className={cn("p-4 rounded-xl", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              {linkedSheets.length > 0 ? (
                <div className="space-y-2">
                  {linkedSheets.map((url, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ExternalLink className={cn("w-4 h-4 flex-shrink-0 mt-0.5", darkMode ? "text-blue-400" : "text-blue-600")} />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn("text-sm break-all hover:underline", darkMode ? "text-blue-400" : "text-blue-600")}
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={cn("text-sm italic", darkMode ? "text-slate-400" : "text-slate-500")}>
                  No Google Sheets linked. Configure SHEET_ID in the code to link a sheet.
                </p>
              )}

              {/* Documentation Downloads */}
              <div className={cn("mt-4 pt-4 border-t", darkMode ? "border-slate-600" : "border-slate-200")}>
                <p className={cn("text-sm font-medium mb-2", darkMode ? "text-slate-300" : "text-slate-700")}>Documentation & Templates:</p>
                <div className="space-y-2">
                  <a
                    href="/GOOGLE_SHEETS_SCHEMA.md"
                    download="GOOGLE_SHEETS_SCHEMA.md"
                    className={cn("flex items-center gap-2 text-sm hover:underline", darkMode ? "text-blue-400" : "text-blue-600")}
                  >
                    <Download className="w-4 h-4" />
                    Google Sheets Schema (MD)
                  </a>
                  <a
                    href="/StudyHub_Complete_Data.xlsx"
                    download="StudyHub_Complete_Data.xlsx"
                    className={cn("flex items-center gap-2 text-sm hover:underline", darkMode ? "text-blue-400" : "text-blue-600")}
                  >
                    <Download className="w-4 h-4" />
                    StudyHub Data Template (Excel)
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* AI Content Generation Section */}
          <div>
            <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
              <Sparkles className="w-5 h-5 text-purple-500" />
              Generate Content with AI
            </h3>
            <div className={cn("p-4 rounded-xl space-y-4", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              {/* API Key Input */}
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Gemini API Key
                </label>
                {isEnvKeyConfigured ? (
                  <div className={cn("flex items-center gap-2 p-2 rounded-lg", darkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-700")}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">API key configured via environment variable</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={handleApiKeyChange}
                      placeholder="Enter your Gemini API key..."
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2",
                        darkMode
                          ? "bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:ring-purple-500"
                          : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500"
                      )}
                    />
                    <p className={cn("text-xs mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
                      Get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">Google AI Studio</a>. Or set REACT_APP_GEMINI_API_KEY in .env
                    </p>
                  </>
                )}
              </div>

              {/* Subject Dropdown */}
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(''); setSelectedSubTopic(''); }}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2",
                    darkMode
                      ? "bg-slate-600 border-slate-500 text-white focus:ring-purple-500"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500"
                  )}
                >
                  <option value="">Select a subject...</option>
                  {subjectsList.map(subject => (
                    <option key={subject.key} value={subject.key}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Dropdown */}
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Topic
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => { setSelectedTopic(e.target.value); setSelectedSubTopic(''); }}
                  disabled={!selectedSubject}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2",
                    darkMode
                      ? "bg-slate-600 border-slate-500 text-white focus:ring-purple-500 disabled:opacity-50"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500 disabled:opacity-50"
                  )}
                >
                  <option value="">Select a topic...</option>
                  {filteredTopics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Topic Dropdown */}
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Sub Topic
                </label>
                <select
                  value={selectedSubTopic}
                  onChange={(e) => setSelectedSubTopic(e.target.value)}
                  disabled={!selectedTopic}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2",
                    darkMode
                      ? "bg-slate-600 border-slate-500 text-white focus:ring-purple-500 disabled:opacity-50"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500 disabled:opacity-50"
                  )}
                >
                  <option value="">Select a sub topic (optional)...</option>
                  <option value="introduction">Introduction</option>
                  <option value="key_concepts">Key Concepts</option>
                  <option value="formulas">Formulas</option>
                  <option value="applications">Real-World Applications</option>
                  <option value="practice">Practice Problems</option>
                </select>
              </div>

              {/* Content Type Dropdown */}
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2",
                    darkMode
                      ? "bg-slate-600 border-slate-500 text-white focus:ring-purple-500"
                      : "bg-white border-slate-300 text-slate-900 focus:ring-purple-500"
                  )}
                >
                  <option value="questions">Quiz Questions</option>
                  <option value="studyguide">Study Guide</option>
                  <option value="handout">Handout</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || (!isEnvKeyConfigured && !aiApiKey) || !selectedTopic}
                className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                  isGenerating || (!isEnvKeyConfigured && !aiApiKey) || !selectedTopic
                    ? darkMode ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-lg"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate using AI
                  </>
                )}
              </button>

              {/* Generation Result */}
              {generationResult && (
                <div className={cn("p-3 rounded-lg border", darkMode ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200")}>
                  <p className={cn("text-sm font-medium mb-1", darkMode ? "text-emerald-400" : "text-emerald-700")}>
                    ✓ Content generated successfully!
                  </p>
                  <p className={cn("text-xs", darkMode ? "text-emerald-300" : "text-emerald-600")}>
                    Generated {generationResult.count || 0} {generationResult.type} items for "{generationResult.topicName}".
                  </p>
                </div>
              )}

              {/* Generation Error */}
              {generationError && (
                <div className={cn("p-3 rounded-lg border", darkMode ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200")}>
                  <p className={cn("text-sm font-medium mb-1", darkMode ? "text-red-400" : "text-red-700")}>
                    ✗ Generation failed
                  </p>
                  <p className={cn("text-xs", darkMode ? "text-red-300" : "text-red-600")}>
                    {generationError}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Generated Content Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn("font-bold flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                <Database className="w-5 h-5 text-indigo-500" />
                Generated Content ({storedContent.length})
              </h3>
              <div className="flex gap-2">
                {storedContent.length > 0 && isDemoMode && (
                  <button
                    onClick={async () => {
                      try {
                        // 1. Fetch current file
                        const response = await fetch('/StudyHub_Data.xlsx');
                        if (!response.ok) throw new Error('Base file not found');
                        const buffer = await response.arrayBuffer();
                        const workbook = XLSX.read(buffer);

                        // 2. Prepare new rows
                        const newQuestions = [];
                        const newContent = [];

                        storedContent.forEach(batch => {
                          if (batch.type === 'questions') {
                            batch.items.forEach(q => {
                              newQuestions.push({
                                question_id: q.id || `ai-q-${Date.now()}`,
                                topic_id: batch.topicId,
                                question_text: q.question,
                                option_a: q.options[0]?.text || '',
                                option_b: q.options[1]?.text || '',
                                option_c: q.options[2]?.text || '',
                                option_d: q.options[3]?.text || '',
                                correct_answer: q.correctAnswer,
                                explanation: q.explanation,
                                difficulty: q.difficulty,
                                hint: q.hint,
                                xp_reward: q.xpReward
                              });
                            });
                          } else {
                            // Handouts / Study Guides
                            batch.items.forEach((item, idx) => {
                              let text = item.content_text || '';
                              if (item.keyPoints) text += '\nKey Points:\n' + item.keyPoints.join('\n');
                              if (item.definitions) text += '\nDefinitions:\n' + item.definitions.map(d => `${d.term}: ${d.definition}`).join('\n');
                              if (item.points) text += '\nPoints:\n' + item.points.join('\n'); // Handout structure logic

                              newContent.push({
                                content_id: item.id || `ai-c-${Date.now()}`,
                                section_id: `${batch.topicId}-s001`, // Default section
                                content_type: batch.type === 'handout' ? 'text' : 'introduction', // Map to valid types
                                content_title: item.title || batch.type,
                                content_text: text || item.text || JSON.stringify(item),
                                order_index: 99
                              });
                            });
                          }
                        });

                        // 3. Append to sheets
                        if (newQuestions.length > 0) {
                          const sheet = workbook.Sheets['Quiz_Questions'];
                          XLSX.utils.sheet_add_json(sheet, newQuestions, { skipHeader: true, origin: -1 });
                        }
                        if (newContent.length > 0) {
                          const sheet = workbook.Sheets['Study_Content'];
                          XLSX.utils.sheet_add_json(sheet, newContent, { skipHeader: true, origin: -1 });
                        }

                        // 4. Download
                        XLSX.writeFile(workbook, "StudyHub_Data_Updated.xlsx");
                        alert('File downloaded! Please replace public/StudyHub_Data.xlsx with this new file to make changes permanent.');

                      } catch (err) {
                        console.error('Export failed:', err);
                        alert('Failed to export data: ' + err.message);
                      }
                    }}
                    className={cn("text-xs px-2 py-1 rounded flex items-center gap-1", darkMode ? "bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}
                    title="Download updated Excel file with this content"
                  >
                    <Download className="w-3 h-3" /> Save to Excel
                  </button>
                )}
                {storedContent.length > 0 && (
                  <button
                    onClick={handleClearContent}
                    className={cn("text-xs px-2 py-1 rounded", darkMode ? "text-red-400 hover:bg-red-900/30" : "text-red-600 hover:bg-red-100")}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <div className={cn("p-4 rounded-xl", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              {storedContent.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {storedContent.slice(0, 10).map((item, i) => (
                    <div key={item.id || i} className={cn("p-3 rounded-lg border", darkMode ? "bg-slate-600 border-slate-500" : "bg-white border-slate-200")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              item.type === 'questions' ? "bg-purple-100 text-purple-700" :
                                item.type === 'studyguide' ? "bg-blue-100 text-blue-700" :
                                  "bg-amber-100 text-amber-700"
                            )}>
                              {item.type}
                            </span>
                            <span className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                              {item.count} items
                            </span>
                          </div>
                          <p className={cn("text-sm font-medium truncate", darkMode ? "text-white" : "text-slate-800")}>
                            {item.topicName || item.topicId}
                          </p>
                          <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                            {item.subjectName} • {new Date(item.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {storedContent.length > 10 && (
                    <p className={cn("text-xs text-center", darkMode ? "text-slate-400" : "text-slate-500")}>
                      ... and {storedContent.length - 10} more items
                    </p>
                  )}
                </div>
              ) : (
                <p className={cn("text-sm italic", darkMode ? "text-slate-400" : "text-slate-500")}>
                  No generated content yet. Use the form above to generate quiz questions, study guides, or handouts.
                </p>
              )}
            </div>
          </div>

          {/* Setup Instructions (Demo Mode Only) */}
          {isDemoMode && (
            <div className={cn("p-4 rounded-xl", darkMode ? "bg-slate-700" : "bg-slate-100")}>
              <h4 className={cn("font-bold mb-2", darkMode ? "text-white" : "text-slate-800")}>Setup Instructions</h4>
              <ol className={cn("text-sm space-y-2", darkMode ? "text-slate-300" : "text-slate-600")}>
                <li>1. Upload the Excel template to Google Sheets (for cloud sync)</li>
                <li>... OR use local file mode:</li>
                <li>2. Generate content using AI</li>
                <li>3. Click "Save to Excel" to download updated data</li>
                <li>4. Replace <code>public/StudyHub_Data.xlsx</code> with the new file</li>
              </ol>
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-indigo-500 hover:underline text-sm">
                Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn("p-6 border-t flex-shrink-0", darkMode ? "border-slate-700" : "border-slate-200")}>
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
  const studyData = useStudy();
  const darkMode = studyData.settings.darkMode;

  const [view, setView] = useState('dashboard');
  const [subject, setSubject] = useState(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Prepare studyData object with defaults for the new modular StudyGuide
  const studyDataWithDefaults = useMemo(() => ({
    ...studyData,
    DEFAULT_SECTIONS,
    DEFAULT_OBJECTIVES,
    DEFAULT_KEY_TERMS,
    DEFAULT_CONTENT,
    DEFAULT_FORMULAS,
    DEFAULT_QUIZZES
  }), [studyData]);

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
        <StudyGuideNew
          subject={subject}
          topicIndex={topicIndex}
          onBack={() => setView('subject')}
          onOpenSettings={() => setShowSettings(true)}
          studyData={studyDataWithDefaults}
          ICON_MAP={ICON_MAP}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};
