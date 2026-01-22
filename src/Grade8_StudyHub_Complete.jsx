import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { DataProvider, useData } from './contexts/DataContext';
import { StudyProvider, useStudy } from './contexts/StudyContext';
import Dashboard from './components/Dashboard';
import SubjectOverview from './components/SubjectOverview';
import TopicStudyView from './components/TopicStudyView';
import SettingsPanel from './components/SettingsPanel';
import { cn } from './utils';

const AppContent = () => {
  const { isLoading } = useData();
  const { settings } = useStudy();
  const darkMode = settings.darkMode;

  const [view, setView] = useState('dashboard');
  const [subject, setSubject] = useState(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Memoized handlers to prevent unnecessary re-renders of child components
  const handleSelectSubject = useCallback((s) => {
    setSubject(s);
    setView('subject');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setView('dashboard');
  }, []);

  const handleSelectTopic = useCallback((i) => {
    setTopicIndex(i);
    setView('study');
  }, []);

  const handleBackToSubject = useCallback(() => {
    setView('subject');
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  if (isLoading) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center", darkMode ? "bg-slate-900" : "bg-slate-50")}>
        <Loader2 className={cn("w-12 h-12 animate-spin mb-4", darkMode ? "text-blue-400" : "text-blue-600")} />
        <p className={cn("text-lg", darkMode ? "text-slate-300" : "text-slate-600")}>Loading content...</p>
      </div>
    );
  }

  return (
    <div className={cn("font-sans antialiased", darkMode && "dark")}>
      {view === 'dashboard' && (
        <Dashboard
          onSelectSubject={handleSelectSubject}
          onOpenSettings={handleOpenSettings}
          onGoHome={handleBackToDashboard}
        />
      )}

      {view === 'subject' && subject && (
        <SubjectOverview
          subject={subject}
          onBack={handleBackToDashboard}
          onSelectTopic={handleSelectTopic}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {view === 'study' && subject && (
        <TopicStudyView
          subject={subject}
          topicIndex={topicIndex}
          onBack={handleBackToSubject}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {showSettings && <SettingsPanel onClose={handleCloseSettings} />}

      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default function Grade8StudyHub() {
  return (
    <DataProvider>
      <StudyProvider>
        <AppContent />
      </StudyProvider>
    </DataProvider>
  );
}
