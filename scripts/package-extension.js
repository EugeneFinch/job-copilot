import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, '..');
const extensionDir = path.join(projectDir, 'chrome-extension');
const distDir = path.join(projectDir, 'dist');
const zipPath = path.join(distDir, 'chrome-extension.zip');

export function packageExtension() {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (fs.existsSync(zipPath)) {
    try {
      fs.unlinkSync(zipPath);
    } catch (e) {
      // ignore
    }
  }

  console.log('[Package] Packaging Chrome Extension into ZIP...');

  try {
    execSync(`cd "${extensionDir}" && zip -r "${zipPath}" . -x "*.DS_Store"`, { stdio: 'inherit' });
    console.log(`[Package] Extension successfully packaged at: ${zipPath}`);
    return zipPath;
  } catch (err) {
    console.error('[Package] Error packaging extension:', err.message);
    return null;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  packageExtension();
}
