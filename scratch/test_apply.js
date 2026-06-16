import { runApply } from '../scripts/apply.js';
import fs from 'fs';
import path from 'path';

async function testApply() {
  console.log("Starting auto-apply verification...");
  
  const settingsPath = './data/settings.json';
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  
  const testJobUrl = "https://jobs.ashbyhq.com/Checkbox%20Technology/53b772aa-a94f-47fe-bfc1-5d1da0d68092";
  const cvPdf = "./data/generated/CV_Base_Exact_Replica.pdf";
  const testCoverLetter = "Dear Checkbox team, this is a test cover letter demonstrating the automated application sequence.";
  
  try {
    console.log("Launching auto-apply headed browser...");
    await runApply(testJobUrl, settings.profile, testCoverLetter, cvPdf, console.log);
    console.log("Auto-apply finished successfully!");
  } catch (err) {
    console.error("Auto-apply failed:", err.message);
  }
}

testApply();
