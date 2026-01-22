export const GOOGLE_SHEETS_CONFIG = {
    // ===========================================
    // 🔧 CONFIGURE THESE VALUES FOR YOUR SETUP
    // ===========================================

    // Your Google Sheet ID (from the URL)
    // URL: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    SHEET_ID: 'YOUR_SHEET_ID_HERE',

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
