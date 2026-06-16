import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs';


export async function generatePdf(cvData, outputPath) {
  const browser = await chromium.launch({ 
    headless: true,
    channel: 'chrome'
  });
  const page = await browser.newPage();
  if (typeof cvData === 'string') {
    const escaped = cvData.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html = `<html><head><style>body{font-family:Arial,Helvetica,sans-serif;margin:15mm;font-size:11pt;} pre{white-space:pre-wrap;word-wrap:break-word;}</style></head><body><pre>${escaped}</pre></body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
  } else {
    const templatePath = path.resolve(__dirname, '..', 'cv_template.html');
    await page.goto(`file://${templatePath}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(data => window.populateCV(data), cvData);
    await page.waitForTimeout(500);
  }
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
  });
  await browser.close();
  return outputPath;
}
