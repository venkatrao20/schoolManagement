/* Start all independently runnable modules with non-conflicting Hub ports. */
const { existsSync } = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const children = [];
const folder = (...parts) => path.join(root, ...parts);
const hasNodeModules = (directory) => existsSync(path.join(directory, 'node_modules'));

function start({ id, command, args, cwd, env = {}, needsNodeModules = false, enabled = true, reason }) {
  if (!enabled) return console.log(`[${id}] skipped: ${reason}`);
  if (needsNodeModules && !hasNodeModules(cwd)) {
    return console.log(`[${id}] skipped: dependencies are missing. Run npm install in ${path.relative(root, cwd)} first.`);
  }
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  child.on('error', (error) => console.error(`[${id}] could not start: ${error.message}`));
  child.on('exit', (code) => { if (code && code !== 0) console.error(`[${id}] stopped with exit code ${code}`); });
  children.push(child);
}

const admissionsBackend = folder('admissions', 'backend');
start({ id: 'hub', command: process.execPath, args: ['server.js'], cwd: __dirname });
start({ id: 'admin', command: npm, args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5174'], cwd: folder('admin_portal'), needsNodeModules: true });
start({ id: 'transport', command: python, args: ['app.py'], cwd: folder('school_transport'), env: { PORT: '5002', FLASK_DEBUG: '0' } });
start({
  id: 'admissions-api', command: npm, args: ['start'], cwd: admissionsBackend, env: { PORT: '5003' }, needsNodeModules: true,
  enabled: existsSync(path.join(admissionsBackend, '.env')), reason: 'create admissions/backend/.env with valid MySQL settings first',
});
start({ id: 'admissions', command: npm, args: ['start'], cwd: folder('admissions', 'frontend'), env: { PORT: '3001', BROWSER: 'none' }, needsNodeModules: true });
start({ id: 'academics', command: process.execPath, args: ['server.js'], cwd: folder('academics', 'backend'), env: { PORT: '4000' }, needsNodeModules: true });
start({ id: 'notifications', command: python, args: ['app.py'], cwd: folder('notifications'), env: { PORT: '5001', FLASK_DEBUG: '0' } });
start({ id: 'fees-api', command: npm, args: ['start'], cwd: folder('fee finance', 'backend'), env: { PORT: '5004', DATABASE_URL: 'file:./dev.db', FRONTEND_URL: 'http://127.0.0.1:5173' }, needsNodeModules: true });
start({ id: 'fees', command: npm, args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], cwd: folder('fee finance', 'frontend'), env: { FEE_API_URL: 'http://127.0.0.1:5004' }, needsNodeModules: true });

function stop() { children.forEach((child) => child.kill()); }
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
