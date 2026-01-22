import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sheetsService } from '../services/GoogleSheetsService';
import { DataTransformer } from '../services/DataTransformer';
import { fetchLocalExcelData } from '../services/excelService';
import { GOOGLE_SHEETS_CONFIG } from '../config';
import { log } from '../utils';

const DataContext = createContext(null);

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
};

export const DataProvider = ({ children }) => {
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
            log('Demo mode - loading local Excel data');
            try {
                const rawExcelData = await fetchLocalExcelData();
                const transformed = DataTransformer.transformAll(rawExcelData);
                setData(transformed);
                setSyncStatus('offline'); // Or 'local'
            } catch (e) {
                setError('Failed to load local data: ' + e.message);
                setSyncStatus('error');
            }
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

            // Use fallback data from local Excel if enabled
            if (!data) {
                log('Attempting to load local Excel data...');
                const rawLocalData = await fetchLocalExcelData();
                const transformed = DataTransformer.transformAll(rawLocalData);
                setData(transformed);
                setSyncStatus('success');
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
