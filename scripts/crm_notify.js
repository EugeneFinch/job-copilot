// Push applied jobs → LinkedIn CRM (Supabase crm_store)
// Copy data/crm_config.example.json → data/crm_config.json (same keys as CRM extension Settings)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../data/crm_config.json');
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
  if (idx >= 0) list[idx] = { ...list[idx], ...incoming };
  else list.push(incoming);
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

/**
 * Fire-and-forget: updates CRM when job status is Applied / Invited / Tailored.
 * No-op if crm_config.json missing (use CRM Settings → Sync instead).
 */
export async function notifyLinkedInCrm(job) {
  if (!job || !SYNC_STATUSES.has(job.status)) return { skipped: true };

  const cfg = loadConfig();
  if (!cfg) {
    return { skipped: true, reason: 'no crm_config.json — copy data/crm_config.example.json' };
  }

  const application = normalizeApplication(job);
  if (!application) return { skipped: true, reason: 'invalid job' };

  // Try with job_applications column; if the migration hasn't been run yet, fall back gracefully
  let row = {};
  let applications = [];
  let migrationApplied = true;


  const getRes = await fetch(
    `${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main&select=job_applications,projects,companies`,
    { headers: supabaseHeaders(cfg.supabaseAnonKey) }
  );

  if (getRes.ok) {
    const rows = await getRes.json();
    row = rows[0] || {};
    applications = mergeApplications(row.job_applications, application);
  } else {
    const errBody = await getRes.text().catch(() => '');
    const needsMigration = errBody.includes('job_applications') && errBody.includes('does not exist');
    if (needsMigration) {
      console.warn('[CRM] job_applications column missing — run the SQL migration in Supabase:');
      console.warn('[CRM]   alter table public.crm_store add column if not exists job_applications jsonb not null default \'[]\';');
      // Still fetch projects/companies so the company appears in Job search project
      const fallbackRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main&select=projects,companies`,
        { headers: supabaseHeaders(cfg.supabaseAnonKey) }
      );
      if (fallbackRes.ok) {
        const rows = await fallbackRes.json();
        row = rows[0] || {};
      }
      applications = [application]; // Will be stored once migration runs
      migrationApplied = false;
    } else {
      throw new Error(`CRM fetch failed (${getRes.status}): ${errBody.slice(0, 200)}`);
    }
  }

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
  keys.add(application.companyKey);
  projects[projIdx] = {
    ...projects[projIdx],
    companyKeys: [...keys],
    updatedAt: new Date().toISOString()
  };

  const companies = row.companies && typeof row.companies === 'object' ? { ...row.companies } : {};
  const prev = companies[application.companyKey] || {};
  const hiringManager = applications
    .filter((j) => j.companyKey === application.companyKey)
    .map((j) => j.hiringManager)
    .find((url) => url);
  companies[application.companyKey] = {
    ...prev,
    name: application.company,
    jobs: formatJobsText(applications, application.companyKey),
    goals: prev.goals || 'Find hiring manager · follow up after application',
    targetProfileUrl: prev.targetProfileUrl || hiringManager || '',
    updatedAt: new Date().toISOString()
  };

  const patchRes = await fetch(`${cfg.supabaseUrl}/rest/v1/crm_store?id=eq.main`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(cfg.supabaseAnonKey), Prefer: 'return=minimal' },
    body: JSON.stringify({
      ...(migrationApplied ? { job_applications: applications } : {}),
      projects,
      companies,
      updated_at: new Date().toISOString()
    })
  });
  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '');
    throw new Error(text || `CRM patch failed (${patchRes.status})`);
  }

  console.log(`[CRM] Synced ${application.company} — ${application.title} (${application.status})`);
  return { ok: true, company: application.company, title: application.title };
}
