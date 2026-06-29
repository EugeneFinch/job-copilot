import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, '..');

const label = 'com.eugene.jobsearch.server';
const plistFileName = `${label}.plist`;
const homeDir = process.env.HOME || `/Users/${process.env.USER}`;
const launchAgentsDir = path.join(homeDir, 'Library/LaunchAgents');
const plistPath = path.join(launchAgentsDir, plistFileName);
const logsDir = path.join(projectDir, 'logs');
const stdoutLog = path.join(logsDir, 'server.log');
const stderrLog = path.join(logsDir, 'server-error.log');

const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${stdoutLog}</string>
    <key>StandardErrorPath</key>
    <string>${stderrLog}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3004</string>
        <key>PATH</key>
        <string>${path.dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin</string>
    </dict>
</dict>
</plist>
`;

function install() {
  console.log('Installing persistent Job Search background server...');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`Created logs directory at: ${logsDir}`);
  }
  
  // Ensure LaunchAgents directory exists
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }

  // If already loaded, unload it first
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null`);
  } catch (e) {
    // Ignore error
  }

  // Write plist file
  fs.writeFileSync(plistPath, plistContent, 'utf8');
  console.log(`Wrote plist file to: ${plistPath}`);

  // Load agent
  try {
    execSync(`launchctl load "${plistPath}"`);
    console.log('Successfully loaded background server!');
    console.log('The server will start automatically at login and restart if it crashes.');
    console.log('You can check status using: npm run server:persist-status');
  } catch (e) {
    console.error('Failed to load background agent:', e.message);
  }
}

function uninstall() {
  console.log('Uninstalling persistent Job Search background server...');
  
  if (fs.existsSync(plistPath)) {
    try {
      execSync(`launchctl unload "${plistPath}"`);
      console.log('Unloaded background agent.');
    } catch (e) {
      console.warn('Warning: Could not unload background agent (maybe it was not running?):', e.message);
    }
    
    try {
      fs.unlinkSync(plistPath);
      console.log('Deleted plist file.');
    } catch (e) {
      console.error('Error deleting plist file:', e.message);
    }
  } else {
    console.log('No plist file found at path. Nothing to uninstall.');
  }
}

function status() {
  console.log('Checking status of persistent server daemon...');
  const plistExists = fs.existsSync(plistPath);
  console.log(`Plist file exists in LaunchAgents: ${plistExists ? 'Yes' : 'No'}`);
  
  try {
    const listOutput = execSync(`launchctl list | grep ${label}`, { encoding: 'utf8' });
    console.log(`launchctl status: Active\nDetails:\n${listOutput.trim()}`);
  } catch (e) {
    console.log('launchctl status: Inactive / Not Loaded');
  }

  // Check if listening on port 3004
  try {
    const netstatOutput = execSync('lsof -i :3004', { encoding: 'utf8' });
    console.log(`Port 3004 status:\n${netstatOutput.trim()}`);
  } catch (e) {
    console.log('Port 3004 status: Not listening (server might be down)');
  }
}

function restart() {
  console.log('Restarting persistent server...');
  uninstall();
  // Wait a small bit before reloading
  setTimeout(() => {
    install();
  }, 1000);
}

const command = process.argv[2];
if (command === 'install') {
  install();
} else if (command === 'uninstall') {
  uninstall();
} else if (command === 'status') {
  status();
} else if (command === 'restart') {
  restart();
} else {
  console.log('Usage: node manage-daemon.js [install|uninstall|status|restart]');
  process.exit(1);
}
