import React, { memo } from 'react';
import { X, RefreshCw, Cloud, CloudOff, CheckCircle2, AlertCircle, ExternalLink, Database, FileSpreadsheet } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { useData } from '../contexts/DataContext';
import { cn } from '../utils';
import { GOOGLE_SHEETS_CONFIG } from '../config';

const SettingsPanel = memo(({ onClose }) => {
    const { settings, updateSettings } = useStudy();
    const { isDemoMode, lastSync, syncStatus, refresh, isRefreshing } = useData();

    const darkMode = settings.darkMode;

    const getSyncStatusDisplay = () => {
        switch (syncStatus) {
            case 'syncing':
                return { icon: RefreshCw, text: 'Syncing...', color: 'text-blue-500', animate: true };
            case 'success':
                return { icon: CheckCircle2, text: 'Connected', color: 'text-emerald-500', animate: false };
            case 'error':
                return { icon: AlertCircle, text: 'Sync Error', color: 'text-red-500', animate: false };
            case 'offline':
                return { icon: CloudOff, text: 'Offline Mode', color: 'text-amber-500', animate: false };
            default:
                return { icon: Cloud, text: 'Idle', color: 'text-slate-400', animate: false };
        }
    };

    const statusInfo = getSyncStatusDisplay();
    const StatusIcon = statusInfo.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={cn("w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col", darkMode ? "bg-slate-800" : "bg-white")}>
                <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
                    <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>Settings</h2>
                    <button onClick={onClose} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Google Sheets Connection Status */}
                    <div>
                        <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                            <Database className="w-5 h-5" />
                            Data Source
                        </h3>
                        <div className={cn("rounded-xl p-4 border", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                            {/* Connection Status */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <StatusIcon className={cn("w-5 h-5", statusInfo.color, statusInfo.animate && "animate-spin")} />
                                    <span className={cn("font-medium", darkMode ? "text-slate-200" : "text-slate-700")}>{statusInfo.text}</span>
                                </div>
                                <button
                                    onClick={refresh}
                                    disabled={isRefreshing || isDemoMode}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        isRefreshing || isDemoMode
                                            ? darkMode ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            : darkMode ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"
                                    )}
                                >
                                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                                    {isRefreshing ? 'Syncing...' : 'Sync Now'}
                                </button>
                            </div>

                            {/* Mode Display */}
                            <div className={cn("text-sm mb-2", darkMode ? "text-slate-400" : "text-slate-500")}>
                                <span className="font-medium">Mode:</span>{' '}
                                {isDemoMode ? (
                                    <span className="text-amber-500">Demo (Local Excel)</span>
                                ) : (
                                    <span className="text-emerald-500">Google Sheets</span>
                                )}
                            </div>

                            {/* Last Sync */}
                            {lastSync && (
                                <div className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                                    <span className="font-medium">Last Synced:</span>{' '}
                                    {new Date(lastSync).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Google Sheets Setup */}
                    <div>
                        <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                            <FileSpreadsheet className="w-5 h-5" />
                            Google Sheets Setup
                        </h3>
                        <div className={cn("rounded-xl p-4 border space-y-3", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                            {isDemoMode ? (
                                <>
                                    <div className={cn("p-3 rounded-lg border-l-4 border-amber-500", darkMode ? "bg-amber-900/20" : "bg-amber-50")}>
                                        <p className={cn("text-sm font-medium", darkMode ? "text-amber-300" : "text-amber-800")}>
                                            Google Sheets not configured
                                        </p>
                                        <p className={cn("text-xs mt-1", darkMode ? "text-amber-400/70" : "text-amber-700")}>
                                            Currently using local Excel data. Configure Google Sheets for real-time sync.
                                        </p>
                                    </div>
                                    <div className={cn("text-sm space-y-2", darkMode ? "text-slate-300" : "text-slate-600")}>
                                        <p className="font-medium">To connect Google Sheets:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-xs">
                                            <li>Create a Google Sheet with the required schema</li>
                                            <li>Enable Google Sheets API in Cloud Console</li>
                                            <li>Create an API key</li>
                                            <li>Update <code className={cn("px-1 py-0.5 rounded", darkMode ? "bg-slate-600" : "bg-slate-200")}>src/config.js</code> with your Sheet ID and API Key</li>
                                        </ol>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={cn("p-3 rounded-lg border-l-4 border-emerald-500", darkMode ? "bg-emerald-900/20" : "bg-emerald-50")}>
                                        <p className={cn("text-sm font-medium", darkMode ? "text-emerald-300" : "text-emerald-800")}>
                                            Connected to Google Sheets
                                        </p>
                                        <p className={cn("text-xs mt-1 font-mono break-all", darkMode ? "text-emerald-400/70" : "text-emerald-700")}>
                                            Sheet ID: {GOOGLE_SHEETS_CONFIG.SHEET_ID.substring(0, 20)}...
                                        </p>
                                    </div>
                                    <div className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                                        <p><span className="font-medium">Auto-refresh:</span> {GOOGLE_SHEETS_CONFIG.AUTO_REFRESH ? 'Enabled' : 'Disabled'}</p>
                                        <p><span className="font-medium">Refresh interval:</span> {GOOGLE_SHEETS_CONFIG.REFRESH_INTERVAL / 1000}s</p>
                                    </div>
                                </>
                            )}

                            {/* Documentation Link */}
                            <a
                                href={`${process.env.PUBLIC_URL || ''}/GOOGLE_SHEETS_SCHEMA.md`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors",
                                    darkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"
                                )}
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Google Sheets Schema Documentation
                            </a>
                        </div>
                    </div>

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
