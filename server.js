// Dev Server Reload Trigger
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { runScraper, scrapeJobUrl } from './scripts/scraper.js';
import multer from 'multer';
import { tailorCvAndLetter, DEFAULT_SYSTEM_PROMPT, generateCoverLetter, buildTailorPrompt, buildCoverLetterPrompt } from './scripts/tailor.js';
import { parsePlainCv } from './scripts/cv_parser.js';
import { generatePdf } from './scripts/pdf_generator.js';
import { runApply } from './scripts/apply.js';
import { canonicalJobUrl, findJobByUrl } from './scripts/jobUrl.js';
import { notifyLinkedInCrm } from './scripts/crm_notify.js';

function pushJobToCrm(job) {
  notifyLinkedInCrm(job).catch((e) => console.warn('[CRM]', e.message));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Persistent Data Storage Management
export function getDataDir() {
  if (process.env.JOB_SEARCH_DATA_DIR) {
    return process.env.JOB_SEARCH_DATA_DIR;
  }
  return path.join(os.homedir(), '.job-search', 'data');
}

function getSettingsPath() { return path.join(getDataDir(), 'settings.json'); }
function getJobsPath() { return path.join(getDataDir(), 'jobs.json'); }
function getContactsPath() { return path.join(getDataDir(), 'contacts.json'); }
function getExtensionStatePath() { return path.join(getDataDir(), 'extension_state.json'); }

// Ensure database directories exist and sync initial repo data if needed
function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const genDir = path.join(dir, 'generated');
  if (!fs.existsSync(genDir)) {
    fs.mkdirSync(genDir, { recursive: true });
  }

  // Auto-sync existing repo files to persistent home data dir if destination doesn't exist yet
  const repoDataDir = path.join(__dirname, 'data');
  if (fs.existsSync(repoDataDir) && repoDataDir !== dir) {
    ['jobs.json', 'contacts.json', 'settings.json', 'crm_config.json'].forEach((file) => {
      const src = path.join(repoDataDir, file);
      const dest = path.join(dir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try {
          fs.copyFileSync(src, dest);
          console.log(`[Data Persistence] Synced initial ${file} to ${dir}`);
        } catch (e) {
          console.warn(`[Data Persistence Warning] Failed syncing ${file}:`, e.message);
        }
      }
    });

    const repoGen = path.join(repoDataDir, 'generated');
    if (fs.existsSync(repoGen)) {
      try {
        const files = fs.readdirSync(repoGen);
        files.forEach((f) => {
          const s = path.join(repoGen, f);
          const d = path.join(genDir, f);
          if (fs.statSync(s).isFile() && !fs.existsSync(d)) {
            fs.copyFileSync(s, d);
          }
        });
      } catch (e) {}
    }
  }

  return dir;
}

// Atomic Safe JSON Read & Write Helpers with Backup Recovery
function safeReadJson(filePath, defaultValue) {
  ensureDataDir();
  const bakFile = filePath + '.bak';

  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(bakFile)) {
      try {
        console.log(`[Data Recovery] Restoring missing file from backup: ${bakFile}`);
        const bakContent = JSON.parse(fs.readFileSync(bakFile, 'utf8'));
        fs.writeFileSync(filePath, JSON.stringify(bakContent, null, 2), 'utf8');
        return bakContent;
      } catch (e) {}
    }
    return defaultValue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) throw new Error('File content is empty');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Data Error] Parsing ${filePath} failed: ${err.message}`);
    if (fs.existsSync(bakFile)) {
      try {
        console.log(`[Data Recovery] Restoring corrupted file from backup: ${bakFile}`);
        const bakContent = JSON.parse(fs.readFileSync(bakFile, 'utf8'));
        fs.writeFileSync(filePath, JSON.stringify(bakContent, null, 2), 'utf8');
        return bakContent;
      } catch (e) {
        console.error(`[Data Recovery Failed] Backup also unreadable: ${bakFile}`);
      }
    }
    return defaultValue;
  }
}

function safeWriteJson(filePath, data) {
  ensureDataDir();
  const tmpFile = filePath + '.tmp';
  const bakFile = filePath + '.bak';
  const jsonStr = JSON.stringify(data, null, 2);

  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, bakFile);
    } catch (e) {}
  }

  fs.writeFileSync(tmpFile, jsonStr, 'utf8');
  fs.renameSync(tmpFile, filePath);
}

// Serve static generated files from persistent data directory with fallback to repo directory
app.use('/data/generated', (req, res, next) => {
  const primaryPath = path.join(getDataDir(), 'generated', req.path);
  if (fs.existsSync(primaryPath) && fs.statSync(primaryPath).isFile()) {
    return res.sendFile(primaryPath);
  }
  const fallbackPath = path.join(__dirname, 'data/generated', req.path);
  if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
    return res.sendFile(fallbackPath);
  }
  next();
});

// Serve compiled frontend static files
const distPath = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distPath, 'index.html');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

function readContacts() {
  return safeReadJson(getContactsPath(), []);
}

function writeContacts(data) {
  safeWriteJson(getContactsPath(), data);
}

const CRM_FOLLOW_UP_DAYS = 7;

function addDaysIso(isoDate, days) {
  const d = new Date(isoDate || Date.now());
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function applyContactStatusFields(contact, updates = {}) {
  const merged = { ...contact, ...updates };
  const status = merged.status || 'To Contact';
  const now = new Date().toISOString();
  const statusChanged = updates.status && updates.status !== contact.status;

  if (status === 'Invite Sent' || status === 'Waiting') {
    if (!merged.inviteSentAt || statusChanged) {
      merged.inviteSentAt = updates.inviteSentAt || now;
    }
    if (!merged.nextFollowUpAt || statusChanged) {
      merged.nextFollowUpAt = addDaysIso(merged.inviteSentAt, CRM_FOLLOW_UP_DAYS);
    }
    merged.followUpNeeded = false;
    merged.followUpCount = merged.followUpCount || 0;
  } else if (status === 'To Contact' || status === 'To Source') {
    merged.followUpNeeded = true;
  } else if (status === 'Follow Up Needed') {
    merged.followUpNeeded = true;
    if (statusChanged) {
      merged.followUpCount = (merged.followUpCount || 0) + 1;
    }
  } else if (status === 'Replied') {
    merged.followUpNeeded = false;
    merged.nextFollowUpAt = '';
  }

  merged.updatedAt = now;
  return merged;
}

function processContactsForReminders(contacts) {
  const now = Date.now();
  let changed = false;
  const processed = contacts.map((c) => {
    if ((c.status === 'Invite Sent' || c.status === 'Waiting') && c.nextFollowUpAt) {
      if (new Date(c.nextFollowUpAt).getTime() <= now) {
        changed = true;
        return applyContactStatusFields(c, { status: 'Follow Up Needed' });
      }
    }
    return c;
  });
  if (changed) writeContacts(processed);
  return processed;
}

function findContactForJob(contacts, job) {
  const company = String(job.company || '').trim().toLowerCase();
  const jobId = job.id;
  return contacts.find((c) => {
    if (jobId && c.jobId === jobId) return true;
    if (!company) return false;
    const sameCompany = String(c.company || '').trim().toLowerCase() === company;
    const linkedTitle = String(c.jobTitle || '').trim().toLowerCase();
    const jobTitle = String(job.title || '').trim().toLowerCase();
    return sameCompany && linkedTitle && jobTitle && linkedTitle === jobTitle;
  });
}

function autoCreateContactFromJob(job) {
  if (!job || job.status !== 'Applied') return;
  const contacts = readContacts();
  const company = job.company ? job.company.trim() : '';
  const jobId = job.id;
  const jobTitle = job.title || '';

  if (findContactForJob(contacts, job)) return;

  if (job.hiringManager) {
    const rawManager = job.hiringManager.trim();
    let profileUrl = '';
    let name = rawManager;
    if (rawManager.startsWith('http')) {
      profileUrl = rawManager;
      const match = rawManager.match(/\/in\/([^\/?#\s]+)/);
      if (match && match[1]) {
        name = match[1].replace(/[-_]/g, ' ');
        name = name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } else {
        name = `${company} Hiring Manager`;
      }
    }

    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newContact = applyContactStatusFields({
      id: Math.random().toString(36).substring(2, 11),
      firstName,
      lastName,
      company,
      jobId,
      jobTitle,
      profileUrl,
      threadUrl: '',
      lastOutboundDate: new Date().toISOString(),
      lastOutboundSnippet: job.hiringManagerIntro || '',
      lastInboundDate: '',
      lastInboundSnippet: '',
      followUpNeeded: true,
      status: 'To Contact',
      inviteSentAt: '',
      nextFollowUpAt: '',
      followUpCount: 0,
      notes: `Auto-created from applied job: ${jobTitle}. AI Outreach Message: ${job.hiringManagerIntro || 'none'}`,
      updatedAt: new Date().toISOString()
    });
    contacts.push(newContact);
    writeContacts(contacts);
    console.log(`[CRM] Auto-created contact ${name} for ${company}`);
    return;
  }

  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`hiring manager ${company}`)}`;
  const placeholder = applyContactStatusFields({
    id: Math.random().toString(36).substring(2, 11),
    firstName: 'Source',
    lastName: 'Manager',
    company,
    jobId,
    jobTitle,
    profileUrl: searchUrl,
    threadUrl: '',
    lastOutboundDate: '',
    lastOutboundSnippet: '',
    lastInboundDate: '',
    lastInboundSnippet: '',
    followUpNeeded: true,
    status: 'To Source',
    inviteSentAt: '',
    nextFollowUpAt: '',
    followUpCount: 0,
    notes: `Find hiring manager for applied role: ${jobTitle}`,
    updatedAt: new Date().toISOString()
  });
  contacts.push(placeholder);
  writeContacts(contacts);
  console.log(`[CRM] Auto-created sourcing task for ${company} (${jobTitle})`);
}

function cleanJsonText(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '');
    cleaned = cleaned.replace(/```$/, '');
  }
  return cleaned.trim();
}

function readSettings() {
  const defaultSettings = { 
    geminiApiKey: '', 
    deepSeekApiKey: '', 
    targetKeywords: [], 
    targetLocations: [], 
    excludeCompanies: [], 
    profile: {},
    cvSystemPrompt: DEFAULT_SYSTEM_PROMPT
  };
  const data = safeReadJson(getSettingsPath(), defaultSettings);
  
  let migrated = false;
  let geminiApiKey = data.geminiApiKey || '';
  let deepSeekApiKey = data.deepSeekApiKey || '';
  
  // If deepSeekApiKey contains a Gemini key, migrate it
  if (deepSeekApiKey && (deepSeekApiKey.startsWith('AIzaSy') || deepSeekApiKey.startsWith('AQ.'))) {
    if (!geminiApiKey) {
      geminiApiKey = deepSeekApiKey;
    }
    deepSeekApiKey = '';
    migrated = true;
  }

  if (!data.cvSystemPrompt) {
    migrated = true;
  }
  
  const updatedSettings = {
    ...defaultSettings,
    ...data,
    geminiApiKey,
    deepSeekApiKey
  };

  if (migrated) {
    writeSettings(updatedSettings);
  }

  return updatedSettings;
}

function resolveApiKeys(settings = {}) {
  let geminiApiKey = settings.geminiApiKey || '';
  let deepSeekApiKey = settings.deepSeekApiKey || '';

  if (geminiApiKey && !geminiApiKey.startsWith('AIzaSy')) {
    geminiApiKey = '';
  }

  return { geminiApiKey, deepSeekApiKey };
}

function writeSettings(data) {
  safeWriteJson(getSettingsPath(), data);
}

function readJobs() {
  const jobs = safeReadJson(getJobsPath(), []);
  let modified = false;
  const migratedJobs = jobs.map(j => {
    if (!j.source) {
      j.source = 'Auto Search';
      modified = true;
    }
    return j;
  });
  if (modified) {
    safeWriteJson(getJobsPath(), migratedJobs);
  }
  return migratedJobs;
}

function writeJobs(data) {
  safeWriteJson(getJobsPath(), data);
}

function getLatestAnalysisPath() {
  return path.join(ensureDataDir(), 'latest_group_analysis.json');
}

function readLatestAnalysis() {
  return safeReadJson(getLatestAnalysisPath(), null);
}

function writeLatestAnalysis(data) {
  safeWriteJson(getLatestAnalysisPath(), data);
}

// Heuristic matcher in case LLM fails or is not configured
function selectBestJobHeuristically(jobs, profile) {
  let bestIndex = 0;
  let highestScore = -1;
  
  const profileText = `${profile.title || ''} ${profile.summary || ''} ${
    profile.experience ? profile.experience.map(e => `${e.role} ${e.company} ${e.bullets ? e.bullets.join(' ') : ''}`).join(' ') : ''
  }`.toLowerCase();

  jobs.forEach((job, index) => {
    let score = 0;
    const title = (job.title || '').toLowerCase();
    const desc = (job.description || '').toLowerCase();

    // PM keywords in title
    if (title.includes('product manager') || title.includes('product lead') || title.includes('director of product') || title.includes('head of product')) {
      score += 10;
    }
    
    // AI keywords
    if (title.includes('ai') || title.includes('artificial intelligence') || title.includes('machine learning') || title.includes('llm') || title.includes('gpt')) {
      if (profileText.includes('ai') || profileText.includes('gpt')) {
        score += 8;
      }
    }
    
    // Growth keywords
    if (title.includes('growth')) {
      if (profileText.includes('growth')) {
        score += 8;
      }
    }

    // Fintech / payments keywords
    if (title.includes('pay') || title.includes('checkout') || title.includes('check-out') || title.includes('finance') || title.includes('treasury') || title.includes('card')) {
      if (profileText.includes('fintech') || profileText.includes('payment') || profileText.includes('spenmo') || profileText.includes('foundation') || profileText.includes('credit')) {
        score += 8;
      }
    }

    // Technical / DevEx keywords
    if (title.includes('technical') || title.includes('developer') || title.includes('devex') || title.includes('api') || title.includes('platform')) {
      if (profileText.includes('api') || profileText.includes('platform') || profileText.includes('developer')) {
        score += 6;
      }
    }

    // General term matching from profile summary
    const keywords = ['fintech', 'saas', 'b2b', 'api', 'payments', 'compliance', 'solana', 'analytics', 'dashboard', 'credit'];
    keywords.forEach(kw => {
      if (desc.includes(kw)) score += 1;
      if (title.includes(kw)) score += 3;
    });

    if (score > highestScore) {
      highestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      const isRetriable = [429, 502, 503, 504].includes(response.status);
      if (!isRetriable || attempt >= maxRetries) {
        return response;
      }
      attempt++;
      const delay = initialDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
      console.warn(`[API] Attempt ${attempt} failed with status ${response.status}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (e) {
      if (attempt >= maxRetries) {
        throw e;
      }
      attempt++;
      const delay = initialDelay * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
      console.warn(`[API] Attempt ${attempt} failed with connection error: ${e.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function selectBestJobForCompany(jobs, profile, apiKeyOrKeys, log) {
  if (jobs.length <= 1) return jobs[0];

  const companyName = jobs[0].company;
  log(`[Filter] Comparing ${jobs.length} jobs for ${companyName} to pick the best match...`);

  let geminiApiKey = '';
  let deepSeekApiKey = '';

  if (typeof apiKeyOrKeys === 'string') {
    if (apiKeyOrKeys.startsWith('AIzaSy') || apiKeyOrKeys.startsWith('AQ.')) {
      geminiApiKey = apiKeyOrKeys;
    } else {
      deepSeekApiKey = apiKeyOrKeys;
    }
  } else if (apiKeyOrKeys && typeof apiKeyOrKeys === 'object') {
    geminiApiKey = apiKeyOrKeys.geminiApiKey || '';
    deepSeekApiKey = apiKeyOrKeys.deepSeekApiKey || '';
  }

  if (!geminiApiKey && !deepSeekApiKey) {
    const bestIdx = selectBestJobHeuristically(jobs, profile);
    log(`[Filter] Selected "${jobs[bestIdx].title}" for ${companyName} via heuristics.`);
    return jobs[bestIdx];
  }

  // Build a prompt for the LLM
  const prompt = `
You are an expert recruitment matching system. Given a candidate's profile and a list of jobs from the same company, identify the single job that best fits the candidate's profile.

**Candidate Profile:**
Title: ${profile.title || ''}
Summary: ${profile.summary || ''}
Experience Summary: ${
    profile.experience 
      ? profile.experience.map(e => `${e.role} at ${e.company}`).join(', ') 
      : ''
  }

**Jobs List:**
${jobs.map((job, idx) => `Index: ${idx}
Title: ${job.title}
Location: ${job.location}
Description Snippet: ${job.description ? job.description.substring(0, 1500) : ''}
---`).join('\n')}

Identify the single job by its Index (0-based) that represents the best fit for the candidate's profile.
Return a JSON object containing the index of the best match and a brief reason:
{
  "bestMatchIndex": <number>,
  "reason": "Brief explanation of why this job fits best"
}
`;

  let response;
  let success = false;
  let errorMessages = [];

  // Try Gemini first if key is available
  if (geminiApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        })
      });

      if (response.ok) {
        success = true;
      } else {
        const errText = await response.text();
        errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
      }
    } catch (e) {
      errorMessages.push(`Gemini Connection Error: ${e.message}`);
    }
  }

  // Try DeepSeek if Gemini wasn't used or failed
  if (!success && deepSeekApiKey) {
    try {
      const url = `https://api.deepseek.com/chat/completions`;
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      if (response.ok) {
        success = true;
      } else {
        const errText = await response.text();
        errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
      }
    } catch (e) {
      errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
    }
  }

  if (success) {
    try {
      const resJson = await response.json();
      let rawText = '';
      const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
      if (hasGeminiKeyUsed) {
        rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        rawText = resJson.choices?.[0]?.message?.content || '';
      }

      const data = JSON.parse(cleanJsonText(rawText));
      const bestIdx = parseInt(data.bestMatchIndex, 10);
      if (!isNaN(bestIdx) && bestIdx >= 0 && bestIdx < jobs.length) {
        log(`[Filter] Selected "${jobs[bestIdx].title}" for ${companyName} via LLM: ${data.reason}`);
        return jobs[bestIdx];
      }
    } catch (err) {
      log(`[Filter Warning] LLM parsing failed: ${err.message}`);
    }
  } else {
    log(`[Filter Warning] LLM matching failed (${errorMessages.join(' | ')}). Falling back to heuristic matching.`);
  }

  const bestIdx = selectBestJobHeuristically(jobs, profile);
  log(`[Filter] Selected "${jobs[bestIdx].title}" for ${companyName} via heuristics.`);
  return jobs[bestIdx];
}

async function filterAndDeduplicateJobsForCompany(companyName, newScrapedJobs, currentJobs, settings, log) {
  if (!companyName) return null;
  const companyLower = companyName.trim().toLowerCase();
  
  // Find all existing jobs for this company
  const existingJobs = currentJobs.filter(ej => ej.company && ej.company.trim().toLowerCase() === companyLower);
  
  // Combine existing and new jobs
  const allJobs = [...existingJobs, ...newScrapedJobs];
  
  // Deduplicate by URL
  const uniqueJobs = [];
  const urlsSeen = new Set();
  for (const job of allJobs) {
    if (!urlsSeen.has(job.url)) {
      urlsSeen.add(job.url);
      uniqueJobs.push(job);
    }
  }
  
  if (uniqueJobs.length === 0) return null;
  if (uniqueJobs.length === 1) return uniqueJobs[0];
  
  // Check if any job has status !== 'To Process'
  const processedJobs = uniqueJobs.filter(j => j.status && j.status !== 'To Process');
  if (processedJobs.length > 0) {
    // If we have processed jobs, keep the first one
    const keptJob = processedJobs[0];
    const skippedCount = uniqueJobs.length - 1;
    log(`[Filter] Keeping existing processed job "${keptJob.title}" at ${companyName} (Status: ${keptJob.status}). Skipped/discarded ${skippedCount} other jobs.`);
    return keptJob;
  }
  
  // Resolve API keys for matching
  const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
  const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
  const apiKeys = { geminiApiKey, deepSeekApiKey };

  // If all are 'To Process', compare them and pick the best match
  const bestJob = await selectBestJobForCompany(uniqueJobs, settings.profile, apiKeys, log);
  const skippedCount = uniqueJobs.length - 1;
  log(`[Filter] Selected best match "${bestJob.title}" at ${companyName} and skipped/discarded ${skippedCount} others.`);
  return bestJob;
}

// ----------------------------------------------------
// CONTACTS API
// ----------------------------------------------------
app.get('/api/contacts', (req, res) => {
  try {
    let contacts = processContactsForReminders(readContacts());
    if (req.query.due === 'true') {
      const now = Date.now();
      contacts = contacts.filter(
        (c) =>
          c.followUpNeeded ||
          c.status === 'Follow Up Needed' ||
          ((c.status === 'Invite Sent' || c.status === 'Waiting') &&
            c.nextFollowUpAt &&
            new Date(c.nextFollowUpAt).getTime() <= now)
      );
    }
    if (req.query.jobId) {
      contacts = contacts.filter((c) => c.jobId === req.query.jobId);
    }
    res.json(contacts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/:id/contacts', (req, res) => {
  try {
    const jobs = readJobs();
    const job = jobs.find((j) => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    const contacts = processContactsForReminders(readContacts()).filter(
      (c) =>
        c.jobId === job.id ||
        (String(c.company || '').toLowerCase() === String(job.company || '').toLowerCase() &&
          String(c.jobTitle || '').toLowerCase() === String(job.title || '').toLowerCase())
    );
    res.json({ success: true, data: contacts, job });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contacts', (req, res) => {
  try {
    writeContacts(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/contacts/add', (req, res) => {
  try {
    const contacts = readContacts();
    const { firstName, lastName, company, profileUrl } = req.body;

    // Find existing contact
    let existingIndex = -1;
    if (profileUrl) {
      existingIndex = contacts.findIndex(c => c.profileUrl && c.profileUrl.toLowerCase() === profileUrl.toLowerCase());
    }
    if (existingIndex === -1 && firstName && lastName && company) {
      existingIndex = contacts.findIndex(c => 
        (c.firstName || '').toLowerCase() === firstName.toLowerCase() &&
        (c.lastName || '').toLowerCase() === lastName.toLowerCase() &&
        (c.company || '').toLowerCase() === company.toLowerCase()
      );
    }

    if (existingIndex !== -1) {
      contacts[existingIndex] = applyContactStatusFields(contacts[existingIndex], req.body);
      writeContacts(contacts);
      res.json({ success: true, data: contacts[existingIndex], updated: true });
    } else {
      const newContact = applyContactStatusFields({
        id: Math.random().toString(36).substring(2, 11),
        firstName: '',
        lastName: '',
        company: '',
        jobId: '',
        jobTitle: '',
        profileUrl: '',
        threadUrl: '',
        lastOutboundDate: '',
        lastOutboundSnippet: '',
        lastInboundDate: '',
        lastInboundSnippet: '',
        followUpNeeded: false,
        status: 'To Contact',
        inviteSentAt: '',
        nextFollowUpAt: '',
        followUpCount: 0,
        notes: '',
        ...req.body
      });
      contacts.push(newContact);
      writeContacts(contacts);
      res.json({ success: true, data: newContact });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/contacts/:id', (req, res) => {
  try {
    const contacts = readContacts();
    const { id } = req.params;
    const existing = contacts.find(c => c.id === id);
    if (!existing) return res.status(404).json({ error: 'Contact not found.' });

    const updatedContacts = contacts.map((c) =>
      c.id === id ? applyContactStatusFields(c, req.body) : c
    );
    writeContacts(updatedContacts);
    res.json({ success: true, data: updatedContacts.find(c => c.id === id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/contacts/:id', (req, res) => {
  try {
    const contacts = readContacts();
    const filtered = contacts.filter(c => c.id !== req.params.id);
    writeContacts(filtered);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// SETTINGS API
// ----------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    res.json(readSettings());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    writeSettings(updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// JOBS API
// ----------------------------------------------------
app.get('/api/jobs', (req, res) => {
  try {
    res.json(readJobs());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs', (req, res) => {
  try {
    writeJobs(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put('/api/jobs/:id', (req, res) => {
  try {
    const jobs = readJobs();
    const { id } = req.params;
    const existingJob = jobs.find(j => j.id === id);
    if (!existingJob) return res.status(404).json({ error: 'Job not found.' });

    const updates = { ...req.body };
    if (updates.status && updates.status !== existingJob.status) {
      updates.lastActionDate = new Date().toISOString();
    }

    const updatedJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    writeJobs(updatedJobs);
    const updatedJob = updatedJobs.find(j => j.id === id);
    if (updatedJob?.status && updatedJob.status !== existingJob.status) {
      pushJobToCrm(updatedJob);
    }
    if (updatedJob && updatedJob.status === 'Applied' && updatedJob.status !== existingJob.status) {
      autoCreateContactFromJob(updatedJob);
    }
    res.json({ success: true, data: updatedJob });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check if we've already applied to a company (used by the extension before auto-applying)
app.get('/api/jobs/check-company', (req, res) => {
  try {
    const company = (req.query.company || '').trim().toLowerCase();
    if (!company) return res.json({ applied: false });
    const jobs = readJobs();
    const appliedStatuses = ['applied', 'interviewing', 'offer', 'rejected'];
    const alreadyApplied = jobs.some(j => {
      const jCompany = (j.company || '').trim().toLowerCase();
      return jCompany === company && appliedStatuses.includes((j.status || '').toLowerCase());
    });
    res.json({ applied: alreadyApplied });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/lookup', (req, res) => {
  try {
    const jobs = readJobs();
    const job = findJobByUrl(jobs, req.query.url, {
      title: req.query.title,
      company: req.query.company
    });
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    res.json(job);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/add', (req, res) => {
  try {
    const jobs = readJobs();
    const newJob = { ...req.body };
    newJob.url = canonicalJobUrl(newJob.url);

    const existing = findJobByUrl(jobs, newJob.url, {
      title: newJob.title,
      company: newJob.company
    });

    if (existing) {
      const existingIndex = jobs.findIndex((j) => j.id === existing.id);
      const lockedStatuses = ['Applied', 'Invited', 'Dismissed', 'Skipped'];
      const nextStatus = lockedStatuses.includes(existing.status)
        ? existing.status
        : (newJob.status || existing.status);
      jobs[existingIndex] = {
        source: existing.source || newJob.source || 'Extension Sourced',
        ...existing,
        ...newJob,
        id: existing.id,
        status: nextStatus,
        tailoredCv: existing.tailoredCv || newJob.tailoredCv,
        coverLetter: existing.coverLetter || newJob.coverLetter,
        pdfPath: existing.pdfPath || newJob.pdfPath,
        whyInterested: existing.whyInterested || newJob.whyInterested,
        recruiterEmail: newJob.recruiterEmail || existing.recruiterEmail,
        url: canonicalJobUrl(newJob.url || existing.url)
      };
      if (newJob.source) {
        jobs[existingIndex].source = newJob.source;
      }
      writeJobs(jobs);
      return res.json({ success: true, updated: true, job: jobs[existingIndex] });
    }

    newJob.id = newJob.id || Math.random().toString(36).substring(2, 11);
    newJob.source = newJob.source || 'Extension Sourced';
    jobs.push(newJob);
    writeJobs(jobs);
    res.json({ success: true, updated: false, job: newJob });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    const jobs = readJobs();
    const filtered = jobs.filter(j => j.id !== req.params.id);
    writeJobs(filtered);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// DIRECT JOB IMPORT (SSE Streaming Logs)
// ----------------------------------------------------
app.post('/api/jobs/import', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const log = (msg) => {
    console.log(`[Import] ${msg}`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
  };

  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    const apiKeys = { geminiApiKey, deepSeekApiKey };
    const hasAnyKey = geminiApiKey || deepSeekApiKey;
    
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      log('Error: No URLs provided.');
      res.write(`data: ${JSON.stringify({ type: 'done', count: 0 })}\n\n`);
      res.end();
      return;
    }

    log(`Initializing URL importer for ${urls.length} links...`);
    const scrapedJobs = [];

    for (const rawUrl of urls) {
      const url = rawUrl.trim();
      if (!url) continue;

      const existingJobs = readJobs();
      const exists = existingJobs.some(ej => ej.url === url);
      if (exists) {
        log(`[Skip] Already in pipeline: ${url}`);
        continue;
      }

      // Check if URL matches any excluded company name (case-insensitive)
      const isExcluded = (settings.excludeCompanies || []).some(comp => {
        const cleanComp = comp.trim().toLowerCase();
        return cleanComp && url.toLowerCase().includes(cleanComp);
      });
      if (isExcluded) {
        log(`[Skip] Company excluded by settings: ${url}`);
        continue;
      }

      log(`[Importing] Loading and parsing details from: ${url}`);
      try {
        const jobData = await scrapeJobUrl(url);
        
        // Double check company name after scraping
        const isCompanyExcluded = (settings.excludeCompanies || []).some(comp => {
          const cleanComp = comp.trim().toLowerCase();
          return cleanComp && jobData.company.toLowerCase().includes(cleanComp);
        });
        if (isCompanyExcluded) {
          log(`[Skip] Scraped company "${jobData.company}" is in exclude list.`);
          continue;
        }

        scrapedJobs.push(jobData);
        log(`[Success] Scraped: ${jobData.title} at ${jobData.company}`);
      } catch (err) {
        log(`[Failed] Failed to parse: ${url} (${err.message})`);
      }
    }

    log(`Filtering ${scrapedJobs.length} imported jobs to pick best-fit per company...`);
    const jobsByCompany = {};
    for (const job of scrapedJobs) {
      const company = job.company || 'Unknown';
      if (!jobsByCompany[company]) {
        jobsByCompany[company] = [];
      }
      jobsByCompany[company].push(job);
    }

    const finalJobsToProcess = [];
    const currentJobs = readJobs();

    for (const company of Object.keys(jobsByCompany)) {
      const companyJobs = jobsByCompany[company];
      const originalUrls = new Set(currentJobs.filter(ej => ej.company && ej.company.trim().toLowerCase() === company.trim().toLowerCase()).map(ej => ej.url));

      const bestJob = await filterAndDeduplicateJobsForCompany(company, companyJobs, currentJobs, settings, log);

      // Remove all existing jobs for this company from currentJobs
      const companyLower = company.trim().toLowerCase();
      for (let i = currentJobs.length - 1; i >= 0; i--) {
        if (currentJobs[i].company && currentJobs[i].company.trim().toLowerCase() === companyLower) {
          currentJobs.splice(i, 1);
        }
      }

      if (bestJob) {
        if (originalUrls.has(bestJob.url)) {
          // It was already in the database, put it back
          currentJobs.push(bestJob);
        } else {
          // It is a new job, push it to finalJobsToProcess to be tailored and saved
          finalJobsToProcess.push(bestJob);
        }
      }
    }

    writeJobs(currentJobs);

    const latestJobs = readJobs();
    let importedCount = 0;
    for (let jobToSave of finalJobsToProcess) {
      if (latestJobs.some(ej => ej.url === jobToSave.url)) continue;
      jobToSave.source = 'Direct Import';

      if (hasAnyKey) {
        try {
          log(`[Auto-Tailor] Automatically tailoring CV for: ${jobToSave.title} at ${jobToSave.company}...`);
          const tailorResult = await tailorCvAndLetter(
            apiKeys,
            settings.profile,
            jobToSave.description,
            jobToSave.title,
            jobToSave.company,
            settings.customInstructions,
            settings.cvSystemPrompt,
            jobToSave.isRecruiter
          );
          
          jobToSave.tailoredCv = {
            name: settings.profile.name,
            title: tailorResult.title || settings.profile.title,
            email: settings.profile.email,
            phone: settings.profile.phone,
            linkedin: settings.profile.linkedin,
            summary: tailorResult.summary,
            coreSkills: tailorResult.coreSkills || '',
            experience: tailorResult.experience
          };
          jobToSave.tailoredByModel = tailorResult.tailoredByModel || '';
          jobToSave.detectedDomain = tailorResult.detectedDomain || '';
          jobToSave.tailoringExplanation = tailorResult.tailoringExplanation || '';
          jobToSave.experienceGaps = tailorResult.experienceGaps || [];
          jobToSave.gapBridgeNote = tailorResult.gapBridgeNote || '';
          jobToSave.transferableHighlights = tailorResult.transferableHighlights || [];
          jobToSave.timelineNotes = tailorResult.timelineNotes || [];
          jobToSave.omittedRoles = tailorResult.omittedRoles || [];
          jobToSave.bridgeRolesAdded = tailorResult.bridgeRolesAdded || [];
          log(`[Auto-Tailor] Successfully tailored! (model: ${jobToSave.tailoredByModel || 'unknown'})`);

          try {
            const coverResult = await generateCoverLetter(
              apiKeys,
              settings.profile,
              jobToSave.tailoredCv,
              jobToSave.title,
              jobToSave.company,
              jobToSave.description,
              settings.customInstructions,
              jobToSave.isRecruiter,
              {
                experienceGaps: jobToSave.experienceGaps,
                gapBridgeNote: jobToSave.gapBridgeNote,
                transferableHighlights: jobToSave.transferableHighlights,
                suitabilityAssessment: jobToSave.suitabilityAssessment || ''
              }
            );
            jobToSave.coverLetter = coverResult.coverLetter;
            jobToSave.coverLetterByModel = coverResult.generatedByModel;
          } catch (coverErr) {
            log(`[Auto-Tailor] Cover letter skipped: ${coverErr.message}`);
          }

          log(`[Auto-PDF] Automatically generating CV PDF...`);
          const cleanCompany = (jobToSave.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
          const outputPath = path.join(getDataDir(), 'generated', fileName);
          await generatePdf(jobToSave.tailoredCv, outputPath);
          jobToSave.pdfPath = `/data/generated/${fileName}`;
          log(`[Auto-PDF] Successfully generated PDF!`);
        } catch (err) {
          log(`[Auto-Automation Warning] Failed to auto-tailor/PDF: ${err.message}`);
        }
      }

      latestJobs.push(jobToSave);
      importedCount++;
      log(`[Success] Imported: ${jobToSave.title} at ${jobToSave.company} (${jobToSave.status})`);
    }

    writeJobs(latestJobs);

    log(`Import session finished. Added ${importedCount} new jobs.`);
    res.write(`data: ${JSON.stringify({ type: 'done', count: importedCount })}\n\n`);
    res.end();
  } catch (e) {
    log(`Import failed: ${e.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    res.end();
  }
});

// ----------------------------------------------------
// JOB SEARCH (SSE Streaming Logs)
// ----------------------------------------------------
app.post('/api/jobs/search', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const log = (msg) => {
    console.log(`[Search] ${msg}`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
  };

  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    const apiKeys = { geminiApiKey, deepSeekApiKey };
    const hasAnyKey = geminiApiKey || deepSeekApiKey;

    const keywords = settings.targetKeywords || [];
    const locations = settings.targetLocations || [];

    if (keywords.length === 0 || locations.length === 0) {
      log('Error: Keywords or locations list is empty. Set them in settings.');
      res.write(`data: ${JSON.stringify({ type: 'done', count: 0 })}\n\n`);
      res.end();
      return;
    }

    log(`Starting search using keywords: ${keywords.join(', ')}`);
    
    const scrapedJobs = [];
    const onJobScraped = async (jobData) => {
      scrapedJobs.push(jobData);
    };

    await runScraper(keywords, locations, log, onJobScraped, settings.excludeCompanies || []);
    
    log(`Filtering ${scrapedJobs.length} scraped jobs to pick best-fit per company...`);
    const jobsByCompany = {};
    for (const job of scrapedJobs) {
      const company = job.company || 'Unknown';
      if (!jobsByCompany[company]) {
        jobsByCompany[company] = [];
      }
      jobsByCompany[company].push(job);
    }

    const finalJobsToProcess = [];
    const currentJobs = readJobs();

    for (const company of Object.keys(jobsByCompany)) {
      const companyJobs = jobsByCompany[company];
      const originalUrls = new Set(currentJobs.filter(ej => ej.company && ej.company.trim().toLowerCase() === company.trim().toLowerCase()).map(ej => ej.url));

      const bestJob = await filterAndDeduplicateJobsForCompany(company, companyJobs, currentJobs, settings, log);

      // Remove all existing jobs for this company from currentJobs
      const companyLower = company.trim().toLowerCase();
      for (let i = currentJobs.length - 1; i >= 0; i--) {
        if (currentJobs[i].company && currentJobs[i].company.trim().toLowerCase() === companyLower) {
          currentJobs.splice(i, 1);
        }
      }

      if (bestJob) {
        if (originalUrls.has(bestJob.url)) {
          // It was already in the database, put it back
          currentJobs.push(bestJob);
        } else {
          // It is a new job, push it to finalJobsToProcess to be tailored and saved
          finalJobsToProcess.push(bestJob);
        }
      }
    }

    writeJobs(currentJobs);

    const latestJobs = readJobs();
    let addedCount = 0;
    for (let jobToSave of finalJobsToProcess) {
      if (latestJobs.some(ej => ej.url === jobToSave.url)) continue;
      jobToSave.source = 'Auto Search';

      if (hasAnyKey) {
        try {
          log(`[Auto-Tailor] Automatically tailoring CV for: ${jobToSave.title} at ${jobToSave.company}...`);
          const tailorResult = await tailorCvAndLetter(
            apiKeys,
            settings.profile,
            jobToSave.description,
            jobToSave.title,
            jobToSave.company,
            settings.customInstructions,
            settings.cvSystemPrompt,
            jobToSave.isRecruiter
          );
          
          jobToSave.tailoredCv = {
            name: settings.profile.name,
            title: tailorResult.title || settings.profile.title,
            email: settings.profile.email,
            phone: settings.profile.phone,
            linkedin: settings.profile.linkedin,
            summary: tailorResult.summary,
            coreSkills: tailorResult.coreSkills || '',
            experience: tailorResult.experience
          };
          jobToSave.tailoredByModel = tailorResult.tailoredByModel || '';
          jobToSave.detectedDomain = tailorResult.detectedDomain || '';
          jobToSave.tailoringExplanation = tailorResult.tailoringExplanation || '';
          jobToSave.experienceGaps = tailorResult.experienceGaps || [];
          jobToSave.gapBridgeNote = tailorResult.gapBridgeNote || '';
          jobToSave.transferableHighlights = tailorResult.transferableHighlights || [];
          jobToSave.timelineNotes = tailorResult.timelineNotes || [];
          jobToSave.omittedRoles = tailorResult.omittedRoles || [];
          jobToSave.bridgeRolesAdded = tailorResult.bridgeRolesAdded || [];
          log(`[Auto-Tailor] Successfully tailored! (model: ${jobToSave.tailoredByModel || 'unknown'})`);

          try {
            const coverResult = await generateCoverLetter(
              apiKeys,
              settings.profile,
              jobToSave.tailoredCv,
              jobToSave.title,
              jobToSave.company,
              jobToSave.description,
              settings.customInstructions,
              jobToSave.isRecruiter,
              {
                experienceGaps: jobToSave.experienceGaps,
                gapBridgeNote: jobToSave.gapBridgeNote,
                transferableHighlights: jobToSave.transferableHighlights,
                suitabilityAssessment: jobToSave.suitabilityAssessment || ''
              }
            );
            jobToSave.coverLetter = coverResult.coverLetter;
            jobToSave.coverLetterByModel = coverResult.generatedByModel;
          } catch (coverErr) {
            log(`[Auto-Tailor] Cover letter skipped: ${coverErr.message}`);
          }

          log(`[Auto-PDF] Automatically generating CV PDF...`);
          const cleanCompany = (jobToSave.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
          const outputPath = path.join(getDataDir(), 'generated', fileName);
          await generatePdf(jobToSave.tailoredCv, outputPath);
          jobToSave.pdfPath = `/data/generated/${fileName}`;
          log(`[Auto-PDF] Successfully generated PDF!`);
        } catch (err) {
          log(`[Auto-Automation Warning] Failed to auto-tailor/PDF: ${err.message}`);
        }
      }

      latestJobs.push(jobToSave);
      addedCount++;
      log(`[Success] Saved: ${jobToSave.title} at ${jobToSave.company} (${jobToSave.status})`);
    }

    writeJobs(latestJobs);
    
    log(`Saved ${addedCount} new jobs to pipeline.`);
    res.write(`data: ${JSON.stringify({ type: 'done', count: addedCount })}\n\n`);
    res.end();
  } catch (e) {
    log(`Execution failed: ${e.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    res.end();
  }
});

// ----------------------------------------------------
// TAILOR CV AND COVER LETTER
// ----------------------------------------------------
app.post('/api/jobs/:id/tailor', async (req, res) => {
  console.log(`[Server] POST /api/jobs/${req.params.id}/tailor received.`);
  try {
    const settings = readSettings();
    const apiKeys = resolveApiKeys(settings);

    if (!apiKeys.geminiApiKey && !apiKeys.deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const jobs = readJobs();
    let jobIndex = jobs.findIndex(j => j.id === req.params.id);
    if (jobIndex === -1 && req.body?.url) {
      jobIndex = jobs.findIndex((j) => findJobByUrl([j], req.body.url));
    }
    if (jobIndex === -1) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = jobs[jobIndex];
    
    const jobSpecificInstructions = req.body?.customInstructions || job.customInstructions || '';
    job.customInstructions = jobSpecificInstructions;

    // Combine global settings instructions with job-specific instructions
    const combinedInstructions = [
      settings.customInstructions,
      jobSpecificInstructions,
      job.suitabilityAssessment ? `**Suitability Assessment (Use this to guide alignment and address gaps):**\n${job.suitabilityAssessment}` : ''
    ].filter(Boolean).join('\n\n');

    // Call AI tailor function
    const result = await tailorCvAndLetter(
      apiKeys,
      settings.profile,
      job.description,
      job.title,
      job.company,
      combinedInstructions,
      settings.cvSystemPrompt,
      job.isRecruiter
    );

    // Update job database with tailored info
    job.tailoredCv = {
      name: settings.profile.name,
      title: result.title || settings.profile.title,
      email: settings.profile.email,
      phone: settings.profile.phone,
      address: settings.profile.address,
      visa: settings.profile.visa,
      linkedin: settings.profile.linkedin,
      github: settings.profile.github,
      website: settings.profile.website,
      summary: result.summary,
      coreSkills: result.coreSkills || '',
      experience: result.experience
    };
    job.tailoringExplanation = result.tailoringExplanation || '';
    job.experienceGaps = result.experienceGaps || [];
    job.gapBridgeNote = result.gapBridgeNote || '';
    job.transferableHighlights = result.transferableHighlights || [];
    job.timelineNotes = result.timelineNotes || [];
    job.omittedRoles = result.omittedRoles || [];
    job.bridgeRolesAdded = result.bridgeRolesAdded || [];
    job.tailoredByModel = result.tailoredByModel || '';
    job.detectedDomain = result.detectedDomain || '';
    job.lastActionDate = new Date().toISOString();
    console.log(`[Tailor] Job ${job.id} CV by ${job.tailoredByModel || 'unknown'}`);
    if (job.experienceGaps?.length) {
      console.log(`[Tailor] Experience gaps flagged: ${job.experienceGaps.join('; ')}`);
    }

    try {
      const coverResult = await generateCoverLetter(
        apiKeys,
        settings.profile,
        job.tailoredCv,
        job.title,
        job.company,
        job.description,
        combinedInstructions,
        job.isRecruiter,
        {
          experienceGaps: job.experienceGaps,
          gapBridgeNote: job.gapBridgeNote,
          transferableHighlights: job.transferableHighlights,
          suitabilityAssessment: job.suitabilityAssessment || ''
        }
      );
      job.coverLetter = coverResult.coverLetter;
      job.coverLetterByModel = coverResult.generatedByModel;
      console.log(`[Tailor] Job ${job.id} cover letter by ${job.coverLetterByModel}`);
    } catch (coverErr) {
      console.warn(`[Tailor] Cover letter generation failed: ${coverErr.message}`);
      job.coverLetter = result.coverLetter || job.coverLetter || '';
    }

    writeJobs(jobs);
    res.json(job);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/:id/cover-letter', async (req, res) => {
  console.log(`[Server] POST /api/jobs/${req.params.id}/cover-letter received.`);
  try {
    const settings = readSettings();
    const apiKeys = resolveApiKeys(settings);

    if (!apiKeys.geminiApiKey && !apiKeys.deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const jobSpecificInstructions = req.body?.customInstructions || job.customInstructions || '';
    
    // Combine global settings instructions with job-specific instructions
    const combinedInstructions = [
      settings.customInstructions,
      jobSpecificInstructions
    ].filter(Boolean).join('\n\n');

    const coverResult = await generateCoverLetter(
      apiKeys,
      settings.profile,
      job.tailoredCv || settings.profile,
      job.title,
      job.company,
      job.description,
      combinedInstructions,
      job.isRecruiter,
      {
        experienceGaps: job.experienceGaps || [],
        gapBridgeNote: job.gapBridgeNote || '',
        transferableHighlights: job.transferableHighlights || [],
        suitabilityAssessment: job.suitabilityAssessment || ''
      }
    );

    job.coverLetter = coverResult.coverLetter;
    job.coverLetterByModel = coverResult.generatedByModel;
    job.lastActionDate = new Date().toISOString();
    writeJobs(jobs);

    res.json({ success: true, coverLetter: coverResult.coverLetter, generatedByModel: coverResult.generatedByModel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// GROUP DISMISSAL / REJECTION COHORT ANALYSIS
// ----------------------------------------------------
app.post('/api/jobs/analyze-dismissals-group', async (req, res) => {
  console.log(`[Server] POST /api/jobs/analyze-dismissals-group received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const { ids } = req.body || {};
    const jobs = readJobs();
    
    let targetJobs = [];
    if (Array.isArray(ids) && ids.length > 0) {
      targetJobs = jobs.filter(j => ids.includes(j.id));
    } else {
      targetJobs = jobs.filter(j => j.status === 'Dismissed');
    }

    if (targetJobs.length === 0) {
      return res.status(400).json({ error: 'No jobs found to analyze. Please select at least one job or mark jobs as Dismissed.' });
    }

    const currentCustomInstructions = settings.customInstructions || '';
    const baseProfile = settings.profile || {};
    const formattedProfileExperience = (baseProfile.experience || []).map(exp => {
      return `Company: ${exp.company} | Role: ${exp.role} (${exp.period})
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
    }).join('\n\n');

    const formattedJobs = targetJobs.map((j, idx) => {
      const cv = j.tailoredCv || baseProfile;
      const cvExp = (cv.experience || []).map(exp => `- ${exp.company} (${exp.role}): ${(exp.bullets || []).slice(0, 3).join('; ')}`).join('\n');
      const prevAnalysis = j.dismissalAnalysis ? (typeof j.dismissalAnalysis === 'string' ? j.dismissalAnalysis : `What went wrong: ${j.dismissalAnalysis.whatWentWrong}`) : 'None';

      return `### Job ${idx + 1}: ${j.title} at ${j.company} (${j.location || 'Remote'})
- Job ID: ${j.id}
- Status: ${j.status}
- Suitability Assessment: ${j.suitabilityAssessment || 'N/A'} (Score: ${j.suitabilityScore || 'N/A'}/10)
- Key Tailoring Gaps Identified: ${(j.experienceGaps || []).join(', ') || 'None noted'}
- Job Description:
${(j.description || 'Not provided').slice(0, 900)}
- Tailored CV Details:
  - Title Used: ${cv.title || 'Not specified'}
  - Summary: ${cv.summary || 'Not specified'}
  - Highlights:
${cvExp}
- Individual Rejection Feedback: ${prevAnalysis}`;
    }).join('\n\n---------------------------------\n\n');

    const prompt = `
You are an expert Executive Tech Recruiter, Head of Talent, and ATS / Career Strategist.
We are analyzing a cohort of ${targetJobs.length} job applications for candidate Eugene Bochkov that resulted in dismissals/rejections or require cohort failure analysis.

**Candidate Base Profile:**
Name: ${baseProfile.name || 'Eugene Bochkov'}
Target Title: ${baseProfile.title || 'Senior Product Manager / Head of Product'}
Experience Overview:
${formattedProfileExperience}

**Current Global Custom Instructions for CV Tailoring:**
"${currentCustomInstructions}"

**Cohort of ${targetJobs.length} Applications Analyzed:**
${formattedJobs}

**Instructions:**
Perform a cross-application cohort diagnosis across these ${targetJobs.length} roles to identify systematic patterns, recurring friction points, and concrete improvements.

CRITICAL CONSTRAINTS:
1. STRICT FACTUALITY: Do NOT suggest fabricating or exaggerating metrics, roles, or skills not present in the candidate's actual background.
2. DISTINGUISH TAILORING GAPS VS DOMAIN GAPS:
   - Identify when the candidate actually HAS relevant background (e.g. Spenmo payments, Dirac AI LLMs/GPT-3, Vincere ATS workflows) but it was omitted or understated in tailoring.
   - Contrast this with genuine market/domain mismatches (e.g. niche automotive hardware).
3. ACTIONABLE PROMPT RECOMMENDATIONS: Formulate high-leverage rules to update the Global Custom Instructions so future applications convert better.

Output format MUST be valid JSON matching this exact schema:
{
  "executiveSummary": "A direct 2-3 sentence diagnosis summarizing why this cohort of applications was dismissed.",
  "analyzedCount": ${targetJobs.length},
  "commonThemes": [
    {
      "theme": "Descriptive title of recurring failure pattern (e.g., Generalist/Founder Framing vs. Deep Domain IC)",
      "explanation": "Brief explanation of how this affected these applications.",
      "severity": "High"
    }
  ],
  "profileGaps": [
    "Specific gap or positioning mismatch across the cohort #1",
    "Specific gap or positioning mismatch #2"
  ],
  "positiveSignals": [
    "Strong elements in the profile/applications that should be preserved"
  ],
  "recommendedStrategy": [
    "Immediate strategic action item for role targeting, outreach, or framing #1",
    "Immediate strategic action item #2"
  ],
  "actionablePromptChanges": "Specific bullet points for prompt additions to fix these issues in future CV tailors.",
  "suggestedRevisedInstructions": "The complete merged Global Custom Instructions text, combining all existing instructions with new rules."
}
`;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini first
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.3 
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Fallback to DeepSeek
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Group dismissal analysis failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let reply = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = resJson.choices?.[0]?.message?.content || '';
    }

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanJsonText(reply));
      if (!parsedAnalysis.executiveSummary) {
        throw new Error('Missing executiveSummary in response JSON.');
      }
    } catch (err) {
      console.warn('Failed to parse group dismissal analysis JSON, using fallback formatting.', err);
      parsedAnalysis = {
        executiveSummary: reply.slice(0, 300),
        analyzedCount: targetJobs.length,
        commonThemes: [
          { theme: 'Rejection Pattern Analysis', explanation: reply, severity: 'Medium' }
        ],
        profileGaps: ['Review individual job gaps'],
        positiveSignals: ['Strong foundational background'],
        recommendedStrategy: ['Refine role targeting and prompt rules'],
        actionablePromptChanges: 'Update custom instructions with specific role requirements.',
        suggestedRevisedInstructions: currentCustomInstructions
      };
    }

    const currentLen = currentCustomInstructions.trim().length;
    const currentTokens = Math.ceil(currentLen / 4);
    const revisedLen = (parsedAnalysis.suggestedRevisedInstructions || '').trim().length;
    const revisedTokens = Math.ceil(revisedLen / 4);
    const tokenDelta = revisedTokens - currentTokens;
    const tokenDeltaPct = currentTokens > 0 ? Math.round((tokenDelta / currentTokens) * 100) : (revisedTokens > 0 ? 100 : 0);

    const basePromptLen = (settings.cvSystemPrompt || '').length;
    const basePromptTokens = Math.ceil(basePromptLen / 4);
    const estTotalPerCall = basePromptTokens + revisedTokens + 800;

    parsedAnalysis.tokenMetrics = {
      currentPromptChars: currentLen,
      currentPromptTokens: currentTokens,
      revisedPromptChars: revisedLen,
      revisedPromptTokens: revisedTokens,
      tokenDelta,
      tokenDeltaPct,
      estTotalInputTokensPerCv: estTotalPerCall,
      estCostPerCvFlash: `$${((estTotalPerCall / 1000000) * 0.075).toFixed(6)}`,
      estCostPerCvDeepSeek: `$${((estTotalPerCall / 1000000) * 0.14).toFixed(6)}`
    };

    const payloadToSave = {
      groupAnalysis: parsedAnalysis,
      analyzedJobIds: targetJobs.map(j => j.id),
      savedAt: new Date().toISOString()
    };
    writeLatestAnalysis(payloadToSave);

    res.json({ success: true, count: targetJobs.length, groupAnalysis: parsedAnalysis, savedAt: payloadToSave.savedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/latest-dismissals-group', (req, res) => {
  try {
    const saved = readLatestAnalysis();
    if (!saved || !saved.groupAnalysis) {
      return res.json({ success: false, message: 'No prior group analysis saved.' });
    }
    res.json({ success: true, ...saved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/simulate-prompt-ab', async (req, res) => {
  console.log(`[Server] POST /api/jobs/simulate-prompt-ab received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const { jobId, proposedInstructions } = req.body || {};
    const jobs = readJobs();
    const job = jobs.find(j => j.id === jobId) || jobs[0];

    if (!job) {
      return res.status(404).json({ error: 'Job not found to simulate against.' });
    }

    const currentInstructions = settings.customInstructions || '';
    const proposed = proposedInstructions || currentInstructions;

    const currentTokens = Math.ceil(currentInstructions.length / 4);
    const proposedTokens = Math.ceil(proposed.length / 4);
    const deltaTokens = proposedTokens - currentTokens;

    const baseProfile = settings.profile || {};
    const formattedProfileExp = (baseProfile.experience || []).slice(0, 5).map(exp => {
      return `${exp.company} (${exp.role}): ${(exp.bullets || []).slice(0, 2).join('; ')}`;
    }).join('\n');

    const prompt = `
You are an expert ATS & CV Optimization Simulator.
We are running an A/B Test simulation comparing two different sets of Custom Tailoring Instructions for candidate Eugene Bochkov on this target job.

**Target Job:**
Title: ${job.title}
Company: ${job.company}
Job Description Snippet: ${(job.description || '').slice(0, 1000)}

**Candidate Profile Excerpt:**
${formattedProfileExp}

**Version A (Current Instructions):**
"${currentInstructions}"

**Version B (Proposed Revised Instructions):**
"${proposed}"

**Task:**
Generate a side-by-side comparison of the key tailored elements produced under Version A vs Version B for this specific job.
Return ONLY valid JSON matching this schema exactly:
{
  "versionA": {
    "title": "Professional Title tailored under Version A",
    "summary": "2-sentence Summary tailored under Version A",
    "leadHighlights": ["STAR bullet highlight 1", "STAR bullet highlight 2"]
  },
  "versionB": {
    "title": "Professional Title tailored under Version B",
    "summary": "2-sentence Summary tailored under Version B",
    "leadHighlights": ["STAR bullet highlight 1", "STAR bullet highlight 2"]
  },
  "keyDifferences": "A concise 2-sentence explanation of what changed in Version B to address rejection gaps compared to Version A."
}
`;

    let response;
    let success = false;
    let errorMessages = [];

    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
          })
        });
        if (response.ok) success = true;
        else errorMessages.push(await response.text());
      } catch (e) {
        errorMessages.push(e.message);
      }
    }

    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepSeekApiKey}` },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
          })
        });
        if (response.ok) success = true;
        else errorMessages.push(await response.text());
      } catch (e) {
        errorMessages.push(e.message);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Simulation failed: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let reply = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = resJson.choices?.[0]?.message?.content || '';
    }

    let parsedSim;
    try {
      parsedSim = JSON.parse(cleanJsonText(reply));
    } catch (err) {
      parsedSim = {
        versionA: { title: job.title, summary: 'Version A standard summary', leadHighlights: [] },
        versionB: { title: job.title, summary: 'Version B revised summary', leadHighlights: [] },
        keyDifferences: reply
      };
    }

    res.json({
      success: true,
      job: { id: job.id, title: job.title, company: job.company },
      tokenMetrics: {
        currentTokens,
        proposedTokens,
        deltaTokens,
        deltaTokensPct: currentTokens > 0 ? Math.round((deltaTokens / currentTokens) * 100) : 100,
        estCostPerCv: `$${(((proposedTokens + 800) / 1000000) * 0.075).toFixed(6)}`
      },
      simulation: parsedSim
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/:id/prompt-preview', (req, res) => {
  try {
    const settings = readSettings();
    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const baseProfile = settings.profile || {};
    const jobSpecificInstructions = job.customInstructions || '';
    const combinedInstructions = [
      settings.customInstructions,
      jobSpecificInstructions,
      job.suitabilityAssessment ? `**Suitability Assessment (Use this to guide alignment and address gaps):**\n${job.suitabilityAssessment}` : ''
    ].filter(Boolean).join('\n\n');

    const tailorObj = buildTailorPrompt(
      baseProfile,
      job.description || '',
      job.title || '',
      job.company || '',
      combinedInstructions,
      settings.cvSystemPrompt || DEFAULT_SYSTEM_PROMPT,
      job.isRecruiter
    );

    const coverObj = buildCoverLetterPrompt(
      baseProfile,
      job.description || '',
      job.title || '',
      job.company || '',
      combinedInstructions,
      job.tailoredCv || baseProfile,
      {
        experienceGaps: job.experienceGaps,
        gapBridgeNote: job.gapBridgeNote,
        transferableHighlights: job.transferableHighlights,
        suitabilityAssessment: job.suitabilityAssessment
      },
      job.isRecruiter
    );

    const calcTokens = (text) => {
      const chars = (text || '').length;
      const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
      const tokens = Math.ceil(chars / 4);
      const estCostFlash = ((tokens / 1000000) * 0.075).toFixed(6);
      const estCostDeepSeek = ((tokens / 1000000) * 0.14).toFixed(6);
      return { chars, words, tokens, estCostFlash: `$${estCostFlash}`, estCostDeepSeek: `$${estCostDeepSeek}` };
    };

    const cvMetrics = calcTokens(tailorObj.prompt);
    const coverMetrics = calcTokens(coverObj.prompt);

    res.json({
      success: true,
      job: { id: job.id, title: job.title, company: job.company },
      detectedDomain: tailorObj.detectedDomain,
      components: {
        systemTemplateTokens: Math.ceil((settings.cvSystemPrompt || DEFAULT_SYSTEM_PROMPT).length / 4),
        candidateProfileTokens: Math.ceil((tailorObj.formattedExp || '').length / 4),
        jobDescriptionTokens: Math.ceil((tailorObj.formattedJd || '').length / 4),
        customInstructionsTokens: Math.ceil((tailorObj.finalInstructions || '').length / 4)
      },
      prompts: {
        cvTailoring: {
          name: 'CV Tailoring Engine Prompt (System + Experience + JD)',
          prompt: tailorObj.prompt,
          metrics: cvMetrics
        },
        coverLetter: {
          name: 'Cover Letter Engine Prompt',
          prompt: coverObj.prompt,
          metrics: coverMetrics
        }
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/:id/analyze-dismissal', async (req, res) => {
  console.log(`[Server] POST /api/jobs/${req.params.id}/analyze-dismissal received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Use tailored CV if present; fallback to base profile if not tailored
    const cv = job.tailoredCv || settings.profile;

    const formattedExperience = (cv.experience || []).map(exp => {
      return `Company: ${exp.company}
Role: ${exp.role}
Period: ${exp.period}
Location: ${exp.location || 'Remote'}
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
    }).join('\n\n');

    const prompt = `
You are an expert recruitment consultant, ATS optimization specialist, and career coach.
Analyze why the candidate's application was dismissed/rejected for the target job by comparing the submitted CV details against the target Job Description (JD).

**Job Details:**
Company: ${job.company}
Title: ${job.title}
Job Description:
${job.description || 'Not provided'}

**Submitted CV Details:**
Name: ${cv.name || 'Not set'}
Professional Title: ${cv.title || 'Not set'}
Summary: ${cv.summary || 'Not set'}
Work Experience:
${formattedExperience || 'No experience bullets set'}

 **Instructions:**
    Compare the candidate's CV details against the target Job Description (JD). Output a JSON object with two fields.
    Be extremely brief, concise, and direct. Keep the total word count under 150 words.
    
    CRITICAL CONSTRAINTS:
    - STRICT COMPLIANCE: Do NOT suggest inventing or inflating any metrics, roles, or achievements (e.g. do NOT suggest claiming 100k users if not explicitly in the CV). Every recommendation must be strictly factual based only on the candidate's CV.
    - RELEVANT FACT RETRIEVAL: Carefully check the candidate's experience (e.g. Spenmo, Paymentwall). If they have actual relevant experience (like payments) that matches the JD but was not highlighted in their tailored application, call it out as a gap in the tailoring execution and suggest prompt rules to highlight it next time.

    1. "whatWentWrong": A highly concise, brief summary (at most 3 short bullet points) of the main rejection reasons/gaps and factual improvement suggestions.
    2. "recommendedPromptChanges": 1 or 2 specific, very brief guidelines/rules to add to the custom instructions for future CV tailoring.

    Output format must be valid JSON matching this schema:
    {
      "whatWentWrong": "String containing brief bullet points and improvement suggestions",
      "recommendedPromptChanges": "String containing 1 or 2 short prompt additions"
    }
    `;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini first
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.3 
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Fallback to DeepSeek
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Dismissal analysis failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let reply = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = resJson.choices?.[0]?.message?.content || '';
    }

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(cleanJsonText(reply));
      if (!parsedAnalysis.whatWentWrong || !parsedAnalysis.recommendedPromptChanges) {
        throw new Error('Missing key properties in response JSON.');
      }
    } catch (err) {
      console.warn('Failed to parse dismissal analysis JSON, using fallback formatting.', err);
      parsedAnalysis = {
        whatWentWrong: reply,
        recommendedPromptChanges: "Review and refine your custom instructions manually in Settings."
      };
    }

    job.dismissalAnalysis = parsedAnalysis;
    job.lastActionDate = new Date().toISOString();
    writeJobs(jobs);

    res.json({ success: true, dismissalAnalysis: parsedAnalysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/:id/suggest-prompt-revision', async (req, res) => {
  console.log(`[Server] POST /api/jobs/${req.params.id}/suggest-prompt-revision received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const currentCustomInstructions = settings.customInstructions || '';
    const dismissalAnalysis = job.dismissalAnalysis;
    
    if (!dismissalAnalysis) {
      return res.status(400).json({ error: 'Please run rejection analysis first.' });
    }

    const analysisText = typeof dismissalAnalysis === 'string' 
      ? dismissalAnalysis 
      : `What Went Wrong:\n${dismissalAnalysis.whatWentWrong}\n\nRecommended Adjustments:\n${dismissalAnalysis.recommendedPromptChanges}`;

    const prompt = `
You are an expert AI prompt engineer and recruiter.
We are tailoring a CV for a candidate named Eugene Bochkov.
The candidate was recently rejected/dismissed for this job:
- Company: ${job.company}
- Title: ${job.title}
- Job Description:
${job.description || 'Not provided'}

Rejection Analysis feedback for this job:
${analysisText}

Currently, we tailor the CV using these Global Custom Instructions:
"${currentCustomInstructions}"

Your task is to review the current Global Custom Instructions and the rejection feedback, and suggest a revised version of the Global Custom Instructions. We want to update the instructions to prevent similar rejection reasons in future CV generations (e.g. framing generalist/founder roles as strategic/scale leadership for Principal roles, translating niche domains like Web3 into B2B SaaS terms if needed).

Keep all existing instructions and rules that are still valid, and integrate the new recommendations seamlessly, concisely, and cleanly. 

Output format must be a valid JSON object matching this schema exactly:
{
  "explanation": "A concise explanation (1-2 sentences) of what improvements/rules were added to the custom instructions to address the rejection reasons.",
  "revisedCustomInstructions": "The complete new text for the Global Custom Instructions, incorporating all existing instructions plus the new rules."
}
`;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini first
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              responseMimeType: "application/json",
              temperature: 0.3 
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Fallback to DeepSeek
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Prompt revision suggestion failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let reply = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = resJson.choices?.[0]?.message?.content || '';
    }

    let parsedRevision;
    try {
      parsedRevision = JSON.parse(cleanJsonText(reply));
      if (!parsedRevision.explanation || !parsedRevision.revisedCustomInstructions) {
        throw new Error('Missing key properties in response JSON.');
      }
    } catch (err) {
      console.warn('Failed to parse prompt revision JSON, using fallback formatting.', err);
      parsedRevision = {
        explanation: "Could not automatically merge recommendations. Please review guidelines manually.",
        revisedCustomInstructions: currentCustomInstructions + "\n\n# Suggested Rejection Fixes:\n" + (dismissalAnalysis.recommendedPromptChanges || '')
      };
    }

    res.json({ 
      success: true, 
      explanation: parsedRevision.explanation,
      originalCustomInstructions: currentCustomInstructions,
      revisedCustomInstructions: parsedRevision.revisedCustomInstructions
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// JOB ASSISTANT CHAT ENDPOINT
// ----------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    const apiKeys = { geminiApiKey, deepSeekApiKey };

    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const { jobTitle, companyName, jobDescription, messages, suitabilityAssessment, isRecruiter } = req.body;
    if (!jobTitle || !companyName || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const profile = settings.profile || {};
    let recruiterPromptPart = '';
    if (isRecruiter) {
      recruiterPromptPart = `\n**SPECIAL CONTEXT: RECRUITER POSTING**
This job is listed by a recruitment agency (${companyName}), not the actual hiring company. The actual hiring company's identity is currently unknown.
- Therefore, do NOT assume the candidate wants to work for the recruitment agency itself (e.g. ${companyName}).
- Do NOT refer to joining the agency's teams, mission, or office.
- If drafting introduction/invite messages to recruiters, frame it as inquiring about their client's role or connecting for roles matching the candidate's background. Refer to the hiring company generically as 'your client' or 'the client company'.\n`;
    }

    const systemPrompt = `You are a helpful executive recruitment assistant and AI career coach assisting ${profile.name || 'the candidate'}.
You have access to their CV/profile and target job details.

**Candidate Profile:**
Name: ${profile.name || ''}
Title: ${profile.title || ''}
Base CV Summary: ${profile.summary || ''}
Base Visa/Work Status: ${profile.visa || ''}
Base Work Experience:
${JSON.stringify(profile.experience || [], null, 2)}

**Target Job Details:**
Job Title: ${jobTitle}
Company: ${companyName}
Job Description:
${jobDescription || ''}
${suitabilityAssessment ? `\n**Pre-Pipeline Suitability Assessment (Use this match context to answer questions about relevance and fit):**\n${suitabilityAssessment}\n` : ''}${recruiterPromptPart}

**Instructions:**
- Help the candidate by answering questions about the company/role, explaining why they might be a good fit, or drafting custom messages/response copy for job applications (like "Why are you interested?", "Top Choice" messages, or responses to application questions).
- Strictly maintain a professional, confident, and high-impact tone. Avoid corporate clichés, generic AI fluff, and robotic phrasing.
- If drafting text for the candidate, write it in first-person (using "I", "my") so they can copy-paste it directly. Keep it concise, punchy, and customized to both their experience and this job.
- Do not make up facts; align strictly with the candidate's real experience.
- If the candidate asks whether the job is relevant, suitable, or how they fit ("is this job relevant to me?", "how is the match?", "relevance", etc.), you MUST answer extremely concisely, directly, and objectively. Avoid generic intro templates like 'Yes, this role is highly relevant to you. Here's why:' or conversational fluff. Get straight to the key alignments and gaps/mismatches in 2-3 short bullet points.
`;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        
        // Map history to Gemini format (role must be 'user' or 'model')
        const contents = messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.3
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Try DeepSeek fallback
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        const deepSeekMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }))
        ];

        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: deepSeekMessages,
            temperature: 0.3
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Chat failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let reply = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      reply = resJson.choices?.[0]?.message?.content || '';
    }

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function isLinkedInFeedPollutedDescription(text = '') {
  const t = String(text).trim();
  if (!t) return true;

  const feedMarkers = [
    /how promoted jobs are ranked/i,
    /are these results helpful/i,
    /99\+ results/i,
    /skip to main content/i,
    /linkedin corporation ©/i,
    /get job alerts for this search/i,
    /ai-powered search is in beta/i,
    /get the linkedin app/i
  ];
  const markerHits = feedMarkers.filter((r) => r.test(t)).length;
  if (markerHits >= 2) return true;
  if (markerHits >= 1 && !/about the job/i.test(t) && t.length > 1500) return true;

  const easyApplyCount = (t.match(/easy apply/gi) || []).length;
  if (easyApplyCount >= 4 && !/about the job/i.test(t)) return true;

  return false;
}

function sanitizeJobDescriptionForAssessment(desc = '', title = '') {
  let text = String(desc || '').trim();
  if (!text) return text;

  const aboutIdx = text.search(/about the job/i);
  if (aboutIdx >= 0) {
    text = text.slice(aboutIdx);
  } else if (
    /how promoted jobs are ranked|99\+ results|skip to main content|ai-powered search is in beta/i.test(text) &&
    title
  ) {
    const titleEsc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idx = text.search(new RegExp(titleEsc, 'i'));
    if (idx >= 0) {
      const slice = text.slice(idx);
      const aboutInSlice = slice.search(/about the job/i);
      text = aboutInSlice >= 0 ? slice.slice(aboutInSlice) : slice;
    }
  }

  const footerIdx = text.search(
    /\n(?:About\n|Accessibility\n|Help Center\n|Privacy & Terms\n|LinkedIn Corporation)/i
  );
  if (footerIdx > 100) text = text.slice(0, footerIdx);

  if (isLinkedInFeedPollutedDescription(text)) return '';

  return text.slice(0, 12000);
}

function isCoreProductRoleTitle(title = '') {
  const t = String(title).toLowerCase().trim();
  if (!t.includes('product')) return false;
  const blockers = ['project manager', 'program manager', 'product marketing', 'product designer', 'product engineer'];
  if (blockers.some((b) => t.includes(b))) return false;
  return /product\s*(manager|lead|director|head|owner|principal)|head of product|vp product|chief product/.test(t);
}

function adjustSuitabilityScore({
  score = 5,
  jobTitle = '',
  companyName = '',
  jobDescription = '',
  profile = {}
} = {}) {
  let adjusted = Number(score) || 5;
  const title = String(jobTitle).toLowerCase();
  const company = String(companyName).toLowerCase();
  const desc = String(jobDescription).toLowerCase();
  const combined = `${title} ${company} ${desc}`;
  const profileBlob = JSON.stringify(profile).toLowerCase();

  const candidateFintech =
    /fintech|payments?|stablecoin|crypto|lending|credit|baas|financial infrastructure|yield|vault|paymentwall|spenmo|digital asset|exchange/.test(
      profileBlob
    );

  const sweetSpotJd =
    /pricing|payments?|monetization|billing|subscription|lending|credit|stablecoin|crypto|digital asset|exchange|treasury|fx|fintech|financial infrastructure|token|wallet/.test(
      combined
    );

  const isProduct = isCoreProductRoleTitle(jobTitle);

  if (isProduct && sweetSpotJd && candidateFintech) {
    adjusted = Math.max(adjusted, 7);
  }

  if (isProduct && /pricing/.test(title) && candidateFintech) {
    adjusted = Math.max(adjusted, 8);
  }

  if (/osl/.test(company) && isProduct) {
    adjusted = Math.max(adjusted, 8);
  }

  // Hard caps — ERP / insurance only
  const erpJd =
    /general ledger|\bgl\b|oracle erp|sap erp|anaplan|tm1|workday financial|finance systems|erp product|budgeting system/.test(
      combined
    );
  const hasFinanceFoundation =
    /kpmg|finance controller|audit|financial control/.test(profileBlob) &&
    /payments?|lending|credit|fintech/.test(profileBlob);

  if (erpJd && !hasFinanceFoundation) {
    adjusted = Math.min(adjusted, 4);
  } else if (erpJd) {
    adjusted = Math.min(adjusted, 5);
  }

  return Math.min(10, Math.max(1, Math.round(adjusted)));
}

// ----------------------------------------------------
// PRE-PIPELINE SUITABILITY ASSESSMENT (ASSESS MATCH)
// ----------------------------------------------------
app.post('/api/jobs/assess-match', async (req, res) => {
  console.log(`[Server] POST /api/jobs/assess-match received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const { jobTitle, companyName, jobDescription, isRecruiter } = req.body;
    if (!jobTitle || !companyName) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const cv = settings.profile || {};
    const cleanDescription = sanitizeJobDescriptionForAssessment(jobDescription, jobTitle);
    
    const formattedExperience = (cv.experience || []).map(exp => {
      return `Company: ${exp.company}
Role: ${exp.role}
Period: ${exp.period}
Location: ${exp.location || 'Remote'}
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
    }).join('\n\n');

    let recruiterPromptPart = '';
    if (isRecruiter) {
      recruiterPromptPart = `\nNote: This job is listed by a recruitment agency (${companyName}) for an unknown client. Do not evaluate interest in the agency itself, but rather candidate's fit for the role requirements.\n`;
    }

    const prompt = `You are an expert recruitment consultant, ATS optimization specialist, and career coach.
Analyze how the candidate's CV matches the target job description before they save it to their pipeline.
Assess the match suitability objectively and concisely based ONLY on the candidate's actual CV details. Do not make up any facts.
${recruiterPromptPart}
**Job Details:**
Company: ${companyName}
Title: ${jobTitle}
Job Description:
${cleanDescription || 'Not provided'}

**Candidate CV Details:**
Name: ${cv.name || 'Not set'}
Professional Title: ${cv.title || 'Not set'}
Summary: ${cv.summary || 'Not set'}
Work Experience:
${formattedExperience || 'No experience bullets set'}

**Instructions:**
1. Assess the match suitability objectively and concisely based ONLY on the candidate's actual CV details. Do not make up any facts.
2. Outline key alignments and gaps/mismatches in 2-3 short, direct bullet points (keep the total explanation under 100 words, no polite preambles or introductory phrases).
3. Assign a numeric relevance/suitability score between 1 and 10, using the full scale:
   - 10: Perfect match (perfect alignment on requirements, domain, and seniority).
   - 9: Excellent match (very minor gaps, extremely strong fit).
   - 7-8: Strong match (highly aligned on core skills, minor gaps in domain or secondary tools).
   - 5-6: Moderate match (some transferable PM skills, but significant domain/technical gaps or different industry focus).
   - 3-4: Low match (very few overlapping skills, major industry mismatch).
   - 1-2: Irrelevant (entirely unrelated field, e.g. medical, civil engineering, or hardware where the candidate lacks relevant background).
4. **Hard domain caps (apply strictly):**
   - Enterprise finance systems / ERP product ownership (GL, budgeting, Oracle, Anaplan, TM1): **max 5** if CV shows KPMG/audit/finance-control background plus payments or lending product leadership — still cap at **4** if no finance-side career foundation. **max 3** only if neither finance background nor relevant product work.
   - Owning GL/ERP as a **product manager** (not auditor/controller) is still the main gap — say so clearly.
   - Insurance / GAP / warranty / automotive finance product roles: **max 4** unless CV shows that domain.
5. **Boost (when CV supports it — do not under-score these):**
   - Product Manager/Lead/Director + **pricing, payments, monetization, billing, subscriptions, lending, credit, crypto, stablecoin, digital assets, or exchange**: **minimum 7** if CV shows fintech/payments product leadership (stablecoin, payments platforms, BaaS, lending, yield/pricing architecture).
   - **OSL** or regulated crypto/digital-asset companies: stablecoin + payments infrastructure = strong fit for pricing product roles — **minimum 8**.
   - Do NOT penalize for lacking retail/telco domain when the role is product leadership in pricing/monetization and CV shows financial product building.

**Output Format:**
You must return a single JSON object matching this structure exactly (do not output the placeholder angle brackets, replace with actual evaluated value):
{
  "score": <score_integer>, // Evaluated score integer between 1 and 10 based on rules above
  "explanation": "String (the bulleted explanation)"
}
`;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini first if key is available
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Try DeepSeek fallback
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Assessment failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let rawText = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      rawText = resJson.choices?.[0]?.message?.content || '';
    }

    let parsed = { score: 5, explanation: rawText };
    try {
      let cleanedText = rawText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      }
      const data = JSON.parse(cleanedText);
      if (data && typeof data === 'object') {
        parsed.score = typeof data.score === 'number' ? data.score : parseInt(data.score, 10) || 5;
        parsed.explanation = data.explanation || rawText;
      }
    } catch (e) {
      console.warn('[Server] Failed to parse suitability assessment response as JSON:', e.message);
    }

    const finalScore = adjustSuitabilityScore({
      score: parsed.score,
      jobTitle,
      companyName,
      jobDescription: cleanDescription,
      profile: cv
    });

    res.json({ success: true, score: finalScore, explanation: parsed.explanation.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// SUGGEST ANSWER TO CUSTOM APPLICATION QUESTION
// ----------------------------------------------------
app.post('/api/jobs/suggest-answer', async (req, res) => {
  console.log(`[Server] POST /api/jobs/suggest-answer received.`);
  try {
    const settings = readSettings();
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    
    if (!geminiApiKey && !deepSeekApiKey) {
      return res.status(400).json({ error: 'Please set your API key in Settings first.' });
    }

    const { jobTitle, companyName, jobDescription, question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Missing required parameter: question.' });
    }

    const cv = settings.profile || {};
    const formattedExperience = (cv.experience || []).map(exp => {
      return `Company: ${exp.company}
Role: ${exp.role}
Period: ${exp.period}
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
    }).join('\n\n');

    const prompt = `You are helping a candidate named Eugene Bochkov apply for a job.
We need to answer a custom application question honestly and professionally based ONLY on the candidate's CV. Do not invent details.

**Candidate Profile:**
Name: ${cv.name || 'Eugene Bochkov'}
Professional Title: ${cv.title || ''}
Summary: ${cv.summary || ''}
Visa Status: ${cv.visa || ''}
Work Experience:
${formattedExperience}

**Job Details:**
Title: ${jobTitle || 'Job Opportunity'}
Company: ${companyName || 'Unknown'}
Job Description:
${jobDescription || 'Not provided'}

**Application Question to Answer:**
"${question}"

**Instructions:**
1. Formulate a short, direct, and honest answer to the question.
2. If the question asks for a number (e.g. "How many years of experience do you have in X?"), count/estimate based only on the candidate's CV and return a clear number (or brief text like "5 years").
3. If the question is yes/no, clearly state "Yes" or "No" and (if appropriate) add a brief explanation.
4. Keep the answer extremely brief (maximum 2 sentences, or just a few words if simple).
5. Output format must be a JSON object:
{
  "answer": "The generated answer text"
}
`;

    let response;
    let success = false;
    let errorMessages = [];

    // Try Gemini
    if (geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`Gemini Error: ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`Gemini Connection Error: ${e.message}`);
      }
    }

    // Try DeepSeek fallback
    if (!success && deepSeekApiKey) {
      try {
        const url = `https://api.deepseek.com/chat/completions`;
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepSeekApiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        if (response.ok) {
          success = true;
        } else {
          const errText = await response.text();
          errorMessages.push(`DeepSeek Error: ${errText}`);
        }
      } catch (e) {
        errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
      }
    }

    if (!success) {
      return res.status(500).json({ error: `Suggest answer failed. Errors: ${errorMessages.join(' | ')}` });
    }

    const resJson = await response.json();
    let rawText = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      rawText = resJson.choices?.[0]?.message?.content || '';
    }

    let parsed = { answer: rawText };
    try {
      let cleanedText = rawText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      }
      const data = JSON.parse(cleanedText);
      if (data && typeof data === 'object' && data.answer) {
        parsed.answer = data.answer;
      }
    } catch (e) {
      console.warn('[Server] Failed to parse suggested answer response as JSON:', e.message);
    }

    res.json({ success: true, answer: parsed.answer.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// BULK ACTION ENDPOINTS
app.post('/api/jobs/bulk-status', (req, res) => {
  try {
    const { ids = [], status = '' } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ error: 'ids array and status string required.' });
    }
    const jobs = readJobs();
    let updatedCount = 0;
    const now = new Date().toISOString();
    jobs.forEach(j => {
      if (ids.includes(j.id)) {
        j.status = status;
        j.lastActionDate = now;
        updatedCount++;
      }
    });
    writeJobs(jobs);
    console.log(`[Server] Bulk updated status to "${status}" for ${updatedCount} jobs.`);
    res.json({ success: true, updatedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/bulk-delete', (req, res) => {
  try {
    const { ids = [] } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }
    const jobs = readJobs();
    const filtered = jobs.filter(j => !ids.includes(j.id));
    const deletedCount = jobs.length - filtered.length;
    writeJobs(filtered);
    console.log(`[Server] Bulk deleted ${deletedCount} jobs.`);
    res.json({ success: true, deletedCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------

// EXPORT CV TO PDF
// ----------------------------------------------------
// ----------------------------------------------------
// CUSTOM PDF SCHEMA DOWNLOAD
// ----------------------------------------------------
app.get('/api/custom-pdf/schema', async (req, res) => {
  try {
    const schemaPath = path.resolve(__dirname, 'scripts', 'cv_schema.json');
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(schemaPath);
  } catch (e) {
    console.error('Schema download error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// EXPORT CV TO PDF (updated to accept JSON data)
// ----------------------------------------------------
app.post('/api/custom-pdf', upload.single('json'), async (req, res) => {
  try {
    let cvData;
    // If a file is uploaded via multipart/form-data
    if (req.file) {
      const content = req.file.buffer.toString('utf8');
      cvData = JSON.parse(content);
    } else {
      // Fallback to JSON body
      cvData = req.body;
    }
    console.log('Received custom CV data:', JSON.stringify(cvData, null, 2));
    if (!cvData || typeof cvData !== 'object') {
      return res.status(400).json({ error: 'Invalid CV data provided.' });
    }
    const timestamp = Date.now();
    const fileName = `Custom_CV_${timestamp}.pdf`;
    const outputPath = path.join(getDataDir(), 'generated', fileName);
    await generatePdf(cvData, outputPath);
    const pdfUrl = `/data/generated/${fileName}`;
    res.json({ pdfUrl });
  } catch (e) {
    console.error('Custom PDF generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// EXPORT CV TO PDF
// ----------------------------------------------------
app.post('/api/jobs/:id/pdf', async (req, res) => {
  console.log(`[Server] POST /api/jobs/${req.params.id}/pdf received.`);
  try {
    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job || !job.tailoredCv) {
      return res.status(404).json({ error: 'Tailored CV data not found. Please run tailoring first.' });
    }

    const settings = readSettings();
    const cleanCompany = (job.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
    const outputPath = path.join(getDataDir(), 'generated', fileName);

    console.log('Generating PDF using premium HTML template cv_template.html...');
    await generatePdf(job.tailoredCv, outputPath);
    
    // Update job with local URL link
    job.pdfPath = `/data/generated/${fileName}`;
    writeJobs(jobs);

    res.json({ pdfUrl: job.pdfPath, docxUrl: null });
  } catch (e) {
    console.error('PDF Generation Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------
// AUTO APPLY (SSE Streaming Logs)
// ----------------------------------------------------
app.post('/api/jobs/:id/apply', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const log = (msg) => {
    console.log(`[Apply] ${msg}`);
    res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
  };

  try {
    const settings = readSettings();
    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    
    if (!job) {
      log('Error: Job not found.');
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    if (!job.tailoredCv || !job.pdfPath) {
      log('Error: Tailored CV and printed PDF are required before applying.');
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    const absolutePdfPath = path.join(__dirname, job.pdfPath);
    const coverLetter = job.coverLetter || '';

    log('Starting Playwright auto-apply sequence...');
    
    // Run Playwright apply (launches headed browser and pauses on finish)
    await runApply(job.url, settings.profile, coverLetter, absolutePdfPath, log);

    // Update job status to Applied
    job.status = 'Applied';
    job.lastActionDate = new Date().toISOString();
    writeJobs(jobs);
    pushJobToCrm(job);
    autoCreateContactFromJob(job);

    log('Playwright application process closed.');
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (e) {
    log(`Application error: ${e.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    res.end();
  }
});

// Route to serve Chrome Extension ZIP package
app.get('/api/extension/download', (req, res) => {
  const zipPath = path.join(__dirname, 'dist/chrome-extension.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, '100x-job-copilot-extension.zip');
  } else {
    import('./scripts/package-extension.js').then(({ packageExtension }) => {
      const generatedZip = packageExtension();
      if (generatedZip && fs.existsSync(generatedZip)) {
        res.download(generatedZip, '100x-job-copilot-extension.zip');
      } else {
        res.status(404).json({ error: 'Extension zip package not found. Run npm run build first.' });
      }
    }).catch(err => {
      res.status(500).json({ error: err.message });
    });
  }
});

app.get('/chrome-extension.zip', (req, res) => {
  res.redirect('/api/extension/download');
});

// Route for Chrome Extension backup state (queue & pending invites)
app.get('/api/extension/state', (req, res) => {
  const state = safeReadJson(getExtensionStatePath(), {});
  res.json({ success: true, state });
});

app.post('/api/extension/state', (req, res) => {
  const currentState = safeReadJson(getExtensionStatePath(), {});
  const newState = { ...currentState, ...req.body, updatedAt: new Date().toISOString() };
  safeWriteJson(getExtensionStatePath(), newState);
  res.json({ success: true, state: newState });
});

// Route to serve the default CV
app.get('/Eugene_Bochkov_CV.pdf', (req, res) => {
  const cvPath = path.join(__dirname, 'Eugene_Bochkov_CV.pdf');
  if (fs.existsSync(cvPath)) {
    res.sendFile(cvPath);
  } else {
    res.status(404).send('Default CV not found');
  }
});

// Fallback route for SPA client-side routing
if (fs.existsSync(indexHtmlPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/data')) {
      return next();
    }
    res.sendFile(indexHtmlPath, (err) => {
      if (err) next(err);
    });
  });
} else {
  console.warn(`[Server] Dashboard not built — run "npm run build" (missing ${indexHtmlPath})`);
}

app.listen(PORT, () => {
  console.log(`100x job Server running on http://localhost:${PORT}`);
});
