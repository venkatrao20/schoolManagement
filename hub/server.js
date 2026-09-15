/* Dependency-free local server for the School Management Hub. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HUB_HOST || '127.0.0.1';
const PORT = Number(process.env.HUB_PORT || 8080);
const ROOT = __dirname;

const modules = [
  { id: 'admin', name: 'Admin Portal', port: 5174, url: 'http://127.0.0.1:5174' },
  { id: 'transport', name: 'School Transport', port: 5002, url: 'http://127.0.0.1:5002' },
  { id: 'admissions', name: 'Admissions', port: 3001, url: 'http://127.0.0.1:3001' },
  { id: 'academics', name: 'Academics', port: 4000, url: 'http://127.0.0.1:4000' },
  { id: 'notifications', name: 'Notifications', port: 5001, url: 'http://127.0.0.1:5001' },
  { id: 'fees', name: 'Fee Finance', port: 5173, url: 'http://127.0.0.1:5173' },
];

function sendJson(response, body) {
  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function probe(module) {
  return new Promise((resolve) => {
    const request = http.get(module.url, { timeout: 1200 }, (response) => {
      response.resume();
      resolve({ ...module, online: response.statusCode >= 200 && response.statusCode < 500, statusCode: response.statusCode });
    });
    request.once('timeout', () => request.destroy());
    request.once('error', () => resolve({ ...module, online: false, statusCode: null }));
  });
}

function typeFor(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream';
}

function serveFile(requestPath, response) {
  const requested = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const file = path.resolve(ROOT, requested);
  if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': typeFor(file), 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(response);
}

http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
  if (requestUrl.pathname === '/api/modules') return sendJson(response, { modules });
  if (requestUrl.pathname === '/api/status') {
    const statuses = await Promise.all(modules.map(probe));
    return sendJson(response, { modules: statuses, online: statuses.filter((module) => module.online).length, total: statuses.length });
  }
  serveFile(requestUrl.pathname, response);
}).listen(PORT, HOST, () => console.log(`School Management Hub: http://${HOST}:${PORT}`));
