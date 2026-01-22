import React, { memo, useState } from 'react';
import { BookOpen, Star, ChevronLeft, FileText, Check, StickyNote, Target, Lightbulb, AlertTriangle, Globe, FlaskConical, CheckCircle2, ChevronRight, Bookmark, Copy } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { cn } from '../utils';
import { ICON_MAP } from '../constants';
import NotesEditor from './NotesEditor';

const StudyGuide = memo(({ subject, topicIndex, onBack, onOpenSettings }) => {
    const { progress, subjects, sections, objectives, keyTerms, studyContent, formulas, quizQuestions, updateProgress, settings } = useStudy();
    const darkMode = settings.darkMode;

    const config = subjects[subject];
    const topic = config.topics[topicIndex];
    const topicKey = topic.id;
    const IconComponent = ICON_MAP[config.icon] || BookOpen;

    // Get data for this topic
    const topicSections = sections[topicKey] || [];
    const topicObjectives = objectives[topicKey] || [];
    const topicTerms = keyTerms[topicKey] || [];
    const topicFormulas = formulas[topicKey] || [];
    const topicQuizzes = quizQuestions[topicKey] || [];

    const [activeSection, setActiveSection] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const [quizAnswer, setQuizAnswer] = useState(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [xpGain, setXpGain] = useState(null);

    const currentSection = topicSections[activeSection];
    const sectionContent = currentSection ? (studyContent[currentSection.id] || []) : [];

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

                                        {content.type === 'image' && (
                                            <div className="mb-6">
                                                <img
                                                    src={content.text.startsWith('http') ? content.text : content.url || content.text}
                                                    alt={content.title}
                                                    className="w-full rounded-2xl shadow-md mb-2 object-cover max-h-96"
                                                />
                                                {content.title && (
                                                    <p className={cn("text-sm text-center italic", darkMode ? "text-slate-400" : "text-slate-500")}>{content.title}</p>
                                                )}
                                            </div>
                                        )}

                                        {content.type === 'video' && (
                                            <div className="mb-6">
                                                <div className="relative w-full rounded-2xl overflow-hidden shadow-lg bg-black" style={{ paddingBottom: '56.25%' }}>
                                                    <iframe
                                                        src={content.text.startsWith('http') ? content.text : content.url || content.text}
                                                        title={content.title}
                                                        className="absolute top-0 left-0 w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                                {content.title && (
                                                    <p className={cn("mt-2 text-sm text-center font-medium", darkMode ? "text-slate-300" : "text-slate-600")}>📺 {content.title}</p>
                                                )}
                                            </div>
                                        )}

                                        {content.type === 'example' && (
                                            <div className={cn("rounded-2xl p-6 border mb-6", darkMode ? "bg-amber-900/20 border-amber-700" : "bg-amber-50 border-amber-200")}>
                                                <h4 className={cn("font-bold mb-2 flex items-center gap-2", darkMode ? "text-amber-400" : "text-amber-700")}>
                                                    <FlaskConical className="w-5 h-5" /> Example Problem
                                                </h4>
                                                <div className={cn("font-medium mb-2", darkMode ? "text-slate-300" : "text-slate-700")}>{content.title}</div>
                                                <div className={cn("text-sm font-mono p-4 rounded-xl", darkMode ? "bg-slate-900 text-amber-300" : "bg-white text-amber-800 border border-amber-100")}>
                                                    {content.text}
                                                </div>
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

export default StudyGuide;
