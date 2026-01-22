import React, { memo, useState } from 'react';
import { BookOpen, FileText, HelpCircle, ClipboardList, Settings, ChevronLeft, CheckCircle2, Circle, CircleDot, Clock, ChevronRight, Check, Download, Search } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { cn } from '../utils';
import { ICON_MAP, calculateSubjectProgress } from '../constants';
import { Card, ProgressRing } from './common/UIComponents';

const SubjectOverview = memo(({ subject, onBack, onSelectTopic, onOpenSettings }) => {
    const { progress, subjects, settings } = useStudy();
    const darkMode = settings.darkMode;
    const [activeTab, setActiveTab] = useState('topics');
    const [searchQuery, setSearchQuery] = useState('');

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

            {/* Tabs & Search */}
            <div className={cn("border-b sticky top-0 z-10", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 sm:py-0">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
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

                        {/* Search Bar */}
                        <div className="relative py-2 sm:py-0">
                            <div className="relative">
                                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", darkMode ? "text-slate-400" : "text-slate-500")} />
                                <input
                                    type="text"
                                    placeholder="Search topics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={cn(
                                        "w-full sm:w-64 pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500",
                                        darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-500"
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {activeTab === 'topics' && (
                    <div className="space-y-4">
                        {config.topics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((topic, i) => {
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

export default SubjectOverview;
