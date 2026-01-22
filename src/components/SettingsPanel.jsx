import React, { memo } from 'react';
import { X } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { useData } from '../contexts/DataContext';
import { cn } from '../utils';

const SettingsPanel = memo(({ onClose }) => {
    const { settings, updateSettings } = useStudy();
    // Unused: toggleDarkMode, isDemoMode, refresh, lastSync, syncStatus were in original code but not used in JSX shown
    // Checking original JSX from monolith:
    // It only rendered "Topic Configuration" inputs.

    const darkMode = settings.darkMode;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={cn("w-full max-w-lg rounded-2xl shadow-xl overflow-hidden", darkMode ? "bg-slate-800" : "bg-white")}>
                <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
                    <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>Settings</h2>
                    <button onClick={onClose} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Topic Configuration */}
                    <div>
                        <h3 className={cn("font-bold mb-3", darkMode ? "text-white" : "text-slate-800")}>Topic Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-400" : "text-slate-600")}>Topics (comma separated)</label>
                                <textarea
                                    value={settings.customTopics || ''}
                                    onChange={(e) => updateSettings({ customTopics: e.target.value })}
                                    placeholder="e.g. Newton's Laws, Energy, Light"
                                    className={cn("w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2", darkMode ? "bg-slate-700 border-slate-600 focus:ring-amber-500/50" : "bg-slate-50 border-slate-200 focus:ring-amber-200")}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-400" : "text-slate-600")}>Subtopics (comma separated)</label>
                                <textarea
                                    value={settings.customSubtopics || ''}
                                    onChange={(e) => updateSettings({ customSubtopics: e.target.value })}
                                    placeholder="e.g. Inertia, F=ma, Action-Reaction"
                                    className={cn("w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2", darkMode ? "bg-slate-700 border-slate-600 focus:ring-amber-500/50" : "bg-slate-50 border-slate-200 focus:ring-amber-200")}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn("p-6 border-t", darkMode ? "border-slate-700" : "border-slate-200")}>
                    <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Done</button>
                </div>
            </div>
        </div>
    );
});

export default SettingsPanel;
