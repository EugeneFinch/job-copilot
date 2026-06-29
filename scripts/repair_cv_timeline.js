#!/usr/bin/env node
/**
 * Repair timeline ordering/gaps on an existing tailored CV and regenerate PDF.
 * Usage: node scripts/repair_cv_timeline.js [jobId]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { finalizeTailoredExperience } from './tailor.js';
import { generatePdf } from './pdf_generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const jobsPath = path.join(root, 'data/jobs.json');
const settingsPath = path.join(root, 'data/settings.json');

const jobId = process.argv[2] || '9ik5cbjdt';

const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const job = jobs.find((j) => j.id === jobId);

if (!job?.tailoredCv?.experience) {
  console.error(`Job ${jobId} has no tailored CV to repair.`);
  process.exit(1);
}

const before = job.tailoredCv.experience.map((r) => `${r.period} — ${r.company}`);
const result = finalizeTailoredExperience(job.tailoredCv.experience, settings.profile.experience || []);
job.tailoredCv.experience = result.experience;
job.timelineNotes = [...(job.timelineNotes || []), ...result.timelineNotes].slice(0, 8);
job.bridgeRolesAdded = result.bridgeRolesAdded;

const after = job.tailoredCv.experience.map((r) => `${r.period} — ${r.company}`);
console.log('Before:', before.join(' | '));
console.log('After: ', after.join(' | '));
if (result.timelineNotes.length) {
  console.log('Notes:', result.timelineNotes.join('\n  '));
}

const cleanCompany = (job.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
const outputPath = path.join(root, 'data/generated', fileName);
await generatePdf(job.tailoredCv, outputPath);
job.pdfPath = `/data/generated/${fileName}`;
job.lastActionDate = new Date().toISOString();

fs.writeFileSync(jobsPath, JSON.stringify(jobs, null, 2) + '\n');
console.log(`\n✓ PDF regenerated: http://localhost:3004${job.pdfPath}`);