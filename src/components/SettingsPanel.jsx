import React, { memo, useState, useRef, useEffect } from 'react';
import { X, RefreshCw, Cloud, CloudOff, CheckCircle2, AlertCircle, ExternalLink, Database, FileSpreadsheet, Sparkles, Loader2, Upload, HardDrive, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStudy } from '../contexts/StudyContext';
import { useData } from '../contexts/DataContext';
import { cn } from '../utils';
import { GOOGLE_SHEETS_CONFIG } from '../config';
import { ContentGenerator } from '../services/ContentGenerator';
import { ExcelExporter } from '../services/ExcelExporter';

// Only the 4 subjects available in the app
const SUBJECT_OPTIONS = [
    { value: 'physics', label: 'Physics' },
    { value: 'math', label: 'Mathematics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' }
];

// Topics for each subject (from the actual data)
const TOPIC_OPTIONS = {
    physics: [
        { value: 'newtons-laws', label: "Newton's Laws" },
        { value: 'work-energy', label: 'Work & Energy' },
        { value: 'electricity', label: 'Electricity' }
    ],
    math: [
        { value: 'algebraic-expressions', label: 'Algebraic Expressions' },
        { value: 'geometry-triangles', label: 'Geometry: Triangles' },
        { value: 'probability', label: 'Probability' }
    ],
    chemistry: [
        { value: 'atomic-structure', label: 'Atomic Structure' },
        { value: 'periodic-table', label: 'The Periodic Table' },
        { value: 'chemical-bonding', label: 'Chemical Bonding' }
    ],
    biology: [
        { value: 'cell-biology', label: 'Cell Biology' },
        { value: 'genetics-dna', label: 'Genetics & DNA' },
        { value: 'ecosystems', label: 'Ecosystems' }
    ]
};

const SettingsPanel = memo(({ onClose }) => {
    const { settings, updateSettings } = useStudy();
    const {
        lastSync,
        syncStatus,
        refresh,
        isRefreshing,
        dataSource,
        updateDataSource,
        isGoogleSheetsConfigured
    } = useData();

    const [selectedSubject, setSelectedSubject] = useState(settings.selectedSubject || 'physics');
    const [selectedTopics, setSelectedTopics] = useState(settings.selectedTopics || []);
    const [customSubtopics, setCustomSubtopics] = useState(settings.customSubtopics || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const fileInputRef = useRef(null);

    const darkMode = settings.darkMode;

    // Load settings on mount
    useEffect(() => {
        if (settings.selectedSubject) {
            setSelectedSubject(settings.selectedSubject);
        }
        if (settings.selectedTopics) {
            setSelectedTopics(settings.selectedTopics);
        }
        if (settings.customSubtopics) {
            setCustomSubtopics(settings.customSubtopics);
        }
    }, [settings]);

    const handleSubjectChange = (e) => {
        const value = e.target.value;
        setSelectedSubject(value);
        setSelectedTopics([]); // Reset topics when subject changes
        updateSettings({ selectedSubject: value, selectedTopics: [] });
    };

    const handleTopicToggle = (topicValue) => {
        const newTopics = selectedTopics.includes(topicValue)
            ? selectedTopics.filter(t => t !== topicValue)
            : [...selectedTopics, topicValue];
        setSelectedTopics(newTopics);
        updateSettings({ selectedTopics: newTopics });
    };

    const handleSubtopicsChange = (e) => {
        const value = e.target.value;
        setCustomSubtopics(value);
        updateSettings({ customSubtopics: value });
    };

    const handleDataSourceChange = (source) => {
        updateDataSource(source);
    };

    const handleGenerateContent = async () => {
        try {
            setIsGenerating(true);
            setGenerationStatus({ type: 'info', message: 'Generating content...' });

            const subjectLabel = SUBJECT_OPTIONS.find(s => s.value === selectedSubject)?.label || selectedSubject;

            if (selectedTopics.length === 0) {
                throw new Error('Please select at least one topic');
            }

            // Get topic labels
            const topicLabels = selectedTopics.map(t => {
                const topic = TOPIC_OPTIONS[selectedSubject]?.find(opt => opt.value === t);
                return topic?.label || t;
            }).join(', ');

            // Generate content using AI
            const generatedData = ContentGenerator.generateContent(subjectLabel, topicLabels, customSubtopics);

            // Export to Excel file for download
            const filename = `StudyHub_${subjectLabel.replace(/\s+/g, '_')}_Generated.xlsx`;
            ExcelExporter.exportToExcel(generatedData, filename);

            setGenerationStatus({
                type: 'success',
                message: `Content generated! Excel file "${filename}" downloaded. After verification, upload it back using the button below.`
            });

            // Save settings
            updateSettings({
                selectedSubject,
                selectedTopics,
                customSubtopics
            });

        } catch (error) {
            console.error('Generation error:', error);
            setGenerationStatus({ type: 'error', message: error.message || 'Failed to generate content' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if it's an Excel file
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setUploadStatus({ type: 'error', message: 'Please upload an Excel file (.xlsx or .xls)' });
            return;
        }

        try {
            setUploadStatus({ type: 'info', message: 'Processing file...' });

            // Read the file and validate its structure
            const arrayBuffer = await file.arrayBuffer();
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(arrayBuffer);

            // Validate required sheets exist
            const requiredSheets = ['Subjects', 'Topics', 'Quiz_Questions', 'Study_Content'];
            const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));

            if (missingSheets.length > 0) {
                setUploadStatus({
                    type: 'error',
                    message: `Missing required sheets: ${missingSheets.join(', ')}`
                });
                return;
            }

            // Create a downloadable file with the correct name
            const blob = new Blob([new Uint8Array(arrayBuffer)], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Create download link for the properly named file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'StudyHub_Complete_Data.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setUploadStatus({
                type: 'success',
                message: 'File validated successfully! The file has been downloaded as "StudyHub_Complete_Data.xlsx". Place it in the public folder and reload the app to apply changes.'
            });

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('Upload error:', error);
            setUploadStatus({ type: 'error', message: 'Failed to process file: ' + error.message });
        }
    };

    const getSyncStatusDisplay = () => {
        switch (syncStatus) {
            case 'loading':
                return { icon: Loader2, text: 'Loading...', color: 'text-blue-500', animate: true };
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

    const availableTopics = TOPIC_OPTIONS[selectedSubject] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={cn("w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col", darkMode ? "bg-slate-800" : "bg-white")}>
                <div className={cn("p-6 border-b flex items-center justify-between", darkMode ? "border-slate-700" : "border-slate-200")}>
                    <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-800")}>Settings</h2>
                    <button onClick={onClose} className={cn("p-2 rounded-lg", darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100")}><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Data Source Selection */}
                    <div>
                        <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                            <Database className="w-5 h-5" />
                            Data Source
                        </h3>
                        <div className={cn("rounded-xl p-4 border", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                            {/* Connection Status */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <StatusIcon className={cn("w-5 h-5", statusInfo.color, statusInfo.animate && "animate-spin")} />
                                    <span className={cn("font-medium", darkMode ? "text-slate-200" : "text-slate-700")}>{statusInfo.text}</span>
                                </div>
                                <button
                                    onClick={refresh}
                                    disabled={isRefreshing || syncStatus === 'loading'}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        isRefreshing || syncStatus === 'loading'
                                            ? darkMode ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            : darkMode ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"
                                    )}
                                >
                                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                                    {isRefreshing ? 'Syncing...' : 'Sync Now'}
                                </button>
                            </div>

                            {/* Data Source Toggles */}
                            <div className="space-y-3 mb-4">
                                {/* Local Excel Toggle */}
                                <button
                                    onClick={() => handleDataSourceChange('local')}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                                        dataSource === 'local'
                                            ? darkMode ? "bg-emerald-900/30 border-emerald-500" : "bg-emerald-50 border-emerald-500"
                                            : darkMode ? "bg-slate-700 border-slate-600 hover:border-slate-500" : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <HardDrive className={cn("w-5 h-5", dataSource === 'local' ? "text-emerald-500" : darkMode ? "text-slate-400" : "text-slate-500")} />
                                        <div className="text-left">
                                            <p className={cn("font-medium text-sm", darkMode ? "text-slate-200" : "text-slate-700")}>
                                                Local Excel File
                                            </p>
                                            <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                                                public/StudyHub_Complete_Data.xlsx
                                            </p>
                                        </div>
                                    </div>
                                    {dataSource === 'local' ? (
                                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className={cn("w-6 h-6", darkMode ? "text-slate-500" : "text-slate-400")} />
                                    )}
                                </button>

                                {/* Google Sheets Toggle */}
                                <button
                                    onClick={() => isGoogleSheetsConfigured && handleDataSourceChange('google')}
                                    disabled={!isGoogleSheetsConfigured}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                                        !isGoogleSheetsConfigured
                                            ? darkMode ? "bg-slate-700/50 border-slate-600 opacity-50 cursor-not-allowed" : "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed"
                                            : dataSource === 'google'
                                                ? darkMode ? "bg-emerald-900/30 border-emerald-500" : "bg-emerald-50 border-emerald-500"
                                                : darkMode ? "bg-slate-700 border-slate-600 hover:border-slate-500" : "bg-white border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileSpreadsheet className={cn("w-5 h-5", dataSource === 'google' && isGoogleSheetsConfigured ? "text-emerald-500" : darkMode ? "text-slate-400" : "text-slate-500")} />
                                        <div className="text-left">
                                            <p className={cn("font-medium text-sm", darkMode ? "text-slate-200" : "text-slate-700")}>
                                                Google Sheets
                                            </p>
                                            <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                                                {isGoogleSheetsConfigured
                                                    ? `Sheet ID: ${GOOGLE_SHEETS_CONFIG.SHEET_ID.substring(0, 15)}...`
                                                    : 'Not configured'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    {dataSource === 'google' && isGoogleSheetsConfigured ? (
                                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                                    ) : (
                                        <ToggleLeft className={cn("w-6 h-6", darkMode ? "text-slate-500" : "text-slate-400")} />
                                    )}
                                </button>
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

                    {/* Google Sheets Setup (only if not configured) */}
                    {!isGoogleSheetsConfigured && (
                        <div>
                            <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                                <FileSpreadsheet className="w-5 h-5" />
                                Google Sheets Setup
                            </h3>
                            <div className={cn("rounded-xl p-4 border space-y-3", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                                <div className={cn("p-3 rounded-lg border-l-4 border-amber-500", darkMode ? "bg-amber-900/20" : "bg-amber-50")}>
                                    <p className={cn("text-sm font-medium", darkMode ? "text-amber-300" : "text-amber-800")}>
                                        Google Sheets not configured
                                    </p>
                                    <p className={cn("text-xs mt-1", darkMode ? "text-amber-400/70" : "text-amber-700")}>
                                        Configure Google Sheets for real-time sync.
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
                    )}

                    {/* Content Generation */}
                    <div>
                        <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Generate Content
                        </h3>
                        <div className={cn("rounded-xl p-4 border space-y-4", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                            {/* Subject Dropdown */}
                            <div>
                                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-400" : "text-slate-600")}>Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={handleSubjectChange}
                                    className={cn(
                                        "w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 appearance-none cursor-pointer",
                                        darkMode ? "bg-slate-700 border-slate-600 text-slate-200 focus:ring-amber-500/50" : "bg-white border-slate-200 text-slate-700 focus:ring-amber-200"
                                    )}
                                >
                                    {SUBJECT_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Topics Selection */}
                            <div>
                                <label className={cn("block text-sm font-medium mb-2", darkMode ? "text-slate-400" : "text-slate-600")}>Topics (select at least one)</label>
                                <div className="space-y-2">
                                    {availableTopics.map(topic => (
                                        <button
                                            key={topic.value}
                                            onClick={() => handleTopicToggle(topic.value)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all",
                                                selectedTopics.includes(topic.value)
                                                    ? darkMode ? "bg-amber-900/30 border-amber-500 text-amber-300" : "bg-amber-50 border-amber-500 text-amber-800"
                                                    : darkMode ? "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                            )}
                                        >
                                            <span>{topic.label}</span>
                                            <CheckCircle2 className={cn("w-4 h-4", selectedTopics.includes(topic.value) ? "opacity-100" : "opacity-0")} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subtopics */}
                            <div>
                                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-400" : "text-slate-600")}>Subtopics (comma separated, optional)</label>
                                <textarea
                                    value={customSubtopics}
                                    onChange={handleSubtopicsChange}
                                    placeholder="e.g. Inertia, F=ma, Action-Reaction"
                                    className={cn("w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2", darkMode ? "bg-slate-700 border-slate-600 focus:ring-amber-500/50" : "bg-white border-slate-200 focus:ring-amber-200")}
                                    rows={2}
                                />
                            </div>

                            {/* Generation Status Message */}
                            {generationStatus && (
                                <div className={cn(
                                    "p-3 rounded-lg text-sm",
                                    generationStatus.type === 'success' ? darkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-800" :
                                    generationStatus.type === 'error' ? darkMode ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-800" :
                                    darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-800"
                                )}>
                                    {generationStatus.message}
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerateContent}
                                disabled={isGenerating || selectedTopics.length === 0}
                                className={cn(
                                    "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                    isGenerating || selectedTopics.length === 0
                                        ? darkMode ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl"
                                )}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate using AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div>
                        <h3 className={cn("font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-800")}>
                            <Upload className="w-5 h-5 text-indigo-500" />
                            Upload Verified Content
                        </h3>
                        <div className={cn("rounded-xl p-4 border space-y-4", darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200")}>
                            <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-600")}>
                                After verifying generated content, upload the Excel file here. It will be renamed to <code className={cn("px-1 py-0.5 rounded text-xs", darkMode ? "bg-slate-600" : "bg-slate-200")}>StudyHub_Complete_Data.xlsx</code> for you to place in the public folder.
                            </p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                                    darkMode
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                                )}
                            >
                                <Upload className="w-5 h-5" />
                                Upload Excel File
                            </button>

                            {/* Upload Status Message */}
                            {uploadStatus && (
                                <div className={cn(
                                    "p-3 rounded-lg text-sm",
                                    uploadStatus.type === 'success' ? darkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-50 text-emerald-800" :
                                    uploadStatus.type === 'error' ? darkMode ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-800" :
                                    darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-800"
                                )}>
                                    {uploadStatus.message}
                                </div>
                            )}
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
