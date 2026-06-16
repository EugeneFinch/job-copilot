// Dev Server Reload Trigger
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { runScraper, scrapeJobUrl } from './scripts/scraper.js';
import multer from 'multer';
import { tailorCvAndLetter, DEFAULT_SYSTEM_PROMPT } from './scripts/tailor.js';
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

// Serve static generated files
app.use('/data/generated', express.static(path.join(__dirname, 'data/generated')));

const SETTINGS_PATH = path.join(__dirname, 'data/settings.json');
const JOBS_PATH = path.join(__dirname, 'data/jobs.json');
const CONTACTS_PATH = path.join(__dirname, 'data/contacts.json');

// Ensure database files exist
function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readContacts() {
  ensureDataDir();
  if (!fs.existsSync(CONTACTS_PATH)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeContacts(data) {
  ensureDataDir();
  fs.writeFileSync(CONTACTS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function autoCreateContactFromJob(job) {
  if (!job.hiringManager) return;
  const contacts = readContacts();
  const rawManager = job.hiringManager.trim();
  const company = job.company ? job.company.trim() : '';
  
  // Clean name and URL
  let profileUrl = '';
  let name = rawManager;
  if (rawManager.startsWith('http')) {
    profileUrl = rawManager;
    const match = rawManager.match(/\/in\/([^\/?#\s]+)/);
    if (match && match[1]) {
      name = match[1].replace(/[-_]/g, ' ');
      name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      name = `${company} Hiring Manager`;
    }
  }

  const nameParts = name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Check if a contact with this company and profileUrl (or name) already exists
  const exists = contacts.find(c => {
    const sameCompany = String(c.company || '').toLowerCase() === company.toLowerCase();
    const sameUrl = profileUrl && c.profileUrl && String(c.profileUrl || '').toLowerCase() === profileUrl.toLowerCase();
    const sameName = String(c.firstName || '').toLowerCase() === firstName.toLowerCase() && String(c.lastName || '').toLowerCase() === lastName.toLowerCase();
    return sameCompany && (sameUrl || sameName);
  });

  if (!exists) {
    const newContact = {
      id: Math.random().toString(36).substring(2, 11),
      firstName,
      lastName,
      company,
      profileUrl,
      threadUrl: '',
      lastOutboundDate: new Date().toISOString(),
      lastOutboundSnippet: job.hiringManagerIntro || '',
      lastInboundDate: '',
      lastInboundSnippet: '',
      followUpNeeded: true,
      status: 'To Contact',
      notes: `Auto-created from job: ${job.title}. AI Outreach Message: ${job.hiringManagerIntro || 'none'}`,
      updatedAt: new Date().toISOString()
    };
    contacts.push(newContact);
    writeContacts(contacts);
    console.log(`[CRM] Auto-created contact ${name} for ${company}`);
  }
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
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { 
      geminiApiKey: '', 
      deepSeekApiKey: '', 
      targetKeywords: [], 
      targetLocations: [], 
      excludeCompanies: [], 
      profile: {},
      cvSystemPrompt: DEFAULT_SYSTEM_PROMPT
    };
  }
  const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  
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
    geminiApiKey,
    deepSeekApiKey,
    excludeCompanies: [],
    targetKeywords: [],
    targetLocations: [],
    profile: {},
    cvSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    ...data,
    geminiApiKey,
    deepSeekApiKey
  };

  if (migrated) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updatedSettings, null, 2), 'utf8');
  }

  return updatedSettings;
}

function writeSettings(data) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readJobs() {
  ensureDataDir();
  if (!fs.existsSync(JOBS_PATH)) {
    return [];
  }
  const jobs = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf8'));
  let modified = false;
  const migratedJobs = jobs.map(j => {
    if (!j.source) {
      j.source = 'Auto Search';
      modified = true;
    }
    return j;
  });
  if (modified) {
    fs.writeFileSync(JOBS_PATH, JSON.stringify(migratedJobs, null, 2), 'utf8');
  }
  return migratedJobs;
}

function writeJobs(data) {
  ensureDataDir();
  fs.writeFileSync(JOBS_PATH, JSON.stringify(data, null, 2), 'utf8');
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
    res.json(readContacts());
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
    const newContact = { 
      id: Math.random().toString(36).substring(2, 11),
      firstName: '',
      lastName: '',
      company: '',
      profileUrl: '',
      threadUrl: '',
      lastOutboundDate: '',
      lastOutboundSnippet: '',
      lastInboundDate: '',
      lastInboundSnippet: '',
      followUpNeeded: false,
      status: 'To Contact',
      notes: '',
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    contacts.push(newContact);
    writeContacts(contacts);
    res.json({ success: true, data: newContact });
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

    const updatedContacts = contacts.map(c => 
      c.id === id ? { ...c, ...req.body, updatedAt: new Date().toISOString() } : c
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
    if (updatedJob && updatedJob.status === 'Applied' && updatedJob.hiringManager) {
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
      jobs[existingIndex] = {
        source: existing.source || newJob.source || 'Extension Sourced',
        ...existing,
        ...newJob,
        id: existing.id,
        status: existing.status,
        tailoredCv: existing.tailoredCv,
        coverLetter: existing.coverLetter,
        pdfPath: existing.pdfPath,
        whyInterested: existing.whyInterested,
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
            experience: tailorResult.experience
          };
          jobToSave.coverLetter = tailorResult.coverLetter;
          jobToSave.whyInterested = tailorResult.whyInterested || '';
          jobToSave.tailoringExplanation = tailorResult.tailoringExplanation || '';
          log(`[Auto-Tailor] Successfully tailored!`);

          log(`[Auto-PDF] Automatically generating CV PDF...`);
          const cleanCompany = (jobToSave.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
          const outputPath = path.join(__dirname, 'data/generated', fileName);
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
            experience: tailorResult.experience
          };
          jobToSave.coverLetter = tailorResult.coverLetter;
          jobToSave.whyInterested = tailorResult.whyInterested || '';
          jobToSave.tailoringExplanation = tailorResult.tailoringExplanation || '';
          log(`[Auto-Tailor] Successfully tailored!`);

          log(`[Auto-PDF] Automatically generating CV PDF...`);
          const cleanCompany = (jobToSave.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Eugene_bochkov_CV_${cleanCompany}.pdf`;
          const outputPath = path.join(__dirname, 'data/generated', fileName);
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
    const geminiApiKey = settings.geminiApiKey || (settings.deepSeekApiKey && (settings.deepSeekApiKey.startsWith('AIzaSy') || settings.deepSeekApiKey.startsWith('AQ.')) ? settings.deepSeekApiKey : '');
    const deepSeekApiKey = settings.deepSeekApiKey && !settings.deepSeekApiKey.startsWith('AIzaSy') && !settings.deepSeekApiKey.startsWith('AQ.') ? settings.deepSeekApiKey : '';
    const apiKeys = { geminiApiKey, deepSeekApiKey };

    if (!geminiApiKey && !deepSeekApiKey) {
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
      experience: result.experience
    };
    job.coverLetter = result.coverLetter;
    job.whyInterested = result.whyInterested || '';
    job.tailoringExplanation = result.tailoringExplanation || '';
    job.lastActionDate = new Date().toISOString();

    writeJobs(jobs);
    res.json(job);
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
${jobDescription || 'Not provided'}

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

**Output Format:**
You must return a single JSON object matching this structure exactly:
{
  "score": 8, // Integer between 1 and 10
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

    res.json({ success: true, score: parsed.score, explanation: parsed.explanation.trim() });
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
    const outputPath = path.join(__dirname, 'data/generated', fileName);
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
    const outputPath = path.join(__dirname, 'data/generated', fileName);

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
    if (job.hiringManager) {
      autoCreateContactFromJob(job);
    }

    log('Playwright application process closed.');
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (e) {
    log(`Application error: ${e.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`100x job Server running on http://localhost:${PORT}`);
});
