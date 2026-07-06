// AusJobFlow Copilot content script

let currentScrapedJob = null;
let currentSettings = null;
let targetLocationsList = ['Sydney', 'Melbourne'];
let sidebarElement = null;
let launcherElement = null;
let pipelineLinked = false;
let pipelineCheckDone = false;
let chatMessages = [];
let generatingCoverLetter = false;
let activityLogs = [];
let activityExpanded = false;
let extensionDisconnected = false;

const RECRUITER_AGENCIES = [
  'hays', 'onset', 'wow recruitment', 'latitude it', 'salt', 'talent international',
  'hudson', 'robert half', 'michael page', 'adecco', 'randstad', 'genesis', 'aurec',
  'paxus', 'greythorn', 'chandler macleod', 'espy', 'allura', 'halcyon knights',
  'prestige staffing', 'charterhouse', 'command', 'davidson', 'sharp & carter',
  'tribe', 'reo group', 'denovo', 'sourced', 'g2', 'kinexus', 'm&t resources',
  'polyglot', 'peoplebank', 'talenza', 'trs resourcing', 'sirius', 'bluefin',
  'concept recruitment', 'method recruitment', 'mitchellake', 'xpand', 'interpro',
  'robert walters', 'executive search', 'cox purtell', 'purtell staffing'
];

const COPILOT_DOMAINS = [
  'linkedin.com',
  'seek.com.au',
  'indeed.com',
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workday.com',
  'workdayjobs.com',
  'bamboohr.com',
  'workable.com',
  'smartrecruiters.com',
  'jobvite.com',
  'breezy.hr',
  'recruitee.com',
  'personio.de',
  'personio.com',
  'myworkdayjobs.com'
];

function stripScoreFromText(text) {
  return String(text || '')
    .replace(/^Suitability Score:\s*\d+\/10\s*/i, '')
    .replace(/^Okay, the score is\s*\d+\/10\.\s*[^\n]*\n*/i, '')
    .replace(/^Score:\s*\d+\/10\s*/i, '')
    .trim();
}

function flattenInsightText(text) {
  return stripScoreFromText(text)
    .replace(/^-\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildInsightPreview(text) {
  return flattenInsightText(text);
}

function toggleCollapsibleSection(toggleEl) {
  const section = toggleEl.closest('.ajf-collapsible-section');
  const body = section?.querySelector('[data-collapsible-body]');
  const preview = section?.querySelector('[data-collapsible-preview]');
  const chevron = toggleEl.querySelector('.ajf-collapsible-chevron');
  if (!body) return;

  const expanded = toggleEl.getAttribute('aria-expanded') === 'true';
  const next = !expanded;
  toggleEl.setAttribute('aria-expanded', String(next));
  body.hidden = !next;
  if (preview) preview.style.display = next ? 'none' : '';
  if (chevron) chevron.textContent = next ? '▼' : '▶';
  if (section) section.classList.toggle('ajf-collapsible-expanded', next);
}

function setCollapsibleExpanded(sectionId, expanded) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const toggle = section.querySelector('[data-collapsible-toggle]');
  const body = section.querySelector('[data-collapsible-body]');
  const preview = section.querySelector('[data-collapsible-preview]');
  const chevron = toggle?.querySelector('.ajf-collapsible-chevron');
  if (!toggle || !body) return;

  toggle.setAttribute('aria-expanded', String(expanded));
  body.hidden = !expanded;
  if (preview) preview.style.display = expanded ? 'none' : '';
  if (chevron) chevron.textContent = expanded ? '▼' : '▶';
  section.classList.toggle('ajf-collapsible-expanded', expanded);
}

function setCollapsibleInsight(sectionId, fullText, { visible = true, collapse = true } = {}) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const resultEl = section.querySelector('[data-collapsible-content]');
  const previewEl = section.querySelector('[data-collapsible-preview]');

  if (!visible || !fullText) {
    section.style.display = 'none';
    if (resultEl) resultEl.textContent = '';
    if (previewEl) previewEl.textContent = '';
    return;
  }

  section.style.display = 'block';
  if (resultEl) resultEl.textContent = fullText;
  if (previewEl) previewEl.textContent = buildInsightPreview(fullText);
  if (collapse) setCollapsibleExpanded(sectionId, false);
}

function initCollapsibleSections(root = document) {
  root.querySelectorAll('[data-collapsible-toggle]').forEach((toggle) => {
    if (toggle.dataset.collapsibleBound) return;
    toggle.dataset.collapsibleBound = '1';
    toggle.addEventListener('click', () => toggleCollapsibleSection(toggle));
  });
}

const JOB_URL_PATTERNS = [
  /\/careers?\//i,
  /\/jobs?\//i,
  /\/positions?\//i,
  /\/opportunities?\//i,
  /\/apply\/?$/i,
  /\/application\/?$/i,
  /\/hiring\//i,
  /\/vacanc/i,
  /\/role\//i
];

function capitalizeWord(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function companyFromHostname(hostname) {
  const parts = hostname.replace(/^www\./, '').split('.');
  if (parts.length >= 2) {
    const name = parts[parts.length - 2];
    if (['jobs', 'careers', 'apply', 'work', 'hiring'].includes(name.toLowerCase()) && parts.length >= 3) {
      return capitalizeWord(parts[parts.length - 3]);
    }
    return capitalizeWord(name);
  }
  return capitalizeWord(parts[0] || 'Unknown');
}

function titleFromUrlSlug(url) {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    let slug = segments[segments.length - 1] || '';
    if (['apply', 'application'].includes(slug.toLowerCase()) && segments.length >= 2) {
      slug = segments[segments.length - 2];
    }
    if (!slug || ['careers', 'career', 'jobs', 'job', 'positions', 'opportunities'].includes(slug.toLowerCase())) {
      return '';
    }
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return '';
  }
}

function getCompanyFromPage() {
  const ogSite = document.querySelector('meta[property="og:site_name"]')?.content;
  if (ogSite) return ogSite.trim();

  const title = document.title || '';
  if (title.includes('—')) return title.split('—')[0].trim();
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length >= 2) return parts[parts.length - 1].trim();
  }
  if (title.includes('|')) {
    const parts = title.split('|');
    if (parts.length >= 2) return parts[parts.length - 1].trim();
  }
  if (title.includes(' at ')) return title.split(' at ').pop().trim();

  return companyFromHostname(window.location.hostname);
}

function extractLocationFromText(text) {
  if (!text) return '';
  const match = text.match(/(?:location|based in|office)[:\s]+([^\n•|]+)/i);
  if (match) return match[1].trim();
  const lower = text.toLowerCase();
  if (lower.includes('sydney')) return 'Sydney';
  if (lower.includes('melbourne')) return 'Melbourne';
  if (lower.includes('remote')) return 'Remote';
  return '';
}

function extractJobDescriptionFromPage() {
  const selectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[data-testid*="description"]',
    'article',
    'main',
    '[role="main"]'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.innerText && el.innerText.length > 200) {
      return el.innerText;
    }
  }

  const headings = document.querySelectorAll('h2, h3, h4');
  for (const h of headings) {
    if (/about the role|job description|responsibilities|overview|what you.ll do/i.test(h.innerText)) {
      const section = h.closest('section') || h.parentElement?.parentElement || h.parentElement;
      if (section?.innerText && section.innerText.length > 200) {
        return section.innerText;
      }
    }
  }

  return '';
}

function hasJobPostingSchema() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
      if (items.some((item) => item?.['@type'] === 'JobPosting')) return true;
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return false;
}

function isGenericCareerPage(url) {
  try {
    const path = new URL(url).pathname;
    return JOB_URL_PATTERNS.some((pattern) => pattern.test(path)) || hasJobPostingSchema();
  } catch {
    return false;
  }
}

function isCopilotPage() {
  const url = window.location.href;

  if (url.includes('linkedin.com/in/')) return true;
  if (COPILOT_DOMAINS.some((domain) => url.includes(domain))) return true;
  if (isGenericCareerPage(url)) return true;

  const h1 = document.querySelector('h1')?.innerText?.trim();
  if (h1 && h1.length > 2 && h1.length < 120) {
    const bodyText = (document.body?.innerText || '').slice(0, 8000).toLowerCase();
    const jobSignals = [
      'responsibilities',
      'requirements',
      'qualifications',
      'apply now',
      'job description',
      'about the role',
      'what you will',
      'what you\'ll',
      'we are looking',
      'benefits',
      'salary'
    ];
    const signalCount = jobSignals.filter((signal) => bodyText.includes(signal)).length;
    if (signalCount >= 2) return true;

    const hasApplyForm = document.querySelector('input[type="file"], input[type="email"], form[action*="apply"]');
    const hasApplyBtn = Array.from(document.querySelectorAll('button, a')).some((el) =>
      /apply|submit application/i.test(el.innerText || '')
    );
    if (hasApplyForm && hasApplyBtn) return true;
  }

  return false;
}

function tryInitCopilot() {
  if (document.getElementById('ajf-launcher')) return true;
  if (!isCopilotPage()) return false;
  initCopilot();
  return true;
}

// Initialize elements when script runs
function initCopilot() {
  if (document.getElementById('ajf-launcher')) return;

  // Create UI Container
  const container = document.createElement('div');
  container.className = 'ajf-copilot-container';
  container.innerHTML = `
    <!-- Launcher Button -->
    <div id="ajf-launcher">
      <span>🚀</span> Copilot
    </div>

    <!-- Sidebar Panel -->
    <div id="ajf-sidebar">
      <div class="ajf-header">
        <div class="ajf-logo-group">
          <div class="ajf-logo-icon">A</div>
          <h2 class="ajf-title">100x job Copilot</h2>
        </div>
        <button class="ajf-close-btn" id="ajf-close-sidebar">×</button>
      </div>
      <div class="ajf-content">
        <!-- JOB-SPECIFIC VIEW -->
        <div id="ajf-job-view-content" class="ajf-dashboard">
          <div class="ajf-status-bar">
            <span class="ajf-badge ajf-badge-to-process" id="ajf-job-status">To Process</span>
            <button class="ajf-status-chip ajf-big-btn-applied" id="ajf-btn-mark-applied-top" title="Mark Applied">Applied</button>
            <button class="ajf-status-chip ajf-big-btn-skipped" id="ajf-btn-mark-skipped-top" title="Mark Skipped">Skip</button>
            <button id="ajf-btn-reparse" class="ajf-status-chip ajf-status-chip-muted" title="Re-parse page">↻</button>
          </div>

          <div id="ajf-activity-section" class="ajf-activity-feed" style="display: none;">
            <button type="button" id="ajf-activity-toggle" class="ajf-activity-toggle" aria-expanded="false">
              <div class="ajf-activity-latest-row">
                <span class="ajf-activity-icon ajf-activity-tone-neutral" id="ajf-activity-icon">●</span>
                <span class="ajf-activity-latest ajf-activity-tone-neutral" id="ajf-activity-latest"></span>
                <span class="ajf-activity-count" id="ajf-activity-count"></span>
                <span class="ajf-activity-chevron">▶</span>
              </div>
            </button>
            <div id="ajf-activity-history" class="ajf-activity-history" hidden></div>
          </div>

          <div class="ajf-workflow-rail" id="ajf-workflow-rail" aria-label="Application workflow">
            <span class="ajf-workflow-pill" data-step="job">Job</span>
            <span class="ajf-workflow-pill" data-step="tailor">Tailor</span>
            <span class="ajf-workflow-pill" data-step="apply">Apply</span>
            <span class="ajf-workflow-pill" data-step="outreach">Outreach</span>
          </div>

          <div class="ajf-panel" id="ajf-block-job">
            <div class="ajf-compact-grid ajf-compact-grid-2">
              <div class="ajf-form-group ajf-form-group-compact">
                <label class="ajf-label">Title</label>
                <input type="text" class="ajf-input ajf-input-compact" id="ajf-input-title">
              </div>
              <div class="ajf-form-group ajf-form-group-compact">
                <label class="ajf-label">Company</label>
                <input type="text" class="ajf-input ajf-input-compact" id="ajf-input-company">
              </div>
            </div>
            <div class="ajf-compact-grid ajf-compact-grid-2">
              <div class="ajf-form-group ajf-form-group-compact">
                <label class="ajf-label">Location</label>
                <select class="ajf-input ajf-input-compact" id="ajf-select-location" style="margin: 0; cursor: pointer;">
                  <option value="" disabled>—</option>
                  <option value="Sydney">Sydney</option>
                  <option value="Melbourne">Melbourne</option>
                  <option value="Other">Other</option>
                </select>
                <input type="text" class="ajf-input ajf-input-compact" id="ajf-input-location" style="margin: 0; display: none;" placeholder="Other…">
              </div>
              <div class="ajf-form-group ajf-form-group-compact" style="display: flex; align-items: flex-end;">
                <label class="ajf-checkbox-row" for="ajf-input-is-recruiter" style="margin: 0; padding: 0 12px; height: var(--ajf-control-height); box-sizing: border-box; display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%;">
                  <input type="checkbox" id="ajf-input-is-recruiter" style="margin: 0;">
                  <span style="font-size: var(--ajf-font-base); font-weight: 500; color: var(--ajf-text-primary); user-select: none;">Recruiter posting</span>
                </label>
              </div>
            </div>
            <div class="ajf-form-group ajf-form-group-compact" style="margin-top: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label class="ajf-label" style="margin: 0;">Hiring Manager / Contact</label>
                <button type="button" id="ajf-btn-capture-hm" class="ajf-flow-action-link" style="margin: 0; padding: 0;">Capture HM</button>
              </div>
              <input type="text" class="ajf-input ajf-input-compact" id="ajf-input-hiring-manager" placeholder="LinkedIn URL or Name" style="width: 100%; box-sizing: border-box; margin-bottom: 6px;">
              <div id="ajf-hm-capture-status" class="ajf-hm-status" style="display: none; margin-bottom: 6px; font-size: 11px;"></div>
              <div class="ajf-btn-row ajf-outreach-actions" style="margin: 0; display: flex; gap: 6px;">
                <button type="button" class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-open-hm-profile" style="display: none; flex: 1; padding: 4px 8px; font-weight: 600; font-size: 11px; height: 28px !important; min-height: 28px !important; justify-content: center; align-items: center;">Open Profile</button>
                <button type="button" class="ajf-btn ajf-btn-primary ajf-btn-xs" id="ajf-btn-quick-connect-msg" style="flex: 1; padding: 4px 8px; font-weight: 600; font-size: 11px; height: 28px !important; min-height: 28px !important; justify-content: center; align-items: center;">Copy Invite</button>
              </div>
            </div>
            <div class="ajf-save-block">
              <button class="ajf-btn ajf-btn-primary ajf-btn-save-prominent" id="ajf-btn-save">Save to Pipeline</button>
              <label class="ajf-auto-process-wrap ajf-auto-process-block" for="ajf-input-auto-process" title="Assess + Tailor + PDF after save">
                <input type="checkbox" id="ajf-input-auto-process" checked>
                <span>Auto: Assess → Tailor → PDF</span>
              </label>
              <button type="button" id="ajf-btn-save-later" class="ajf-flow-action-link" style="display: none; align-self: center; margin-top: 2px;">Bookmark for later</button>
            </div>
            <input type="text" class="ajf-input ajf-input-compact ajf-url-hidden" id="ajf-input-url" disabled tabindex="-1" aria-hidden="true">
            <div class="ajf-card-inset ajf-link-inset" id="ajf-link-section" style="display: none;">
              <select class="ajf-input ajf-input-compact" id="ajf-select-pipeline-job">
                <option value="">Link existing job…</option>
              </select>
            </div>

            <div class="ajf-action-grid" id="ajf-block-tailor">
              <button class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-assess">Assess</button>
              <button class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-tailor" disabled>Tailor</button>
              <button class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-download-pdf" style="display:none;">PDF</button>
              <button class="ajf-btn ajf-btn-success ajf-btn-xs" id="ajf-btn-autofill" disabled>Fill</button>
              <button class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-cover-letter" style="display:none;">Letter</button>
            </div>
            <p class="ajf-workflow-hint" id="ajf-workflow-hint" style="display: none !important;"></p>

            <div class="ajf-insights-stack" id="ajf-block-apply">
          <div id="ajf-assess-section" class="ajf-collapsible-section ajf-collapsible-assess ajf-collapsible-dense" style="display: none; margin-top: 0;">
            <button type="button" class="ajf-collapsible-toggle" data-collapsible-toggle aria-expanded="false">
              <span class="ajf-collapsible-header-row">
                <span class="ajf-collapsible-chevron">▶</span>
                <span class="ajf-collapsible-label">🔍 Suitability Assessment</span>
              </span>
              <span class="ajf-collapsible-preview" data-collapsible-preview></span>
            </button>
            <div class="ajf-collapsible-body" data-collapsible-body hidden>
              <div class="ajf-card" style="background: rgba(52, 199, 89, 0.05) !important; border-color: rgba(52, 199, 89, 0.2) !important;">
                <p class="ajf-text-sm" data-collapsible-content id="ajf-assess-result" style="font-size: 14px !important; line-height: 1.5 !important; color: #1d1d1f !important; margin: 0 !important; white-space: pre-wrap !important;"></p>
              </div>
            </div>
          </div>

          <div id="ajf-tailor-explanation-section" class="ajf-collapsible-section ajf-collapsible-tailor ajf-collapsible-dense" style="display: none; margin-top: 0;">
            <button type="button" class="ajf-collapsible-toggle" data-collapsible-toggle aria-expanded="false">
              <span class="ajf-collapsible-header-row">
                <span class="ajf-collapsible-chevron">▶</span>
                <span class="ajf-collapsible-label">✨ Tailoring Changes & Highlights</span>
                <span id="ajf-tailor-model" class="ajf-collapsible-badge"></span>
              </span>
              <span class="ajf-collapsible-preview" data-collapsible-preview id="ajf-tailor-preview"></span>
            </button>
            <div class="ajf-collapsible-body" data-collapsible-body hidden>
              <div class="ajf-card" style="background: rgba(0, 113, 227, 0.04) !important; border-color: rgba(0, 113, 227, 0.18) !important;">
                <p class="ajf-text-sm" data-collapsible-content id="ajf-tailor-explanation" style="font-size: 14px !important; line-height: 1.5 !important; color: #1d1d1f !important; margin: 0 !important; white-space: pre-wrap !important;"></p>
              </div>
            </div>
          </div>

          <div id="ajf-gap-section" class="ajf-gap-dense" style="display: none;">
              <p class="ajf-text-sm" id="ajf-gap-list" style="font-size: 13px !important; line-height: 1.45 !important; color: #9a6700 !important; margin: 0 !important; white-space: pre-wrap !important;"></p>
              <p class="ajf-text-sm" id="ajf-gap-bridge" style="display: none !important; margin: 0 !important;"></p>
              <p class="ajf-text-sm" id="ajf-gap-hint" style="display: none !important; margin: 0 !important;"></p>
          </div>

            <div id="ajf-cover-letter-section" style="display: none;">
              <div id="ajf-cover-letter-preview-wrap" style="display: none;">
                <textarea class="ajf-input ajf-input-compact" id="ajf-cover-letter-preview" readonly rows="2"></textarea>
              </div>
            </div>

            <div class="ajf-panel-divider"></div>

            <div class="ajf-outreach-compact" id="ajf-block-outreach">
              <div class="ajf-outreach-head">
                <span id="ajf-outreach-role-context" class="ajf-outreach-role"></span>
              </div>
              <textarea class="ajf-input ajf-input-compact" id="ajf-connect-message-preview" readonly rows="4" placeholder="Invite message (after save)"></textarea>
            </div>

            <div class="ajf-outreach-compact ajf-recruiter-email-fallback" id="ajf-recruiter-outreach" style="display: none;">
              <div class="ajf-outreach-head">
                <span class="ajf-outreach-role">Email fallback</span>
                <button type="button" id="ajf-btn-toggle-recruiter-email" class="ajf-flow-action-link">Show</button>
              </div>
              <div id="ajf-recruiter-email-fields" style="display: none;">
                <input type="email" class="ajf-input ajf-input-compact" id="ajf-recruiter-email" placeholder="recruiter@agency.com">
                <textarea class="ajf-input ajf-input-compact" id="ajf-recruiter-email-draft" readonly rows="3" placeholder="Email draft…"></textarea>
                <div class="ajf-btn-row ajf-outreach-actions">
                  <button type="button" class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-copy-recruiter-email">Copy email</button>
                  <button type="button" class="ajf-btn ajf-btn-secondary ajf-btn-xs" id="ajf-btn-open-recruiter-mailto">Open mail</button>
                </div>
              </div>
            </div>
          </div>

          <div id="ajf-custom-instructions-container" style="display: none !important; margin: 0; height: 0; overflow: hidden;">
            <textarea class="ajf-input" id="ajf-job-custom-instructions"></textarea>
            <button class="ajf-btn" id="ajf-btn-save-instructions" style="display: none;"></button>
          </div>

        </div> <!-- end of ajf-job-view-content -->

        <!-- PROFILE-OUTREACH VIEW -->
        <div id="ajf-profile-helper-view" style="display: none; padding: 5px 0;">
          <h3 class="ajf-section-title" style="margin-top: 0; font-size: 13px !important; color: #0066cc !important;">👤 Profile Outreach Helper</h3>
          <div class="ajf-card" style="padding: 12px !important;">
            <div class="ajf-form-group">
              <label class="ajf-label">👤 Profile Contact Name</label>
              <input type="text" class="ajf-input" id="ajf-profile-contact-name" placeholder="Parsing name...">
            </div>
            <div class="ajf-form-group">
              <label class="ajf-label">📁 Applied Job Context</label>
              <select class="ajf-input" id="ajf-profile-job-select" style="cursor: pointer;">
                <option value="">-- Loading Applied Jobs --</option>
              </select>
            </div>
            <div class="ajf-form-group">
              <label class="ajf-label">Outreach Status</label>
              <select class="ajf-input" id="ajf-profile-contact-status" style="cursor: pointer;">
                <option value="To Contact">To Contact</option>
                <option value="Waiting" selected>Waiting (invite sent)</option>
                <option value="Invite Sent">Invite Sent</option>
                <option value="Replied">Replied</option>
                <option value="Follow Up Needed">Follow Up Needed</option>
              </select>
            </div>
            <div class="ajf-form-group">
              <label class="ajf-label">💬 Tailored Connection Invite</label>
              <textarea class="ajf-input" id="ajf-profile-outreach-text" style="height: 110px !important; font-size: 12px !important; resize: vertical;" placeholder="Select a job to pre-fill..."></textarea>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
              <button class="ajf-btn ajf-btn-primary" id="ajf-btn-copy-profile-message" style="flex: 1; font-weight: bold;">
                📋 Copy & Save to CRM
              </button>
              <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-fill-linkedin-invite" style="flex: 1; font-weight: bold;">
                📨 Fill LinkedIn Invite
              </button>
            </div>
            <div id="ajf-profile-crm-status" style="font-size: 12px; color: #10b981; margin-top: 10px; text-align: center; display: none; font-weight: bold; padding: 4px; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">
              ✓ Message Copied & Saved to Contacts CRM!
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Prevent host page (e.g. LinkedIn) from intercepting keyboard events in our sidebar
  ['keydown', 'keypress', 'keyup'].forEach(evtType => {
    container.addEventListener(evtType, (e) => e.stopPropagation());
  });

  sidebarElement = document.getElementById('ajf-sidebar');
  launcherElement = document.getElementById('ajf-launcher');
  initCollapsibleSections(container);

  const activityToggle = document.getElementById('ajf-activity-toggle');
  if (activityToggle) {
    activityToggle.addEventListener('click', () => {
      activityExpanded = !activityExpanded;
      renderActivityFeed();
    });
  }

  // Event Listeners
  launcherElement.addEventListener('click', toggleSidebar);
  document.getElementById('ajf-close-sidebar').addEventListener('click', toggleSidebar);
  document.getElementById('ajf-btn-save').addEventListener('click', handleSaveOrOpenPdf);
  document.getElementById('ajf-btn-save-later').addEventListener('click', handleSaveForLater);
  document.getElementById('ajf-btn-assess').addEventListener('click', handleAssessMatch);
  document.getElementById('ajf-btn-reparse').addEventListener('click', handleReparseJob);
  document.getElementById('ajf-btn-tailor').addEventListener('click', handleTailorJob);
  document.getElementById('ajf-btn-autofill').addEventListener('click', handleAutofill);
  const saveInstrBtn = document.getElementById('ajf-btn-save-instructions');
  if (saveInstrBtn) {
    saveInstrBtn.addEventListener('click', handleSaveCustomInstructions);
  }
  document.getElementById('ajf-btn-mark-applied-top').addEventListener('click', () => handleUpdateStatus('Applied'));
  document.getElementById('ajf-btn-mark-skipped-top').addEventListener('click', () => handleUpdateStatus('Skipped'));

  const coverLetterBtn = document.getElementById('ajf-btn-cover-letter');
  if (coverLetterBtn) {
    coverLetterBtn.addEventListener('click', handleCoverLetterAction);
  }

  const quickMsgBtn = document.getElementById('ajf-btn-quick-connect-msg');
  if (quickMsgBtn) {
    quickMsgBtn.addEventListener('click', handleQuickConnectMessage);
  }
  const captureHmBtn = document.getElementById('ajf-btn-capture-hm');
  if (captureHmBtn) {
    captureHmBtn.addEventListener('click', () => syncHiringManagerFromPage({ force: true, autoSave: true }));
  }
  const openHmBtn = document.getElementById('ajf-btn-open-hm-profile');
  if (openHmBtn) {
    openHmBtn.addEventListener('click', () => {
      const url = getHiringManagerProfileUrl();
      if (url) window.open(url, '_blank');
    });
  }
  const sendHmInviteBtn = document.getElementById('ajf-btn-send-hm-invite');
  if (sendHmInviteBtn) {
    sendHmInviteBtn.addEventListener('click', handleSendHmInvite);
  }
  const fillLinkedInInviteBtn = document.getElementById('ajf-btn-fill-linkedin-invite');
  if (fillLinkedInInviteBtn) {
    fillLinkedInInviteBtn.addEventListener('click', handleFillLinkedInInvite);
  }

  // Attach blur and change listeners to inputs for auto-saving
  const titleInput = document.getElementById('ajf-input-title');
  const companyInput = document.getElementById('ajf-input-company');
  const locationInput = document.getElementById('ajf-input-location');
  const hiringManagerInput = document.getElementById('ajf-input-hiring-manager');
  const isRecruiterInput = document.getElementById('ajf-input-is-recruiter');

  [titleInput, companyInput, locationInput, hiringManagerInput, isRecruiterInput].forEach(input => {
    if (input) {
      input.addEventListener('change', autoSaveJobDetails);
      input.addEventListener('blur', autoSaveJobDetails);
    }
  });

  const toggleRecruiterEmailBtn = document.getElementById('ajf-btn-toggle-recruiter-email');
  if (toggleRecruiterEmailBtn) {
    toggleRecruiterEmailBtn.addEventListener('click', () => {
      const fields = document.getElementById('ajf-recruiter-email-fields');
      if (!fields) return;
      const show = fields.style.display === 'none';
      fields.style.display = show ? 'flex' : 'none';
      fields.style.flexDirection = 'column';
      fields.style.gap = '8px';
      toggleRecruiterEmailBtn.innerText = show ? 'Hide' : 'Show';
    });
  }

  const copyRecruiterEmailBtn = document.getElementById('ajf-btn-copy-recruiter-email');
  if (copyRecruiterEmailBtn) {
    copyRecruiterEmailBtn.addEventListener('click', handleCopyRecruiterEmail);
  }
  const openRecruiterMailBtn = document.getElementById('ajf-btn-open-recruiter-mailto');
  if (openRecruiterMailBtn) {
    openRecruiterMailBtn.addEventListener('click', handleOpenRecruiterMailto);
  }
  const recruiterEmailInput = document.getElementById('ajf-recruiter-email');
  if (recruiterEmailInput) {
    recruiterEmailInput.addEventListener('change', () => {
      if (currentScrapedJob) {
        currentScrapedJob.recruiterEmail = recruiterEmailInput.value.trim();
        refreshRecruiterEmailDraft();
        if (pipelineLinked && currentScrapedJob.id) {
          sendExtensionMessage({
            action: 'updateJob',
            jobId: currentScrapedJob.id,
            updates: { recruiterEmail: currentScrapedJob.recruiterEmail }
          });
        }
      }
    });
  }
  if (companyInput) {
    companyInput.addEventListener('input', () => updateOutreachRoleContext(currentScrapedJob));
  }
  if (isRecruiterInput) {
    isRecruiterInput.addEventListener('change', () => {
      if (currentScrapedJob) currentScrapedJob.isRecruiter = isRecruiterInput.checked;
      updateOutreachRoleContext(currentScrapedJob);
      updateRecruiterOutreachUI(currentScrapedJob);
      updateConnectMessagePreview(currentScrapedJob);
      autoSaveJobDetails();
    });
  }
  const selectLocElem = document.getElementById('ajf-select-location');
  if (selectLocElem) {
    selectLocElem.addEventListener('change', (e) => {
      const selectVal = e.target.value;
      const locationInput = document.getElementById('ajf-input-location');
      if (selectVal === 'Other') {
        locationInput.style.display = 'block';
        if (targetLocationsList.includes(locationInput.value)) {
          locationInput.value = '';
        }
        locationInput.focus();
      } else {
        locationInput.style.display = 'none';
        locationInput.value = selectVal;
        autoSaveJobDetails();
      }
    });
  }

  document.getElementById('ajf-select-pipeline-job').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      handleLinkJob(val);
    }
  });

  document.getElementById('ajf-btn-download-pdf').addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[Copilot] Download button clicked. currentScrapedJob:', currentScrapedJob);
    logToConsole('Download button clicked...');

    try {
      if (!currentScrapedJob) {
        logToConsole('Error: No job details parsed.');
        return;
      }

      if (!currentScrapedJob.tailoredCv) {
        logToConsole('No tailored CV found — run Tailor CV first.');
        showToast('No tailored CV yet — starting tailor step…');
        handleTailorJob();
        return;
      }

      if (currentScrapedJob.pdfPath) {
        const pdfUrl = `http://localhost:3004${currentScrapedJob.pdfPath}?t=${Date.now()}`;
        logToConsole(`Opening existing PDF: ${pdfUrl}`);
        sendExtensionMessage({ action: 'openTab', url: pdfUrl });
        return;
      }

      const downloadBtn = document.getElementById('ajf-btn-download-pdf');
      downloadBtn.disabled = true;
      downloadBtn.innerText = '⌛ Generating PDF...';
      logToConsole(`Requesting PDF generation for Job ID: ${currentScrapedJob.id}...`);

      sendExtensionMessage({ action: 'generatePdf', jobId: currentScrapedJob.id }, (pdfResponse) => {
        try {
          downloadBtn.disabled = false;
          downloadBtn.innerText = '📄 Open Tailored PDF';

          console.log('[Copilot] generatePdf response received:', pdfResponse);

          if (pdfResponse && pdfResponse.success) {
            currentScrapedJob.pdfPath = pdfResponse.data.pdfUrl;
            const pdfUrl = `http://localhost:3004${currentScrapedJob.pdfPath}?t=${Date.now()}`;
            const cleanCompany = (currentScrapedJob.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
            const pdfFilename = `Eugene_bochkov_CV_${cleanCompany}.pdf`;

            logToConsole('✓ PDF compiled successfully on server!');
            logToConsole(`Opening PDF URL: ${pdfUrl}`);
            sendExtensionMessage({ action: 'openTab', url: pdfUrl }, (res) => {
              logToConsole('✓ PDF open request sent to background script.');
            });
            logToConsole(`Saved to: data/generated/${pdfFilename}`);
          } else {
            logToConsole(`Failed to compile PDF: ${pdfResponse?.error || 'Unknown server error'}`);
          }
        } catch (innerErr) {
          logToConsole(`Error in PDF response handler: ${innerErr.message}`);
          console.error('[Copilot] Inner error:', innerErr);
        }
      });
    } catch (err) {
      logToConsole(`Error triggering download: ${err.message}`);
      logToConsole('TIP: Please refresh the web page to reload the extension script context!');
      console.error('[Copilot] Click handler error:', err);
    }
  });

  // Parse Job details as soon as page loads (or panel is opened)
  pipelineLinked = false;
  pipelineCheckDone = false;
  currentScrapedJob = extractJobDetails();
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  loadSettingsAndLocations();
  populateUIFields();
  updateActionButtons();

  const autoProcessCheckbox = document.getElementById('ajf-input-auto-process');
  if (autoProcessCheckbox) {
    autoProcessCheckbox.addEventListener('change', updateDynamicUI);
  }
  updateDynamicUI();

  setupProfileHelperEvents();

  checkExistingJob();
  runSpaAutoReparse();
  setupHiringManagerObserver();
}

function updateDynamicUI() {
  const autoProcessCheckbox = document.getElementById('ajf-input-auto-process');
  const isTicked = autoProcessCheckbox ? autoProcessCheckbox.checked : false;
  const inDb = pipelineLinked;
  const hasTailored = !!(currentScrapedJob?.tailoredCv || currentScrapedJob?.pdfPath);

  const assessBtn = document.getElementById('ajf-btn-assess');
  const tailorBtn = document.getElementById('ajf-btn-tailor');
  // Only hide manual steps for fresh saves where auto-process will run on click
  const hideForAutoSave = isTicked && !inDb;

  if (assessBtn) {
    assessBtn.style.setProperty('display', hideForAutoSave ? 'none' : 'flex', 'important');
  }
  if (tailorBtn) {
    // Always show tailor once job is in pipeline (needed for re-tailor / recovery)
    tailorBtn.style.setProperty('display', (inDb || !hideForAutoSave) ? 'flex' : 'none', 'important');
    if (inDb) {
      tailorBtn.innerText = hasTailored ? 'Re-tailor' : 'Tailor';
    }
  }
}

function loadSettingsAndLocations() {
  sendExtensionMessage({ action: 'getSettings' }, (settingsResponse) => {
    if (settingsResponse && settingsResponse.success && settingsResponse.data) {
      currentSettings = settingsResponse.data;
      if (Array.isArray(currentSettings.targetLocations)) {
        targetLocationsList = currentSettings.targetLocations;
        updateLocationDropdownOptions();
        populateUIFields();
      }
    }
  });
}

function updateLocationDropdownOptions() {
  const selectLoc = document.getElementById('ajf-select-location');
  if (!selectLoc) return;
  let html = '<option value="" disabled>-- Select Location --</option>';
  targetLocationsList.forEach(loc => {
    html += `<option value="${loc}">${loc}</option>`;
  });
  html += '<option value="Other">Other</option>';
  selectLoc.innerHTML = html;
}

function normalizeJobUrl(url) {
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

function canonicalJobUrl(url) {
  if (!url) return '';
  if (url.includes('linkedin.com')) {
    const match = url.match(/currentJobId=(\d+)/);
    if (match) {
      return `https://www.linkedin.com/jobs/view/${match[1]}/`;
    }
    const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) {
      return `https://www.linkedin.com/jobs/view/${viewMatch[1]}/`;
    }
  }
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/(application|apply)\/?$/i, '').replace(/\/$/, '') || '/';
    u.search = '';
    u.hash = '';
    return `${u.origin}${u.pathname}`;
  } catch {
    return String(url).split('?')[0].replace(/\/(application|apply)\/?$/i, '').replace(/\/$/, '');
  }
}

function extractJobUuid(url) {
  const m = String(url || '').match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return m ? m[1].toLowerCase() : null;
}

function findJobInList(jobs, scraped) {
  if (!Array.isArray(jobs) || !scraped) return null;
  const pageKey = normalizeJobUrl(scraped.url);
  const pageUuid = extractJobUuid(scraped.url);
  return (
    jobs.find(
      (j) =>
        normalizeJobUrl(j.url) === pageKey ||
        (j.applicationUrl && normalizeJobUrl(j.applicationUrl) === pageKey)
    ) ||
    jobs.find(
      (j) =>
        (pageUuid && extractJobUuid(j.url) === pageUuid) ||
        (pageUuid && j.applicationUrl && extractJobUuid(j.applicationUrl) === pageUuid)
    ) ||
    jobs.find(
      (j) =>
        scraped.title &&
        scraped.company &&
        j.title?.trim().toLowerCase() === scraped.title.trim().toLowerCase() &&
        j.company?.trim().toLowerCase() === scraped.company.trim().toLowerCase()
    ) ||
    null
  );
}

function resolvePipelineJob(callback) {
  sendExtensionMessage(
    {
      action: 'lookupJob',
      url: currentScrapedJob.url,
      title: currentScrapedJob.title,
      company: currentScrapedJob.company
    },
    (lookup) => {
      if (lookup?.error && isExtensionDisconnectedError(lookup.error)) {
        callback(null, lookup.error);
        return;
      }
      if (lookup?.success && lookup.data) {
        applyJobToUI(lookup.data, { fromPipeline: true });
        callback(lookup.data, null);
        return;
      }
      sendExtensionMessage({ action: 'getJobs' }, (response) => {
        if (response?.error && isExtensionDisconnectedError(response.error)) {
          callback(null, response.error);
          return;
        }
        if (!response?.success || !Array.isArray(response.data)) {
          callback(null, lookup?.error || response?.error || 'Could not reach pipeline server (port 3004).');
          return;
        }
        const existing = findJobInList(response.data, currentScrapedJob);
        if (existing) {
          applyJobToUI(existing, { fromPipeline: true });
          callback(existing, null);
        } else {
          callback(null, 'not_found');
        }
      });
    }
  );
}

function applyJobToUI(job, { fromPipeline = false } = {}) {
  if (job) applyScoreCorrection(job, { persist: fromPipeline });
  currentScrapedJob = job;
  if (fromPipeline) pipelineLinked = true;
  populateUIFields();

  const instrInput = document.getElementById('ajf-job-custom-instructions');
  if (instrInput) {
    instrInput.value = job.customInstructions || '';
  }

  const statusBadge = document.getElementById('ajf-job-status');
  const status = (job.status || 'To Process').trim();
  const statusLabel =
    typeof job.suitabilityScore === 'number' ? `${status} · ${job.suitabilityScore}/10` : status;
  statusBadge.innerText = statusLabel;
  statusBadge.className = `ajf-badge ajf-badge-${status.toLowerCase().replace(/\s+/g, '-')}`;
  const scoreTitle = typeof job.suitabilityScore === 'number' ? `, fit ${job.suitabilityScore}/10` : '';
  statusBadge.setAttribute('title', `Pipeline status: ${status}${scoreTitle}`);

  const markAppliedBtnTop = document.getElementById('ajf-btn-mark-applied-top');
  const markSkippedBtnTop = document.getElementById('ajf-btn-mark-skipped-top');
  if (markAppliedBtnTop) markAppliedBtnTop.disabled = (status === 'Applied');
  if (markSkippedBtnTop) markSkippedBtnTop.disabled = (status === 'Skipped');

  const linkSection = document.getElementById('ajf-link-section');
  if (linkSection) {
    linkSection.style.display = (fromPipeline || pipelineLinked) ? 'none' : 'block';
    if (!fromPipeline && !pipelineLinked) {
      populatePipelineDropdown();
    }
  }

  updateTailorMetaDisplay(job);

  if (job && job.suitabilityAssessment) {
    setCollapsibleInsight('ajf-assess-section', stripScoreFromText(job.suitabilityAssessment));
  } else {
    setCollapsibleInsight('ajf-assess-section', '', { visible: false });
  }

  updateConnectMessagePreview(job);
  updateOutreachRoleContext(job);
  updateWorkflowRail(job);
  updateActionButtons();
  updateDynamicUI();
  updateRecruiterOutreachUI(job);
}

function updateActionButtons() {
  const job = currentScrapedJob;
  const inDb = pipelineLinked;
  const hasTailoredCv = !!job?.tailoredCv;
  const hasPdf = !!job?.pdfPath;
  const tailored = hasTailoredCv || hasPdf;

  const saveBtn = document.getElementById('ajf-btn-save');
  const tailorBtn = document.getElementById('ajf-btn-tailor');
  const autofillBtn = document.getElementById('ajf-btn-autofill');
  const downloadBtn = document.getElementById('ajf-btn-download-pdf');
  const hint = null; // hint removed from UI

  const isSavedForLater = job?.status === 'Saved';
  const saveLaterBtn = document.getElementById('ajf-btn-save-later');

  if (inDb && hasPdf) {
    saveBtn.innerText = 'Open PDF';
    saveBtn.disabled = false;
  } else if (inDb && isSavedForLater) {
    saveBtn.innerText = 'Prepare & apply';
    saveBtn.disabled = false;
  } else if (inDb) {
    saveBtn.innerText = 'Saved to Pipeline';
    saveBtn.disabled = true;
  } else {
    saveBtn.innerText = 'Save to Pipeline';
    saveBtn.disabled = false;
  }
  if (saveLaterBtn) {
    saveLaterBtn.style.display = !inDb ? 'block' : 'none';
  }
  tailorBtn.disabled = !pipelineCheckDone || !inDb;
  autofillBtn.disabled = !pipelineCheckDone || (!inDb && !isLinkedInEasyApplyOpen());
  downloadBtn.style.display = tailored ? 'flex' : 'none';
  downloadBtn.innerText = 'PDF';

  const coverSection = document.getElementById('ajf-cover-letter-section');
  const coverBtn = document.getElementById('ajf-btn-cover-letter');
  const coverPreviewWrap = document.getElementById('ajf-cover-letter-preview-wrap');
  const coverPreview = document.getElementById('ajf-cover-letter-preview');

  if (coverBtn) {
    coverBtn.style.display = inDb ? 'flex' : 'none';
    if (generatingCoverLetter) {
      coverBtn.innerHTML = '…';
      coverBtn.disabled = true;
    } else if (job?.coverLetter) {
      coverBtn.innerHTML = 'Copy';
      coverBtn.disabled = false;
      coverBtn.title = 'Copy cover letter';
    } else {
      coverBtn.innerHTML = 'Letter';
      coverBtn.disabled = !tailored;
      coverBtn.title = tailored ? 'Generate cover letter' : 'Tailor CV first';
    }
  }
  if (coverSection) {
    coverSection.style.display = inDb && job?.coverLetter ? 'block' : 'none';
  }
  if (coverPreviewWrap && coverPreview) {
    if (job?.coverLetter) {
      coverPreviewWrap.style.display = 'block';
      coverPreview.value = job.coverLetter;
    } else {
      coverPreviewWrap.style.display = 'none';
      coverPreview.value = '';
    }
  }

  tailorBtn.title = inDb ? 'Generate tailored CV' : 'Save to pipeline first';
  autofillBtn.title = 'Fill this application form';

  updateConnectMessagePreview(job);
  updateOutreachRoleContext(job);
  updateWorkflowRail(job);
  updateInsightsStackVisibility();
}

function finishPipelineCheck() {
  pipelineCheckDone = true;
  updateActionButtons();
  updateDynamicUI();
}

const OFF_TARGET_TITLE_KEYWORDS = [
  'machinery', 'mechanical', 'mining', 'construction', 'civil engineering',
  'hardware engineer', 'warehouse', 'manufacturing', 'automotive technician',
  'diesel', 'heavy equipment', 'trades', 'electrician', 'plumber'
];

const NON_PM_TITLE_KEYWORDS = [
  'operations', 'operator', 'project manager', 'program manager', 'analyst',
  'scrum', 'coordinator', 'specialist', 'assistant', 'intern', 'support',
  'recruiter', 'consultant', 'engineer', 'developer', 'sales', 'marketing'
];

const LOW_FIT_SCORE_THRESHOLD = 5;

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

function hasMeaningfulJobDescription(desc = '', title = '') {
  const clean = sanitizeJobDescriptionForAssessment(desc, title);
  return !!(clean && clean.length >= 150 && !isLinkedInFeedPollutedDescription(clean));
}

function correctSuitabilityScore({
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

function applyScoreCorrection(job, { persist = false } = {}) {
  if (!job || typeof job.suitabilityScore !== 'number') return job;
  const profile = currentSettings?.profile || {};
  const cleanDesc = sanitizeJobDescriptionForAssessment(job.description || '', job.title || '');
  const corrected = correctSuitabilityScore({
    score: job.suitabilityScore,
    jobTitle: job.title || '',
    companyName: job.company || '',
    jobDescription: cleanDesc,
    profile
  });
  if (corrected !== job.suitabilityScore) {
    job.suitabilityScore = corrected;
    if (persist && pipelineLinked && job.id) {
      sendExtensionMessage({
        action: 'updateJob',
        jobId: job.id,
        updates: { suitabilityScore: corrected }
      });
    }
  }
  return job;
}

function isCoreProductRoleTitle(title = '') {
  const t = String(title).toLowerCase().trim();
  if (!t.includes('product')) return false;
  for (const ex of NON_PM_TITLE_KEYWORDS) {
    if (t.includes(ex)) return false;
  }
  const matches = ['manager', 'lead', 'director', 'head', 'vp', 'chief', 'owner', 'principal'];
  return matches.some((m) => t.includes(m)) || t === 'product manager' || t === 'product owner' || t === 'product lead';
}

function getJobFitWarning(job = {}) {
  const title = (job.title || '').trim();
  const titleLower = title.toLowerCase();

  const descLower = String(job.description || '').toLowerCase();
  if (/mining contractor|built specifically for mining|heavy equipment|machinery\b/i.test(descLower)
    && !/fintech|payments|banking/i.test(descLower)) {
    return {
      level: 'warning',
      message: 'JD is mining/construction SaaS — not your core domain. Assessment already flags gaps; apply only if you want this lane.'
    };
  }

  if (title && OFF_TARGET_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw))) {
    return {
      level: 'danger',
      message: `Off-target role (“${title}”) — looks like machinery/industrial, not product. Skip unless you mean it.`
    };
  }

  if (title && !isCoreProductRoleTitle(title)) {
    return {
      level: 'danger',
      message: `Not a core PM title (“${title}”). You almost applied to the wrong job yesterday — hit Skip.`
    };
  }

  return null;
}

function shouldProceedDespiteLowFit() {
  return true;
}

function refreshPipelineOnOpen() {
  const fresh = extractJobDetails();
  const jobUrl = getLinkedInJobPageUrl() || canonicalJobUrl(fresh.url || window.location.href);

  if (!currentScrapedJob) {
    currentScrapedJob = fresh;
  } else if (pipelineLinked) {
    // Keep pipeline title/CV/assessment — only refresh URL + company hint from Easy Apply modal
    currentScrapedJob.url = jobUrl;
    if (fresh.company && (!currentScrapedJob.company || currentScrapedJob.company === 'Unknown')) {
      currentScrapedJob.company = fresh.company;
    }
    if (
      hasMeaningfulJobDescription(fresh.description, fresh.title) &&
      (!hasMeaningfulJobDescription(currentScrapedJob.description, currentScrapedJob.title) ||
        sanitizeJobDescriptionForAssessment(fresh.description, fresh.title).length >
          sanitizeJobDescriptionForAssessment(currentScrapedJob.description, currentScrapedJob.title).length)
    ) {
      currentScrapedJob.description = fresh.description;
    }
  } else {
    currentScrapedJob.url = jobUrl;
    if (fresh.title && fresh.title !== 'Job Opportunity') currentScrapedJob.title = fresh.title;
    if (fresh.company) currentScrapedJob.company = fresh.company;
    if (
      hasMeaningfulJobDescription(fresh.description, fresh.title) &&
      (!hasMeaningfulJobDescription(currentScrapedJob.description, currentScrapedJob.title) ||
        sanitizeJobDescriptionForAssessment(fresh.description, fresh.title).length >
          sanitizeJobDescriptionForAssessment(currentScrapedJob.description, currentScrapedJob.title).length)
    ) {
      currentScrapedJob.description = fresh.description;
    }
  }
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  populateUIFields();
  checkExistingJob();
}

function checkExistingJob() {
  pipelineCheckDone = false;
  updateActionButtons();
  logToConsole('Checking pipeline for this job…');

  resolvePipelineJob((job, err) => {
    if (job) {
      logToConsole(`✓ Linked to pipeline #${job.id} (${job.status || 'To Process'})`);
      if (job.suitabilityScore) {
        logToConsole(`Score: ${job.suitabilityScore}/10`);
      }
      if (job.pdfPath) {
        logToConsole('✓ Tailored PDF ready — Open PDF or Fill to apply.');
      } else if (job.tailoredCv) {
        logToConsole('✓ Tailored CV on file — run PDF if needed.');
      }
      if (job.status === 'Applied') {
        logToConsole('✓ Already applied — outreach tab for HM invite.');
      }
      const assessSection = document.getElementById('ajf-assess-section');
      if (job.suitabilityAssessment && assessSection) {
        assessSection.style.display = 'block';
      }
    } else if (err === 'not_found') {
      pipelineLinked = false;
      logToConsole('Not in pipeline yet — Save to Pipeline (or Auto) to add.');
      const linkSection = document.getElementById('ajf-link-section');
      if (linkSection) {
        linkSection.style.display = 'block';
        populatePipelineDropdown();
      }
    } else if (!isExtensionDisconnectedError(err)) {
      logToConsole(`✗ ${err}`);
    }
    finishPipelineCheck();
  });
}

function toggleSidebar() {
  const opening = !sidebarElement.classList.contains('ajf-open');
  sidebarElement.classList.toggle('ajf-open');
  if (opening) {
    refreshPipelineOnOpen();
  }
}

function getLogTone(message) {
  const msg = String(message || '');
  if (/^✓|successfully|complete|ready|linked to pipeline/i.test(msg)) return 'success';
  if (/^✗|failed|error/i.test(msg)) return 'error';
  if (/^⚠|warning/i.test(msg)) return 'warning';
  if (/^📨|^📇|^step \d/i.test(msg)) return 'info';
  return 'neutral';
}

function escapeLogHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderActivityFeed() {
  const section = document.getElementById('ajf-activity-section');
  const latestEl = document.getElementById('ajf-activity-latest');
  const countEl = document.getElementById('ajf-activity-count');
  const historyEl = document.getElementById('ajf-activity-history');
  const iconEl = document.getElementById('ajf-activity-icon');
  const toggle = document.getElementById('ajf-activity-toggle');

  if (!section) return;

  if (!activityLogs.length) {
    section.style.display = 'none';
    if (historyEl) historyEl.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  const latest = activityLogs[activityLogs.length - 1];
  const tone = getLogTone(latest);

  if (latestEl) {
    latestEl.textContent = latest;
    latestEl.className = `ajf-activity-latest ajf-activity-tone-${tone}`;
  }
  if (iconEl) {
    iconEl.textContent = tone === 'success' ? '✓' : tone === 'error' ? '✗' : tone === 'warning' ? '!' : '●';
    iconEl.className = `ajf-activity-icon ajf-activity-tone-${tone}`;
  }
  if (countEl) {
    countEl.textContent = activityLogs.length > 1 ? `${activityLogs.length} steps` : '';
  }
  if (historyEl) {
    historyEl.innerHTML = activityLogs
      .map((msg, i) => {
        const t = getLogTone(msg);
        const isLatest = i === activityLogs.length - 1;
        return `<div class="ajf-log-line ajf-activity-tone-${t}${isLatest ? ' ajf-log-line-latest' : ''}">${escapeLogHtml(msg)}</div>`;
      })
      .join('');
    if (activityExpanded) {
      historyEl.scrollTop = historyEl.scrollHeight;
    }
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(activityExpanded));
    const chevron = toggle.querySelector('.ajf-activity-chevron');
    if (chevron) chevron.textContent = activityExpanded ? '▼' : '▶';
  }
  if (historyEl) historyEl.hidden = !activityExpanded;
  if (section) section.classList.toggle('ajf-activity-expanded', activityExpanded);
}

function logToConsole(message) {
  activityLogs.push(String(message || ''));
  if (activityLogs.length > 50) activityLogs = activityLogs.slice(-50);
  renderActivityFeed();
}

function clearLogs() {
  activityLogs = [];
  activityExpanded = false;
  renderActivityFeed();
}

// SPA watcher delay/retry parsing engine
let spaTimer = null;
let retryCount = 0;
const MAX_RETRIES = 4;

function runSpaAutoReparse() {
  if (spaTimer) clearTimeout(spaTimer);
  retryCount = 0;

  const url = window.location.href;
  if (url.includes('linkedin.com/in/')) {
    // Clear profile helper UI fields to avoid stale display
    const nameInput = document.getElementById('ajf-profile-contact-name');
    if (nameInput) nameInput.value = 'Parsing name...';
    const outreachText = document.getElementById('ajf-profile-outreach-text');
    if (outreachText) outreachText.value = '';
    const statusSuccess = document.getElementById('ajf-profile-crm-status');
    if (statusSuccess) statusSuccess.style.display = 'none';

    spaTimer = setTimeout(attemptReparse, 800);
    return;
  }

  // Clear UI fields immediately to avoid stale data display
  const titleInput = document.getElementById('ajf-input-title');
  if (titleInput) titleInput.value = 'Loading job details...';
  const companyInput = document.getElementById('ajf-input-company');
  if (companyInput) companyInput.value = '';
  const isRecruiterInput = document.getElementById('ajf-input-is-recruiter');
  if (isRecruiterInput) isRecruiterInput.checked = false;
  const locationInput = document.getElementById('ajf-input-location');
  if (locationInput) locationInput.value = '';
  const hmInput = document.getElementById('ajf-input-hiring-manager');
  if (hmInput) hmInput.value = '';
  const hmStatus = document.getElementById('ajf-hm-capture-status');
  if (hmStatus) {
    hmStatus.style.display = 'none';
    hmStatus.textContent = '';
  }
  const openHmBtn = document.getElementById('ajf-btn-open-hm-profile');
  if (openHmBtn) openHmBtn.style.display = 'none';
  const statusBadge = document.getElementById('ajf-job-status');
  if (statusBadge) {
    statusBadge.innerText = 'Checking...';
    statusBadge.className = 'ajf-badge ajf-badge-to-process';
  }

  spaTimer = setTimeout(attemptReparse, 800);
}

function attemptReparse() {
  const url = window.location.href;
  if (url.includes('linkedin.com/in/')) {
    // Toggle sidebar views
    const jobContent = document.getElementById('ajf-job-view-content');
    const profileContent = document.getElementById('ajf-profile-helper-view');
    if (jobContent) jobContent.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';

    setupProfileOutreachView();
    setTimeout(checkPendingConnectInviteOnProfile, 1200);
    return;
  }

  // Toggle sidebar views
  const jobContent = document.getElementById('ajf-job-view-content');
  const profileContent = document.getElementById('ajf-profile-helper-view');
  if (jobContent) jobContent.style.display = 'block';
  if (profileContent) profileContent.style.display = 'none';

  const scraped = extractJobDetails();
  const titleEmpty = !scraped.title || scraped.title === 'Job Opportunity' || scraped.title.trim().length === 0;
  const descEmpty = !hasMeaningfulJobDescription(scraped.description, scraped.title);

  // Detect if the DOM content is identical to the previously active job, which indicates the SPA hasn't hydrated/rendered the new job details yet
  const isDuplicateOfCurrent = currentScrapedJob &&
    scraped.title === currentScrapedJob.title &&
    scraped.company === currentScrapedJob.company &&
    scraped.description === currentScrapedJob.description;

  if ((titleEmpty || descEmpty || isDuplicateOfCurrent) && retryCount < MAX_RETRIES) {
    retryCount++;
    const waitReason = descEmpty && scraped.description
      ? 'Waiting for job description (ignoring jobs feed noise)'
      : 'Waiting for page content to load';
    logToConsole(`${waitReason} (Retry ${retryCount}/${MAX_RETRIES})...`);
    spaTimer = setTimeout(attemptReparse, 500);
    return;
  }

  if (url.includes('linkedin.com') && isLinkedInEasyApplyOpen()) {
    logToConsole('Easy Apply open — loading saved pipeline job (not re-scraping modal).');
    const easyApply = parseLinkedInEasyApplyHeader();
    if (!currentScrapedJob) currentScrapedJob = scraped;
    currentScrapedJob.url = getLinkedInJobPageUrl() || canonicalJobUrl(currentScrapedJob.url);
    if (easyApply.company) currentScrapedJob.company = easyApply.company;
    populateUIFields();
    updateActionButtons();
    checkExistingJob();
    return;
  }

  logToConsole('Job details extracted successfully from page.');
  pipelineLinked = false;
  pipelineCheckDone = false;
  clearChat();
  currentScrapedJob = scraped;
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  populateUIFields();
  if (url.includes('linkedin.com')) {
    syncHiringManagerFromPage({ autoSave: false, silent: true });
    setupHiringManagerObserver();
  }
  updateActionButtons();
  checkExistingJob();
}

function handleReparseJob() {
  clearLogs();
  logToConsole('Manually re-parsing page details...');
  pipelineLinked = false;
  pipelineCheckDone = false;
  clearChat();

  const url = window.location.href;
  if (url.includes('linkedin.com/in/')) {
    attemptReparse();
    showToast('Profile page re-parsed successfully!');
    return;
  }

  currentScrapedJob = extractJobDetails();
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  populateUIFields();
  if (url.includes('linkedin.com')) {
    syncHiringManagerFromPage({ force: true, autoSave: pipelineLinked, silent: false });
    setupHiringManagerObserver();
  }
  updateActionButtons();
  checkExistingJob();
  showToast('Page re-parsed successfully!');
}

function getLinkedInProfileName() {
  const selectors = [
    'h1.text-heading-xlarge',
    '.pv-text-details__left-panel h1',
    '.pv-top-card-layout__title',
    'h1'
  ];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.innerText.trim();
      if (text && text.length < 100) {
        const cleaned = extractCleanName(text);
        if (cleaned && cleaned !== 'LinkedIn' && !cleaned.toLowerCase().includes('sign in')) {
          return cleaned;
        }
      }
    }
  }

  const title = document.title;
  if (title && title.includes('|')) {
    const namePart = title.split('|')[0].trim();
    if (namePart && namePart.toLowerCase() !== 'linkedin') {
      return extractCleanName(namePart);
    }
  }
  if (title && title.includes('-')) {
    const namePart = title.split('-')[0].trim();
    if (namePart && namePart.toLowerCase() !== 'linkedin') {
      return extractCleanName(namePart);
    }
  }
  return '';
}

function cleanProfileNameForTemplate(fullName) {
  if (!fullName) return '';
  let name = fullName.replace(/\s*\([^)]*\)/g, '');
  name = name.replace(/,\s*(?:Ph\.?D\.?|PMP|MBA|M\.?S\.?|B\.?S\.?)\b/gi, '');
  name = name.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
  name = extractCleanName(name);
  return name;
}

function shortRoleTitle(title = '') {
  return String(title)
    .replace(/\s*[-–—|]\s*(software delivery|hybrid|remote|sydney|melbourne).*/i, '')
    .trim() || title;
}

function isRecruiterPosting(company = '', isRecruiter = false) {
  if (isRecruiter) return true;
  const lower = String(company).toLowerCase();
  return RECRUITER_AGENCIES.some((agency) => lower.includes(agency));
}

function formatOutreachWorkRightsLine(visa = '') {
  const v = String(visa || currentSettings?.profile?.visa || '').trim();
  if (/pr|permanent resident/i.test(v)) {
    return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
  }
  if (v) return `${v} — looking forward to connect.`;
  return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
}

function isStaleOutreachIntro(intro = '') {
  const t = String(intro);
  return (
    /Happy to chat if useful/i.test(t) ||
    (/Eugene here — just applied/i.test(t) && !/PR|visa|relocat|work rights/i.test(t))
  );
}

function buildQuickOutreachMessage({
  title = '',
  company = '',
  contactFirstName = '',
  isRecruiter = false,
  visa = ''
} = {}) {
  const first = (contactFirstName || '').trim().split(/\s+/)[0];
  const greeting = first ? `Hey ${first},` : 'Hey,';
  const role = shortRoleTitle(title) || 'this role';
  const recruiter = isRecruiterPosting(company, isRecruiter);
  const workRights = formatOutreachWorkRightsLine(visa);

  let body;
  if (recruiter) {
    body = `Eugene here — just applied for the ${role} role that you posted. ${workRights}`;
  } else {
    const atCompany = company ? ` at ${company}` : '';
    body = `Eugene here — just applied for the ${role} role${atCompany}. ${workRights}`;
  }

  return `${greeting}\n\n${body}`.slice(0, 300);
}

function getHiringManagerProfileUrl() {
  const raw = currentScrapedJob?.hiringManager || document.getElementById('ajf-input-hiring-manager')?.value || '';
  return raw.startsWith('http') ? normalizeLinkedInProfileUrl(raw) || raw : '';
}

function resolveHiringManagerFirstName(job = currentScrapedJob) {
  if (!job) return '';
  if (job.hiringManagerName) {
    return cleanProfileNameForTemplate(job.hiringManagerName).split(/\s+/)[0] || '';
  }
  const hm = (job.hiringManager || '').trim();
  if (hm && !hm.startsWith('http')) {
    return cleanProfileNameForTemplate(hm).split(/\s+/)[0] || '';
  }
  const profileUrl = normalizeLinkedInProfileUrl(hm);
  const onProfile = window.location.href.includes('linkedin.com/in/');
  if (onProfile && profileUrl && normalizeLinkedInProfileUrl(window.location.href) === profileUrl) {
    return cleanProfileNameForTemplate(getLinkedInProfileName()).split(/\s+/)[0] || '';
  }
  return '';
}

function isJobRecruiterPosting(job = {}) {
  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  return isRecruiterPosting(job.company, job.isRecruiter || isRecruiterBox?.checked);
}

function buildJobConnectMessage(job = currentScrapedJob) {
  if (!job) return '';
  return buildQuickOutreachMessage({
    title: job.title,
    company: job.company,
    contactFirstName: resolveHiringManagerFirstName(job),
    isRecruiter: isJobRecruiterPosting(job)
  });
}

function updateConnectMessagePreview(job = currentScrapedJob) {
  const preview = document.getElementById('ajf-connect-message-preview');
  if (!preview) return;
  if (!job) {
    preview.value = '';
    return;
  }
  const savedIntro = job.hiringManagerIntro;
  preview.value = (savedIntro && !isStaleOutreachIntro(savedIntro))
    ? savedIntro
    : (buildJobConnectMessage(job) || '');
}

function isCopilotElementVisible(el) {
  if (!el) return false;
  if (el.style.display === 'none') return false;
  const cs = window.getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
}

function updateInsightsStackVisibility() {
  const stack = document.getElementById('ajf-block-apply');
  if (!stack) return;
  const hasVisible = [...stack.children].some(isCopilotElementVisible);
  stack.classList.toggle('ajf-insights-empty', !hasVisible);
}

function updateOutreachRoleContext(job = currentScrapedJob) {
  const el = document.getElementById('ajf-outreach-role-context');
  const captureBtn = document.getElementById('ajf-btn-capture-hm');
  const hmInput = document.getElementById('ajf-input-hiring-manager');
  if (!el) return;
  const title = (job?.title || document.getElementById('ajf-input-title')?.value || '').trim();
  const company = (job?.company || document.getElementById('ajf-input-company')?.value || '').trim();
  const recruiter = isJobRecruiterPosting(job || {});

  if (captureBtn) {
    captureBtn.innerText = recruiter ? 'Capture recruiter' : 'Capture HM';
  }
  if (hmInput && !hmInput.value) {
    hmInput.placeholder = recruiter ? 'Recruiter LinkedIn /in/ profile' : 'LinkedIn /in/ profile';
  }

  if (!title && !company) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const roleLine = company ? `${title} · ${company}` : title;
  el.textContent = recruiter ? `Recruiter · ${roleLine}` : roleLine;
}

function updateWorkflowRail(job = currentScrapedJob) {
  const rail = document.getElementById('ajf-workflow-rail');
  if (!rail) return;

  const inDb = pipelineLinked;
  const tailored = !!(job?.tailoredCv || job?.pdfPath);
  const status = (job?.status || '').trim();
  const applied = status === 'Applied';

  let active = 'job';
  if (inDb && applied) active = 'outreach';
  else if (inDb && tailored) active = 'apply';
  else if (inDb) active = 'tailor';
  else if (job?.title || job?.company) active = 'job';

  rail.querySelectorAll('.ajf-workflow-pill').forEach((pill) => {
    const step = pill.dataset.step;
    pill.classList.toggle('ajf-workflow-pill-active', step === active);
    pill.classList.toggle('ajf-workflow-pill-done', (
      (step === 'job' && inDb) ||
      (step === 'tailor' && tailored) ||
      (step === 'apply' && applied) ||
      (step === 'outreach' && applied && getHiringManagerProfileUrl())
    ));
  });

  ['job', 'tailor', 'apply', 'outreach'].forEach((step) => {
    const block = document.getElementById(`ajf-block-${step}`);
    if (block) block.classList.toggle('ajf-flow-block-active', step === active);
  });
}

function persistHiringManagerIntro(job, msg) {
  if (!job || !msg) return;
  job.hiringManagerIntro = msg;
  if (!job.id) return;
  sendExtensionMessage({
    action: 'updateJob',
    jobId: job.id,
    updates: { hiringManagerIntro: msg, hiringManagerName: job.hiringManagerName || '' }
  });
}

async function attemptLinkedInConnectAutofill(message, { maxAttempts = 12 } = {}) {
  if (!message || !window.location.href.includes('linkedin.com/in/')) {
    return { success: false, error: 'Not on a LinkedIn profile page' };
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clickEl = (el) => {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.click();
    return true;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const connectBtn = [...document.querySelectorAll('button, a[role="button"]')].find((el) => {
      if (isInsideExtensionUI(el)) return false;
      const label = `${el.getAttribute('aria-label') || ''} ${el.innerText || ''}`.toLowerCase();
      return (/invite/i.test(label) && /connect/i.test(label)) || label.trim() === 'connect';
    });

    if (connectBtn && !document.querySelector('textarea#custom-message, textarea[name="message"]')) {
      clickEl(connectBtn);
      await sleep(600);
    }

    const addNoteBtn = [...document.querySelectorAll('button, a[role="button"]')].find((el) => {
      const label = `${el.getAttribute('aria-label') || ''} ${el.innerText || ''}`.toLowerCase();
      return label.includes('add a note') || label.includes('add note');
    });
    if (addNoteBtn) {
      clickEl(addNoteBtn);
      await sleep(400);
    }

    const textarea = document.querySelector(
      'textarea#custom-message, textarea[name="message"], textarea[aria-label*="message" i], textarea[aria-label*="note" i]'
    );
    if (textarea) {
      textarea.focus();
      textarea.value = message;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true };
    }

    await sleep(500);
  }

  return { success: false, error: 'Could not find LinkedIn invite note field — paste manually' };
}

function handleFillLinkedInInvite() {
  const outreachText = document.getElementById('ajf-profile-outreach-text');
  const message = outreachText?.value?.trim() || '';
  if (!message) {
    showToast('No invite message — select a job first');
    return;
  }
  logToConsole('Filling LinkedIn connection invite note...');
  attemptLinkedInConnectAutofill(message).then((result) => {
    if (result.success) {
      showToast('Invite note pasted — review and click Send');
      logToConsole('✓ LinkedIn invite note filled. Review and click Send.');
    } else {
      showToast(result.error || 'Could not autofill invite');
      logToConsole(`✗ ${result.error || 'Invite autofill failed'}`);
      navigator.clipboard.writeText(message).catch(() => {});
    }
  });
}

function handleSendHmInvite() {
  if (!currentScrapedJob) return;
  const profileUrl = getHiringManagerProfileUrl();
  if (!profileUrl) {
    showToast('Capture hiring manager profile first');
    return;
  }

  const msg = buildJobConnectMessage(currentScrapedJob);
  persistHiringManagerIntro(currentScrapedJob, msg);
  updateConnectMessagePreview(currentScrapedJob);

  navigator.clipboard.writeText(msg).then(() => {
    showToast('Invite copied — opening profile…');
  }).catch(() => showToast('Opening profile to send invite…'));

  sendExtensionMessage({
    action: 'setPendingConnectInvite',
    invite: {
      profileUrl,
      jobId: currentScrapedJob.id || '',
      message: msg
    }
  }, () => {
    sendExtensionMessage({ action: 'openTab', url: profileUrl });
    logToConsole(`📨 Opened HM profile — invite will auto-fill when page loads.`);
    logToConsole(`Message: ${msg.replace(/\n/g, ' ')}`);
  });
}

function checkPendingConnectInviteOnProfile() {
  if (!window.location.href.includes('linkedin.com/in/')) return;

  sendExtensionMessage({ action: 'getPendingConnectInvite' }, async (response) => {
    const invite = response?.data;
    if (!invite?.profileUrl || !invite?.message) return;

    const currentProfile = normalizeLinkedInProfileUrl(window.location.href);
    const targetProfile = normalizeLinkedInProfileUrl(invite.profileUrl);
    if (!currentProfile || currentProfile !== targetProfile) return;

    const profileName = cleanProfileNameForTemplate(getLinkedInProfileName());
    let message = invite.message;
    let jobContext = currentScrapedJob;

    const applyJobContext = (job) => {
      if (!job) return;
      jobContext = job;
      if (profileName) {
        job.hiringManagerName = profileName;
      }
      const first = profileName ? profileName.split(/\s+/)[0] : resolveHiringManagerFirstName(job);
      message = buildQuickOutreachMessage({
        title: job.title,
        company: job.company,
        contactFirstName: first,
        isRecruiter: isRecruiterPosting(job.company, job.isRecruiter)
      });
      job.hiringManagerIntro = message;
      persistHiringManagerIntro(job, message);
    };

    if (invite.jobId) {
      sendExtensionMessage({ action: 'getJobs' }, (jobsRes) => {
        const job = jobsRes?.data?.find((j) => j.id === invite.jobId);
        if (job) applyJobContext(job);
        finishPendingInvite(message);
      });
      return;
    }

    if (currentScrapedJob) applyJobContext(currentScrapedJob);
    finishPendingInvite(message);
  });

  function finishPendingInvite(message) {

    const outreachText = document.getElementById('ajf-profile-outreach-text');
    if (outreachText) outreachText.value = message;

    logToConsole('📨 Pending connect invite detected — filling LinkedIn note…');
    attemptLinkedInConnectAutofill(message).then((result) => {
      if (result.success) {
        showToast('Invite pasted — review and click Send');
        logToConsole('✓ LinkedIn invite note filled. Review and click Send.');
      } else {
        navigator.clipboard.writeText(message).catch(() => {});
        logToConsole('Copied invite to clipboard — click Add a note and paste');
      }
      sendExtensionMessage({ action: 'clearPendingConnectInvite' });
    });
  }
}

function updateTailorMetaDisplay(job) {
  const expSection = document.getElementById('ajf-tailor-explanation-section');
  const expText = document.getElementById('ajf-tailor-explanation');
  const modelEl = document.getElementById('ajf-tailor-model');
  const gapSection = document.getElementById('ajf-gap-section');
  const gapList = document.getElementById('ajf-gap-list');
  const gapBridge = document.getElementById('ajf-gap-bridge');
  if (!expSection || !expText) return;

  if (job?.tailoringExplanation) {
    setCollapsibleInsight('ajf-tailor-explanation-section', job.tailoringExplanation);
  } else {
    setCollapsibleInsight('ajf-tailor-explanation-section', '', { visible: false });
  }

  const gaps = Array.isArray(job?.experienceGaps) ? job.experienceGaps.filter(Boolean) : [];
  const bridge = (job?.gapBridgeNote || '').trim();
  const highlights = Array.isArray(job?.transferableHighlights) ? job.transferableHighlights.filter(Boolean) : [];

  if (gapSection && gapList && gapBridge) {
    const hasContent = gaps.length || bridge || highlights.length;
    if (hasContent) {
      gapList.textContent = gaps.length
        ? `Domain gaps (JD vs your background):\n${gaps.map((g) => `• ${g}`).join('\n')}`
        : '';
      const bridgeParts = [];
      if (bridge) bridgeParts.push(`Cover letter bridge:\n${bridge}`);
      if (highlights.length) {
        bridgeParts.push(`Transferable proof:\n${highlights.map((h) => `• ${h}`).join('\n')}`);
      }
      gapBridge.textContent = bridgeParts.join('\n\n');
      gapSection.style.display = 'block';
    } else {
      gapList.textContent = '';
      gapBridge.textContent = '';
      gapSection.style.display = 'none';
    }
  }

  if (modelEl) {
    const parts = [];
    if (job?.tailoredByModel) parts.push(`CV: ${job.tailoredByModel}`);
    if (job?.coverLetterByModel) parts.push(`Letter: ${job.coverLetterByModel}`);
    modelEl.textContent = parts.length ? parts.join(' · ') : '';
  }

  updateInsightsStackVisibility();
}

function handleCoverLetterAction() {
  if (generatingCoverLetter || !currentScrapedJob) return;

  if (currentScrapedJob.coverLetter) {
    navigator.clipboard.writeText(currentScrapedJob.coverLetter);
    showToast('Cover letter copied');
    return;
  }

  if (!currentScrapedJob.id) {
    showToast('Save to pipeline first');
    return;
  }
  if (!currentScrapedJob.tailoredCv) {
    showToast('Tailor CV first');
    return;
  }

  generatingCoverLetter = true;
  updateActionButtons();
  logToConsole('Generating cover letter…');

  const customInstructionsInput = document.getElementById('ajf-job-custom-instructions');
  const customInstructions = customInstructionsInput ? customInstructionsInput.value : '';

  sendExtensionMessage({
    action: 'generateCoverLetter',
    jobId: currentScrapedJob.id,
    customInstructions
  }, (response) => {
    generatingCoverLetter = false;
    if (response?.success && response.data?.coverLetter) {
      currentScrapedJob.coverLetter = response.data.coverLetter;
      if (response.data.coverLetterByModel) {
        currentScrapedJob.coverLetterByModel = response.data.coverLetterByModel;
      }
      navigator.clipboard.writeText(response.data.coverLetter);
      logToConsole(`✓ Cover letter ready (${response.data.coverLetterByModel || 'AI'})`);
      showToast('Cover letter generated and copied');
    } else {
      logToConsole(`✗ Cover letter failed: ${response?.error || 'Unknown error'}`);
      showToast('Cover letter generation failed');
    }
    updateActionButtons();
  });
}

function handleQuickConnectMessage() {
  if (!currentScrapedJob) return;
  const msg = buildJobConnectMessage(currentScrapedJob);
  currentScrapedJob.hiringManagerIntro = msg;
  updateConnectMessagePreview(currentScrapedJob);
  navigator.clipboard.writeText(msg).then(() => {
    showToast('Connect message copied!');
  }).catch(() => showToast('Copy from message preview above'));

  updateActionButtons();
  persistHiringManagerIntro(currentScrapedJob, msg);
}

function updateOutreachTemplate() {
  const select = document.getElementById('ajf-profile-job-select');
  if (!select) return;
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption || !selectedOption.value) {
    document.getElementById('ajf-profile-outreach-text').value = '';
    return;
  }

  const company = selectedOption.dataset.company || '';
  const role = selectedOption.dataset.title || '';
  const rawName = document.getElementById('ajf-profile-contact-name').value || '';
  const cleanName = cleanProfileNameForTemplate(rawName);

  const isRecruiter = selectedOption?.dataset?.isRecruiter === 'true';
  document.getElementById('ajf-profile-outreach-text').value = buildQuickOutreachMessage({
    title: role,
    company,
    contactFirstName: cleanName,
    isRecruiter
  });
}

function setupProfileOutreachView() {
  const rawName = getLinkedInProfileName();
  const cleanName = cleanProfileNameForTemplate(rawName);

  const nameInput = document.getElementById('ajf-profile-contact-name');
  if (nameInput) {
    nameInput.value = cleanName || 'Hiring Manager';
  }

  const jobSelect = document.getElementById('ajf-profile-job-select');
  if (jobSelect) {
    jobSelect.innerHTML = '<option value="">-- Loading Applied Jobs --</option>';
  }

  sendExtensionMessage({ action: 'getJobs' }, (response) => {
    if (response && response.success && Array.isArray(response.data)) {
      const jobs = response.data;

      const sortedJobs = jobs.sort((a, b) => {
        const statusA = a.status || '';
        const statusB = b.status || '';
        if (statusA === 'Applied' && statusB !== 'Applied') return -1;
        if (statusA !== 'Applied' && statusB === 'Applied') return 1;

        const dateA = new Date(a.updatedAt || a.scrapedAt || 0);
        const dateB = new Date(b.updatedAt || b.scrapedAt || 0);
        return dateB - dateA;
      });

      if (jobSelect) {
        jobSelect.innerHTML = '';
        if (sortedJobs.length === 0) {
          jobSelect.innerHTML = '<option value="">No jobs found in pipeline</option>';
        } else {
          let bestMatchId = '';
          const pageText = document.body.innerText.toLowerCase();

          sortedJobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `[${job.status || 'To Process'}] ${job.company || 'Unknown'} - ${job.title || 'Unknown'}`;
            option.dataset.company = job.company || '';
            option.dataset.title = job.title || '';
            option.dataset.isRecruiter = String(isRecruiterPosting(job.company, job.isRecruiter));
            jobSelect.appendChild(option);

            const hmUrl = normalizeLinkedInProfileUrl(job.hiringManager || '');
            const pageProfile = normalizeLinkedInProfileUrl(window.location.href);
            if (hmUrl && pageProfile && hmUrl === pageProfile) {
              bestMatchId = job.id;
            } else if (job.company && job.company.length > 2 && !bestMatchId) {
              if (pageText.includes(job.company.toLowerCase())) {
                bestMatchId = job.id;
              }
            }
          });

          if (bestMatchId) {
            jobSelect.value = bestMatchId;
          } else {
            jobSelect.value = sortedJobs[0].id;
          }
        }
      }

      updateOutreachTemplate();
    } else {
      if (jobSelect) {
        jobSelect.innerHTML = '<option value="">Failed to load jobs</option>';
      }
    }
  });
}

function setupProfileHelperEvents() {
  const nameInput = document.getElementById('ajf-profile-contact-name');
  const jobSelect = document.getElementById('ajf-profile-job-select');
  const statusSelect = document.getElementById('ajf-profile-contact-status');
  const copyBtn = document.getElementById('ajf-btn-copy-profile-message');

  if (nameInput) {
    nameInput.addEventListener('input', updateOutreachTemplate);
  }
  if (jobSelect) {
    jobSelect.addEventListener('change', updateOutreachTemplate);
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', updateOutreachTemplate);
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', handleCopyAndSaveProfileOutreach);
  }
}

function handleCopyAndSaveProfileOutreach() {
  const outreachText = document.getElementById('ajf-profile-outreach-text').value || '';
  if (!outreachText) {
    showToast('No outreach message to copy!');
    return;
  }

  navigator.clipboard.writeText(outreachText).then(() => {
    showToast('Message copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy to clipboard');
  });

  const rawName = document.getElementById('ajf-profile-contact-name').value || '';
  const cleanName = cleanProfileNameForTemplate(rawName);
  const nameParts = cleanName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const jobSelect = document.getElementById('ajf-profile-job-select');
  const selectedOption = jobSelect.options[jobSelect.selectedIndex];
  const company = selectedOption ? (selectedOption.dataset.company || '') : '';
  const role = selectedOption ? (selectedOption.dataset.title || '') : '';
  const jobId = jobSelect ? (jobSelect.value || '') : '';

  const statusSelect = document.getElementById('ajf-profile-contact-status');
  const status = statusSelect ? statusSelect.value : 'Waiting';
  const now = new Date().toISOString();
  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 7);

  const contact = {
    firstName,
    lastName,
    company,
    jobId,
    jobTitle: role,
    profileUrl: window.location.href.split('?')[0].split('#')[0],
    threadUrl: '',
    lastOutboundDate: now,
    lastOutboundSnippet: outreachText,
    lastInboundDate: '',
    lastInboundSnippet: '',
    followUpNeeded: status === 'To Contact' || status === 'Follow Up Needed',
    status,
    inviteSentAt: (status === 'Waiting' || status === 'Invite Sent') ? now : '',
    nextFollowUpAt: (status === 'Waiting' || status === 'Invite Sent') ? followUp.toISOString() : '',
    followUpCount: 0,
    notes: `Outreach for ${role} role at ${company}. Sent message: "${outreachText}"`
  };

  const statusMsg = document.getElementById('ajf-profile-crm-status');
  if (statusMsg) {
    statusMsg.innerText = '⌛ Saving to Contacts CRM...';
    statusMsg.style.display = 'block';
    statusMsg.style.background = 'rgba(245, 158, 11, 0.1)';
    statusMsg.style.color = '#f59e0b';
  }

  sendExtensionMessage({ action: 'addContact', contact }, (response) => {
    if (response && response.success) {
      showToast('✓ Saved to CRM!');
      if (statusMsg) {
        statusMsg.innerText = '✓ Message Copied & Saved to Contacts CRM!';
        statusMsg.style.background = 'rgba(16, 185, 129, 0.1)';
        statusMsg.style.color = '#10b981';
        statusMsg.style.display = 'block';
        setTimeout(() => {
          statusMsg.style.display = 'none';
        }, 5000);
      }
    } else {
      showToast('Failed to save to CRM');
      if (statusMsg) {
        statusMsg.innerText = `✗ Save failed: ${response?.error || 'Unknown error'}`;
        statusMsg.style.background = 'rgba(239, 68, 68, 0.1)';
        statusMsg.style.color = '#ef4444';
        statusMsg.style.display = 'block';
      }
    }
  });
}

function isBadCompanyName(name) {
  if (!name) return true;
  const lower = String(name).trim().toLowerCase();
  return !lower || lower === 'unknown' || lower === 'linkedin' || lower === 'jobs' || lower.length < 2;
}

function getLinkedInJobTopCard() {
  return document.querySelector('.job-details-jobs-unified-top-card') ||
    document.querySelector('.jobs-unified-top-card') ||
    document.querySelector('.jobs-details-top-card') ||
    document.querySelector('.jobs-search-top-card') ||
    document.querySelector('.job-details-panel') ||
    null;
}

function getLinkedInCompany() {
  const topCard = getLinkedInJobTopCard() || document;

  const selectors = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name-link',
    '.jobs-details-top-card__company-name a',
    '.jobs-details-top-card__company-name',
    '.jobs-search-top-card__company-name a',
    '.jobs-search-top-card__company-name',
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
    'a[data-tracking-control-name="jobdetails_topcard_org_name"]',
    '[data-test-job-details-company-name] a',
    '[data-test-job-details-company-name]',
    '.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]',
    '.jobs-unified-top-card__subtitle-primary-grouping a[href*="/company/"]',
    'a.app-aware-link[href*="/company/"]'
  ];

  for (const sel of selectors) {
    const el = topCard.querySelector(sel) || document.querySelector(sel);
    if (!el) continue;
    const text = (el.innerText || el.textContent || '')
      .trim()
      .split('\n')[0]
      .split('·')[0]
      .trim()
      .replace(/ hiring now!/gi, '');
    if (!isBadCompanyName(text)) return text;
  }

  const pageTitle = document.title || '';
  if (pageTitle.includes('|')) {
    const parts = pageTitle.split('|').map((p) => p.trim());
    if (parts.length >= 3 && /linkedin/i.test(parts[parts.length - 1])) {
      const fromTitle = parts[parts.length - 2];
      if (!isBadCompanyName(fromTitle)) return fromTitle.replace(/ hiring now!/gi, '');
    }
    if (parts.length >= 2 && !isBadCompanyName(parts[1])) {
      return parts[1].replace(/ hiring now!/gi, '');
    }
  }

  if (pageTitle.includes(' at ')) {
    const candidate = pageTitle.split(' at ')[1]?.split(/[|\-–—]/)[0]?.trim();
    if (!isBadCompanyName(candidate)) return candidate.replace(/ hiring now!/gi, '');
  }

  return '';
}

function getLinkedInLocation() {
  const topCard = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane') ||
    document.querySelector('.jobs-unified-top-card') ||
    document.querySelector('.jobs-details-top-card') ||
    document.querySelector('.jobs-search-top-card') ||
    document.querySelector('.job-details-panel') ||
    document.querySelector('.job-view-layout') ||
    document;

  // Selectors to try first
  const selectors = [
    '.job-details-jobs-unified-top-card__primary-description-container span.tvm__text--low-emphasis:first-child',
    '.job-details-jobs-unified-top-card__primary-description-container',
    '.job-details-jobs-unified-top-card__bullet',
    '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text',
    '.job-details-jobs-unified-top-card__tertiary-description-container span span',
    '.jobs-unified-top-card__bullet',
    '.jobs-details-top-card__bullet',
    '.jobs-unified-top-card__bullet-point',
    '.job-details-jobs-unified-top-card__company-name-and-location',
    '[class*="primary-description-container"]',
    '[class*="tertiary-description-container"]',
    '[class*="company-name-and-location"]'
  ];

  for (const selector of selectors) {
    const el = topCard.querySelector(selector);
    if (el) {
      const text = el.innerText.trim();
      if (text && !text.includes('members') && !text.includes('employees') && text.length < 150) {
        // Remove trailing dots, newlines, etc.
        const clean = text.split('\n')[0].split('·')[0].trim();
        if (clean) return clean;
      }
    }
  }

  // Fallback pattern matching: search for elements containing middle dot and typical terms
  const spans = topCard.querySelectorAll('span, div, li');
  for (const span of spans) {
    if (span.children.length === 0) {
      const text = span.innerText.trim();
      if (text.includes('·') && (text.includes('ago') || text.includes('applicant') || text.includes('promoted') || text.includes('school'))) {
        const candidate = text.split('·')[0].trim();
        if (candidate && candidate.length < 100 && (candidate.includes('Australia') || candidate.toLowerCase().includes('sydney') || candidate.toLowerCase().includes('melbourne'))) {
          return candidate;
        }
      }
    }
  }

  // Just look for elements containing "Australia", "Sydney", or "Melbourne" in standard headers
  const possibleLocationElements = topCard.querySelectorAll('span, div');
  for (const el of possibleLocationElements) {
    if (el.children.length === 0 && el.innerText.trim().length < 80) {
      const text = el.innerText.trim();
      if (text.includes('Australia') || text.toLowerCase().includes('sydney') || text.toLowerCase().includes('melbourne')) {
        // Exclude things like "Promoted by hirer" or "Easy Apply"
        if (!text.toLowerCase().includes('apply') && !text.toLowerCase().includes('poster') && !text.toLowerCase().includes('hiring') && !text.toLowerCase().includes('review') && !text.toLowerCase().includes('mutual')) {
          return text;
        }
      }
    }
  }

  return '';
}

const HM_SECTION_HINTS = [
  'meet the hiring team',
  'hiring team',
  'hiring manager',
  'posted by'
];

const HM_EXCLUDE_SECTION_HINTS = [
  'people you can reach out to',
  'people in your network',
  'in my network',
  'in your network',
  'application status',
  'similar jobs',
  'more jobs',
  'people also viewed'
];

const HM_ROOT_SELECTORS = [
  '.job-view-layout',
  '.jobs-details',
  '.jobs-details__main-content',
  '#job-details',
  '.scaffold-layout__detail',
  'main'
];

const HM_CONTAINER_SELECTORS = [
  '.jobs-poster',
  '[class*="jobs-poster"]',
  '[class*="hirer-card"]',
  '[class*="hiring-team"]',
  '[class*="meet-the-hiring"]',
  '[data-view-name*="hirer"]',
  '[data-view-name*="hiring-team"]',
  '[data-view-name*="poster"]'
];

let hmObserver = null;
let hmObserverDebounce = null;

function normalizeLinkedInProfileUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim(), 'https://www.linkedin.com');
    if (!parsed.hostname.includes('linkedin.com')) return '';
    const match = parsed.pathname.match(/^\/in\/([^/?#]+)/i);
    if (!match || !match[1]) return '';
    return `https://www.linkedin.com/in/${match[1]}/`;
  } catch {
    const match = String(url).match(/linkedin\.com\/in\/([^/?#]+)/i);
    return match?.[1] ? `https://www.linkedin.com/in/${match[1]}/` : '';
  }
}

function isInsideExtensionUI(el) {
  return !!(el?.closest?.('#ajf-sidebar, #ajf-launcher, #ajf-indeed-launcher, .ajf-copilot-container'));
}

function getLinkedInJobDetailsRoot() {
  for (const selector of HM_ROOT_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return document;
}

function isOutreachSuggestionCard(cardText = '') {
  const t = String(cardText).toLowerCase();
  if (HM_EXCLUDE_SECTION_HINTS.some((hint) => t.includes(hint))) return true;
  if (t.includes('recently hired') && !t.includes('job poster')) return true;
  if (t.includes('mutual connection') && !t.includes('job poster') && !t.includes('hiring team')) {
    return true;
  }
  return false;
}

function getProfileCardForLink(link) {
  return link.closest(
    '.artdeco-card, li, [class*="entity-lockup"], [class*="lockup"], [class*="hirer-card"], .jobs-poster, [class*="jobs-poster"], [class*="hiring-team"]'
  ) || link.closest('div');
}

function extractNameFromProfileCard(link, card) {
  const nameEl = card?.querySelector?.(
    '.jobs-poster__name, .hirer-card__hirer-information, [class*="actor-name"], strong, [class*="name"]'
  );
  return extractCleanName(nameEl?.innerText || link.innerText || '');
}

function getSectionAfterHeader(headerEl) {
  if (!headerEl) return null;
  let sibling = headerEl.nextElementSibling;
  for (let i = 0; i < 4 && sibling; i++) {
    if (sibling.querySelector?.('a[href*="/in/"]')) return sibling;
    sibling = sibling.nextElementSibling;
  }
  const parent = headerEl.parentElement;
  if (parent?.querySelector('a[href*="/in/"]')) return parent;
  return headerEl.closest('section') || headerEl.parentElement?.parentElement;
}

function findJobPosterCandidate(root) {
  for (const link of root.querySelectorAll('a[href*="/in/"]')) {
    if (isInsideExtensionUI(link)) continue;
    if (link.closest('header, nav, [class*="global-nav"]')) continue;
    const card = getProfileCardForLink(link);
    const cardText = (card?.innerText || '').toLowerCase();
    if (!cardText.includes('job poster')) continue;
    if (isOutreachSuggestionCard(cardText)) continue;
    const url = normalizeLinkedInProfileUrl(link.href || link.getAttribute('href'));
    if (!url) continue;
    return { url, name: extractNameFromProfileCard(link, card), score: 220 };
  }
  return null;
}

function findMeetHiringTeamCandidate(root) {
  for (const el of root.querySelectorAll('h2, h3, h4, h5, span, div, label, p')) {
    if (isInsideExtensionUI(el)) continue;
    const text = (el.textContent || '').trim().toLowerCase();
    if (text !== 'meet the hiring team' && !text.startsWith('meet the hiring team')) continue;

    const section = getSectionAfterHeader(el);
    if (!section || isInsideExtensionUI(section)) continue;
    if (isOutreachSuggestionCard(section.innerText || '')) continue;

    for (const link of section.querySelectorAll('a[href*="/in/"]')) {
      if (isInsideExtensionUI(link)) continue;
      const card = getProfileCardForLink(link);
      const cardText = (card?.innerText || '').toLowerCase();
      if (isOutreachSuggestionCard(cardText)) continue;
      const url = normalizeLinkedInProfileUrl(link.href || link.getAttribute('href'));
      if (!url) continue;
      let score = 180;
      if (cardText.includes('job poster')) score = 210;
      return { url, name: extractNameFromProfileCard(link, card), score };
    }
  }
  return null;
}

function scoreHiringManagerCandidate(link, contextText = '') {
  const href = link.getAttribute('href') || link.href || '';
  const normalized = normalizeLinkedInProfileUrl(href);
  if (!normalized) return -1;
  if (isInsideExtensionUI(link)) return -1;
  if (link.closest('header, nav, [class*="global-nav"], [class*="msg-overlay"]')) return -1;

  const slug = normalized.split('/in/')[1]?.replace(/\/$/, '').toLowerCase() || '';
  const excludedSlugs = ['company', 'jobs', 'school', 'groups', 'pulse', 'feed', 'search', 'learning'];
  if (excludedSlugs.includes(slug)) return -1;

  const card = getProfileCardForLink(link);
  const cardText = (card?.innerText || contextText || '').toLowerCase();
  if (isOutreachSuggestionCard(cardText)) return -1;

  let score = 0;
  if (link.closest('[class*="hirer-card"], .jobs-poster, [class*="hiring-team"], [class*="jobs-poster"]')) {
    score += 50;
  }
  for (const hint of HM_SECTION_HINTS) {
    if (cardText.includes(hint)) score += 18;
  }
  if (cardText.includes('job poster')) score += 40;
  if (cardText.includes('hirer')) score += 12;
  if (link.closest('.jobs-poster__name, [class*="poster__name"]')) score += 20;

  const linkText = (link.innerText || '').trim();
  if (linkText && linkText.length < 80 && !/linkedin|view profile|message/i.test(linkText)) {
    score += 8;
  }

  return score;
}

function getLinkedInHiringManager() {
  const root = getLinkedInJobDetailsRoot();

  const jobPoster = findJobPosterCandidate(root);
  if (jobPoster) return { url: jobPoster.url, name: jobPoster.name };

  const hiringTeam = findMeetHiringTeamCandidate(root);
  if (hiringTeam) return { url: hiringTeam.url, name: hiringTeam.name };

  const candidates = [];

  for (const selector of HM_CONTAINER_SELECTORS) {
    root.querySelectorAll(selector).forEach((container) => {
      if (isInsideExtensionUI(container)) return;
      const containerText = (container.innerText || '').toLowerCase();
      if (isOutreachSuggestionCard(containerText)) return;
      const link = container.querySelector('a[href*="/in/"]');
      if (!link) return;
      const url = normalizeLinkedInProfileUrl(link.href || link.getAttribute('href'));
      if (!url) return;
      candidates.push({
        url,
        name: extractNameFromProfileCard(link, container),
        score: containerText.includes('job poster') ? 160 : 100
      });
    });
  }

  const headerEls = root.querySelectorAll('h2, h3, h4, h5, span, div, label, p');
  for (const el of headerEls) {
    if (isInsideExtensionUI(el)) continue;
    const text = (el.textContent || '').trim().toLowerCase();
    if (!HM_SECTION_HINTS.some((hint) => text === hint || text.startsWith(hint))) continue;

    const container = getSectionAfterHeader(el) ||
      el.closest('.jobs-poster') ||
      el.closest('[class*="hirer"]') ||
      el.closest('[class*="hiring-team"]') ||
      el.closest('.artdeco-card') ||
      el.closest('section');

    if (!container || isInsideExtensionUI(container)) continue;
    if (isOutreachSuggestionCard(container.innerText || '')) continue;

    const link = container.querySelector('a[href*="/in/"]');
    if (link) {
      const url = normalizeLinkedInProfileUrl(link.href || link.getAttribute('href'));
      if (url) {
        candidates.push({
          url,
          name: extractNameFromProfileCard(link, container),
          score: 90
        });
      }
    }
  }

  root.querySelectorAll('a[href*="/in/"]').forEach((link) => {
    const card = getProfileCardForLink(link);
    const score = scoreHiringManagerCandidate(link, card?.innerText || '');
    if (score < 15) return;
    const url = normalizeLinkedInProfileUrl(link.href || link.getAttribute('href'));
    if (!url) return;
    candidates.push({
      url,
      name: extractNameFromProfileCard(link, card),
      score
    });
  });

  if (!candidates.length) return null;

  const byKey = new Map();
  for (const candidate of candidates) {
    const key = candidate.url || `name:${candidate.name}`;
    const prev = byKey.get(key);
    if (!prev || candidate.score > prev.score) {
      byKey.set(key, candidate);
    }
  }

  const sorted = [...byKey.values()].sort((a, b) => {
    if (Boolean(a.url) !== Boolean(b.url)) return a.url ? -1 : 1;
    return b.score - a.score;
  });

  const best = sorted[0];
  if (!best) return null;
  if (!best.url && best.score < 40) return null;

  return { url: best.url, name: best.name };
}

function updateHiringManagerUI(hmInfo = null) {
  const hmInput = document.getElementById('ajf-input-hiring-manager');
  const openBtn = document.getElementById('ajf-btn-open-hm-profile');
  const statusEl = document.getElementById('ajf-hm-capture-status');
  const value = (currentScrapedJob?.hiringManager || hmInput?.value || '').trim();
  const profileUrl = normalizeLinkedInProfileUrl(value) || normalizeLinkedInProfileUrl(hmInfo?.url);

  if (hmInput && value) hmInput.value = value;
  if (openBtn) {
    openBtn.style.display = profileUrl ? 'inline-flex' : 'none';
  }
  const inviteBtn = document.getElementById('ajf-btn-send-hm-invite');
  if (inviteBtn) {
    inviteBtn.style.display = 'none';
  }
  const displayName = hmInfo?.name || currentScrapedJob?.hiringManagerName || '';
  updateConnectMessagePreview();
  updateOutreachRoleContext();

  if (statusEl) {
    if (profileUrl && displayName) {
      statusEl.textContent = `✓ Captured: ${displayName}`;
      statusEl.style.color = '#248a3d';
      statusEl.style.display = 'block';
    } else if (profileUrl) {
      statusEl.textContent = '✓ LinkedIn profile captured';
      statusEl.style.color = '#248a3d';
      statusEl.style.display = 'block';
    } else if (displayName) {
      statusEl.textContent = `Name found (no profile link): ${displayName}`;
      statusEl.style.color = '#c93400';
      statusEl.style.display = 'block';
    } else if (!value) {
      statusEl.style.display = 'none';
      statusEl.textContent = '';
    }
  }
  updateRecruiterOutreachUI(currentScrapedJob || {});
}

function syncHiringManagerFromPage({ force = false, autoSave = false, silent = false } = {}) {
  if (!window.location.href.includes('linkedin.com') || window.location.href.includes('linkedin.com/in/')) {
    if (force && !silent) logToConsole('Hiring manager capture works on LinkedIn job pages.');
    return null;
  }

  const hmInfo = getLinkedInHiringManager();
  const hmInput = document.getElementById('ajf-input-hiring-manager');
  const currentHM = (currentScrapedJob?.hiringManager || hmInput?.value || '').trim();
  const currentIsUrl = currentHM.startsWith('http');
  const newValue = hmInfo
    ? (hmInfo.url ? normalizeLinkedInProfileUrl(hmInfo.url) : (hmInfo.name || '').trim())
    : '';

  if (!newValue) {
    if (force) {
      const statusEl = document.getElementById('ajf-hm-capture-status');
      if (statusEl) {
        statusEl.textContent = 'No hiring manager section found on this page';
        statusEl.style.color = '#f59e0b';
        statusEl.style.display = 'block';
      }
      if (!silent) logToConsole('No hiring manager found on this page.');
    }
    return null;
  }

  const normalizedCurrent = normalizeLinkedInProfileUrl(currentHM);
  const normalizedNew = normalizeLinkedInProfileUrl(newValue);
  const shouldUpdate = force ||
    !currentHM ||
    (!currentIsUrl && !!hmInfo?.url) ||
    (normalizedNew && normalizedCurrent !== normalizedNew);

  if (!shouldUpdate) {
    updateHiringManagerUI(hmInfo);
    return hmInfo;
  }

  if (currentScrapedJob) {
    currentScrapedJob.hiringManager = newValue;
    if (hmInfo?.name) currentScrapedJob.hiringManagerName = hmInfo.name;
  }
  if (hmInput) hmInput.value = newValue;

  updateHiringManagerUI(hmInfo);

  if (!silent) {
    logToConsole(`✓ Hiring manager captured: ${hmInfo?.name || newValue}`);
  }
  if (autoSave && pipelineLinked) {
    autoSaveJobDetails();
  }

  return hmInfo;
}

function setupHiringManagerObserver() {
  if (!window.location.href.includes('linkedin.com') || window.location.href.includes('linkedin.com/in/')) {
    return;
  }

  if (hmObserver) {
    hmObserver.disconnect();
    hmObserver = null;
  }

  const root = getLinkedInJobDetailsRoot();
  hmObserver = new MutationObserver(() => {
    if (hmObserverDebounce) clearTimeout(hmObserverDebounce);
    hmObserverDebounce = setTimeout(() => {
      if (currentScrapedJob) {
        syncHiringManagerFromPage({ autoSave: pipelineLinked, silent: true });
      }
    }, 500);
  });

  hmObserver.observe(root, { childList: true, subtree: true });
}

function extractCleanName(rawName) {
  if (!rawName) return '';
  // Split by newline, remove anything after '·' or degree like '2nd', clean emoji, remove trailing/leading spaces
  let name = rawName.split('\n')[0].split('•')[0].split('·')[0].trim();
  name = name.replace(/\s+(?:1st|2nd|3rd\+?|3rd)\b/gi, ''); // remove connection degree
  return name.trim();
}

function isLinkedInEasyApplyOpen() {
  return !!document.querySelector(
    'dialog[data-testid="dialog"][open], dialog[open][aria-labelledby="dialog-header"]'
  );
}

function getLinkedInEasyApplyDialog() {
  return document.querySelector(
    'dialog[data-testid="dialog"][open], dialog[open][aria-labelledby="dialog-header"]'
  );
}

function getAutofillRoot() {
  return getLinkedInEasyApplyDialog() || document;
}

function isInsideCopilot(el) {
  return !!(el?.closest?.('.ajf-copilot-container, #ajf-sidebar, #ajf-launcher'));
}

function parseLinkedInEasyApplyHeader() {
  const header = document.querySelector('#dialog-header h2, dialog[open] header h2');
  if (!header) return { company: '', title: '' };
  const text = header.innerText.trim();
  const match = text.match(/^Apply to\s+(.+)$/i);
  return { company: match ? match[1].trim() : '', title: '' };
}

function getLinkedInJobPageUrl() {
  try {
    const u = new URL(window.location.href);
    const jobId = u.searchParams.get('currentJobId');
    if (jobId) return canonicalJobUrl(`https://www.linkedin.com/jobs/view/${jobId}`);
    const viewMatch = u.pathname.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return canonicalJobUrl(`https://www.linkedin.com/jobs/view/${viewMatch[1]}`);
  } catch {
    // ignore
  }
  return canonicalJobUrl(window.location.href);
}

function getLinkedInJobDetailRoots() {
  const roots = [
    document.querySelector('.jobs-details__main-content'),
    document.querySelector('.scaffold-layout__detail'),
    document.querySelector('.jobs-details'),
    document.querySelector('.job-view-layout'),
    document.querySelector('#job-details')
  ].filter(Boolean);
  return roots.length ? roots : [document];
}

function extractLinkedInJobDescription(title = '') {
  const descSelectors = [
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description-content__text',
    '.jobs-description',
    '[class*="jobs-description__content"]',
    '[class*="description__text"]',
    '[data-test-id*="job-description"]'
  ];

  for (const root of getLinkedInJobDetailRoots()) {
    for (const sel of descSelectors) {
      const el = root.querySelector(sel);
      const text = el?.innerText?.trim() || '';
      if (text.length > 80 && !isLinkedInFeedPollutedDescription(text)) {
        return text;
      }
    }
  }

  for (const root of getLinkedInJobDetailRoots()) {
    const headings = root.querySelectorAll('h2, h3, h4, span, strong, p');
    for (const h of headings) {
      if (!/^about the job$/i.test((h.innerText || '').trim())) continue;

      const section =
        h.closest('section') ||
        h.closest('[class*="description"]') ||
        h.closest('.jobs-box__html-content') ||
        h.parentElement?.parentElement;
      const sectionText = section?.innerText?.trim() || '';
      if (sectionText.length > 80 && !isLinkedInFeedPollutedDescription(sectionText)) {
        return sectionText;
      }

      const container = h.parentElement;
      const parts = [h.innerText.trim()];
      let sibling = container?.nextElementSibling;
      let hops = 0;
      while (sibling && hops < 6) {
        const chunk = sibling.innerText?.trim();
        if (chunk) parts.push(chunk);
        if (parts.join('\n').length > 200) break;
        sibling = sibling.nextElementSibling;
        hops++;
      }
      const assembled = parts.join('\n\n').trim();
      if (assembled.length > 80 && !isLinkedInFeedPollutedDescription(assembled)) {
        return assembled;
      }
    }
  }

  return '';
}

// Extract Job Listing details using custom/generic selectors
function extractJobDetails() {
  let pageUrl = window.location.href;
  const url = pageUrl;
  let title = '';
  let company = '';
  let location = '';
  let description = '';
  let hiringManager = '';

  if (url.includes('greenhouse.io')) {
    title = document.querySelector('h1.app-title')?.innerText || '';
    location = document.querySelector('.location')?.innerText || '';
    description = document.querySelector('#content')?.innerText || '';
    try {
      const pathParts = new URL(url).pathname.split('/');
      company = pathParts[1] ? pathParts[1].toUpperCase() : '';
    } catch (e) { }
  } else if (url.includes('lever.co')) {
    title = document.querySelector('.posting-header h2')?.innerText || '';
    description = document.querySelector('.section.page-centered')?.innerText || '';
    const meta = document.querySelector('.posting-categories')?.innerText || '';
    location = meta ? meta.split('//')[0] || meta.split('/')[0] : '';
    try {
      const pathParts = new URL(url).pathname.split('/');
      company = pathParts[1] ? pathParts[1].toUpperCase() : '';
    } catch (e) { }
  } else if (url.includes('ashbyhq.com') || document.querySelector('.job-description, [class*="jobDescription"], [class*="_ashby_"]')) {
    title = document.querySelector('h1')?.innerText || '';
    description = document.querySelector('.job-description, [class*="jobDescription"]')?.innerText || '';
    location = document.body.innerText.match(/Location:\s*(.*)/i)?.[1] || 'Australia';
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      if (host.includes('ashbyhq.com')) {
        const pathParts = urlObj.pathname.split('/');
        company = pathParts[1] ? pathParts[1].toUpperCase() : '';
      } else {
        const parts = host.split('.');
        company = parts[parts.length - 3] ? parts[parts.length - 3].toUpperCase() : (parts[0] || 'Unknown');
        if (company.toLowerCase() === 'jobs' || company.toLowerCase() === 'careers') {
          company = parts[parts.length - 2] ? parts[parts.length - 2].toUpperCase() : company;
        }
      }
    } catch (e) { }
  } else if (url.includes('linkedin.com')) {
    if (isLinkedInEasyApplyOpen()) {
      const easyApply = parseLinkedInEasyApplyHeader();
      if (easyApply.company) company = easyApply.company;
      pageUrl = getLinkedInJobPageUrl();
    }

    title = document.querySelector('.job-details-jobs-unified-top-card__job-title h1')?.innerText ||
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-unified-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-details-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-search-top-card__job-title')?.innerText ||
      document.querySelector('.job-details-panel h1')?.innerText ||
      document.querySelector('.job-details h1')?.innerText ||
      document.querySelector('h1')?.innerText || '';

    company = getLinkedInCompany();

    location = getLinkedInLocation();

    description = extractLinkedInJobDescription(title);

    const hmInfo = getLinkedInHiringManager();
    if (hmInfo) {
      hiringManager = hmInfo.url ? normalizeLinkedInProfileUrl(hmInfo.url) : (hmInfo.name || '');
    }
  } else if (url.includes('seek.com.au')) {
    title = document.querySelector('h1[data-testid="job-detail-title"]')?.innerText || document.querySelector('h1')?.innerText || '';
    company = document.querySelector('[data-testid="advertiser-name"]')?.innerText || '';
    location = document.querySelector('[data-testid="job-detail-location"]')?.innerText || 'Australia';
    description = document.querySelector('[data-testid="job-description"]')?.innerText || '';
  } else if (url.includes('indeed.com')) {
    title = document.querySelector('h1[class*="jobsearch-JobInfoHeader-title"], h1[class*="jobTitle"], .jobsearch-JobInfoHeader-title-container h1')?.innerText || '';
    company = document.querySelector('[data-testid="inlineHeader-companyName"] a, [data-testid="inlineHeader-companyName"], .jobsearch-CompanyInfoWithoutHeaderImage a, .jobsearch-InlineCompanyRating div, [class*="InlineCompanyRating"] div')?.innerText || '';
    location = document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-JobInfoHeader-subtitle div:last-child, .jobsearch-JobInfoHeader-subtitle [class*="Location"]')?.innerText || 'Australia';
    description = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText')?.innerText || '';
  } else if (isGenericCareerPage(url) || isCopilotPage()) {
    title = document.querySelector('h1')?.innerText || '';
    company = getCompanyFromPage();
    location = extractLocationFromText(document.body?.innerText || '');
    description = extractJobDescriptionFromPage();

    if (!title) {
      title = titleFromUrlSlug(url);
    }

    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of schemaScripts) {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        const posting = items.find((item) => item?.['@type'] === 'JobPosting');
        if (posting) {
          title = posting.title || title;
          company = posting.hiringOrganization?.name || company;
          location = posting.jobLocation?.address?.addressLocality || posting.jobLocation?.name || location;
          description = posting.description || description;
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
  }

  // Fallbacks
  if (!title) {
    const titleParts = document.title.split('|');
    title = document.querySelector('h1')?.innerText || titleParts[0].trim() || 'Job Opportunity';
  }
  if (!company || isBadCompanyName(company)) {
    if (url.includes('linkedin.com')) {
      company = getLinkedInCompany() || company;
    }
    if (!company || isBadCompanyName(company)) {
      const titleParts = document.title.split('|');
      if (titleParts.length >= 2) {
        company = titleParts[1].trim();
      } else {
        company = document.title.split(' at ')[1] || document.title.split(' - ')[1] || '';
      }
      if (url.includes('linkedin.com') && isBadCompanyName(company)) {
        company = '';
      } else if (!company) {
        company = 'Unknown';
      }
    }
  }
  if (!description && !url.includes('linkedin.com')) {
    description = document.body.innerText || '';
  }
  if (!location) {
    location = 'Australia';
  }

  // Format location to get the specific city or fallback (e.g. "Sydney", "Melbourne", or "Australia")
  if (location) {
    const lowerLoc = location.toLowerCase();
    if (lowerLoc.includes('sydney')) {
      location = 'Sydney';
    } else if (lowerLoc.includes('melbourne')) {
      location = 'Melbourne';
    } else {
      location = 'Australia';
    }
  }

  const cleanCompanyName = company.trim().replace(/ hiring now!/gi, '');

  return {
    id: Math.random().toString(36).substring(2, 11),
    title: title.trim(),
    company: cleanCompanyName,
    location: location.trim().replace(/•/g, '').trim(),
    url: canonicalJobUrl(pageUrl),
    description: sanitizeJobDescriptionForAssessment(
      description.replace(/\s+/g, ' ').trim(),
      title.trim()
    ),
    status: 'To Process',
    scrapedAt: new Date().toISOString(),
    tailoredCv: null,
    coverLetter: null,
    source: 'Extension Sourced',
    hiringManager: hiringManager.trim(),
    hiringManagerIntro: '',
    isRecruiter: false,
    suitabilityScore: null
  };
}

function populateUIFields() {
  document.getElementById('ajf-input-title').value = currentScrapedJob.title || '';
  document.getElementById('ajf-input-company').value = currentScrapedJob.company || '';

  let rawLoc = (currentScrapedJob.location || '').trim();
  const selectLoc = document.getElementById('ajf-select-location');
  const inputLoc = document.getElementById('ajf-input-location');
  if (selectLoc && inputLoc) {
    inputLoc.value = rawLoc;

    const lowerRawLoc = rawLoc.toLowerCase();
    const matchedLoc = targetLocationsList.find(loc => {
      const lowerLoc = loc.toLowerCase();
      return lowerRawLoc === lowerLoc || (lowerRawLoc.includes(lowerLoc) && !targetLocationsList.some(otherLoc => otherLoc !== loc && lowerRawLoc.includes(otherLoc.toLowerCase())));
    });

    if (matchedLoc) {
      selectLoc.value = matchedLoc;
      inputLoc.style.display = 'none';
    } else if (rawLoc === '') {
      selectLoc.value = '';
      inputLoc.style.display = 'block';
    } else {
      selectLoc.value = 'Other';
      inputLoc.style.display = 'block';
    }
  }

  document.getElementById('ajf-input-url').value = currentScrapedJob.url || '';

  const hmInput = document.getElementById('ajf-input-hiring-manager');
  if (hmInput) {
    const hmValue = currentScrapedJob.hiringManager || '';
    hmInput.value = hmValue.startsWith('http') ? normalizeLinkedInProfileUrl(hmValue) || hmValue : hmValue;
  }
  updateHiringManagerUI({
    url: normalizeLinkedInProfileUrl(currentScrapedJob.hiringManager) || '',
    name: currentScrapedJob.hiringManagerName || ''
  });

  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  if (isRecruiterBox) {
    const detectedRecruiter = isRecruiterPosting(
      currentScrapedJob.company,
      pipelineLinked ? currentScrapedJob.isRecruiter : false
    );
    isRecruiterBox.checked = detectedRecruiter;
    currentScrapedJob.isRecruiter = detectedRecruiter;
  }

  if (!pipelineLinked) {
    setCollapsibleInsight('ajf-assess-section', '', { visible: false });
  }
  updateOutreachRoleContext(currentScrapedJob);
  updateRecruiterOutreachUI(currentScrapedJob);
}

function populatePipelineDropdown() {
  const select = document.getElementById('ajf-select-pipeline-job');
  if (!select) return;

  sendExtensionMessage({ action: 'getJobs' }, (response) => {
    if (response && response.success && Array.isArray(response.data)) {
      // Clear existing options except first one
      select.innerHTML = '<option value="">-- Select a Job to Link --</option>';

      // Sort jobs: Tailored first, then To Process, then Applied, then Skipped, then others
      const sortedJobs = response.data.sort((a, b) => {
        const score = (s) => {
          const status = String(s || '').trim();
          if (status === 'Tailored') return 4;
          if (status === 'To Process') return 3;
          if (status === 'Applied') return 2;
          if (status === 'Skipped') return 1;
          return 0;
        };
        return score(b.status) - score(a.status);
      });

      for (const job of sortedJobs) {
        const opt = document.createElement('option');
        opt.value = job.id;
        opt.textContent = `[${job.status}] ${job.company} - ${job.title}`;
        select.appendChild(opt);
      }
    }
  });
}

function handleLinkJob(jobId) {
  logToConsole(`Linking current page to pipeline job #${jobId}...`);
  const applicationUrl = currentScrapedJob.url;

  sendExtensionMessage({
    action: 'updateJob',
    jobId: jobId,
    updates: { applicationUrl: applicationUrl }
  }, (response) => {
    if (response && response.success && response.data) {
      logToConsole('✓ Successfully linked job and updated pipeline.');
      applyJobToUI(response.data, { fromPipeline: true });
      showToast('Job linked successfully!');
    } else {
      logToConsole(`Failed to link job: ${response?.error || 'Unknown error'}`);
    }
  });
}

function handleUpdateStatus(newStatus) {
  if (!currentScrapedJob) return;

  const performUpdate = (jobId) => {
    const appliedBtnTop = document.getElementById('ajf-btn-mark-applied-top');
    const skippedBtnTop = document.getElementById('ajf-btn-mark-skipped-top');

    if (appliedBtnTop) appliedBtnTop.disabled = true;
    if (skippedBtnTop) skippedBtnTop.disabled = true;

    logToConsole(`Updating job status to: ${newStatus}...`);

    sendExtensionMessage(
      { action: 'updateJobStatus', jobId: jobId, status: newStatus },
      (response) => {
        if (appliedBtnTop) appliedBtnTop.disabled = (newStatus === 'Applied');
        if (skippedBtnTop) skippedBtnTop.disabled = (newStatus === 'Skipped');

        if (response && response.success) {
          logToConsole(`✓ Job status updated to ${newStatus}.`);
          currentScrapedJob.status = newStatus;
          if (newStatus === 'Applied') {
            const intro = buildJobConnectMessage(currentScrapedJob);
            currentScrapedJob.hiringManagerIntro = intro;
            persistHiringManagerIntro(currentScrapedJob, intro);
            updateActionButtons();
          }
          applyJobToUI(currentScrapedJob, { fromPipeline: true });
          showToast(`Job status updated to ${newStatus}!`);
          if (newStatus === 'Applied') {
            const hmUrl = getHiringManagerProfileUrl();
            if (hmUrl) {
              logToConsole('📇 Applied — click 📨 Invite to open HM profile and paste connect note.');
              showToast('Applied! Click 📨 Invite to connect with HM');
            } else {
              logToConsole('📇 Applied — capture HM profile, then use 📨 Invite or Quick Msg.');
              showToast('Applied! Capture recruiter/HM LinkedIn for invite');
            }
          }
        } else {
          logToConsole(`Failed to update status: ${response?.error || 'Unknown error'}`);
        }
      }
    );
  };

  if (!pipelineLinked || !currentScrapedJob.id) {
    logToConsole('Job not in pipeline yet. Saving job first...');
    // Update inputs first
    updateScrapedJobFromInputs();
    currentScrapedJob.url = canonicalJobUrl(
      document.getElementById('ajf-input-url').value || currentScrapedJob.url
    );

    sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (saveResponse) => {
      if (saveResponse && saveResponse.success) {
        logToConsole('✓ Job saved to pipeline.');
        const savedJob = saveResponse.data.job;
        applyJobToUI(savedJob, { fromPipeline: true });
        performUpdate(savedJob.id);
      } else {
        logToConsole(`✗ Save failed: ${saveResponse?.error || 'Unknown error'}`);
      }
    });
  } else {
    performUpdate(currentScrapedJob.id);
  }
}

function handleSaveCustomInstructions() {
  if (!currentScrapedJob || !currentScrapedJob.id) {
    logToConsole('Error: No job loaded to save custom instructions.');
    return;
  }

  const instrInput = document.getElementById('ajf-job-custom-instructions');
  const customInstructions = instrInput ? instrInput.value : '';

  logToConsole('Saving job-specific custom instructions...');

  sendExtensionMessage(
    {
      action: 'updateJob',
      jobId: currentScrapedJob.id,
      updates: { customInstructions }
    },
    (response) => {
      if (response && response.success) {
        logToConsole('✓ Custom instructions saved successfully!');
        currentScrapedJob = response.data;
        showToast('Custom instructions saved!');
      } else {
        logToConsole(`✗ Failed to save: ${response?.error || 'Unknown error'}`);
      }
    }
  );
}

// Message/Local Server Handlers
function handleAutoProcessChain() {
  updateScrapedJobFromInputs();
  if (!shouldProceedDespiteLowFit(currentScrapedJob, 'Run Auto (Assess → Tailor → PDF)')) {
    return;
  }

  const saveBtn = document.getElementById('ajf-btn-save');
  saveBtn.disabled = true;
  saveBtn.innerText = '⌛ 1/4 Saving job...';

  clearLogs();
  logToConsole('Starting Auto-Process chain...');

  // Update currentScrapedJob from input fields
  updateScrapedJobFromInputs();
  currentScrapedJob.url = canonicalJobUrl(
    document.getElementById('ajf-input-url').value || currentScrapedJob.url
  );

  // Step 1: Save job to database
  sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (saveResponse) => {
    if (!saveResponse || !saveResponse.success) {
      saveBtn.disabled = false;
      saveBtn.innerText = 'Save to Pipeline';
      logToConsole(`✗ Auto-process failed at Save step: ${saveResponse?.error || 'Unknown error'}`);
      showToast('Auto-process failed at Save step!');
      return;
    }

    logToConsole('✓ Step 1/4: Job saved to pipeline.');
    const savedJob = saveResponse.data.job;
    applyJobToUI(savedJob, { fromPipeline: true });

    // Step 2: Assess Match
    saveBtn.innerText = '🔎 2/4 Assessing match...';
    logToConsole('Step 2/4: Running Suitability Assessment (LLM)...');

    sendExtensionMessage(
      {
        action: 'assessMatch',
        jobTitle: savedJob.title,
        companyName: savedJob.company,
        jobDescription: savedJob.description || '',
        isRecruiter: !!savedJob.isRecruiter
      },
      (assessResponse) => {
        let jobToUpdate = savedJob;
        if (assessResponse && assessResponse.success && assessResponse.data) {
          logToConsole('✓ Step 2/4: Suitability assessment completed.');
          jobToUpdate.suitabilityScore = assessResponse.data.score || 5;
          jobToUpdate.suitabilityAssessment = assessResponse.data.explanation;
          applyScoreCorrection(jobToUpdate);

          setCollapsibleInsight(
            'ajf-assess-section',
            stripScoreFromText(assessResponse.data.explanation)
          );

          if (jobToUpdate.suitabilityScore <= LOW_FIT_SCORE_THRESHOLD) {
            logToConsole(
              `⚠️ Score ${jobToUpdate.suitabilityScore}/10 — review assessment, continuing to tailor.`
            );
          }
        } else {
          logToConsole(`⚠️ Step 2/4 warning: Assessment failed (${assessResponse?.error || 'Unknown error'}). Continuing to Tailoring...`);
        }

        // Save assessment before moving to tailoring
        sendExtensionMessage(
          {
            action: 'updateJob',
            jobId: jobToUpdate.id,
            updates: {
              suitabilityScore: jobToUpdate.suitabilityScore,
              suitabilityAssessment: jobToUpdate.suitabilityAssessment
            }
          },
          (saveAssessRes) => {
            // Step 3: Tailor CV & Letter
            saveBtn.innerText = '✨ 3/4 Tailoring CV (LLM)...';
            logToConsole('Step 3/4: Tailoring CV & cover letter...');

            const instrInput = document.getElementById('ajf-job-custom-instructions');
            const customInstructions = instrInput ? instrInput.value : '';

            sendExtensionMessage({ action: 'tailorJob', jobId: jobToUpdate.id, customInstructions }, (tailorResponse) => {
              if (!tailorResponse || !tailorResponse.success) {
                saveBtn.disabled = true;
                saveBtn.innerText = 'Saved';
                logToConsole(`✗ Auto-process failed at Tailor step: ${tailorResponse?.error || 'Unknown error'}`);
                logToConsole('Use ✨ Tailor CV & Letter below to retry.');
                showToast('Tailor failed — use Tailor CV button to retry');
                updateActionButtons();
                updateDynamicUI();
                return;
              }

              logToConsole('✓ Step 3/4: CV & cover letter tailored successfully.');
              const tailoredJob = tailorResponse.data;
              applyJobToUI(tailoredJob, { fromPipeline: true });

              // Step 4: Open Tailored PDF
              saveBtn.innerText = '📄 4/4 Compiling PDF...';
              logToConsole('Step 4/4: Generating & opening PDF...');

              sendExtensionMessage({ action: 'generatePdf', jobId: tailoredJob.id }, (pdfResponse) => {
                saveBtn.disabled = true;
                saveBtn.innerText = 'Saved';

                if (pdfResponse && pdfResponse.success) {
                  tailoredJob.pdfPath = pdfResponse.data.pdfUrl;
                  applyJobToUI(tailoredJob, { fromPipeline: true });

                  const pdfUrl = `http://localhost:3004${tailoredJob.pdfPath}?t=${Date.now()}`;
                  logToConsole('✓ Step 4/4: PDF compiled successfully!');
                  logToConsole(`Opening PDF: ${pdfUrl}`);

                  sendExtensionMessage({ action: 'openTab', url: pdfUrl }, (res) => {
                    logToConsole('✓ PDF opened in new tab.');
                  });
                  showToast('Auto-Process completed successfully!');
                } else {
                  logToConsole(`✗ Step 4/4 warning: PDF compilation failed (${pdfResponse?.error || 'Unknown error'}).`);
                  showToast('Auto-Process completed with PDF errors.');
                }
              });
            });
          }
        );
      }
    );
  });
}

function openJobPdf() {
  if (!currentScrapedJob?.pdfPath) {
    logToConsole('No PDF yet — run Tailor or wait for Auto to finish.');
    showToast('PDF not ready yet');
    return;
  }
  const pdfUrl = `http://localhost:3004${currentScrapedJob.pdfPath}?t=${Date.now()}`;
  logToConsole(`Opening PDF: ${pdfUrl}`);
  sendExtensionMessage({ action: 'openTab', url: pdfUrl });
}

function extractRecruiterEmailFromText(text = '') {
  const matches = String(text).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const filtered = matches.filter(
    (e) => !/linkedin|example|noreply|no-reply/i.test(e)
  );
  return filtered[0] || '';
}

function buildRecruiterEmailDraft(job = {}) {
  const role = (job.title || 'this role').trim();
  const company = (job.company || '').trim();
  const atLine = company ? ` for the ${role} role (${company})` : ` for the ${role} role`;
  const subject = `${role}${company ? ` — ${company}` : ''} — Eugene Bochkov`;
  const workRights = formatOutreachWorkRightsLine();
  const body = `Hi,\n\nI'm interested in the opportunity${atLine}. ${workRights} CV attached.\n\nEugene Bochkov\neu.bochkov@gmail.com`;
  return { subject, body, mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

function refreshRecruiterEmailDraft() {
  const draftEl = document.getElementById('ajf-recruiter-email-draft');
  if (!draftEl || !currentScrapedJob) return;
  const emailInput = document.getElementById('ajf-recruiter-email');
  if (emailInput && emailInput.value.trim()) {
    currentScrapedJob.recruiterEmail = emailInput.value.trim();
  }
  const { subject, body } = buildRecruiterEmailDraft(currentScrapedJob);
  draftEl.value = `Subject: ${subject}\n\n${body}`;
}

function updateRecruiterOutreachUI(job = {}) {
  const emailBlock = document.getElementById('ajf-recruiter-outreach');
  const linkedInBlock = document.getElementById('ajf-block-outreach');
  const emailFields = document.getElementById('ajf-recruiter-email-fields');
  const emailToggle = document.getElementById('ajf-btn-toggle-recruiter-email');

  const isRecruiter = isJobRecruiterPosting(job);
  const emailFromDesc = extractRecruiterEmailFromText(job.description || '');
  const hasEmail = !!(job.recruiterEmail || emailFromDesc);
  const hmUrl = normalizeLinkedInProfileUrl(
    job.hiringManager || document.getElementById('ajf-input-hiring-manager')?.value || ''
  );
  const hasLinkedIn = !!hmUrl;

  if (linkedInBlock) {
    linkedInBlock.style.display = 'flex';
  }

  // LinkedIn first — email only as optional fallback when recruiter post has an address
  const showEmailFallback = isRecruiter && hasEmail;
  if (emailBlock) {
    emailBlock.style.display = showEmailFallback ? 'flex' : 'none';
  }
  if (emailFields && emailToggle) {
    const expanded = emailFields.style.display !== 'none';
    if (!showEmailFallback) {
      emailFields.style.display = 'none';
      emailToggle.innerText = 'Show';
    } else if (!hasLinkedIn && !expanded) {
      emailToggle.innerText = 'Show';
      emailFields.style.display = 'none';
    } else if (expanded) {
      emailToggle.innerText = 'Hide';
    } else {
      emailToggle.innerText = 'Show';
    }
  }

  if (!showEmailFallback) return;

  const emailInput = document.getElementById('ajf-recruiter-email');
  if (emailInput) {
    emailInput.value = job.recruiterEmail || emailFromDesc || emailInput.value || '';
    if (!job.recruiterEmail && emailFromDesc) {
      job.recruiterEmail = emailFromDesc;
    }
  }
  refreshRecruiterEmailDraft();
  updateOutreachRoleContext(job);
}

function handleCopyRecruiterEmail() {
  const draftEl = document.getElementById('ajf-recruiter-email-draft');
  const emailInput = document.getElementById('ajf-recruiter-email');
  if (!draftEl?.value) {
    refreshRecruiterEmailDraft();
  }
  const text = draftEl?.value || '';
  const email = emailInput?.value?.trim() || '';
  const clip = email ? `To: ${email}\n\n${text}` : text;
  navigator.clipboard.writeText(clip).then(() => {
    showToast('Recruiter email copied');
    logToConsole('✓ Recruiter email copied — paste into your mail client, attach CV PDF.');
  }).catch(() => showToast('Copy failed'));
}

function handleOpenRecruiterMailto() {
  const emailInput = document.getElementById('ajf-recruiter-email');
  const to = emailInput?.value?.trim();
  if (!to) {
    showToast('Add recruiter email first');
    return;
  }
  const { subject, body } = buildRecruiterEmailDraft(currentScrapedJob || {});
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
  logToConsole(`Opened mailto for ${to} — attach your tailored PDF before sending.`);
}

function handleSaveForLater() {
  updateScrapedJobFromInputs();
  const btn = document.getElementById('ajf-btn-save-later');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Saving…';
  }

  currentScrapedJob.status = 'Saved';
  currentScrapedJob.isRecruiter = document.getElementById('ajf-input-is-recruiter')?.checked || false;
  currentScrapedJob.url = canonicalJobUrl(
    document.getElementById('ajf-input-url')?.value || currentScrapedJob.url
  );
  if (!currentScrapedJob.recruiterEmail) {
    currentScrapedJob.recruiterEmail = extractRecruiterEmailFromText(currentScrapedJob.description || '');
  }

  clearLogs();
  logToConsole('Saving for later (no assess/tailor)…');

  sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (response) => {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Bookmark for later';
    }
    if (response?.success) {
      const saved = response.data.job;
      applyJobToUI(saved, { fromPipeline: true });
      updateRecruiterOutreachUI(saved);
      logToConsole(`✓ Saved for later (#${saved.id}). Tailor when ready — LinkedIn invite below.`);
      showToast('Saved for later');
      if (saved.recruiterEmail || saved.isRecruiter) {
        logToConsole('Recruiter posting — Capture recruiter on LinkedIn, then Copy Invite.');
      }
    } else {
      logToConsole(`✗ Save failed: ${response?.error || 'Unknown error'}`);
    }
  });
}

function handleSaveOrOpenPdf() {
  if (pipelineLinked && currentScrapedJob?.pdfPath) {
    openJobPdf();
    return;
  }
  if (pipelineLinked && currentScrapedJob?.status === 'Saved') {
    const autoBox = document.getElementById('ajf-input-auto-process');
    if (autoBox) autoBox.checked = true;
    handleAutoProcessChain();
    return;
  }
  handleSaveJob();
}

function handleSaveJob() {
  const autoProcessCheckbox = document.getElementById('ajf-input-auto-process');
  const shouldAutoProcess = autoProcessCheckbox ? autoProcessCheckbox.checked : false;

  updateScrapedJobFromInputs();
  if (!shouldAutoProcess && !shouldProceedDespiteLowFit(currentScrapedJob, 'Save to pipeline')) {
    return;
  }

  if (shouldAutoProcess) {
    handleAutoProcessChain();
    return;
  }

  const saveBtn = document.getElementById('ajf-btn-save');
  saveBtn.disabled = true;
  saveBtn.innerText = '⌛ Saving...';

  // Read potentially modified inputs
  currentScrapedJob.title = document.getElementById('ajf-input-title').value;
  currentScrapedJob.company = document.getElementById('ajf-input-company').value;
  currentScrapedJob.location = document.getElementById('ajf-input-location').value;
  currentScrapedJob.hiringManager = document.getElementById('ajf-input-hiring-manager').value;
  currentScrapedJob.isRecruiter = document.getElementById('ajf-input-is-recruiter').checked;
  currentScrapedJob.url = canonicalJobUrl(
    document.getElementById('ajf-input-url').value || currentScrapedJob.url
  );

  clearLogs();
  logToConsole('Saving job details to pipeline...');

  sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (response) => {
    saveBtn.disabled = false;
    saveBtn.innerText = 'Save & tailor';

    if (response && response.success) {
      logToConsole('✓ Job saved to pipeline.');
      applyJobToUI(response.data.job, { fromPipeline: true });
    } else {
      logToConsole(`Failed to save job: ${response?.error || 'Unknown error'}`);
    }
  });
}

function updateScrapedJobFromInputs() {
  if (!currentScrapedJob) return;
  currentScrapedJob.title = document.getElementById('ajf-input-title').value;
  currentScrapedJob.company = document.getElementById('ajf-input-company').value;
  currentScrapedJob.location = document.getElementById('ajf-input-location').value;
  const hmVal = document.getElementById('ajf-input-hiring-manager');
  if (hmVal) {
    const raw = hmVal.value.trim();
    currentScrapedJob.hiringManager = raw.startsWith('http')
      ? normalizeLinkedInProfileUrl(raw) || raw
      : raw;
  }
  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  if (isRecruiterBox) {
    currentScrapedJob.isRecruiter = isRecruiterBox.checked;
  }
}

function autoSaveJobDetails() {
  updateScrapedJobFromInputs();
  if (!pipelineLinked || !currentScrapedJob?.id) return;

  const updates = {
    title: currentScrapedJob.title,
    company: currentScrapedJob.company,
    location: currentScrapedJob.location,
    hiringManager: currentScrapedJob.hiringManager,
    hiringManagerName: currentScrapedJob.hiringManagerName || '',
    isRecruiter: currentScrapedJob.isRecruiter,
    suitabilityScore: currentScrapedJob.suitabilityScore
  };

  sendExtensionMessage({
    action: 'updateJob',
    jobId: currentScrapedJob.id,
    updates: updates
  }, (response) => {
    if (response && response.success) {
      logToConsole('✓ Auto-saved edits to pipeline.');
    } else {
      logToConsole(`✗ Auto-save failed: ${response?.error || 'Unknown error'}`);
    }
  });
}

async function handleGenerateHiringIntro() {
  if (!currentScrapedJob || !currentScrapedJob.id || !pipelineLinked) {
    logToConsole('Error: Save the job to the pipeline first.');
    showToast('Save the job to pipeline first!');
    return;
  }

  const genBtn = document.getElementById('ajf-btn-gen-hiring-intro');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerText = '⌛...';
  }

  logToConsole('Drafting short intro to hiring manager...');

  // Append user message to chat UI
  const prompt = "Draft an extremely short, high-impact LinkedIn connection invite message to the hiring manager for this role. It MUST be strictly under 300 characters (including spaces). Focus on APAC fintech/payments product leadership and permanent residency (PR).";
  appendChatMessage('user', prompt);

  // Add typing indicator
  const chatHistory = document.getElementById('ajf-chat-history');
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ajf-chat-msg ajf-chat-msg-ai ajf-typing';
  typingIndicator.innerHTML = '<span class="ajf-dot">.</span><span class="ajf-dot">.</span><span class="ajf-dot">.</span>';
  if (chatHistory) {
    chatHistory.appendChild(typingIndicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  sendExtensionMessage({
    action: 'chat',
    jobTitle: currentScrapedJob.title,
    companyName: currentScrapedJob.company,
    jobDescription: currentScrapedJob.description || '',
    suitabilityAssessment: currentScrapedJob.suitabilityAssessment || '',
    isRecruiter: !!currentScrapedJob.isRecruiter,
    messages: chatMessages
  }, (response) => {
    if (typingIndicator) typingIndicator.remove();
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerText = 'Gen Intro';
    }

    if (response && response.success && response.data?.reply) {
      const reply = response.data.reply;
      appendChatMessage('assistant', reply);

      // Save the generated intro to database
      currentScrapedJob.hiringManagerIntro = reply;

      sendExtensionMessage({
        action: 'updateJob',
        jobId: currentScrapedJob.id,
        updates: { hiringManagerIntro: reply }
      }, (updateRes) => {
        if (updateRes && updateRes.success) {
          logToConsole('✓ Hiring manager intro saved to pipeline.');
          applyJobToUI(updateRes.data, { fromPipeline: true });
          updateConnectMessagePreview(currentScrapedJob);
          showToast('Intro generated — see message in step ⑤ or chat');
        } else {
          logToConsole('Failed to save intro to pipeline database.');
        }
      });
    } else {
      appendChatMessage('system', `Error drafting intro: ${response?.error || 'Unknown error'}`);
      logToConsole(`✗ Error: ${response?.error || 'Unknown error'}`);
    }
  });
}

function handleAssessMatch() {
  const assessBtn = document.getElementById('ajf-btn-assess');
  const assessSection = document.getElementById('ajf-assess-section');
  const assessResult = document.getElementById('ajf-assess-result');

  if (!assessBtn || !assessSection || !assessResult) return;

  assessBtn.disabled = true;
  const originalText = assessBtn.innerHTML;
  assessBtn.innerHTML = '⌛ Assessing...';

  // Read potentially modified inputs
  const jobTitle = document.getElementById('ajf-input-title').value;
  const companyName = document.getElementById('ajf-input-company').value;
  const jobDescription = currentScrapedJob?.description || '';

  clearLogs();
  logToConsole('Assessing job relevance via DeepSeek API...');

  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  const isRecruiter = isRecruiterBox ? isRecruiterBox.checked : false;

  sendExtensionMessage(
    {
      action: 'assessMatch',
      jobTitle,
      companyName,
      jobDescription,
      isRecruiter
    },
    (response) => {
      assessBtn.disabled = false;
      assessBtn.innerHTML = originalText;

      if (response && response.success) {
        const score = response.data.score || 5;
        logToConsole('✓ Suitability assessment complete.');

        if (currentScrapedJob) {
          currentScrapedJob.suitabilityAssessment = response.data.explanation;
          currentScrapedJob.suitabilityScore = score;
          applyScoreCorrection(currentScrapedJob);
        }

        setCollapsibleInsight('ajf-assess-section', stripScoreFromText(response.data.explanation));
        const correctedScore = currentScrapedJob?.suitabilityScore ?? score;
        if (correctedScore <= LOW_FIT_SCORE_THRESHOLD) {
          logToConsole(`⚠️ Score ${correctedScore}/10 — review assessment notes above.`);
        }

        // Auto-save the job to pipeline database so the user doesn't get N/A or have to click Save manually
        if (currentScrapedJob) {
          currentScrapedJob.title = document.getElementById('ajf-input-title').value;
          currentScrapedJob.company = document.getElementById('ajf-input-company').value;
          currentScrapedJob.location = document.getElementById('ajf-input-location').value;
          currentScrapedJob.hiringManager = document.getElementById('ajf-input-hiring-manager').value;
          currentScrapedJob.isRecruiter = isRecruiter;
          currentScrapedJob.url = canonicalJobUrl(
            document.getElementById('ajf-input-url').value || currentScrapedJob.url
          );

          logToConsole('Auto-saving job and assessment to pipeline...');
          sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              logToConsole('✓ Job and assessment auto-saved to pipeline.');
              pipelineLinked = true;
              if (saveResponse.data && saveResponse.data.job) {
                currentScrapedJob = saveResponse.data.job;
              }
              updateActionButtons();
              const statusBadge = document.getElementById('ajf-job-status');
              applyJobToUI(currentScrapedJob, { fromPipeline: true });
            } else {
              logToConsole(`✗ Auto-save failed: ${saveResponse?.error || 'Unknown error'}`);
            }
          });
        }
      } else {
        logToConsole(`✗ Assessment failed: ${response?.error || 'Unknown error'}`);
        showToast('Assessment failed!');
      }
    }
  );
}

function handleTailorJob() {
  const tailorBtn = document.getElementById('ajf-btn-tailor');
  tailorBtn.disabled = true;
  tailorBtn.innerText = '…';

  logToConsole('Resolving pipeline job…');

  resolvePipelineJob((job, err) => {
    if (!job) {
      logToConsole(err === 'not_found' ? 'Save to pipeline first.' : `✗ ${err}`);
      tailorBtn.disabled = false;
      tailorBtn.innerText = 'Tailor';
      return;
    }

    logToConsole(`Tailoring job #${job.id} (${job.status})…`);
    logToConsole('Generating cover letter and tailored work history…');

    const jdLower = (job.description || '').toLowerCase();
    const titleLower = (job.title || '').toLowerCase();
    let detectedDomain = 'General B2B SaaS';
    let highlights = 'Emphasizing general B2B SaaS product leadership, Vincere multi-client ATS roadmap, and product analytics setups.';

    if (jdLower.includes('payment') || jdLower.includes('finance') || jdLower.includes('credit') || jdLower.includes('billing') || titleLower.includes('fintech') || titleLower.includes('payment') || titleLower.includes('card')) {
      detectedDomain = 'Fintech/Payments';
      highlights = 'Emphasizing Spenmo credit line/BaaS, Paymentwall payouts, and Foundation yield regulations.';
    } else if (jdLower.includes('solana') || jdLower.includes('blockchain') || jdLower.includes('crypto') || jdLower.includes('web3') || jdLower.includes('token')) {
      detectedDomain = 'Crypto/Web3';
      highlights = 'Emphasizing Foundation Solana yield, real-time NAV pools, and MC Research cross-chain wallet scaling.';
    } else if (jdLower.includes('ai ') || jdLower.includes('machine learning') || jdLower.includes('llm') || jdLower.includes('gpt') || jdLower.includes('conversational') || jdLower.includes('speech') || jdLower.includes('nlp')) {
      detectedDomain = 'AI/ML';
      highlights = 'Emphasizing Dirac AI GPT-3 prompt engineering, Answerbuddy NLP chatbots, and speech agent systems.';
    }

    logToConsole(`Detected Target Domain: ${detectedDomain}`);
    logToConsole(`Injection Plan: ${highlights}`);

    const instrInput = document.getElementById('ajf-job-custom-instructions');
    const customInstructions = instrInput ? instrInput.value : '';

    sendExtensionMessage({ action: 'tailorJob', jobId: job.id, customInstructions }, (response) => {
      if (response && response.success) {
        const modelInfo = response.data?.tailoredByModel
          ? `CV: ${response.data.tailoredByModel}${response.data.coverLetterByModel ? ` · Letter: ${response.data.coverLetterByModel}` : ''}`
          : 'unknown model';
        logToConsole(`CV & cover letter tailored successfully! (${modelInfo})`);
        applyJobToUI(response.data, { fromPipeline: true });

        logToConsole('Automatically compiling PDF CV...');
        sendExtensionMessage({ action: 'generatePdf', jobId: job.id }, (pdfResponse) => {
          tailorBtn.disabled = false;
          tailorBtn.innerText = 'Tailor';

          if (pdfResponse && pdfResponse.success) {
            logToConsole('PDF Generated successfully!');
            currentScrapedJob.pdfPath = pdfResponse.data.pdfUrl;

            updateActionButtons();
          } else {
            logToConsole(`Failed to compile PDF: ${pdfResponse?.error || 'Unknown error'}`);
          }
        });
      } else {
        tailorBtn.disabled = false;
        tailorBtn.innerText = 'Tailor';
        logToConsole(`Failed to tailor job: ${response?.error || 'Unknown error'}`);
      }
    });
  });
}

// ----------------------------------------------------
// AUTO-FILL ENGINE
// ----------------------------------------------------
async function handleAutofill() {
  const autofillBtn = document.getElementById('ajf-btn-autofill');
  autofillBtn.disabled = true;
  autofillBtn.innerText = '⚡ Filling Form...';

  logToConsole('Starting autofill sequence...');

  // Fetch settings to get profile & resume
  sendExtensionMessage({ action: 'getSettings' }, async (settingsResponse) => {
    if (!settingsResponse || !settingsResponse.success) {
      logToConsole('Failed to read settings from local server.');
      autofillBtn.disabled = false;
      autofillBtn.innerText = '⚡ Autofill Application';
      return;
    }

    currentSettings = settingsResponse.data;
    const profile = currentSettings.profile || {};
    const pName = profile.name || '';
    const pEmail = profile.email || '';
    const pPhone = profile.phone || '';
    const pLinkedin = profile.linkedin || '';
    const pGithub = profile.github || '';
    const pWebsite = profile.website || '';
    const pVisa = profile.visa || '';

    const coverLetter = (currentScrapedJob && currentScrapedJob.coverLetter) || '';
    const pdfUrl = (currentScrapedJob && currentScrapedJob.pdfPath) 
      ? `http://localhost:3004${currentScrapedJob.pdfPath}` 
      : `http://localhost:3004/Eugene_Bochkov_CV.pdf`;
    const cleanCompany = ((currentScrapedJob && currentScrapedJob.company) || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = (currentScrapedJob && currentScrapedJob.pdfPath)
      ? `Eugene_bochkov_CV_${cleanCompany}.pdf`
      : 'Eugene_Bochkov_CV.pdf';

    logToConsole('Analyzing application fields...');
    const autofillRoot = getAutofillRoot();
    const formElements = autofillRoot.querySelectorAll('input, textarea, select');
    const radioGroups = {};
    let fieldsFilled = 0;

    for (const el of formElements) {
      if (isInsideCopilot(el)) continue;
      if (el.offsetWidth === 0 || el.offsetHeight === 0) continue; // skip hidden

      const info = getElementInfo(el);
      const labelLower = info.label.toLowerCase();
      const nameLower = info.name.toLowerCase();
      const placeholderLower = info.placeholder.toLowerCase();
      const combined = `${labelLower} ${nameLower} ${placeholderLower}`;

      if (combined.includes('recaptcha') || info.type === 'submit' || info.type === 'button') {
        continue;
      }

      // 1. File Uploads (Resume/CV)
      if (info.type === 'file') {
        if (combined.includes('resume') || combined.includes('cv') || combined.includes('profile')) {
          logToConsole(`Uploading PDF CV to: "${info.label || info.name || 'Resume'}"...`);
          const uploaded = await uploadPdfFile(el, pdfUrl, pdfFilename);
          if (uploaded) {
            logToConsole('✓ File uploaded successfully.');
            fieldsFilled++;
          }
          continue;
        }
      }

      // 2. Radio Groups
      if (info.type === 'radio') {
        const groupName = info.name || 'unnamed-group';
        if (!radioGroups[groupName]) radioGroups[groupName] = [];
        radioGroups[groupName].push({ element: el, info });
        continue;
      }

      // 3. Text & Textarea Inputs
      if (info.tagName === 'INPUT' || info.tagName === 'TEXTAREA') {
        let val = null;

        if (combined.includes('first name') || combined.includes('given name')) {
          val = pName.split(' ')[0];
        } else if (combined.includes('last name') || combined.includes('surname') || combined.includes('family name')) {
          val = pName.split(' ').slice(1).join(' ') || '.';
        } else if (combined.includes('name') && !combined.includes('company') && !combined.includes('school') && !combined.includes('degree') && !combined.includes('reference')) {
          val = pName;
        } else if (info.type === 'email' || combined.includes('email')) {
          val = pEmail;
        } else if (info.type === 'tel' || combined.includes('phone') || combined.includes('mobile') || combined.includes('contact')) {
          val = pPhone;
        } else if (combined.includes('linkedin')) {
          val = pLinkedin ? (pLinkedin.startsWith('http') ? pLinkedin : `https://${pLinkedin}`) : '';
        } else if (combined.includes('github')) {
          val = pGithub ? (pGithub.startsWith('http') ? pGithub : `https://${pGithub}`) : '';
        } else if (combined.includes('website') || combined.includes('portfolio') || combined.includes('personal link') || combined.includes('url')) {
          val = pWebsite || pLinkedin;
        } else if (combined.includes('cover letter') || combined.includes('comments') || combined.includes('message') || combined.includes('note') || combined.includes('letter')) {
          val = coverLetter;
        } else if (combined.includes('why') || combined.includes('interest') || combined.includes('reason') || combined.includes('statement of purpose') || combined.includes('about the role') || combined.includes('fit')) {
          val = extractWhyInterested(coverLetter, currentScrapedJob.company);
        } else if (combined.includes('visa') || combined.includes('sponsorship') || combined.includes('work authorization') || combined.includes('work rights')) {
          val = pVisa;
        } else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start date') || combined.includes('how soon')) {
          val = "Immediate (relocating in 1-2 months, visa subclass 858 permanent residency already granted)";
        } else if (combined.includes('salary') || combined.includes('expectation') || combined.includes('compensation') || combined.includes('desired pay')) {
          val = "Negotiable / Market rate";
        } else if (combined.includes('country')) {
          val = "Australia";
        } else if (combined.includes('address') || combined.includes('street')) {
          val = profile.address || "9 Revell Crescent, St Albans, VIC 3021";
        } else if (combined.includes('city') || combined.includes('suburb') || combined.includes('town')) {
          val = "St Albans";
        } else if (combined.includes('state') || combined.includes('region') || combined.includes('province')) {
          val = "Victoria";
        } else if (combined.includes('zip') || combined.includes('postcode') || combined.includes('postal')) {
          val = "3021";
        } else if (combined.includes('location') && !combined.includes('job')) {
          val = "St Albans, VIC";
        } else if (/product management.*year|years.*product management/i.test(combined)) {
          val = '10';
        } else if (/saas.*startup.*year|years.*saas.*startup/i.test(combined)) {
          val = '8';
        } else if (/years.*\bsaas\b|saas.*years|software as a service/i.test(combined)) {
          val = '8';
        } else if (/\bepm\b|enterprise project management/i.test(combined)) {
          val = '5';
        } else if (/years.*experience|how many years/i.test(combined) && combined.includes('product')) {
          val = '10';
        }

        if (val !== null && val !== '') {
          await setElementValue(el, val);
          fieldsFilled++;
        }
      }

      // 4. Select Dropdowns
      if (info.tagName === 'SELECT') {
        const questionText = getQuestionText(el).toLowerCase();
        const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support');
        const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('work in') || questionText.includes('eligible');
        const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability');
        const isCountry = questionText.includes('country') || nameLower.includes('country') || labelLower.includes('country') || combined.includes('country');
        const isState = questionText.includes('state') || questionText.includes('province') || nameLower.includes('state') || labelLower.includes('state') || combined.includes('state') || combined.includes('province');

        let bestOption = null;
        let bestScore = -999;

        for (const opt of Array.from(el.options)) {
          const optText = opt.innerText.toLowerCase();
          if (!opt.value || optText.includes('select') || optText.includes('choose')) continue;

          let score = 0;
          if (isSponsorship) {
            if (optText.includes('no') || optText.includes('not require') || optText.includes('without sponsorship')) score += 10;
            if (optText.includes('yes') || optText.includes('require sponsorship')) score -= 10;
          } else if (isEligibility) {
            if (optText.includes('yes') || optText.includes('authorized') || optText.includes('eligible') || optText.includes('pr') || optText.includes('permanent resident')) score += 10;
            if (optText.includes('no')) score -= 10;
          } else if (isEEOC) {
            if (optText.includes('decline') || optText.includes('prefer not to say') || optText.includes('disclose')) score += 10;
          } else if (isCountry) {
            if (optText === 'australia' || optText.includes('australia')) score += 20;
          } else if (isState) {
            if (optText === 'victoria' || optText === 'vic' || optText.includes('victoria')) score += 20;
          }

          if (score > bestScore && score > 0) {
            bestScore = score;
            bestOption = opt.value;
          }
        }

        if (bestOption) {
          el.value = bestOption;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          fieldsFilled++;
        }
      }
    }

    // 5. Fill Radio Groups
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      if (radios.length === 0) continue;
      const firstEl = radios[0].element;
      const questionText = getQuestionText(firstEl).toLowerCase();

      const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support');
      const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('eligible');
      const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability');
      const isHybrid = questionText.includes('hybrid');
      const isRemote = questionText.includes('remote') && questionText.includes('comfortable');

      if (!isSponsorship && !isEligibility && !isEEOC && !isHybrid && !isRemote) continue;

      let bestRadio = null;
      let bestScore = -999;

      for (const radio of radios) {
        const optionText = radio.info.label.toLowerCase();
        let score = 0;

        if (isSponsorship) {
          if (optionText.includes('without sponsorship') || optionText.includes('no sponsorship') || optionText.includes('do not require') || optionText.includes("don't require")) score += 15;
          if (optionText.includes('require sponsorship') || optionText.includes('need sponsorship')) score -= 15;
          if (optionText === 'no' || optionText === 'no.') score += 10;
          if (optionText === 'yes' || optionText === 'yes.') score -= 10;
        } else if (isEligibility) {
          if (optionText.includes('yes') || optionText.includes('authorized') || optionText.includes('eligible') || optionText.includes('permanent resident') || optionText.includes('pr')) score += 15;
          if (optionText.includes('no')) score -= 15;
          if (optionText === 'yes' || optionText === 'yes.') score += 10;
          if (optionText === 'no' || optionText === 'no.') score -= 10;
        } else if (isEEOC) {
          if (optionText.includes('decline') || optionText.includes('prefer not to say') || optionText.includes('disclose')) score += 15;
        } else if (isHybrid || isRemote) {
          if (optionText === 'yes' || optionText === 'yes.' || optionText.startsWith('yes')) score += 15;
          if (optionText === 'no' || optionText === 'no.') score -= 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestRadio = radio.element;
        }
      }

      if (bestRadio && bestScore > 0) {
        clickRadio(bestRadio);
        fieldsFilled++;
      }
    }

    // 6. Terms & Agreements Checkboxes
    const checkboxes = autofillRoot.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      if (isInsideCopilot(cb)) continue;
      if (cb.offsetWidth === 0 || cb.offsetHeight === 0) continue;
      const info = getElementInfo(cb);
      const labelLower = info.label.toLowerCase();
      if (labelLower.includes('agree') || labelLower.includes('accept') || labelLower.includes('consent') || labelLower.includes('terms') || labelLower.includes('privacy')) {
        checkCheckbox(cb);
        fieldsFilled++;
      }
    }

    logToConsole(`Autofill complete! Filled ${fieldsFilled} fields.`);
    showToast(`🚀 Copilot pre-filled ${fieldsFilled} fields!`);
    autofillBtn.disabled = false;
    autofillBtn.innerText = '⚡ Autofill Application';
  });
}

function getElementInfo(element) {
  const id = element.getAttribute('id') || '';
  const name = element.getAttribute('name') || '';
  const placeholder = element.getAttribute('placeholder') || '';
  const type = (element.getAttribute('type') || '').toLowerCase();
  const tagName = element.tagName.toUpperCase();

  let labelText = '';
  const ariaLabel = element.getAttribute('aria-label') || '';
  if (ariaLabel) labelText = ariaLabel;

  const searchRoot = element.closest('dialog') || document;
  if (id) {
    const label = searchRoot.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) labelText = label.innerText || labelText;
  }
  if (!labelText) {
    const parentLabel = element.closest('label');
    if (parentLabel) labelText = parentLabel.innerText;
  }
  if (!labelText) {
    const formGroup = element.closest('[class*="field"], [class*="group"], [class*="row"], [class*="container"]');
    if (formGroup) {
      const textEl = formGroup.querySelector('label, span, p, .label, [class*="label"]');
      if (textEl && textEl !== element) labelText = textEl.innerText;
    }
  }
  if (!labelText) {
    const prev = element.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
      labelText = prev.innerText;
    }
  }

  return {
    label: labelText.trim(),
    name: name.trim(),
    placeholder: placeholder.trim(),
    id: id.trim(),
    type: type,
    tagName: tagName
  };
}

function getQuestionText(element) {
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) return legend.innerText.trim();
  }

  let parent = element.parentElement;
  for (let i = 0; i < 5 && parent; i++) {
    const qText = parent.querySelector('label, span, p, h1, h2, h3, h4, [class*="label"], [class*="question"]');
    if (qText && qText !== element && !element.closest('label')) {
      const text = qText.innerText.trim();
      if (text.length > 5) return text;
    }
    parent = parent.parentElement;
  }
  return '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setElementValue(element, value) {
  if (!element) return;

  // Focus the element
  element.focus();
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  await sleep(100 + Math.random() * 100);

  // If long text (e.g., cover letter), simulate pasting
  if (value.length > 100) {
    // Type a small prefix to look natural
    const prefix = value.substring(0, Math.min(3, value.length));
    let typed = '';
    for (const char of prefix) {
      typed += char;
      element.value = typed;
      element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(50 + Math.random() * 100);
    }

    // Trigger paste event
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData.setData('text/plain', value);
    element.dispatchEvent(pasteEvent);

    // Set full value
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(200 + Math.random() * 200);
  } else {
    // Short text: type character-by-character
    element.value = '';
    let typed = '';
    for (const char of value) {
      typed += char;
      element.value = typed;
      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        keyCode: char.charCodeAt(0),
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));
      element.dispatchEvent(new KeyboardEvent('keypress', {
        key: char,
        keyCode: char.charCodeAt(0),
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', {
        key: char,
        keyCode: char.charCodeAt(0),
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));
      await sleep(30 + Math.random() * 70); // 30ms - 100ms per char
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(100 + Math.random() * 100);
  }

  // Blur the element
  element.blur();
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

async function checkCheckbox(checkbox) {
  if (checkbox.checked) return;

  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
  if (descriptor && descriptor.set) {
    descriptor.set.call(checkbox, true);
  } else {
    checkbox.checked = true;
  }
  checkbox.dispatchEvent(new Event('click', { bubbles: true }));
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  checkbox.dispatchEvent(new Event('input', { bubbles: true }));

  if (!checkbox.checked) {
    const parentLabel = checkbox.closest('label');
    if (parentLabel) {
      parentLabel.click();
    } else {
      const id = checkbox.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          label.click();
        } else {
          checkbox.click();
        }
      } else {
        checkbox.click();
      }
    }
  }

  await sleep(100);
}

async function clickRadio(radio) {
  if (radio.checked) return;

  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
  if (descriptor && descriptor.set) {
    descriptor.set.call(radio, true);
  } else {
    radio.checked = true;
  }
  radio.dispatchEvent(new Event('click', { bubbles: true }));
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  radio.dispatchEvent(new Event('input', { bubbles: true }));

  if (!radio.checked) {
    const parentLabel = radio.closest('label');
    if (parentLabel) {
      parentLabel.click();
    } else {
      const id = radio.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
          label.click();
        } else {
          radio.click();
        }
      } else {
        radio.click();
      }
    }
  }

  await sleep(100);
}

async function setSelectElementValue(el, value) {
  el.focus();
  el.dispatchEvent(new Event('focus', { bubbles: true }));

  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  await sleep(100);
  el.blur();
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

async function clickCustomDropdownOption(selectEl, optionText) {
  const container = selectEl.closest('div, section');
  if (!container) return false;

  const trigger = container.querySelector('button, [role="combobox"], [aria-haspopup="listbox"], .dropdown, [class*="select"]');
  if (trigger && isElementVisible(trigger)) {
    console.log('[Copilot] Found custom dropdown trigger. Clicking to expand...');
    trigger.click();
    await sleep(300);

    const options = Array.from(document.querySelectorAll('li, [role="option"], [class*="option"], [class*="item"], button'));
    for (const opt of options) {
      if (!isElementVisible(opt)) continue;
      const text = opt.innerText.toLowerCase();
      if (text.includes(optionText.toLowerCase())) {
        console.log('[Copilot] Clicking custom option:', opt.innerText);
        opt.click();
        await sleep(200);
        return true;
      }
    }
  }
  return false;
}

async function selectUploadResumeOption() {
  const items = Array.from(document.querySelectorAll('div, label, span, p, h2, h3'));
  for (const item of items) {
    const text = item.innerText || '';
    if (
      (text === 'Upload a resume' || text === 'Upload resume' || text === 'Upload a CV') &&
      item.offsetWidth > 0
    ) {
      const clickable = item.closest('button, label, [role="radio"], [role="button"], [class*="card"]');
      if (clickable) {
        logToConsole('Selecting Indeed "Upload a resume" option...');
        clickable.click();
        await sleep(600); // Wait for the file input to hydrate into the DOM
        return true;
      }
    }
  }
  return false;
}

function findResumeFileInput() {
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (inputs.length === 0) return null;
  if (inputs.length === 1) return inputs[0];

  for (const input of inputs) {
    const parentText = (input.closest('div, section, label, form')?.innerText || '').toLowerCase();
    if (parentText.includes('resume') || parentText.includes('cv')) {
      return input;
    }
  }
  return inputs[0];
}

async function uploadPdfFile(inputElement, pdfUrl, filename) {
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`Fetch fail: ${res.statusText}`);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'application/pdf' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputElement.files = dataTransfer.files;

    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch (err) {
    console.error('File upload error:', err);
    return false;
  }
}

function extractWhyInterested(coverLetter, companyName) {
  if (!coverLetter) return '';
  const paragraphs = coverLetter.split('\n').map(p => p.trim()).filter(Boolean);

  // Look for a paragraph containing the company name and words indicating interest/fit
  for (const p of paragraphs) {
    const pLower = p.toLowerCase();
    if (
      (companyName && pLower.includes(companyName.toLowerCase())) &&
      (pLower.includes('draw') || pLower.includes('excit') || pLower.includes('mission') || pLower.includes('align') || pLower.includes('interest') || pLower.includes('opportunity'))
    ) {
      return p;
    }
  }

  // Fallback: look for any paragraph containing "drawn to", "excited about", or "mission"
  for (const p of paragraphs) {
    const pLower = p.toLowerCase();
    if (pLower.includes('drawn to') || pLower.includes('excited about') || pLower.includes('aligns with') || pLower.includes('mission')) {
      return p;
    }
  }

  // Fallback 2: If we couldn't find a specific paragraph, return a clean generic fallback
  return `I am excited about the opportunity to bring my B2B SaaS and fintech product leadership experience to the team, contributing to high-impact initiatives and helping scale your platform.`;
}

function showToast(message) {
  let toast = document.getElementById('ajf-status-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ajf-status-toast';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.style.display = 'flex';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

function isExtensionContextValid() {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function isExtensionDisconnectedError(msg = '') {
  const m = String(msg).toLowerCase();
  return (
    m.includes('invalidated') ||
    m.includes('extension context') ||
    m.includes('connection lost') ||
    m.includes('receiving end does not exist') ||
    m.includes('message port closed')
  );
}

function markExtensionDisconnected(reason = 'Extension context invalidated') {
  if (extensionDisconnected) return;
  extensionDisconnected = true;
  const statusBadge = document.getElementById('ajf-job-status');
  if (statusBadge && statusBadge.innerText === 'Checking...') {
    statusBadge.innerText = 'Offline';
    statusBadge.className = 'ajf-badge ajf-badge-dismissed';
  }
  logToConsole('⚠ Extension reloaded — refresh this tab to reconnect Copilot.');
  showToast('Refresh page to reconnect Copilot');
}

function sendExtensionMessage(message, callback) {
  if (extensionDisconnected || !isExtensionContextValid()) {
    markExtensionDisconnected('Extension context invalidated');
    if (callback) callback({ success: false, error: 'Extension context invalidated' });
    return false;
  }
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    markExtensionDisconnected('Extension connection lost');
    if (callback) callback({ success: false, error: 'Extension connection lost' });
    return false;
  }
  try {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        if (isExtensionDisconnectedError(lastError.message)) {
          markExtensionDisconnected(lastError.message);
        } else {
          logToConsole(`✗ Extension error: ${lastError.message}`);
        }
        if (callback) callback({ success: false, error: lastError.message });
        return;
      }
      if (callback) callback(response);
    });
    return true;
  } catch (e) {
    if (isExtensionDisconnectedError(e.message)) {
      markExtensionDisconnected(e.message);
    } else {
      logToConsole(`✗ Extension error: ${e.message}`);
    }
    if (callback) callback({ success: false, error: e.message });
    return false;
  }
}

// Chatbot helpers
function clearChat() {
  chatMessages = [];
  const chatHistory = document.getElementById('ajf-chat-history');
  if (!chatHistory) return;
  chatHistory.innerHTML = '';
  setCollapsibleInsight('ajf-tailor-explanation-section', '', { visible: false });
}

async function handleSendChatMessage() {
  const inputEl = document.getElementById('ajf-chat-input');
  const sendBtn = document.getElementById('ajf-btn-chat-send');
  const chatHistory = document.getElementById('ajf-chat-history');
  if (!inputEl || !sendBtn || !chatHistory) return;

  const query = inputEl.value.trim();
  if (!query) return;

  inputEl.value = '';
  appendChatMessage('user', query);

  inputEl.disabled = true;
  sendBtn.disabled = true;

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ajf-chat-msg ajf-chat-msg-ai ajf-typing';
  typingIndicator.innerHTML = '<span class="ajf-dot">.</span><span class="ajf-dot">.</span><span class="ajf-dot">.</span>';
  chatHistory.appendChild(typingIndicator);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
    const isRecruiter = isRecruiterBox ? isRecruiterBox.checked : (!!currentScrapedJob?.isRecruiter);

    sendExtensionMessage({
      action: 'chat',
      jobTitle: currentScrapedJob?.title || document.getElementById('ajf-input-title')?.value || 'Job Opportunity',
      companyName: currentScrapedJob?.company || document.getElementById('ajf-input-company')?.value || 'Unknown',
      jobDescription: currentScrapedJob?.description || '',
      suitabilityAssessment: currentScrapedJob?.suitabilityAssessment || '',
      isRecruiter: isRecruiter,
      messages: chatMessages
    }, (response) => {
      typingIndicator.remove();
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();

      if (chrome.runtime.lastError) {
        appendChatMessage('system', `Extension Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (response && response.success && response.data?.reply) {
        appendChatMessage('assistant', response.data.reply);
      } else {
        appendChatMessage('system', `Failed to get response: ${response?.error || 'Unknown error'}`);
      }
    });
  } catch (err) {
    typingIndicator.remove();
    inputEl.disabled = false;
    sendBtn.disabled = false;
    appendChatMessage('system', `Error: ${err.message}`);
  }
}

function appendChatMessage(role, content) {
  const chatHistory = document.getElementById('ajf-chat-history');
  if (!chatHistory) return;

  if (role === 'user' || role === 'assistant') {
    chatMessages.push({ role, content });
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = `ajf-chat-msg ajf-chat-msg-${role}`;
  msgDiv.textContent = content;
  chatHistory.appendChild(msgDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Start Copilot (deferred init supports SPAs like zedai.dev that hydrate after load)
tryInitCopilot();

let initAttempts = 0;
const initInterval = setInterval(() => {
  if (tryInitCopilot() || initAttempts++ >= 20) {
    clearInterval(initInterval);
  }
}, 1000);

// Watch for SPA URL changes
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    tryInitCopilot();
    if (!document.getElementById('ajf-launcher')) return;
    logToConsole('URL change detected (SPA). Rechecking pipeline shortly...');
    clearLogs();
    runSpaAutoReparse();
    setupHiringManagerObserver();
    runIndeedIntegration();
  }
});
urlObserver.observe(document, { subtree: true, childList: true });

let easyApplySyncTimer = null;
function scheduleEasyApplyPipelineSync() {
  if (easyApplySyncTimer) clearTimeout(easyApplySyncTimer);
  easyApplySyncTimer = setTimeout(() => {
    if (!document.getElementById('ajf-launcher') || !isLinkedInEasyApplyOpen()) return;
    logToConsole('Easy Apply modal detected — syncing pipeline…');
    refreshPipelineOnOpen();
  }, 500);
}
const easyApplyObserver = new MutationObserver(scheduleEasyApplyPipelineSync);
easyApplyObserver.observe(document.documentElement, { childList: true, subtree: true });

// Start Indeed Automation integrations
runIndeedIntegration();

// Periodically check Indeed pages in case of dynamic client-side loading or SPA navigation
setInterval(() => {
  const url = window.location.href;
  if (url.includes('indeed.com')) {
    const isSearchPage = url.includes('/jobs') || url.includes('/q-') || document.querySelector('.job_seen_beacon, td.resultContent, #mosaic-provider-jobcards') !== null;
    if (isSearchPage && !document.getElementById('ajf-indeed-launcher')) {
      injectIndeedSearchLauncher();
    }
  }
}, 1500);

// Periodically check for lazy-loaded details on LinkedIn (like the hiring manager, location, company)
setInterval(() => {
  const url = window.location.href;
  if (url.includes('linkedin.com') && currentScrapedJob) {
    let updated = false;

    const hmBefore = (currentScrapedJob.hiringManager || '').trim();
    const hmInfo = syncHiringManagerFromPage({ autoSave: false, silent: true });
    if (hmInfo && (currentScrapedJob.hiringManager || '').trim() !== hmBefore) {
      logToConsole(`✓ Lazy-loaded hiring manager detected: ${currentScrapedJob.hiringManager}`);
      updated = true;
    }

    // 2. Location (if currently 'Australia', 'Other', 'Unknown', or empty)
    const currentLoc = (currentScrapedJob.location || '').trim();
    if (!currentLoc || currentLoc === 'Australia' || currentLoc === 'Other' || currentLoc === 'Unknown') {
      let foundLoc = getLinkedInLocation();
      if (foundLoc) {
        const lowerLoc = foundLoc.toLowerCase();
        let mappedLoc = 'Australia';
        if (lowerLoc.includes('sydney')) {
          mappedLoc = 'Sydney';
        } else if (lowerLoc.includes('melbourne')) {
          mappedLoc = 'Melbourne';
        }

        if (mappedLoc !== 'Australia' && currentLoc !== mappedLoc) {
          currentScrapedJob.location = mappedLoc;
          const locInput = document.getElementById('ajf-input-location');
          if (locInput) locInput.value = mappedLoc;
          const selectLoc = document.getElementById('ajf-select-location');
          if (selectLoc) {
            selectLoc.value = mappedLoc;
            if (locInput) locInput.style.display = 'none';
          }
          logToConsole(`✓ Lazy-loaded location detected: ${mappedLoc}`);
          updated = true;
        }
      }
    }

    // 3. Company Name (if missing, Unknown, or wrongly parsed as LinkedIn)
    if (!currentScrapedJob.company || isBadCompanyName(currentScrapedJob.company)) {
      const foundComp = getLinkedInCompany();
      if (foundComp && currentScrapedJob.company !== foundComp) {
        currentScrapedJob.company = foundComp;
        const compInput = document.getElementById('ajf-input-company');
        if (compInput) compInput.value = foundComp;
        logToConsole(`✓ Lazy-loaded company name detected: ${foundComp}`);
        updated = true;
      }
    }

    // Auto-save changes if any value was updated
    if (updated) {
      autoSaveJobDetails();
    }
  }
}, 2000);

// Periodically refresh parsed details on generic career SPAs (e.g. zedai.dev)
setInterval(() => {
  const url = window.location.href;
  if (!document.getElementById('ajf-launcher')) {
    tryInitCopilot();
    return;
  }
  if (url.includes('linkedin.com') || url.includes('indeed.com')) return;
  if (!isGenericCareerPage(url) && !isCopilotPage()) return;
  if (!currentScrapedJob) return;

  const scraped = extractJobDetails();
  const titleImproved = scraped.title && scraped.title !== 'Job Opportunity' &&
    (!currentScrapedJob.title || currentScrapedJob.title === 'Job Opportunity' || currentScrapedJob.title.length < scraped.title.length);
  const descImproved = scraped.description && scraped.description.length > (currentScrapedJob.description?.length || 0) + 100;

  if (titleImproved || descImproved) {
    currentScrapedJob = { ...currentScrapedJob, ...scraped, url: canonicalJobUrl(scraped.url) };
    populateUIFields();
    updateActionButtons();
    logToConsole('✓ SPA job details refreshed from page.');
  }
}, 2000);

function runIndeedIntegration() {
  const url = window.location.href;
  const isIndeed = url.includes('indeed.com');
  const isSearchPage = url.includes('/jobs') || url.includes('/q-') || document.querySelector('.job_seen_beacon, td.resultContent, #mosaic-provider-jobcards') !== null;

  // 1. INDEED SEARCH PAGE INTEGRATION
  if (isIndeed && isSearchPage && !detectCaptcha()) {
    injectIndeedSearchLauncher();
  }

  // 2. INDEED JOB VIEW, EASY APPLY, AND INTERSTITIAL CAPTCHA AUTOMATOR
  sendExtensionMessage({ action: 'getQueueState' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success || !response.queue?.isActive) {
      return; // Queue is not active
    }

    const queue = response.queue;

    // Handle the post-Easy-Apply redirect: Indeed sends users to /companies after a successful submission.
    // Detect this as a success, mark the job as Applied, and advance the queue.
    if (isIndeed && url.includes('indeed.com/companies') && !detectCaptcha()) {
      console.log('[Content] Detected post-apply /companies redirect. Marking job as applied and advancing queue...');
      const hud = injectIndeedHUD(queue);
      hud.updateStatus('✅ Application Submitted! Marking as Applied...');
      const currentJob = queue.jobList[queue.currentIndex];

      function markAppliedAndAdvance(jobId) {
        sendExtensionMessage({
          action: 'updateJobStatus',
          jobId,
          status: 'Applied'
        }, () => {
          hud.updateStatus('✅ Marked Applied! Moving to next job in 3 seconds...');
          setTimeout(() => { sendExtensionMessage({ action: 'nextIndeedJob' }); }, 3000);
        });
      }

      sendExtensionMessage({
        action: 'lookupJob',
        title: currentJob.title,
        company: currentJob.company
      }, (lookupRes) => {
        if (lookupRes?.success && lookupRes.data?.id) {
          markAppliedAndAdvance(lookupRes.data.id);
        } else {
          // Job not in DB yet — add it now, then mark Applied
          sendExtensionMessage({
            action: 'addJob',
            job: {
              title: currentJob.title,
              company: currentJob.company,
              url: currentJob.url,
              status: 'To Process',
              source: 'Indeed Auto-Apply'
            }
          }, (addRes) => {
            const added = addRes?.success && (addRes.data?.job || addRes.data);
            if (added?.id) {
              markAppliedAndAdvance(added.id);
            } else {
              // Fallback: just advance
              setTimeout(() => { sendExtensionMessage({ action: 'nextIndeedJob' }); }, 3000);
            }
          });
        }
      });
      return;
    }

    // Catch CAPTCHA on Indeed pages (but NOT on Easy Apply wizards, which handle solving in-place without reloading)
    const isEasyApplyPage = url.includes('apply.') || url.includes('/apply/') || url.includes('smartapply.');
    if (isIndeed && detectCaptcha() && !isEasyApplyPage) {
      console.log('[Content] Interstitial CAPTCHA detected. Injecting HUD and solving...');
      const hud = injectIndeedHUD(queue);
      handleCaptchaSolving(hud, () => {
        window.location.reload();
      });
      return;
    }

    // We are on Indeed Job Details page
    if (isIndeed && (url.includes('/viewjob') || url.includes('/rc/clk'))) {
      runIndeedJobDetailsAutoApply(queue);
    }

    // We are on Indeed Easy Apply page (handles apply.indeed.com, apply.au.indeed.com, smartapply.indeed.com, etc.)
    if (isIndeed && (url.includes('apply.') || url.includes('/apply/') || url.includes('smartapply.'))) {
      if (!indeedEasyApplyRunning) {
        runIndeedEasyApplyAutoApply(queue);
      }
    }
  });
}

function isCoreProductRole(title) {
  const t = title.toLowerCase();

  // Exclude operations, project, program, analyst, scrum, coordinator, recruiter, support, assistant
  const excludes = ['operations', 'operator', 'project', 'program', 'analyst', 'scrum', 'coordinator', 'specialist', 'assistant', 'intern', 'support', 'recruiter', 'consultant'];
  for (const ex of excludes) {
    if (t.includes(ex)) return false;
  }

  // Must contain "product"
  if (!t.includes('product')) return false;

  // Must match standard product role words
  const matches = ['manager', 'lead', 'director', 'head', 'vp', 'chief', 'owner', 'principal'];
  for (const m of matches) {
    if (t.includes(m)) return true;
  }

  // Basic fallbacks
  if (t === 'product manager' || t === 'product owner' || t === 'product lead') return true;

  return false;
}

async function crawlMultipleSearchPages(currentPageUrl, maxPages = 4) {
  const jobList = [];
  const seenJks = new Set();

  function parseJobsFromHtml(htmlText, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const cardContainers = Array.from(doc.querySelectorAll('.job_seen_beacon, .cardOutline, td.resultContent, [class*="jobsearch-SerpJobCard"]'));
    const pageJobs = [];

    for (const card of cardContainers) {
      const titleEl = card.querySelector('h2.jobTitle a, a.jcs-JobDetails-title, a[id^="jobtitle"], [id^="jobTitle-"] a, a[data-jk]');
      if (!titleEl) continue;

      const jk = titleEl.getAttribute('data-jk') || titleEl.href?.match(/[?&]jk=([^&]+)/)?.[1];
      if (!jk || seenJks.has(jk)) continue;

      let title = '';
      const titleTextEl = titleEl.querySelector('span[title]') || titleEl;
      title = (titleTextEl.getAttribute('title') || titleTextEl.innerText || '').trim();

      if (!title || !isCoreProductRole(title)) {
        continue;
      }

      seenJks.add(jk);

      let company = 'Unknown';
      const companyEl = card.querySelector('[data-testid="company-name"], .companyName, .company_location [class*="company"]');
      if (companyEl) {
        company = companyEl.innerText.trim().replace(/\n/g, ' ');
      }

      const host = new URL(baseUrl).host;
      pageJobs.push({
        url: `https://${host}/viewjob?jk=${jk}`,
        title: title,
        company: company
      });
    }
    return pageJobs;
  }

  // 1. Scrape current page
  const currentJobs = parseJobsFromHtml(document.documentElement.innerHTML, currentPageUrl);
  jobList.push(...currentJobs);

  // 2. Fetch subsequent pages
  const urlObj = new URL(currentPageUrl);
  let currentStart = parseInt(urlObj.searchParams.get('start') || '0', 10);

  for (let p = 1; p < maxPages; p++) {
    const nextStart = currentStart + (p * 10);
    urlObj.searchParams.set('start', nextStart.toString());
    const nextUrl = urlObj.toString();

    console.log(`[Copilot] Crawling page ${p + 1} of search results: ${nextUrl}`);
    try {
      const response = await fetch(nextUrl);
      if (!response.ok) {
        console.warn(`[Copilot] Failed to fetch search page ${p + 1}: ${response.status}`);
        break;
      }
      const htmlText = await response.text();
      const pageJobs = parseJobsFromHtml(htmlText, nextUrl);
      if (pageJobs.length === 0) {
        // Double check if there are any cards at all to see if we reached the end
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const cardsCount = doc.querySelectorAll('.job_seen_beacon, .cardOutline, td.resultContent').length;
        if (cardsCount === 0) {
          console.log('[Copilot] No more search cards found. Reached end of results.');
          break;
        }
      }
      jobList.push(...pageJobs);
      await sleep(1500); // 1.5s delay to be polite
    } catch (err) {
      console.error(`[Copilot] Error crawling page ${p + 1}:`, err);
      break;
    }
  }

  return jobList;
}

function injectIndeedSearchLauncher() {
  if (document.getElementById('ajf-indeed-launcher')) return;

  const btn = document.createElement('button');
  btn.id = 'ajf-indeed-launcher';
  btn.innerHTML = '🚀 <strong>Indeed Auto-Apply (100x)</strong>';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '999999999';
  btn.style.background = '#000000';
  btn.style.color = '#ffffff';
  btn.style.padding = '12px 20px';
  btn.style.border = '2px solid rgba(255,255,255,0.2)';
  btn.style.borderRadius = '30px';
  btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
  btn.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  btn.style.fontSize = '13px';
  btn.style.cursor = 'pointer';
  btn.style.transition = 'transform 0.2s';

  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');

  btn.addEventListener('click', async () => {
    btn.innerHTML = '🔍 Crawling pages...';
    btn.disabled = true;

    try {
      const jobList = await crawlMultipleSearchPages(window.location.href, 4);

      if (jobList.length === 0) {
        alert('No core Product Management roles detected on the first few pages. (Filtered out Operations, Project, Analysts, Program Managers, etc.)');
        btn.innerHTML = '🚀 Indeed Auto-Apply (100x)';
        btn.disabled = false;
        return;
      }

      btn.innerHTML = `⌛ Loading Queue (${jobList.length} jobs)...`;

      sendExtensionMessage({ action: 'startIndeedQueue', jobList }, (response) => {
        if (response && response.success) {
          console.log('[Content] Indeed queue started successfully!');
        } else {
          alert('Failed to start auto-apply queue. Is the local backend running?');
          btn.innerHTML = '🚀 Indeed Auto-Apply (100x)';
          btn.disabled = false;
        }
      });
    } catch (e) {
      console.error(e);
      alert('Error gathering jobs from search pages.');
      btn.innerHTML = '🚀 Indeed Auto-Apply (100x)';
      btn.disabled = false;
    }
  });

  document.body.appendChild(btn);
}

function runIndeedJobDetailsAutoApply(queue) {
  if (indeedJobDetailsRunning) {
    console.log('[Content] runIndeedJobDetailsAutoApply already running — skipping duplicate call.');
    return;
  }
  indeedJobDetailsRunning = true;
  console.log('[Content] Auto-apply queue active. Scraped Indeed Job view page.');

  // If the Easy Apply modal/iframe is already open, do not execute the job details logic
  const easyApplyIframe = document.querySelector('iframe[src*="indeedapply"], iframe[src*="apply.indeed.com"], iframe[src*="smartapply."]');
  if (easyApplyIframe) {
    console.log('[Content] Indeed Easy Apply modal/iframe detected on job details page. Letting iframe handle the apply flow.');
    indeedJobDetailsRunning = false;
    return;
  }

  // Inject sticky progress HUD
  const hud = injectIndeedHUD(queue);

  let retries = 0;
  const maxRetries = 10;

  function attemptApply() {
    if (detectCaptcha()) {
      handleCaptchaSolving(hud, () => {
        attemptApply();
      });
      return;
    }

    let applyBtn = document.querySelector(
      '.indeedApplyButton button, #indeedApplyButton, button[class*="indeedApplyButton"], a[class*="indeedApplyButton"]'
    );
    if (!applyBtn) {
      const candidates = Array.from(document.querySelectorAll('button, a, span'));
      for (const el of candidates) {
        const text = el.innerText.trim().toLowerCase();
        if (text === 'apply now' || text === 'apply' || text === 'apply on company site') {
          applyBtn = el;
          break;
        }
      }
    }

    const jobTitleEl = document.querySelector('h1[class*="jobsearch-JobInfoHeader-title"], [class*="jobsearch-JobInfoHeader-title"]');
    const jobTitle = jobTitleEl ? jobTitleEl.innerText.trim() : '';

    if ((!applyBtn || !jobTitle) && retries < maxRetries) {
      retries++;
      hud.updateStatus(`⌛ Waiting for job details to load (Attempt ${retries}/${maxRetries})...`);
      setTimeout(attemptApply, 1000);
      return;
    }

    hud.updateStatus('⚡ Scraped job details. Saving and opening application...');

    const scrapedJob = extractJobDetails();
    scrapedJob.url = canonicalJobUrl(scrapedJob.url);

    sendExtensionMessage({ action: 'addJob', job: scrapedJob }, (response) => {
      if (!response || !response.success) {
        console.warn('[Content] Auto-save job failed. Proceeding anyway.');
      }

      // Check if we've already applied to this company before clicking Apply
      const companyName = scrapedJob.company || queue.jobList[queue.currentIndex]?.company || '';
      sendExtensionMessage({ action: 'checkCompanyApplied', company: companyName }, (checkRes) => {
        if (checkRes && checkRes.applied) {
          hud.updateStatus(`⏭️ Already applied to "${companyName}" — skipping to next job in 3 seconds...`);
          setTimeout(() => { sendExtensionMessage({ action: 'nextIndeedJob' }); }, 3000);
          return;
        }

        if (applyBtn) {
          const text = applyBtn.innerText.trim().toLowerCase();
          if (text.includes('company site')) {
            hud.updateStatus('ℹ️ Apply on company site detected (Not Easy Apply). Skipping to next job in 4 seconds...');
            setTimeout(() => {
              sendExtensionMessage({ action: 'nextIndeedJob' });
            }, 4000);
            return;
          }

          hud.updateStatus('✓ Found Easy Apply button. Clicking in 3 seconds...');
          setTimeout(() => {
            applyBtn.click();
          }, 3000);
        } else {
          hud.updateStatus('❌ Easy Apply not available for this job. Skipping to next job in 4 seconds...');
          setTimeout(() => {
            sendExtensionMessage({ action: 'nextIndeedJob' });
          }, 4000);
        }
      });
    });
  }

  attemptApply();
}

let easyApplyRetries = 0;
let indeedEasyApplyRunning = false; // guard: prevent multiple parallel instances
let indeedJobDetailsRunning = false; // guard: prevent multiple parallel job-details calls

async function autofillCustomDropdowns(profile, queue, hud) {
  // Find all potential custom dropdown triggers
  const triggers = Array.from(document.querySelectorAll('button[aria-haspopup="listbox"], button[role="combobox"], button[class*="select"], [class*="select"] button, button.ia-Dropdown-button, [class*="Dropdown"] button, button'))
    .filter(trigger => {
      if (!isElementVisible(trigger)) return false;
      if (trigger.closest('.ajf-copilot-container') || trigger.closest('#ajf-indeed-hud') || trigger.closest('#ajf-indeed-launcher')) {
        return false;
      }
      const text = trigger.innerText.trim().toLowerCase();
      const hasDropdownAttr = trigger.getAttribute('aria-haspopup') === 'listbox' || trigger.getAttribute('role') === 'combobox' || trigger.className.toLowerCase().includes('select') || trigger.className.toLowerCase().includes('dropdown');
      const isPlaceholder = text === 'select an option' || text === 'choose an option' || text === 'select...' || text === 'choose...' || text.startsWith('select ');

      return hasDropdownAttr || isPlaceholder;
    });

  for (const trigger of triggers) {
    const triggerText = trigger.innerText.trim();
    const lowerText = triggerText.toLowerCase();

    // Skip if it's already filled
    if (
      lowerText !== 'select an option' &&
      lowerText !== 'choose an option' &&
      lowerText !== 'select...' &&
      lowerText !== 'choose...' &&
      triggerText !== '' &&
      !lowerText.includes('select ')
    ) {
      console.log(`[Copilot] Custom dropdown already has value: "${triggerText}". Skipping.`);
      continue;
    }

    // Find question text
    let questionText = '';
    const container = trigger.closest('[class*="field"], [class*="group"], [class*="row"], [class*="container"], fieldset') || trigger.parentElement;
    if (container) {
      const qEl = container.querySelector('label, legend, h1, h2, h3, h4, span, p, [class*="label"], [class*="question"]');
      if (qEl && qEl !== trigger) {
        questionText = qEl.innerText.trim();
      }
    }
    if (!questionText) {
      let p = trigger.parentElement;
      for (let i = 0; i < 4 && p; i++) {
        const qEl = p.querySelector('label, legend, h1, h2, h3, h4, span, p');
        if (qEl && qEl !== trigger) {
          questionText = qEl.innerText.trim();
          break;
        }
        p = p.parentElement;
      }
    }

    console.log(`[Copilot] Custom dropdown question: "${questionText}"`);

    // Click trigger to expand
    trigger.click();
    await sleep(400);

    // Find visible option elements
    const optionElements = Array.from(document.querySelectorAll('li, [role="option"], [class*="option"], [class*="item"], button, [role="listbox"] li, [role="listbox"] div, [role="listbox"] span, [class*="listbox"] div, [class*="listbox"] span'))
      .filter(el => {
        if (!isElementVisible(el)) return false;
        if (el === trigger) return false;
        if (el.closest('.ajf-copilot-container') || el.closest('#ajf-indeed-hud')) return false;

        const elText = el.innerText.trim().toLowerCase();
        if (elText === 'continue' || elText === 'submit' || elText === 'next' || elText === 'back' || elText === 'cancel') return false;

        return el.innerText.trim() !== "";
      });

    // Deduplicate options by text content to avoid scanning duplicate nested spans
    const seenTexts = new Set();
    const validOptions = [];
    for (const optEl of optionElements) {
      const optText = optEl.innerText.trim();
      const lowerOpt = optText.toLowerCase();
      if (lowerOpt === 'select an option' || lowerOpt === 'choose an option' || lowerOpt.includes('select...')) continue;

      if (!seenTexts.has(optText)) {
        seenTexts.add(optText);
        validOptions.push(optEl);
      }
    }

    if (validOptions.length === 0) {
      console.log('[Copilot] No options found. Closing dropdown.');
      trigger.click();
      await sleep(200);
      continue;
    }

    const optionsTextList = validOptions.map(el => el.innerText.trim()).join(', ');
    console.log(`[Copilot] Found custom dropdown options: ${optionsTextList}`);

    let bestOptionEl = null;
    let bestScore = -999;

    const questionLower = questionText.toLowerCase();
    const isSponsorship = questionLower.includes('sponsorship') || questionLower.includes('sponsor') || questionLower.includes('visa support');
    const isEligibility = questionLower.includes('authorized') || questionLower.includes('right to work') || questionLower.includes('work in') || questionLower.includes('eligible');
    const isEEOC = questionLower.includes('gender') || questionLower.includes('race') || questionLower.includes('ethnicity') || questionLower.includes('veteran') || questionLower.includes('disability');
    const isCountry = questionLower.includes('country');
    const isState = questionLower.includes('state') || questionLower.includes('province');
    const isEducation = questionLower.includes('education') || questionLower.includes('study') || questionLower.includes('degree');
    const isExperience = questionLower.includes('experience');

    for (const optEl of validOptions) {
      const optText = optEl.innerText.trim().toLowerCase();
      let score = 0;

      if (isSponsorship) {
        if (optText.includes('no') || optText.includes('not require') || optText.includes('without sponsorship')) score += 10;
        if (optText.includes('yes') || optText.includes('require sponsorship')) score -= 10;
      } else if (isEligibility) {
        if (optText.includes('citizen') || optText.includes('permanent resident') || optText.includes('pr') || optText.includes('unlimited')) score += 20;
        if (optText.includes('yes') || optText.includes('authorized') || optText.includes('eligible')) score += 10;
        if (optText.includes('no') || optText.includes('temporary') || optText.includes('restrict')) score -= 10;
      } else if (isEEOC) {
        if (optText.includes('decline') || optText.includes('prefer not to say') || optText.includes('disclose')) score += 10;
      } else if (isCountry) {
        if (optText === 'australia' || optText.includes('australia')) score += 20;
      } else if (isState) {
        if (optText === 'victoria' || optText === 'vic' || optText.includes('victoria')) score += 20;
      } else if (isEducation) {
        if (optText.includes('master') || optText.includes('postgraduate')) score += 20;
        if (optText.includes('bachelor') || optText.includes('undergraduate') || optText.includes('degree')) score += 15;
        if (optText.includes('diploma') || optText.includes('certificate')) score += 10;
        if (optText.includes('high school') || optText.includes('secondary')) score += 5;
      } else if (isExperience) {
        const numMatch = optText.match(/(\d+)/);
        if (numMatch) {
          const years = parseInt(numMatch[1], 10);
          if (years <= 12) score += years;
        }
        if (optText.includes('10+') || optText.includes('10 or more') || optText.includes('10 years')) score += 15;
        if (optText.includes('5-10') || optText.includes('5+') || optText.includes('5 years')) score += 10;
      }

      if (score > bestScore && score > 0) {
        bestScore = score;
        bestOptionEl = optEl;
      }
    }

    if (!bestOptionEl && questionText) {
      hud.updateStatus(`🤔 Asking Gemini to choose option: "${questionText.substring(0, 40)}..."`);
      const currentJobInfo = queue.jobList[queue.currentIndex];

      const suggestedText = await new Promise((resolveSelectPrompt) => {
        sendExtensionMessage({
          action: 'suggestAnswer',
          jobTitle: currentJobInfo.title,
          companyName: currentJobInfo.company,
          jobDescription: '',
          question: `This is a multiple choice dropdown question: "${questionText}". The options are: ${optionsTextList}. Choose the most accurate option name based on candidate's profile/CV. Reply ONLY with the exact option text.`
        }, (ansResponse) => {
          resolveSelectPrompt(ansResponse?.success && ansResponse.data?.answer ? ansResponse.data.answer.toLowerCase() : null);
        });
      });

      if (suggestedText) {
        let bestSubmatch = null;
        let bestSubmatchLen = 0;
        for (const optEl of validOptions) {
          const optText = optEl.innerText.trim().toLowerCase();
          if (suggestedText.includes(optText) || optText.includes(suggestedText)) {
            if (optText.length > bestSubmatchLen) {
              bestSubmatchLen = optText.length;
              bestSubmatch = optEl;
            }
          }
        }
        if (bestSubmatch) {
          bestOptionEl = bestSubmatch;
        }
      }
    }

    if (bestOptionEl) {
      console.log(`[Copilot] Selecting option: "${bestOptionEl.innerText.trim()}"`);
      bestOptionEl.scrollIntoView({ block: 'nearest' });
      await sleep(100);
      bestOptionEl.click();
      await sleep(300);
    } else {
      console.log('[Copilot] Could not determine choice. Closing dropdown.');
      trigger.click();
      await sleep(200);
    }
  }
}

async function runIndeedEasyApplyAutoApply(queue) {
  if (indeedEasyApplyRunning) {
    console.log('[Content] runIndeedEasyApplyAutoApply already running — skipping duplicate call.');
    return;
  }
  indeedEasyApplyRunning = true;
  console.log('[Content] Active inside Indeed Easy Apply Flow.');

  // Inject sticky progress HUD
  const hud = injectIndeedHUD(queue);

  const currentJobInfo = queue.jobList[queue.currentIndex];

  // Pre-fetch/pre-generate tailored CV and cover letter in background
  let preGeneratedJob = null;
  const preGenPromise = new Promise((resolvePreGen) => {
    sendExtensionMessage({
      action: 'lookupJob',
      title: currentJobInfo.title,
      company: currentJobInfo.company
    }, (jobRes) => {
      if (jobRes?.success && jobRes.data) {
        const job = jobRes.data;
        preGeneratedJob = job;

        if (!job.tailoredCv || !job.pdfPath) {
          hud.updateStatus('✨ Pre-generating tailored CV and cover letter in background...');
          sendExtensionMessage({
            action: 'tailorJob',
            jobId: job.id,
            customInstructions: 'Tailor specifically for Indeed Easy Apply.'
          }, (tailorRes) => {
            if (tailorRes?.success) {
              sendExtensionMessage({
                action: 'generatePdf',
                jobId: job.id
              }, (pdfRes) => {
                if (pdfRes?.success && pdfRes.data?.pdfUrl) {
                  job.pdfPath = pdfRes.data.pdfUrl;

                  sendExtensionMessage({
                    action: 'lookupJob',
                    title: currentJobInfo.title,
                    company: currentJobInfo.company
                  }, (jobRes2) => {
                    if (jobRes2?.success && jobRes2.data) {
                      hud.updateStatus('✅ Tailored CV pre-generated.');
                      resolvePreGen(jobRes2.data);
                    } else {
                      resolvePreGen(job);
                    }
                  });
                } else {
                  resolvePreGen(job);
                }
              });
            } else {
              resolvePreGen(job);
            }
          });
        } else {
          resolvePreGen(job);
        }
      } else {
        // If the job is not in the pipeline database, add it now!
        const newJob = {
          title: currentJobInfo.title,
          company: currentJobInfo.company,
          url: currentJobInfo.url,
          status: 'To Process',
          source: 'Indeed Auto-Apply'
        };
        sendExtensionMessage({
          action: 'addJob',
          job: newJob
        }, (addRes) => {
          // addRes.data is the raw server body: { success, updated, job: {...} }
          const job = (addRes?.success && (addRes.data?.job || addRes.data)) || null;
          if (job && job.id) {
            preGeneratedJob = job;

            hud.updateStatus('✨ Pre-generating tailored CV and cover letter in background...');
            sendExtensionMessage({
              action: 'tailorJob',
              jobId: job.id,
              customInstructions: 'Tailor specifically for Indeed Easy Apply.'
            }, (tailorRes) => {
              if (tailorRes?.success) {
                sendExtensionMessage({
                  action: 'generatePdf',
                  jobId: job.id
                }, (pdfRes) => {
                  if (pdfRes?.success && pdfRes.data?.pdfUrl) {
                    job.pdfPath = pdfRes.data.pdfUrl;

                    sendExtensionMessage({
                      action: 'lookupJob',
                      title: currentJobInfo.title,
                      company: currentJobInfo.company
                    }, (jobRes2) => {
                      if (jobRes2?.success && jobRes2.data) {
                        hud.updateStatus('✅ Tailored CV pre-generated.');
                        resolvePreGen(jobRes2.data);
                      } else {
                        resolvePreGen(job);
                      }
                    });
                  } else {
                    resolvePreGen(job);
                  }
                });
              } else {
                resolvePreGen(job);
              }
            });
          } else {
            resolvePreGen(null);
          }
        });
      }
    });
  });

  if (detectCaptcha()) {
    handleCaptchaSolving(
      hud,
      () => {
        indeedEasyApplyRunning = false;
        runIndeedEasyApplyAutoApply(queue);
      },
      () => {
        preGenPromise.then((job) => {
          if (job) addManualActionsToHUD(hud, job);
        });
      }
    );
    return;
  }

  // Set up natural timeout/actions
  setTimeout(async () => {
    try {
      if (detectCaptcha()) {
        handleCaptchaSolving(
          hud,
          () => {
            indeedEasyApplyRunning = false;
            runIndeedEasyApplyAutoApply(queue);
          },
          () => {
            preGenPromise.then((job) => {
              if (job) addManualActionsToHUD(hud, job);
            });
          }
        );
        return;
      }

      // 1. Success check: did we submit?
      const isSuccess = detectIndeedSuccess();
      if (isSuccess) {
        hud.updateStatus('✅ Application Submitted Successfully! Advancing in 3 seconds...');
        const currentJob = queue.jobList[queue.currentIndex];

        sendExtensionMessage({
          action: 'lookupJob',
          title: currentJob.title,
          company: currentJob.company
        }, (lookupRes) => {
          if (lookupRes?.success && lookupRes.data) {
            sendExtensionMessage({
              action: 'updateJobStatus',
              jobId: lookupRes.data.id,
              status: 'Applied'
            }, () => {
              setTimeout(() => {
                sendExtensionMessage({ action: 'nextIndeedJob' });
              }, 3000);
            });
          } else {
            setTimeout(() => {
              sendExtensionMessage({ action: 'nextIndeedJob' });
            }, 3000);
          }
        });
        return;
      }

      // 2. Check for validation errors
      const errorText = detectIndeedErrors();
      if (errorText) {
        hud.updateStatus(`⚠️ Validation Block: "${errorText}". Please resolve manually and click Continue.`, true);
        return;
      }

      // 3a. Detect Indeed "Supporting Documents" section and upload cover letter
      await uploadIndeedCoverLetter(preGenPromise, hud);

      // 3b. Find file inputs for Resume / CV
      // First, try to select/click the "Upload a resume" option if it's there
      await selectUploadResumeOption();

      const fileInput = findResumeFileInput();
      if (fileInput) {
        const parentCombined = (fileInput.closest('div, label, section')?.innerText || '').toLowerCase();
        if (parentCombined.includes('resume') || parentCombined.includes('cv') || parentCombined.includes('select file')) {
          const isUploaded = fileInput.files && fileInput.files.length > 0;
          if (!isUploaded) {
            hud.updateStatus('✨ Uploading tailored CV for this job...');
            const job = await preGenPromise;
            if (job && job.pdfPath) {
              await handleResumeUpload(fileInput, job, currentJobInfo, queue, hud);
            } else {
              hud.updateStatus('⚠️ Tailored CV generation was incomplete. Please drag & drop or upload manually.', true);
            }
            return;
          }
        }
      }

      // 4. Fill form fields
      hud.updateStatus('⚡ Filling current form page...');

      sendExtensionMessage({ action: 'getSettings' }, async (settingsResponse) => {
        if (!settingsResponse || !settingsResponse.success) {
          hud.updateStatus('⚠️ Failed to read settings from backend.', true);
          return;
        }

        const profile = settingsResponse.data.profile || {};
        const pName = profile.name || '';
        const pEmail = profile.email || '';
        const pPhone = profile.phone || '';

        // 1. Autofill custom dropdown widgets dynamically
        await autofillCustomDropdowns(profile, queue, hud);

        const formElements = Array.from(document.querySelectorAll('input, textarea, select'))
          .filter(el => !el.closest('.ajf-copilot-container') && !el.closest('#ajf-indeed-hud') && !el.closest('#ajf-indeed-launcher'));
        const radioGroups = {};
        let fieldsFilled = 0;

        for (const el of formElements) {
          if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
          const container = el.closest('div, section, label, fieldset');
          if (container && (container.offsetWidth === 0 || container.offsetHeight === 0)) {
            continue; // Skip if the enclosing container is hidden
          }

          const info = getElementInfo(el);
          const labelLower = info.label.toLowerCase();
          const nameLower = info.name.toLowerCase();
          const placeholderLower = info.placeholder.toLowerCase();
          const combined = `${labelLower} ${nameLower} ${placeholderLower}`;

          if (combined.includes('recaptcha') || info.type === 'submit' || info.type === 'button') {
            continue;
          }

          if (info.type === 'radio') {
            const groupName = info.name || 'unnamed-group';
            if (!radioGroups[groupName]) radioGroups[groupName] = [];
            radioGroups[groupName].push({ element: el, info });
            continue;
          }

          if (info.type === 'checkbox') {
            if (
              labelLower.includes('agree') ||
              labelLower.includes('accept') ||
              labelLower.includes('consent') ||
              labelLower.includes('terms') ||
              labelLower.includes('privacy') ||
              labelLower.includes('declare') ||
              labelLower.includes('certify') ||
              labelLower.includes('confirm') ||
              labelLower.includes('statement') ||
              labelLower.includes('truth') ||
              labelLower.includes('correct')
            ) {
              await checkCheckbox(el);
              fieldsFilled++;
            }
            continue;
          }

          if (info.tagName === 'SELECT') {
            if (el.value && el.value !== '' && !el.value.toLowerCase().includes('select') && !el.value.toLowerCase().includes('choose')) {
              console.log('[Copilot] Standard select element already has value:', el.value);
              continue;
            }
            const questionText = getQuestionText(el).toLowerCase();
            const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support');
            const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('work in') || questionText.includes('eligible');
            const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability');
            const isCountry = questionText.includes('country') || nameLower.includes('country') || labelLower.includes('country') || combined.includes('country');
            const isState = questionText.includes('state') || questionText.includes('province') || nameLower.includes('state') || labelLower.includes('state') || combined.includes('state') || combined.includes('province');
            const isEducation = questionText.includes('education') || questionText.includes('study') || questionText.includes('degree') || nameLower.includes('education') || labelLower.includes('education') || combined.includes('education');
            const isExperience = questionText.includes('experience') || nameLower.includes('experience') || labelLower.includes('experience') || combined.includes('experience');

            let bestOption = null;
            let bestScore = -999;

            for (const opt of Array.from(el.options)) {
              const optText = opt.innerText.toLowerCase();
              if (!opt.value || optText.includes('select') || optText.includes('choose')) continue;

              let score = 0;
              if (isSponsorship) {
                if (optText.includes('no') || optText.includes('not require') || optText.includes('without sponsorship')) score += 10;
                if (optText.includes('yes') || optText.includes('require sponsorship')) score -= 10;
              } else if (isEligibility) {
                if (optText.includes('citizen') || optText.includes('permanent resident') || optText.includes('pr') || optText.includes('unlimited')) score += 20;
                if (optText.includes('yes') || optText.includes('authorized') || optText.includes('eligible')) score += 10;
                if (optText.includes('no') || optText.includes('temporary') || optText.includes('restrict')) score -= 10;
              } else if (isEEOC) {
                if (optText.includes('decline') || optText.includes('prefer not to say') || optText.includes('disclose')) score += 10;
              } else if (isCountry) {
                if (optText === 'australia' || optText.includes('australia')) score += 20;
              } else if (isState) {
                if (optText === 'victoria' || optText === 'vic' || optText.includes('victoria')) score += 20;
              } else if (isEducation) {
                if (optText.includes('master') || optText.includes('postgraduate')) score += 20;
                if (optText.includes('bachelor') || optText.includes('undergraduate') || optText.includes('degree')) score += 15;
                if (optText.includes('diploma') || optText.includes('certificate')) score += 10;
                if (optText.includes('high school') || optText.includes('secondary')) score += 5;
              } else if (isExperience) {
                const numMatch = optText.match(/(\d+)/);
                if (numMatch) {
                  const years = parseInt(numMatch[1], 10);
                  if (years <= 12) score += years;
                }
                if (optText.includes('10+') || optText.includes('10 or more') || optText.includes('10 years')) score += 15;
                if (optText.includes('5-10') || optText.includes('5+') || optText.includes('5 years')) score += 10;
              }

              if (score > bestScore && score > 0) {
                bestScore = score;
                bestOption = opt.value;
              }
            }

            const optionsTextList = Array.from(el.options)
              .map(o => o.innerText.trim())
              .filter(t => t && !t.toLowerCase().includes('select') && !t.toLowerCase().includes('choose'))
              .join(', ');

            if (!bestOption && optionsTextList) {
              hud.updateStatus(`🤔 Asking Gemini to choose dropdown option: "${questionText.substring(0, 40)}..."`);
              const currentJobInfo = queue.jobList[queue.currentIndex];

              await new Promise((resolveSelectPrompt) => {
                sendExtensionMessage({
                  action: 'suggestAnswer',
                  jobTitle: currentJobInfo.title,
                  companyName: currentJobInfo.company,
                  jobDescription: '',
                  question: `This is a multiple choice dropdown question: "${questionText}". The options are: ${optionsTextList}. Choose the most accurate option name based on candidate's profile/CV. Reply ONLY with the exact option text.`
                }, async (ansResponse) => {
                  if (ansResponse?.success && ansResponse.data?.answer) {
                    const chosenText = ansResponse.data.answer.toLowerCase();
                    let matchedOpt = null;
                    for (const opt of Array.from(el.options)) {
                      const optText = opt.innerText.toLowerCase();
                      if (chosenText.includes(optText) || optText.includes(chosenText)) {
                        matchedOpt = opt;
                        break;
                      }
                    }
                    if (matchedOpt) {
                      bestOption = matchedOpt.value;
                    }
                  }
                  resolveSelectPrompt();
                });
              });
            }

            if (bestOption) {
              await setSelectElementValue(el, bestOption);
              const selectedOpt = Array.from(el.options).find(o => o.value === bestOption);
              if (selectedOpt && selectedOpt.innerText) {
                await clickCustomDropdownOption(el, selectedOpt.innerText);
              }
              fieldsFilled++;
            }
            continue;
          }

          if (info.tagName === 'INPUT' || info.tagName === 'TEXTAREA') {
            let val = null;

            if (combined.includes('first name') || combined.includes('given name')) {
              val = pName.split(' ')[0];
            } else if (combined.includes('last name') || combined.includes('surname') || combined.includes('family name')) {
              val = pName.split(' ').slice(1).join(' ') || '.';
            } else if (combined.includes('name') && !combined.includes('company') && !combined.includes('school') && !combined.includes('degree')) {
              val = pName;
            } else if (info.type === 'email' || combined.includes('email')) {
              val = pEmail;
            } else if (info.type === 'tel' || combined.includes('phone') || combined.includes('mobile')) {
              val = pPhone;
            } else if (combined.includes('linkedin')) {
              val = profile.linkedin || '';
            } else if (combined.includes('github')) {
              val = profile.github || '';
            } else if (combined.includes('website') || combined.includes('portfolio') || combined.includes('personal link') || combined.includes('url')) {
              val = profile.website || profile.linkedin || '';
            } else if (combined.includes('visa') || combined.includes('sponsorship') || combined.includes('work authorization') || combined.includes('work rights')) {
              val = profile.visa || '';
            } else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start date')) {
              val = "Immediate (relocating in 1-2 months, visa subclass 858 permanent residency already granted)";
            } else if (
              combined.includes('know anyone') ||
              combined.includes('know somebody') ||
              combined.includes('know someone') ||
              combined.includes('do you know') ||
              combined.includes('referred by') ||
              combined.includes('referral') ||
              combined.includes('employee referral') ||
              (combined.includes('know') && combined.includes('company')) ||
              (combined.includes('know') && combined.includes('work'))
            ) {
              val = 'Yes';
            } else if (combined.includes('salary') || combined.includes('base pay') || combined.includes('base salary') || combined.includes('expectation') || combined.includes('compensation') || combined.includes('desired pay') || combined.includes('remuneration')) {
              if (info.type === 'number' || combined.includes('number') || combined.includes('numerical') || combined.includes('figure') || combined.includes('only') || combined.includes('$') || combined.includes('annual')) {
                val = '0';
              } else {
                val = 'TBD';
              }
            } else if (combined.includes('country')) {
              val = "Australia";
            } else if (combined.includes('address') || combined.includes('street')) {
              val = profile.address || "9 Revell Crescent, St Albans, VIC 3021";
            } else if (combined.includes('city') || combined.includes('suburb') || combined.includes('town')) {
              val = "St Albans";
            } else if (combined.includes('state') || combined.includes('region') || combined.includes('province')) {
              val = "Victoria";
            } else if (combined.includes('zip') || combined.includes('postcode') || combined.includes('postal')) {
              val = "3021";
            } else if (combined.includes('location') && !combined.includes('job')) {
              val = "St Albans, VIC";
            }

            if (val !== null && val !== '') {
              await setElementValue(el, val);
              fieldsFilled++;
            } else {
              const questionText = getQuestionText(el);
              if (questionText && questionText.length > 5 && !el.value) {
                hud.updateStatus(`🤔 Asking Gemini to answer: "${questionText.substring(0, 40)}..."`);
                const currentJobInfo = queue.jobList[queue.currentIndex];

                await new Promise((resolvePrompt) => {
                  sendExtensionMessage({
                    action: 'suggestAnswer',
                    jobTitle: currentJobInfo.title,
                    companyName: currentJobInfo.company,
                    jobDescription: '',
                    question: questionText
                  }, async (ansResponse) => {
                    if (ansResponse?.success && ansResponse.data?.answer) {
                      await setElementValue(el, ansResponse.data.answer);
                      fieldsFilled++;
                    }
                    resolvePrompt();
                  });
                });
              }
            }
          }
        }

        // Fill Radio Groups
        for (const [groupName, radios] of Object.entries(radioGroups)) {
          if (radios.length === 0) continue;
          const firstEl = radios[0].element;
          const questionText = getQuestionText(firstEl).toLowerCase();

          const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support');
          const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('work in') || questionText.includes('eligible');
          const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability');

          let bestRadio = null;
          let bestScore = -999;

          if (isSponsorship || isEligibility || isEEOC) {
            for (const radio of radios) {
              const optionText = radio.info.label.toLowerCase();
              let score = 0;

              if (isSponsorship) {
                if (optionText.includes('without sponsorship') || optionText.includes('no sponsorship') || optionText.includes('do not require') || optionText.includes("don't require")) score += 15;
                if (optionText.includes('require sponsorship') || optionText.includes('need sponsorship')) score -= 15;
                if (optionText === 'no' || optionText === 'no.') score += 10;
                if (optionText === 'yes' || optionText === 'yes.') score -= 10;
              } else if (isEligibility) {
                if (optionText.includes('citizen') || optionText.includes('permanent resident') || optionText.includes('pr') || optionText.includes('unlimited')) score += 20;
                if (optionText.includes('yes') || optionText.includes('authorized') || optionText.includes('eligible')) score += 10;
                if (optionText.includes('no') || optionText.includes('temporary') || optionText.includes('restrict')) score -= 15;
              } else if (isEEOC) {
                if (optionText.includes('decline') || optionText.includes('prefer not to say') || optionText.includes('disclose')) score += 15;
              }

              if (score > bestScore) {
                bestScore = score;
                bestRadio = radio.element;
              }
            }
          }

          if (!bestRadio || bestScore <= 0) {
            // Ask Gemini as fallback
            const optionsTextList = radios.map(r => r.info.label).join(', ');
            hud.updateStatus(`🤔 Asking Gemini to choose radio: "${questionText.substring(0, 40)}..."`);
            const currentJobInfo = queue.jobList[queue.currentIndex];

            await new Promise((resolveRadioPrompt) => {
              sendExtensionMessage({
                action: 'suggestAnswer',
                jobTitle: currentJobInfo.title,
                companyName: currentJobInfo.company,
                jobDescription: '',
                question: `This is a multiple choice question: "${questionText}". The options are: ${optionsTextList}. Choose the most accurate option name based on candidate's profile/CV. Reply ONLY with the exact option text.`
              }, async (ansResponse) => {
                if (ansResponse?.success && ansResponse.data?.answer) {
                  const chosenText = ansResponse.data.answer.toLowerCase();
                  let matchedRadio = null;
                  for (const r of radios) {
                    const rLabel = r.info.label.toLowerCase();
                    if (chosenText.includes(rLabel) || rLabel.includes(chosenText)) {
                      matchedRadio = r.element;
                      break;
                    }
                  }
                  if (matchedRadio) {
                    bestRadio = matchedRadio;
                    bestScore = 10;
                  }
                }
                resolveRadioPrompt();
              });
            });
          }

          if (bestRadio && bestScore > 0) {
            await clickRadio(bestRadio);
            fieldsFilled++;
          }
        }

        hud.updateStatus(`✓ Filled ${fieldsFilled} fields. Continuing in 3 seconds...`);
        setTimeout(() => {
          try {
            advanceIndeedStep();
          } catch (advErr) {
            hud.updateStatus(`⚠️ Blocked: ${advErr.message}`, true);
          }
        }, 3000);
      });

    } catch (e) {
      hud.updateStatus(`⚠️ Automation Error: ${e.message}`, true);
    }
  }, 3000);
}

function isElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 10 || rect.height <= 10) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  return true;
}

function isIframeHidden(iframe) {
  try {
    let el = iframe;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return true;
      }
      el = el.parentElement;
    }

    if (iframe.closest('.grecaptcha-badge')) {
      return true;
    }

    const rect = iframe.getBoundingClientRect();
    if (rect.width <= 10 || rect.height <= 10) {
      return true;
    }
    if (rect.bottom < -100 || rect.right < -100 || rect.left > window.innerWidth + 100 || rect.top > window.innerHeight + 100) {
      return true;
    }
  } catch (e) { }
  return false;
}

function isRealCaptchaIframe(iframe) {
  const src = iframe.src || '';
  const title = iframe.title || '';
  const name = iframe.name || '';

  const isRecaptchaWidget = src.includes('recaptcha') && (src.includes('anchor') || src.includes('bframe'));
  const isTurnstileWidget = src.includes('challenges.cloudflare.com');
  const isHcaptchaWidget = src.includes('hcaptcha.com') && (src.includes('checkbox') || src.includes('hcaptcha'));
  const isArkoseWidget = src.includes('arkoselabs') || src.includes('funcaptcha');

  return isRecaptchaWidget || isTurnstileWidget || isHcaptchaWidget || isArkoseWidget;
}

function getAllIframes(root = document) {
  let iframes = [];
  try {
    const local = root.querySelectorAll('iframe');
    iframes.push(...Array.from(local));
  } catch (e) { }

  try {
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.shadowRoot) {
        iframes.push(...getAllIframes(el.shadowRoot));
      }
    }
  } catch (e) { }

  return iframes;
}

function isCaptchaSolved() {
  const gResponse = document.querySelector('[name="g-recaptcha-response"], [id="g-recaptcha-response"]');
  const hResponse = document.querySelector('[name="h-captcha-response"], [id="h-captcha-response"]');
  const cfResponse = document.querySelector('[name="cf-turnstile-response"], [id="cf-turnstile-response"]');

  if (gResponse && gResponse.value && gResponse.value.length > 15) {
    return true;
  }
  if (hResponse && hResponse.value && hResponse.value.length > 15) {
    return true;
  }
  if (cfResponse && cfResponse.value && cfResponse.value.length > 15) {
    return true;
  }
  return false;
}

function detectCaptcha() {
  if (isCaptchaSolved()) {
    console.log('[Copilot] CAPTCHA response field is already populated. Treating as solved.');
    return false;
  }

  const iframes = getAllIframes(document);
  for (const iframe of iframes) {
    if (isIframeHidden(iframe)) continue; // Skip hidden tracking/analytics/invisible elements

    if (isRealCaptchaIframe(iframe)) {
      return true;
    }

    // Fallback for general frames if they match but are visible
    if (!isElementVisible(iframe)) continue;

    const src = iframe.src || '';
    const name = iframe.name || '';
    const title = iframe.title || '';
    const id = iframe.id || '';
    if (
      src.includes('challenges.cloudflare.com') ||
      src.includes('recaptcha') ||
      src.includes('hcaptcha') ||
      src.includes('arkoselabs') ||
      src.includes('funcaptcha') ||
      title.toLowerCase().includes('recaptcha') ||
      title.toLowerCase().includes('hcaptcha') ||
      title.toLowerCase().includes('cloudflare') ||
      title.toLowerCase().includes('turnstile') ||
      name.toLowerCase().includes('recaptcha') ||
      id.toLowerCase().includes('recaptcha') ||
      id.toLowerCase().includes('hcaptcha')
    ) {
      return true;
    }
  }

  const turnstile = document.querySelector('.cf-turnstile, [id*="cf-bubble"], [class*="cf-turnstile"]');
  if (turnstile && isElementVisible(turnstile)) {
    return true;
  }

  const bodyText = document.body.innerText || '';
  if (
    bodyText.includes('Verify you are human') ||
    bodyText.includes('Please complete the security check') ||
    bodyText.includes('checking your browser') ||
    bodyText.includes('enable JavaScript and cookies') ||
    document.title.includes('Security Check') ||
    document.title.includes('Attention Required!') ||
    document.title.includes('Verify your identity')
  ) {
    return true;
  }

  return false;
}

function findCaptchaSitekey() {
  const turnstileEl = document.querySelector('.cf-turnstile, [data-cf-sitekey], [data-sitekey*="0x"]');
  if (turnstileEl) {
    const sitekey = turnstileEl.getAttribute('data-sitekey') || turnstileEl.getAttribute('data-cf-sitekey');
    if (sitekey) return { type: 'turnstile', sitekey };
  }

  const recaptchaEl = document.querySelector('.g-recaptcha, [class*="recaptcha"] [data-sitekey], [class*="captcha"] [data-sitekey], div[data-sitekey]');
  if (recaptchaEl) {
    const sitekey = recaptchaEl.getAttribute('data-sitekey');
    if (sitekey && sitekey.length > 15 && !sitekey.includes('0x') && sitekey !== 'null' && sitekey !== 'undefined') {
      return { type: 'userrecaptcha', sitekey };
    }
  }

  const iframes = getAllIframes(document);
  for (const iframe of iframes) {
    if (isIframeHidden(iframe)) continue; // Skip hidden tracking/analytics/invisible elements

    const src = iframe.src || '';
    if (src.includes('recaptcha')) {
      const match = src.match(/[?&]k=([^&]+)/);
      if (match && match[1]) {
        return { type: 'userrecaptcha', sitekey: match[1] };
      }
    }
    if (src.includes('hcaptcha')) {
      const match = src.match(/[?&]sitekey=([^&]+)/);
      if (match && match[1]) {
        return { type: 'hcaptcha', sitekey: match[1] };
      }
    }
    if (src.includes('challenges.cloudflare.com') || src.includes('0x')) {
      const matches = src.match(/(0x[a-zA-Z0-9_-]+)/);
      if (matches) return { type: 'turnstile', sitekey: matches[1] };
    }
  }

  const hcaptchaEl = document.querySelector('.h-captcha');
  if (hcaptchaEl) {
    const sitekey = hcaptchaEl.getAttribute('data-sitekey');
    if (sitekey) return { type: 'hcaptcha', sitekey };
  }

  return null;
}

function injectSolveToken(token, type) {
  let fieldName = "g-recaptcha-response";
  if (type === "hcaptcha") fieldName = "h-captcha-response";
  if (type === "turnstile") fieldName = "cf-turnstile-response";

  const fields = document.querySelectorAll(`[name="${fieldName}"], [id="${fieldName}"]`);
  fields.forEach(field => {
    field.value = token;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const scriptText = `
    (function() {
      const token = ${JSON.stringify(token)};
      const type = ${JSON.stringify(type)};
      
      let fieldName = "g-recaptcha-response";
      if (type === "hcaptcha") fieldName = "h-captcha-response";
      if (type === "turnstile") fieldName = "cf-turnstile-response";

      const fields = document.querySelectorAll('[name="' + fieldName + '"], [id="' + fieldName + '"]');
      fields.forEach(field => {
        field.value = token;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Try triggering callback via ___grecaptcha_cfg configuration traversal
      if (type === "userrecaptcha") {
        try {
          if (typeof ___grecaptcha_cfg !== 'undefined' && ___grecaptcha_cfg.clients) {
            console.log('[Page Context] Found ___grecaptcha_cfg. Attempting callback traversal...');
            
            function findAndTrigger(obj, t, depth) {
              if (depth > 10 || !obj) return;
              for (const key of Object.keys(obj)) {
                try {
                  const val = obj[key];
                  if (typeof val === 'function') {
                    if (key === 'callback' || key === 'promise-callback' || key.toLowerCase().includes('callback')) {
                      console.log('[Page Context] Triggering recaptcha callback function at key:', key);
                      val(t);
                    }
                  } else if (typeof val === 'object' && val !== null) {
                    findAndTrigger(val, t, depth + 1);
                  }
                } catch (e) {}
              }
            }
            
            for (const clientId of Object.keys(___grecaptcha_cfg.clients)) {
              findAndTrigger(___grecaptcha_cfg.clients[clientId], token, 0);
            }
          }
        } catch (gErr) {
          console.error('[Page Context] Error in ___grecaptcha_cfg config traversal:', gErr);
        }
      }

      try {
        if (type === "turnstile") {
          const turnstileEl = document.querySelector('.cf-turnstile, [data-callback]');
          if (turnstileEl) {
            const cbName = turnstileEl.getAttribute('data-callback');
            if (cbName && typeof window[cbName] === 'function') {
              window[cbName](token);
            }
          }
        } else if (type === "userrecaptcha") {
          const recaptchaEl = document.querySelector('.g-recaptcha, [data-callback]');
          if (recaptchaEl) {
            const cbName = recaptchaEl.getAttribute('data-callback');
            if (cbName && typeof window[cbName] === 'function') {
              window[cbName](token);
            }
          }
        } else if (type === "hcaptcha") {
          const hcaptchaEl = document.querySelector('.h-captcha, [data-callback]');
          if (hcaptchaEl) {
            const cbName = hcaptchaEl.getAttribute('data-callback');
            if (cbName && typeof window[cbName] === 'function') {
              window[cbName](token);
            }
          }
        }
      } catch (e) {
        console.error('Error triggering callback in page context:', e);
      }
    })();
  `;

  const script = document.createElement('script');
  script.textContent = scriptText;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function handleCaptchaSolving(hud, onSolved, onManualFallback) {
  if (!detectCaptcha()) {
    onSolved();
    return;
  }

  let retries = 0;
  const maxRetries = 6;

  function attemptFindSitekey() {
    const captchaInfo = findCaptchaSitekey();
    if (captchaInfo) {
      startSolving(captchaInfo);
    } else if (retries < maxRetries && detectCaptcha()) {
      retries++;
      hud.updateStatus(`🤖 CAPTCHA detected. Waiting for solver details (Attempt ${retries}/${maxRetries})...`, false);
      setTimeout(attemptFindSitekey, 800);
    } else {
      console.warn('[Content] CAPTCHA detected but sitekey not found.');
      hud.updateStatus('⚠️ CAPTCHA/Verification detected! Unable to solve automatically. Please solve it manually to continue...', true);
      if (onManualFallback) onManualFallback();
      setupManualCaptchaPoller(hud, onSolved);
    }
  }

  function startSolving(captchaInfo) {
    hud.updateStatus(`🤖 CAPTCHA detected! Attempting automatic solve via 2Captcha (${captchaInfo.type}). Please wait...`, false);

    sendExtensionMessage({
      action: 'solveCaptcha',
      captchaType: captchaInfo.type,
      sitekey: captchaInfo.sitekey,
      pageUrl: window.location.href
    }, (response) => {
      if (response && response.success && response.token) {
        hud.updateStatus('✅ CAPTCHA solved automatically! Injecting token and resuming...', false);
        injectSolveToken(response.token, captchaInfo.type);
        setTimeout(onSolved, 2000);
      } else {
        const errorMsg = response?.error || 'Unknown error';
        console.error('[Content] 2Captcha solve failed:', errorMsg);
        hud.updateStatus(`⚠️ Auto-solve failed (${errorMsg}). Please solve it manually to continue...`, true);
        if (onManualFallback) onManualFallback();
        setupManualCaptchaPoller(hud, onSolved);
      }
    });
  }

  attemptFindSitekey();
}

function setupManualCaptchaPoller(hud, onSolved) {
  const captchaInterval = setInterval(() => {
    if (!detectCaptcha()) {
      clearInterval(captchaInterval);
      hud.updateStatus('✅ CAPTCHA solved! Resuming...', false);
      setTimeout(onSolved, 2000);
    }
  }, 1000);
}

function detectIndeedSuccess() {
  if (detectCaptcha()) return false;
  const bodyText = document.body.innerText.toLowerCase();
  const url = window.location.href.toLowerCase();

  // Indeed redirects to /companies after a successful Easy Apply submission
  const isCompaniesRedirect = url.includes('indeed.com/companies');

  return (
    isCompaniesRedirect ||
    url.includes('post-apply') ||
    url.includes('promo/post-apply') ||
    bodyText.includes('your application has been submitted') ||
    bodyText.includes('successfully applied') ||
    bodyText.includes('applied!') ||
    bodyText.includes('application submitted') ||
    document.querySelector('.ia-post-apply, [class*="PostApply"], [class*="success-page"]') !== null
  );
}

function detectIndeedErrors() {
  const errorEls = Array.from(document.querySelectorAll('.ia-ErrorBanner, [class*="Error"], .ia-validation-error, [aria-invalid="true"]'));
  const visibleErrors = errorEls.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.innerText.trim().length > 0;
  });
  if (visibleErrors.length > 0) {
    return visibleErrors.map(el => el.innerText.trim()).join('; ');
  }
  return null;
}

function advanceIndeedStep() {
  let btn = document.querySelector(
    'button.ia-continue-Button, button[class*="Continue"], button[class*="Submit"], input[type="submit"], button[type="submit"]'
  );
  if (!btn) {
    const buttons = Array.from(document.querySelectorAll('button, span, a, input'));
    for (const b of buttons) {
      const text = (b.tagName === 'INPUT' ? (b.value || '') : (b.innerText || '')).trim().toLowerCase();

      // Skip social/cancel buttons
      if (text.includes('google') || text.includes('apple') || text.includes('facebook') || text.includes('back') || text.includes('cancel') || text.includes('return')) {
        continue;
      }

      if (
        text === 'continue' ||
        text === 'submit' ||
        text === 'submit application' ||
        text === 'submit your application' ||
        text === 'next' ||
        text === 'continue to next step' ||
        text === 'review' ||
        text === 'review your application' ||
        text === 'review application' ||
        text === 'continue to review' ||
        text === 'continue to review application' ||
        text.includes('save and continue') ||
        text === 'apply' ||
        text === 'apply now' ||
        text === 'agree and submit' ||
        text === 'agree & submit'
      ) {
        btn = b;
        break;
      }
    }
  }
  if (!btn) {
    // If no exact match, look for visible buttons containing advance-related text
    const buttons = Array.from(document.querySelectorAll('button, span, a, input'));
    for (const b of buttons) {
      const text = (b.tagName === 'INPUT' ? (b.value || '') : (b.innerText || '')).trim().toLowerCase();
      if (text.includes('google') || text.includes('apple') || text.includes('facebook') || text.includes('back') || text.includes('cancel') || text.includes('return')) {
        continue;
      }
      if (
        text.includes('continue') ||
        text.includes('submit') ||
        text.includes('next') ||
        text.includes('review') ||
        text === 'apply'
      ) {
        if (b.offsetWidth > 0 || b.offsetHeight > 0) {
          btn = b;
          break;
        }
      }
    }
  }
  if (btn) {
    console.log('[Copilot] Clicking step advancement button:', btn.tagName === 'INPUT' ? btn.value : btn.innerText);
    btn.click();
  } else {
    throw new Error('Continue or Submit button not found on this step.');
  }
}

function injectIndeedHUD(queue) {
  let hud = document.getElementById('ajf-indeed-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'ajf-indeed-hud';
    hud.style.position = 'fixed';
    hud.style.top = '0';
    hud.style.left = '0';
    hud.style.right = '0';
    hud.style.backgroundColor = '#000000';
    hud.style.color = '#ffffff';
    hud.style.zIndex = '9999999999';
    hud.style.padding = '12px 20px';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.justifyContent = 'space-between';
    hud.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
    hud.style.fontSize = '14px';
    hud.style.borderBottom = '2px solid rgba(255,255,255,0.1)';
    hud.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';

    document.body.appendChild(hud);
    document.body.style.paddingTop = '50px';
  }

  const currentJob = queue.jobList[queue.currentIndex];
  const progressText = `🚀 <strong>100x Indeed Job Bridge:</strong> Applying to <strong>${currentJob.company}</strong> — <em>${currentJob.title}</em> (${queue.currentIndex + 1}/${queue.jobList.length})`;

  hud.innerHTML = `
    <div style="display:flex; align-items:center; gap: 15px;">
      <span>${progressText}</span>
      <span id="ajf-hud-status" style="color: #a5b4fc; font-style: italic;">Initializing...</span>
    </div>
    <div style="display:flex; gap: 10px;">
      <button id="ajf-hud-pause-btn" style="background:#ef4444; border:none; color:white; padding:5px 12px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;">Pause Queue</button>
    </div>
  `;

  const statusTextEl = document.getElementById('ajf-hud-status');
  const pauseBtn = document.getElementById('ajf-hud-pause-btn');

  pauseBtn.addEventListener('click', () => {
    sendExtensionMessage({ action: 'stopIndeedQueue' }, () => {
      statusTextEl.innerText = 'Queue Stopped.';
      statusTextEl.style.color = '#f87171';
      pauseBtn.style.display = 'none';

      const resumeBtn = document.createElement('button');
      resumeBtn.innerText = 'Resume Queue';
      resumeBtn.style.cssText = 'background:#10b981; border:none; color:white; padding:5px 12px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;';
      resumeBtn.addEventListener('click', () => {
        sendExtensionMessage({ action: 'startIndeedQueue', jobList: queue.jobList.slice(queue.currentIndex) }, () => {
          window.location.reload();
        });
      });
      hud.querySelector('div:last-child').appendChild(resumeBtn);
    });
  });

  return {
    updateStatus: (msg, isError = false) => {
      statusTextEl.innerHTML = msg;
      statusTextEl.style.color = isError ? '#f87171' : '#a5b4fc';
    }
  };
}

function addManualActionsToHUD(hud, job) {
  if (document.getElementById('ajf-hud-manual-actions')) return;

  const container = document.createElement('div');
  container.id = 'ajf-hud-manual-actions';
  container.style.cssText = 'display:flex; gap:10px; align-items:center; margin-left:20px;';

  if (job.pdfPath) {
    const pdfUrl = `http://localhost:3004${job.pdfPath}`;
    const cleanCompany = (job.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `Eugene_bochkov_CV_${cleanCompany}.pdf`;

    const downloadBtn = document.createElement('a');
    downloadBtn.href = pdfUrl;
    downloadBtn.download = pdfFilename;
    downloadBtn.target = '_blank';
    downloadBtn.innerText = '📥 Download Tailored CV';
    downloadBtn.style.cssText = 'background:#3b82f6; color:white; padding:4px 10px; border-radius:4px; font-weight:600; text-decoration:none; font-size:12px; cursor:pointer;';
    container.appendChild(downloadBtn);
  }

  if (job.coverLetter) {
    const copyClBtn = document.createElement('button');
    copyClBtn.innerText = '📋 Copy Cover Letter';
    copyClBtn.style.cssText = 'background:#10b981; border:none; color:white; padding:4px 10px; border-radius:4px; font-weight:600; font-size:12px; cursor:pointer;';
    copyClBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(job.coverLetter);
      copyClBtn.innerText = '✓ Copied!';
      setTimeout(() => copyClBtn.innerText = '📋 Copy Cover Letter', 2000);
    });
    container.appendChild(copyClBtn);
  }

  if (job.whyInterested) {
    const copyWhyBtn = document.createElement('button');
    copyWhyBtn.innerText = '📋 Copy "Why Interested"';
    copyWhyBtn.style.cssText = 'background:#8b5cf6; border:none; color:white; padding:4px 10px; border-radius:4px; font-weight:600; font-size:12px; cursor:pointer;';
    copyWhyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(job.whyInterested);
      copyWhyBtn.innerText = '✓ Copied!';
      setTimeout(() => copyWhyBtn.innerText = '📋 Copy "Why Interested"', 2000);
    });
    container.appendChild(copyWhyBtn);
  }

  const statusSpan = document.getElementById('ajf-hud-status');
  if (statusSpan && statusSpan.parentElement) {
    statusSpan.parentElement.appendChild(container);
  }
}

async function uploadIndeedCoverLetter(preGenPromise, hud) {
  try {
    const allText = document.body.innerText.toLowerCase();
    const hasSupportingSection = (
      allText.includes('supporting document') ||
      allText.includes('cover letter') ||
      allText.includes('additional document')
    );
    if (!hasSupportingSection) return;

    let coverFileInput = null;
    const allSections = Array.from(document.querySelectorAll('section, div, fieldset'));
    for (const section of allSections) {
      const sectionText = (section.innerText || '').toLowerCase();
      if (
        sectionText.includes('supporting document') ||
        (sectionText.includes('cover letter') && sectionText.length < 500) ||
        sectionText.includes('additional document')
      ) {
        const fi = section.querySelector('input[type="file"]');
        if (fi) { coverFileInput = fi; break; }

        const addBtn = Array.from(section.querySelectorAll('button, a, label')).find(b => {
          const t = (b.innerText || b.getAttribute('aria-label') || '').trim().toLowerCase();
          return t === 'add' || t === 'upload' || t === 'add file' || t === 'choose file' || t.includes('add document');
        });
        if (addBtn) {
          addBtn.click();
          await sleep(600);
          const fi2 = section.querySelector('input[type="file"]') ||
            document.querySelector('input[type="file"][accept*="pdf"], input[type="file"][accept*="doc"]');
          if (fi2) { coverFileInput = fi2; break; }
        }
      }
    }

    if (!coverFileInput) return;
    if (coverFileInput.files && coverFileInput.files.length > 0) return;

    const job = await preGenPromise;
    if (!job || !job.coverLetter) return;

    hud.updateStatus('📄 Uploading cover letter...');

    const cleanCompany = (job.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Eugene_Bochkov_Cover_Letter_${cleanCompany}.pdf`;
    const pdfContent = buildSimpleTextPdf(job.coverLetter);
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const file = new File([blob], filename, { type: 'application/pdf' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    coverFileInput.files = dataTransfer.files;
    coverFileInput.dispatchEvent(new Event('change', { bubbles: true }));
    coverFileInput.dispatchEvent(new Event('input', { bubbles: true }));

    await sleep(800);
    hud.updateStatus('✅ Cover letter uploaded!');
    await sleep(500);
  } catch (e) {
    console.warn('[Copilot] Cover letter upload failed:', e.message);
  }
}

function buildSimpleTextPdf(text) {
  const lines = text.split('\n');
  let yPos = 750;
  const lineHeight = 14;
  const fontSize = 11;
  let streamContent = `BT\n/F1 ${fontSize} Tf\n`;

  for (const line of lines) {
    const chunks = [];
    let remaining = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    while (remaining.length > 90) {
      const breakAt = remaining.lastIndexOf(' ', 90);
      const cut = breakAt > 0 ? breakAt : 90;
      chunks.push(remaining.substring(0, cut));
      remaining = remaining.substring(breakAt > 0 ? breakAt + 1 : 90);
    }
    chunks.push(remaining);

    for (const chunk of chunks) {
      streamContent += `50 ${yPos} Td (${chunk}) Tj\n-50 0 Td\n`;
      yPos -= lineHeight;
      if (yPos < 50) yPos = 750;
    }
  }
  streamContent += 'ET\n';

  const enc = new TextEncoder();
  const streamBytes = enc.encode(streamContent);
  const streamLen = streamBytes.length;

  const parts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];
  const body = parts.join('');
  const xref = `xref\n0 6\n0000000000 65535 f \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF`;
  return body + xref;
}

async function handleResumeUpload(fileInput, job, currentJobInfo, queue, hud) {
  const pdfUrl = `http://localhost:3004${job.pdfPath}`;
  const cleanCompany = (job.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const pdfFilename = `Eugene_bochkov_CV_${cleanCompany}.pdf`;


  hud.updateStatus(`📥 Uploading tailored CV... (<a href="${pdfUrl}" target="_blank" download="${pdfFilename}" style="color:#60a5fa; text-decoration:underline; font-weight:bold;">Download PDF manually</a>)`);

  const uploaded = await uploadPdfFile(fileInput, pdfUrl, pdfFilename);
  if (uploaded) {
    hud.updateStatus('⌛ CV selected. Waiting for upload to complete on Indeed...');

    // Poll for up to 8 seconds (16 iterations of 500ms) for Indeed to finish uploading and render the file card
    let uploadSuccess = false;
    for (let i = 0; i < 16; i++) {
      await sleep(500);
      const text = document.body.innerText || '';
      // If Indeed displays the filename or parts of it on the page, the upload is complete
      if (text.includes(pdfFilename) || text.includes('Eugene_bochkov_CV_') || text.includes('Eugene-Bochkov-CV')) {
        uploadSuccess = true;
        break;
      }
    }

    if (uploadSuccess) {
      hud.updateStatus('✓ Tailored CV uploaded successfully!');
      await sleep(1000); // Small delay before advancing
      advanceIndeedStep();
    } else {
      hud.updateStatus('✓ CV uploaded. Advancing...');
      await sleep(1500);
      advanceIndeedStep();
    }
  } else {
    hud.updateStatus(`⚠️ CV Upload Blocked. Please drag & drop the downloaded CV PDF onto the file selector, or upload manually: <a href="${pdfUrl}" target="_blank" download="${pdfFilename}" style="color:#f87171; text-decoration:underline; font-weight:bold; font-size:14px;">Download PDF CV Here</a>`, true);
  }
}
