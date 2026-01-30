import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from './DataContext';

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

const STORAGE_KEY = 'studyhub_v6_data';

const StudyContext = createContext(null);
export const useStudy = () => {
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

export const StudyProvider = ({ children }) => {
    const data = useData();
    const [savedData, setSavedData] = useLocalStorage(STORAGE_KEY, {
        progress: DEFAULT_PROGRESS,
        settings: { darkMode: false, notifications: true, soundEffects: true }
    });

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

    const updateSettings = useCallback((newSettings) => {
        setSavedData(prev => ({
            ...prev,
            settings: { ...prev.settings, ...newSettings }
        }));
    }, [setSavedData]);

    const toggleDarkMode = useCallback(() => {
        updateSettings({ darkMode: !settings.darkMode });
    }, [settings.darkMode, updateSettings]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = React.useMemo(() => ({
        progress,
        settings,
        subjects: data?.subjects || {},
        sections: data?.sections || {},
        objectives: data?.objectives || {},
        keyTerms: data?.keyTerms || {},
        studyContent: data?.studyContent || {},
        formulas: data?.formulas || {},
        quizQuestions: data?.quizQuestions || {},
        achievements: data?.achievements || [],
        updateProgress,
        toggleDarkMode,
        updateSettings
    }), [
        progress,
        settings,
        data,
        updateProgress,
        toggleDarkMode,
        updateSettings
    ]);

    return (
        <StudyContext.Provider value={value}>
            {children}
        </StudyContext.Provider>
    );
};
