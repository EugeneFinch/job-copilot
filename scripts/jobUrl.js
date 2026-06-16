/** Shared job URL matching (server + extension logic kept in sync) */

export function normalizeJobUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/(application|apply)\/?$/i, '').replace(/\/$/, '');
    return `${u.origin}${path}`.toLowerCase();
  } catch {
    return String(url)
      .split('?')[0]
      .replace(/\/(application|apply)\/?$/i, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }
}

export function canonicalJobUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/(application|apply)\/?$/i, '').replace(/\/$/, '') || '/';
    u.hash = '';

    // Preserve key job-identifier query params (e.g. Indeed's jk=, LinkedIn's currentJobId=)
    const keepParams = ['jk', 'currentjobid', 'jobid', 'job_id', 'id'];
    const preserved = new URLSearchParams();
    for (const key of keepParams) {
      const val = u.searchParams.get(key);
      if (val) preserved.set(key, val);
    }
    u.search = preserved.toString();

    return `${u.origin}${u.pathname}${u.search ? '?' + u.search : ''}`;
  } catch {
    return String(url).split('?')[0].replace(/\/(application|apply)\/?$/i, '').replace(/\/$/, '');
  }
}

export function extractJobUuid(url) {
  const m = String(url || '').match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return m ? m[1].toLowerCase() : null;
}

/** Extract Indeed jk param from a URL */
function extractIndeedJk(url) {
  try {
    return new URL(url).searchParams.get('jk') || null;
  } catch {
    const m = String(url || '').match(/[?&]jk=([^&]+)/);
    return m ? m[1] : null;
  }
}

export function jobsMatchUrl(a, b) {
  if (!a || !b) return false;
  if (normalizeJobUrl(a) === normalizeJobUrl(b)) {
    // Same base path — also require jk to match if both have it
    const jkA = extractIndeedJk(a);
    const jkB = extractIndeedJk(b);
    if (jkA && jkB) return jkA === jkB;
    if (jkA || jkB) return false; // One has jk, other doesn't — not the same job
    return true;
  }
  // UUID match (LinkedIn, etc.)
  const ua = extractJobUuid(a);
  const ub = extractJobUuid(b);
  return !!(ua && ub && ua === ub);
}

export function findJobByUrl(jobs, url, { title, company } = {}) {
  if (!Array.isArray(jobs)) return null;
  const byUrl = jobs.find(
    (j) =>
      jobsMatchUrl(j.url, url) ||
      (j.applicationUrl && jobsMatchUrl(j.applicationUrl, url))
  );
  if (byUrl) return byUrl;
  if (title && company) {
    const t = title.trim().toLowerCase();
    const c = company.trim().toLowerCase();
    return (
      jobs.find(
        (j) =>
          j.title?.trim().toLowerCase() === t && j.company?.trim().toLowerCase() === c
      ) || null
    );
  }
  return null;
}

