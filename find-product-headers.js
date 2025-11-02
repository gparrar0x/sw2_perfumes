#!/usr/bin/env node
/**
 * Find where product data actually starts in supplier sheet
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

async function findHeaders() {
  try {
    console.log('🔍 Buscando headers de productos...\n');

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = process.env.GOOGLE_SHEET_PROVEEDOR_ID;

    // Leer primeras 50 filas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'List Price!A1:E50',
    });

    const rows = response.data.values || [];

    console.log('Buscando fila con "UPC" o "SKU" o "ITEM"...\n');

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const firstCell = (row[0] || '').toString().toUpperCase();

      if (firstCell.includes('UPC') ||
          firstCell.includes('SKU') ||
          firstCell.includes('ITEM') ||
          firstCell.includes('CODE')) {
        console.log(`✅ Fila ${rowNum} parece ser el header:`);
        console.log(`   ${row.join(' | ')}`);
        console.log(`\n💡 Los datos probablemente empiezan en la fila ${rowNum + 1}`);
        console.log(`   Rango sugerido: List Price!A${rowNum + 1}:E\n`);
      }
    });

    console.log('\n📋 Primeras 20 filas completas:');
    console.log('='.repeat(80));
    rows.slice(0, 20).forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(3)}: ${row.join(' | ')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findHeaders();
