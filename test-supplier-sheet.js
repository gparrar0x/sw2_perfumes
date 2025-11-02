#!/usr/bin/env node
/**
 * Test script para verificar hojas en Google Sheets del PROVEEDOR
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env.local
const envPath = join(__dirname, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;

  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
});

async function testSupplierSheet() {
  try {
    console.log('🔍 Verificando Google Sheet del PROVEEDOR...\n');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = process.env.GOOGLE_SHEET_PROVEEDOR_ID;

    console.log(`📋 Sheet ID: ${SHEET_ID}\n`);

    // Obtener metadata del spreadsheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    console.log(`📊 Spreadsheet: ${metadata.data.properties.title}\n`);
    console.log('📑 Hojas disponibles:');
    console.log('='.repeat(50));

    metadata.data.sheets.forEach((sheet, index) => {
      const props = sheet.properties;
      console.log(`${index + 1}. ${props.title}`);
      console.log(`   - ID: ${props.sheetId}`);
      console.log(`   - Filas: ${props.gridProperties.rowCount}`);
      console.log(`   - Columnas: ${props.gridProperties.columnCount}`);
      console.log('');
    });

    // Intentar leer la primera hoja
    const firstSheetName = metadata.data.sheets[0].properties.title;
    console.log(`🔍 Leyendo primeras 5 filas de "${firstSheetName}":`);
    console.log('='.repeat(50));

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${firstSheetName}!A1:E5`,
    });

    const rows = response.data.values || [];
    rows.forEach((row, index) => {
      console.log(`Fila ${index + 1}: ${row.join(' | ')}`);
    });

    console.log('\n✨ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testSupplierSheet();
