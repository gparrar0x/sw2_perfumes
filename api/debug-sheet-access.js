// Debug endpoint para verificar acceso al Sheet
import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Intentar acceder al spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    return res.status(200).json({
      success: true,
      sheetId: SHEET_ID,
      title: spreadsheet.data.properties.title,
      serviceAccountEmail: credentials.client_email,
      message: '✅ Access granted! The Service Account CAN access the sheet.'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      sheetId: process.env.GOOGLE_SHEET_ID,
      serviceAccountEmail: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).client_email,
      error: error.message,
      code: error.code,
      message: '❌ Access denied. Make sure the sheet is shared with the Service Account.'
    });
  }
}
