#!/usr/bin/env node
/**
 * Servidor de desarrollo local para sw_commerce_perfumes
 * Simula el comportamiento de Vercel en local
 */

import { createServer } from 'http';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // API routes
    if (req.url.startsWith('/api/')) {
      const apiPath = req.url.split('?')[0];
      const apiFile = join(__dirname, `${apiPath}.js`);

      try {
        // Importar el handler dinámicamente
        const { default: handler } = await import(`file://${apiFile}`);

        // Simular el objeto de request/response de Vercel
        const vercelReq = {
          ...req,
          query: Object.fromEntries(new URL(req.url, `http://localhost:${PORT}`).searchParams),
          body: req.method === 'POST' ? await getBody(req) : undefined
        };

        const vercelRes = {
          status: (code) => {
            res.statusCode = code;
            return vercelRes;
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          },
          send: (data) => {
            res.end(data);
          },
          setHeader: (key, value) => {
            res.setHeader(key, value);
            return vercelRes;
          }
        };

        await handler(vercelReq, vercelRes);
      } catch (err) {
        console.error(`Error loading API ${apiPath}:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Internal Server Error',
          message: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }));
      }
      return;
    }

    // Static files
    let filePath = join(__dirname, req.url === '/' ? 'index.html' : req.url);

    try {
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      const content = await fs.readFile(filePath);
      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Not Found</h1>');
      } else {
        console.error('Error serving file:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 - Internal Server Error</h1>');
      }
    }
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server Error', message: err.message }));
  }
});

// Helper para obtener body del request
function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Servidor de desarrollo iniciado');
  console.log('');
  console.log(`   Local:            http://localhost:${PORT}`);
  console.log(`   Network:          http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('📁 Sirviendo archivos desde:', __dirname);
  console.log('🔌 APIs disponibles en /api/*');
  console.log('');
  console.log('Presiona Ctrl+C para detener');
  console.log('');
});

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n\n👋 Servidor detenido');
  process.exit(0);
});
