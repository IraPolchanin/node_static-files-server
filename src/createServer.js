'use strict';

const http = require('http');
const fs = require('fs/promises');
const url = require('url');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(message);
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url.includes('..')) {
      return sendError(res, 400, 'Bad Request');
    }

    const normalizedUrl = new url.URL(
      req.url || '',
      `http://${req.headers.host}`,
    );
    const pathname = normalizedUrl.pathname;

    if (!pathname.startsWith('/file/')) {
      if (pathname === '/file') {
        return sendError(
          res,
          200,
          'Use /file/yourfile.ext to load static files',
        );
      }

      return sendError(res, 400, 'Bad Request');
    }

    const filePath = pathname.slice(6);

    if (filePath.includes('//')) {
      return sendError(res, 404, 'Not Found');
    }

    let decodedPath;

    try {
      decodedPath = decodeURIComponent(filePath) || 'index.html';
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
    } catch {
      return sendError(res, 404, 'Not Found');
    }
  });

  return server;
}

module.exports = {
  createServer,
};
