import React, { memo } from 'react';
import { BookOpen, Star, Flame, CheckCircle2, Clock, Sun, Moon, Settings } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { useData } from '../contexts/DataContext';
import { cn } from '../utils';
import { ICON_MAP, calculateLevel, countCompletedTopics, formatStudyTime, calculateSubjectProgress } from '../constants';
import { SyncStatusBadge, Card, ProgressRing } from './common/UIComponents';
import { AchievementBadge } from './common/AchievementBadge';

const Dashboard = memo(({ onSelectSubject, onOpenSettings, onGoHome }) => {
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
                    <strong>Demo Mode:</strong> Configure your Data Source to enable live sync.
                </div>
            )}

            {/* Header */}
            <header className={cn("px-4 sm:px-6 py-4 border-b", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-slate-800")}>StudyHub</h1>
                            <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>Grade 8</p>
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
                <h3 className={cn("text-lg font-bold mb-3", darkMode ? "text-slate-300" : "text-slate-600")}>Daily Statistics</h3>
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

export default Dashboard;
