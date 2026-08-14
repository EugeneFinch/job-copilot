#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.PORT || '3004', 10);
const homeDataDir = path.join(os.homedir(), '.job-search', 'data');

console.log(`
┌─────────────────────────────────────────────────────────┐
│              🚀 100x Job Copilot CLI Launcher           │
└─────────────────────────────────────────────────────────┘
`);

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

function openBrowser(url) {
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`open "${url}"`);
    } else if (platform === 'win32') {
      execSync(`start "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch (e) {}
}

async function main() {
  console.log('[1/3] Packaging Chrome Extension...');
  try {
    const packageScript = path.join(projectDir, 'scripts/package-extension.js');
    if (fs.existsSync(packageScript)) {
      execSync(`node "${packageScript}"`, { stdio: 'ignore' });
      console.log('  ✔ Extension zip ready in dist/chrome-extension.zip');
    }
  } catch (e) {
    console.warn('  ⚠️ Extension packaging warning:', e.message);
  }

  console.log(`[2/3] Checking persistent data storage: ${homeDataDir}`);
  if (!fs.existsSync(homeDataDir)) {
    fs.mkdirSync(homeDataDir, { recursive: true });
  }

  const inUse = await isPortInUse(PORT);
  const url = `http://localhost:${PORT}`;

  if (inUse) {
    console.log(`[3/3] Server is ALREADY running on ${url} (background daemon active)!`);
    console.log(`\n✨ Opening dashboard at ${url}`);
    console.log(`📦 Download Extension ZIP: ${url}/api/extension/download`);
    console.log(`📂 Persistent Data Storage: ${homeDataDir}\n`);
    openBrowser(url);
    process.exit(0);
  } else {
    console.log(`[3/3] Starting 100x Job Search server on ${url}...`);
    const serverPath = path.join(projectDir, 'server.js');
    const serverProcess = spawn(process.execPath, [serverPath], {
      cwd: projectDir,
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'inherit'
    });

    setTimeout(() => {
      console.log(`\n✨ Server active! Opening dashboard at ${url}`);
      console.log(`📦 Download Extension ZIP: ${url}/api/extension/download`);
      console.log(`📂 Persistent Data Storage: ${homeDataDir}\n`);
      openBrowser(url);
    }, 1500);

    process.on('SIGINT', () => {
      console.log('\nStopping 100x Job Search server...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
      process.exit(0);
    });
  }
}

main();
