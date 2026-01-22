import * as XLSX from 'xlsx';
import { GOOGLE_SHEETS_CONFIG } from '../config';
import { log } from '../utils';

const processSheetRows = (rows) => {
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
    return rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
            obj[header] = row[i] !== undefined ? String(row[i]).trim() : '';
        });
        return obj;
    });
};

export const fetchLocalExcelData = async () => {
    log('Fetching local Excel file...');
    try {
        // Use process.env.PUBLIC_URL to handle deployment paths (e.g. /HarshiApp/)
        const publicUrl = process.env.PUBLIC_URL || '';
        const response = await fetch(`${publicUrl}/StudyHub_Complete_Data.xlsx`);
        if (!response.ok) throw new Error('Failed to load local data file');

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const data = {};

        Object.entries(GOOGLE_SHEETS_CONFIG.SHEETS).forEach(([key, sheetName]) => {
            const worksheet = workbook.Sheets[sheetName];
            if (worksheet) {
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                data[key] = processSheetRows(jsonData);
            } else {
                data[key] = [];
            }
        });

        log('Local Excel data loaded');
        return data;
    } catch (error) {
        console.error('Error loading local Excel:', error);
        throw error;
    }
};
