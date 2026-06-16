import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../data/crm_config.json');
const JOBS_PATH = path.join(__dirname, '../data/jobs.json');
const JOB_SEARCH_PROJECT_ID = 'proj_job_search';
const JOB_SEARCH_PROJECT_NAME_RE = /^job\s*search$/i;
const SYNC_STATUSES = new Set(['Applied', 'Invited', 'Tailored']);

function findJobSearchProjectIndex(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const byUserName = list.findIndex(
    (p) => JOB_SEARCH_PROJECT_NAME_RE.test(String(p?.name || '').trim()) && p.id !== JOB_SEARCH_PROJECT_ID
  );
  if (byUserName >= 0) return byUserName;
  return list.findIndex((p) => p.id === JOB_SEARCH_PROJECT_ID);
}

function loadConfig() {
  if (process.env.CRM_SUPABASE_URL && process.env.CRM_SUPABASE_ANON_KEY) {
    return {
      supabaseUrl: process.env.CRM_SUPABASE_URL.replace(/\/$/, ''),
      supabaseAnonKey: process.env.CRM_SUPABASE_ANON_KEY
    };
  }
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (!raw.supabaseUrl || !raw.supabaseAnonKey) return null;
    return {
      supabaseUrl: String(raw.supabaseUrl).replace(/\/$/, ''),
      supabaseAnonKey: String(raw.supabaseAnonKey)
    };
  } catch {
    return null;
  }
}

function companyKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeApplication(job) {
  if (!job?.company || !job?.title) return null;
  return {
    id: `job_${job.id}`,
    jobSearchId: job.id,
    company: job.company.trim(),
    companyKey: companyKey(job.company),
    title: job.title.trim(),
    status: job.status,
    url: job.url || null,
    location: job.location || null,
    hiringManager: String(job.hiringManager || '').trim() || null,
    appliedAt: job.lastActionDate || job.scrapedAt || new Date().toISOString(),
    syncedAt: new Date().toISOString()
  };
}

function mergeApplications(existing, incoming) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const idx = list.findIndex(
    (j) =>
      (incoming.jobSearchId && j.jobSearchId === incoming.jobSearchId) ||
      (incoming.url && j.url === incoming.url)
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...incoming };
  } else {
    list.push(incoming);
  }
  return list;
}

function formatJobsText(apps, key) {
  return apps
    .filter((j) => j.companyKey === key)
    .map((j) => {
      const d = j.appliedAt ? new Date(j.appliedAt).toISOString().slice(0, 10) : '';
      const line = `${j.title} — ${j.status}${d ? ` (${d})` : ''}`;
      return j.url ? `${line}\n${j.url}` : line;
    })
    .join('\n\n');
}

function supabaseHeaders(key) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

async function runMigration() {
  const cfg = loadConfig();
  if (!cfg) {
    console.error('Error: Could not load Supabase configuration from config file or environment.');
    process.exit(1);
  }

  if (!fs.existsSync(JOBS_PATH)) {
    console.error('Error: Jobs file not found at:', JOBS_PATH);
    process.exit(1);
  }

  let jobs = [];
  try {
    jobs = JSON.parse(fs.readFileSync(JOBS_PATH, 'utf8'));
  } catch (err) {
    console.error('Error parsing jobs.json:', err.message);
    process.exit(1);
  }

  // Filter and normalize jobs from jobs.json
  const validJobs = jobs.filter(j => SYNC_STATUSES.has(j.status));
  console.log(`Found ${validJobs.length} jobs in jobs.json with syncable status (Applied, Invited, Tailored).`);

  const incomingApps = [];
  for (const job of validJobs) {
    const app = normalizeApplication(job);
    if (app) incomingApps.push(app);
  }
  console.log(`Normalized ${incomingApps.length} applications.`);

  if (incomingApps.length === 0) {
    console.log('No applications to migrate.');
    return;
  }

  // Fetch current crm_store row from Supabase
  console.log('Fetching existing data from Supabase...');
  const getRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main&select=job_applications,projects,companies`,
    { headers: supabaseHeaders(cfg.supabaseAnonKey) }
  );

  if (!getRes.ok) {
    const errBody = await getRes.text().catch(() => '');
    console.error(`CRM fetch failed (${getRes.status}): ${errBody}`);
    process.exit(1);
  }

  const rows = await getRes.json();
  const row = rows[0] || {};

  let applications = Array.isArray(row.job_applications) ? [...row.job_applications] : [];
  console.log(`Existing applications in Supabase: ${applications.length}`);

  // Merge incoming applications
  for (const app of incomingApps) {
    applications = mergeApplications(applications, app);
  }
  console.log(`Merged total applications list: ${applications.length}`);

  // Use existing "Job Search" project if present; merge away duplicate proj_job_search
  let projects = Array.isArray(row.projects) ? [...row.projects] : [];
  const dupIdx = projects.findIndex((p) => p.id === JOB_SEARCH_PROJECT_ID);
  let projIdx = findJobSearchProjectIndex(projects);

  if (dupIdx >= 0 && projIdx >= 0 && dupIdx !== projIdx) {
    const target = projects[projIdx];
    const duplicate = projects[dupIdx];
    const mergedKeys = new Set([...(target.companyKeys || []), ...(duplicate.companyKeys || [])]);
    projects[projIdx] = { ...target, companyKeys: [...mergedKeys], updatedAt: new Date().toISOString() };
    projects = projects.filter((_, i) => i !== dupIdx);
  } else if (projIdx < 0) {
    projects.push({
      id: JOB_SEARCH_PROJECT_ID,
      name: 'Job search',
      goals: 'Companies from job applications — find people and follow up on LinkedIn.',
      companyKeys: [],
      contactIdKeys: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    projIdx = projects.length - 1;
  }

  const keys = new Set(projects[projIdx].companyKeys || []);
  for (const app of incomingApps) {
    keys.add(app.companyKey);
  }
  projects[projIdx] = {
    ...projects[projIdx],
    companyKeys: [...keys],
    updatedAt: new Date().toISOString()
  };
  console.log(`Total company keys in "Job search" project: ${keys.size}`);

  // Update companies object
  const companies = row.companies && typeof row.companies === 'object' ? { ...row.companies } : {};
  for (const app of incomingApps) {
    const prev = companies[app.companyKey] || {};
    const hiringManager = applications
      .filter((j) => j.companyKey === app.companyKey)
      .map((j) => j.hiringManager)
      .find((url) => url);
    companies[app.companyKey] = {
      ...prev,
      name: app.company,
      jobs: formatJobsText(applications, app.companyKey),
      goals: prev.goals || 'Find hiring manager · follow up after application',
      targetProfileUrl: prev.targetProfileUrl || hiringManager || '',
      updatedAt: new Date().toISOString()
    };
  }
  console.log(`Updated details for ${incomingApps.length} companies.`);

  // PATCH back to Supabase
  console.log('Sending PATCH request to Supabase...');
  const patchRes = await fetch(`${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(cfg.supabaseAnonKey), Prefer: 'return=minimal' },
    body: JSON.stringify({
      job_applications: applications,
      projects,
      companies,
      updated_at: new Date().toISOString()
    })
  });

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '');
    console.error(`CRM patch failed (${patchRes.status}): ${text}`);
    process.exit(1);
  }

  console.log('Migration completed successfully!');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
