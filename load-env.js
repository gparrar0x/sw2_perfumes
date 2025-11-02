#!/usr/bin/env node
/**
 * Load environment variables from .env.local or .env
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try .env.local first, then .env
const envFiles = ['.env.local', '.env'];

for (const envFile of envFiles) {
  try {
    const envPath = join(__dirname, envFile);
    const envContent = readFileSync(envPath, 'utf-8');

    // Parse env file (simple parser)
    envContent.split('\n').forEach(line => {
      line = line.trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;

      // Parse key=value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Set env var if not already set
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });

    console.log(`✅ Loaded environment from ${envFile}`);
    break;
  } catch (err) {
    // File not found, try next
    if (err.code !== 'ENOENT') {
      console.error(`Error loading ${envFile}:`, err.message);
    }
  }
}

// Start the dev server
import('./dev-server.js');
