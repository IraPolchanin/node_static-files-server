'use strict';

const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(message);
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url.includes('/..')) {
      return sendError(res, 400, 'Bad Request');
    }

    const pathname = req.url.split('?')[0];

    if (!pathname.startsWith('/file/')) {
      if (pathname.match(/\.\w+$/)) {
        return sendError(res, 400, 'Bad Request');
      }

      return sendError(res, 200, 'Use /file/yourfile.ext to load static files');
    }

    if (pathname.includes('..')) {
      return sendError(res, 400, 'Bad Request');
    }

    if (pathname.includes('//')) {
      return sendError(res, 404, 'Not Found');
    }

    let filePath = pathname.slice(6);

    if (filePath === '' || filePath === '/') {
      filePath = 'index.html';
    }

    if (filePath.endsWith('/')) {
      filePath += 'index.html';
    }

    let decodedPath;

    try {
      decodedPath = decodeURIComponent(filePath);
    } catch {
      return sendError(res, 400, 'Bad Request');
    }

    const publicDir = path.resolve(__dirname, '..', 'public');
    const realPath = path.resolve(publicDir, decodedPath);
    const relative = path.relative(publicDir, realPath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return sendError(res, 400, 'Bad Request');
    }

    const ext = path.extname(realPath).toLowerCase();

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');

    try {
      const file = await fs.readFile(realPath);

      res.statusCode = 200;
      res.end(file);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return sendError(res, 404, 'Not Found');
      }

      return sendError(res, 500, 'Internal Server Error');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
