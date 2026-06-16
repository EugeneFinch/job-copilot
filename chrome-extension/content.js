// AusJobFlow Copilot content script

let currentScrapedJob = null;
let currentSettings = null;
let targetLocationsList = ['Sydney', 'Melbourne'];
let sidebarElement = null;
let launcherElement = null;
let pipelineLinked = false;
let pipelineCheckDone = false;
let chatMessages = [];

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
        <!-- Prominent Top Status Card -->
        <div class="ajf-top-status-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="ajf-label" style="text-transform: uppercase; font-weight: 700; font-size: 10px;">Pipeline Status</span>
            <span class="ajf-badge ajf-badge-to-process" id="ajf-job-status">To Process</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="ajf-big-status-btn ajf-big-btn-applied" id="ajf-btn-mark-applied-top" title="Mark this job as Applied">
              ✅ Applied
            </button>
            <button class="ajf-big-status-btn ajf-big-btn-skipped" id="ajf-btn-mark-skipped-top" title="Mark this job as Skipped">
              🚫 Skipped
            </button>
          </div>
        </div>

        <div class="ajf-card" id="ajf-link-section" style="display: none; margin-top: -8px;">
          <div class="ajf-form-group" style="margin-bottom: 0;">
            <label class="ajf-label">🔗 Link to Job in Pipeline</label>
            <select class="ajf-input" id="ajf-select-pipeline-job" style="margin-top: 4px;">
              <option value="">-- Select a Job to Link --</option>
            </select>
          </div>
        </div>

        <div class="ajf-section-title" style="display: flex !important; justify-content: space-between !important; align-items: center !important;">
          <span>Job Details (Parsed)</span>
          <button id="ajf-btn-reparse" style="background: none !important; border: none !important; color: #6366f1 !important; cursor: pointer !important; font-size: 11px !important; font-weight: 600 !important; padding: 2px 6px !important; display: flex !important; align-items: center !important; gap: 4px !important; text-transform: none !important;">🔄 Re-parse</button>
        </div>
        <div class="ajf-card">
          <div class="ajf-form-group">
            <label class="ajf-label">Job Title</label>
            <input type="text" class="ajf-input" id="ajf-input-title">
          </div>
          <div class="ajf-form-group">
            <label class="ajf-label">Company</label>
            <input type="text" class="ajf-input" id="ajf-input-company">
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
              <input type="checkbox" id="ajf-input-is-recruiter" style="margin: 0; width: 13px; height: 13px; cursor: pointer;">
              <label for="ajf-input-is-recruiter" class="ajf-label" style="margin: 0; cursor: pointer; user-select: none; font-size: 11px !important; text-transform: none !important; color: #9ca3af; font-weight: normal;">Is Recruiter Posting</label>
            </div>
          </div>
          <div class="ajf-form-group">
            <label class="ajf-label">Location</label>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <select class="ajf-input" id="ajf-select-location" style="margin: 0; background: #1e293b !important; color: #f8fafc !important; border: 1px solid #475569 !important; border-radius: 6px !important; padding: 6px 8px !important; font-size: 12px !important; cursor: pointer;">
                <option value="" disabled>-- Select Location --</option>
                <option value="Sydney">Sydney</option>
                <option value="Melbourne">Melbourne</option>
                <option value="Other">Other</option>
              </select>
              <input type="text" class="ajf-input" id="ajf-input-location" style="margin: 0; display: none;" placeholder="Type location manually...">
            </div>
          </div>
          <div class="ajf-form-group">
            <label class="ajf-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span>Hiring Manager Link/Name</span>
              <span style="font-size: 9px; opacity: 0.6; text-transform: none; font-weight: normal; color: #9ca3af;">Alt+M to Gen</span>
            </label>
            <div style="display: flex; gap: 6px; align-items: center;">
              <input type="text" class="ajf-input" id="ajf-input-hiring-manager" placeholder="LinkedIn URL or Name" style="flex: 1; margin: 0; min-width: 0;">
              <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-gen-hiring-intro" style="padding: 6px 10px !important; width: auto !important; height: auto !important; font-size: 11px !important; margin: 0;" title="Generate Hiring Manager Intro (Alt+M)">Gen Intro</button>
            </div>
          </div>
          <div class="ajf-form-group">
            <label class="ajf-label">Job URL</label>
            <input type="text" class="ajf-input" id="ajf-input-url" disabled>
          </div>
          <div class="ajf-form-group">
            <label class="ajf-label">Suitability Score (1-10)</label>
            <input type="number" class="ajf-input" id="ajf-input-score" min="1" max="10" placeholder="Run Assess Match to set score">
          </div>
        </div>

        <div class="ajf-section-title">Automation Console</div>
        <p class="ajf-workflow-hint" id="ajf-workflow-hint">1. Save → 2. Tailor CV → 3. Autofill</p>
        <div id="ajf-custom-instructions-container" style="margin-top: 10px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 11px !important; color: #9ca3af !important; text-transform: uppercase; font-weight: 600; margin: 0;">Job-Specific Custom Instructions</label>
            <button class="ajf-btn" id="ajf-btn-save-instructions" style="padding: 2px 6px !important; font-size: 10px !important; height: auto !important; width: auto !important; margin: 0 !important; display: none;">Save Context</button>
          </div>
          <textarea class="ajf-input" id="ajf-job-custom-instructions" placeholder="e.g. Spenmo: Highlight experience with regional payment compliance workflows. Vincere: focus on multi-client ATS architecture." style="height: 60px !important; font-size: 12px !important; resize: vertical; padding: 6px 8px !important; min-height: 50px !important; background: #1e293b !important; color: #f8fafc !important; border: 1px solid #475569 !important; border-radius: 6px !important;"></textarea>
        </div>

        <div class="ajf-actions">
          <button class="ajf-btn ajf-btn-primary" id="ajf-btn-save">
            💾 Save to Pipeline
          </button>
          <div style="display: flex; align-items: center; gap: 8px; margin: 2px 0 6px 4px;">
            <input type="checkbox" id="ajf-input-auto-process" style="margin: 0; width: 14px; height: 14px; cursor: pointer;" checked>
            <label for="ajf-input-auto-process" class="ajf-label" style="margin: 0; cursor: pointer; font-weight: 600; color: #a78bfa; font-size: 11px; text-transform: none;">Auto-Process after saving (runs Assess & Tailor)</label>
          </div>
          <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-assess">
            🔍 Assess Match
          </button>
          <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-tailor" disabled>
            ✨ Tailor CV & Letter
          </button>
          <button class="ajf-btn ajf-btn-success" id="ajf-btn-autofill" disabled>
            ⚡ Autofill Application
          </button>
          <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-download-pdf" style="display:none;">
            📄 Open Tailored PDF
          </button>
        </div>

        <div id="ajf-assess-section" style="display: none; margin-top: 10px;">
          <div class="ajf-section-title">🔍 Suitability Assessment</div>
          <div class="ajf-card" style="background: rgba(16, 185, 129, 0.08) !important; border-color: rgba(16, 185, 129, 0.2) !important;">
            <p class="ajf-text-sm" id="ajf-assess-result" style="font-size: 12px !important; line-height: 1.45 !important; color: #d1d5db !important; margin: 0 !important; white-space: pre-wrap !important; font-style: italic !important;"></p>
          </div>
        </div>

        <div id="ajf-tailor-explanation-section" style="display: none; margin-top: 10px;">
          <div class="ajf-section-title">✨ Tailoring Changes & Highlights</div>
          <div class="ajf-card" style="background: rgba(99, 102, 241, 0.08) !important; border-color: rgba(99, 102, 241, 0.2) !important;">
            <p class="ajf-text-sm" id="ajf-tailor-explanation" style="font-size: 12px !important; line-height: 1.45 !important; color: #d1d5db !important; margin: 0 !important; white-space: pre-wrap !important; font-style: italic !important;"></p>
          </div>
        </div>

        <div id="ajf-export-section" style="display: none; margin-top: 10px;">
          <div class="ajf-section-title">📋 Export Artifacts</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-copy-cover-letter" style="font-size: 11px !important; padding: 5px 10px !important; flex: 1;">
              📋 Cover Letter
            </button>
            <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-copy-why-interested" style="font-size: 11px !important; padding: 5px 10px !important; flex: 1;">
              📋 Why Interested
            </button>
            <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-copy-hiring-intro" style="font-size: 11px !important; padding: 5px 10px !important; flex: 1; display: none;">
              📋 Hiring Intro
            </button>
            <button class="ajf-btn ajf-btn-secondary" id="ajf-btn-copy-job-details" style="font-size: 11px !important; padding: 5px 10px !important; flex: 1;">
              📋 Job Details
            </button>
          </div>
        </div>

        <div class="ajf-section-title" id="ajf-chat-title">Job Assistant Chat</div>
        <div class="ajf-card" id="ajf-chat-section">
          <div class="ajf-chat-history" id="ajf-chat-history">
            <div class="ajf-chat-msg ajf-chat-msg-ai">Hi Eugene! I know about your CV and this role. Ask me anything about this job/company or ask me to draft a custom message/cover letter adjustment.</div>
          </div>
          <div class="ajf-chat-suggestions" id="ajf-chat-suggestions">
            <span class="ajf-chat-pill" data-prompt="Is this job relevant to me?">Is it relevant?</span>
            <span class="ajf-chat-pill" data-prompt="Why am I interested in this role?">Why interested?</span>
            <span class="ajf-chat-pill" data-prompt="Draft an extremely short LinkedIn connection invite message to the hiring manager for this role. It MUST be strictly under 300 characters (including spaces). Focus on APAC fintech/payments product leadership and permanent residency (PR).">Hiring Manager Invite</span>
            <span class="ajf-chat-pill" data-prompt="Draft a 'Top Choice' message explaining my fit.">Top Choice message</span>
          </div>
          <div class="ajf-chat-input-container">
            <textarea class="ajf-input ajf-chat-input" id="ajf-chat-input" placeholder="Ask a question or draft a message..." rows="1"></textarea>
            <button class="ajf-chat-send-btn" id="ajf-btn-chat-send">Send</button>
          </div>
        </div>

        <div class="ajf-section-title" id="ajf-logs-title" style="display:none;">Logs</div>
        <div class="ajf-log-box" id="ajf-logs" style="display:none;"></div>
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

  // Event Listeners
  launcherElement.addEventListener('click', toggleSidebar);
  document.getElementById('ajf-close-sidebar').addEventListener('click', toggleSidebar);
  document.getElementById('ajf-btn-save').addEventListener('click', handleSaveJob);
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

  // Export buttons
  document.getElementById('ajf-btn-copy-cover-letter').addEventListener('click', () => {
    if (currentScrapedJob?.coverLetter) {
      navigator.clipboard.writeText(currentScrapedJob.coverLetter);
      showToast('Copied Cover Letter to clipboard');
    } else {
      showToast('No Cover Letter available');
    }
  });
  document.getElementById('ajf-btn-copy-why-interested').addEventListener('click', () => {
    if (currentScrapedJob?.whyInterested) {
      navigator.clipboard.writeText(currentScrapedJob.whyInterested);
      showToast('Copied Why Interested to clipboard');
    } else {
      showToast('No Why Interested text available');
    }
  });
  document.getElementById('ajf-btn-copy-hiring-intro').addEventListener('click', () => {
    if (currentScrapedJob?.hiringManagerIntro) {
      navigator.clipboard.writeText(currentScrapedJob.hiringManagerIntro);
      showToast('Copied Hiring Intro to clipboard');
    } else {
      showToast('No Hiring Intro available');
    }
  });
  document.getElementById('ajf-btn-copy-job-details').addEventListener('click', () => {
    if (currentScrapedJob) {
      const details = `Title: ${currentScrapedJob.title || ''}\nCompany: ${currentScrapedJob.company || ''}\nLocation: ${currentScrapedJob.location || ''}\nURL: ${currentScrapedJob.url || ''}\n\nDescription:\n${currentScrapedJob.description || ''}`;
      navigator.clipboard.writeText(details);
      showToast('Copied Job Details to clipboard');
    }
  });

  // Hiring Manager Intro Click Listener
  const genIntroBtn = document.getElementById('ajf-btn-gen-hiring-intro');
  if (genIntroBtn) {
    genIntroBtn.addEventListener('click', handleGenerateHiringIntro);
  }

  // Attach blur and change listeners to inputs for auto-saving
  const titleInput = document.getElementById('ajf-input-title');
  const companyInput = document.getElementById('ajf-input-company');
  const locationInput = document.getElementById('ajf-input-location');
  const hiringManagerInput = document.getElementById('ajf-input-hiring-manager');
  const isRecruiterInput = document.getElementById('ajf-input-is-recruiter');
  const scoreInput = document.getElementById('ajf-input-score');

  [titleInput, companyInput, locationInput, hiringManagerInput, isRecruiterInput, scoreInput].forEach(input => {
    if (input) {
      input.addEventListener('change', autoSaveJobDetails);
      input.addEventListener('blur', autoSaveJobDetails);
    }
  });
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

  // Hotkey listener inside container (Alt+M to generate hiring manager intro)
  container.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      handleGenerateHiringIntro();
    }
  });

  document.getElementById('ajf-select-pipeline-job').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      handleLinkJob(val);
    }
  });

  // Chatbot event listeners
  document.getElementById('ajf-btn-chat-send').addEventListener('click', handleSendChatMessage);
  document.getElementById('ajf-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  });
  document.querySelectorAll('.ajf-chat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const prompt = pill.getAttribute('data-prompt');
      if (prompt) {
        document.getElementById('ajf-chat-input').value = prompt;
        handleSendChatMessage();
      }
    });
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
            logToConsole(`Local file path: /Users/eugene/Coding/job-search/data/generated/${pdfFilename}`);
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

  // Trigger auto re-parse on startup to wait for SPA hydration
  runSpaAutoReparse();
}

function updateDynamicUI() {
  const autoProcessCheckbox = document.getElementById('ajf-input-auto-process');
  const isTicked = autoProcessCheckbox ? autoProcessCheckbox.checked : false;

  const assessBtn = document.getElementById('ajf-btn-assess');
  const tailorBtn = document.getElementById('ajf-btn-tailor');
  const instructionsContainer = document.getElementById('ajf-custom-instructions-container');

  if (assessBtn) {
    assessBtn.style.setProperty('display', isTicked ? 'none' : 'flex', 'important');
  }
  if (tailorBtn) {
    tailorBtn.style.setProperty('display', isTicked ? 'none' : 'flex', 'important');
  }
  if (instructionsContainer) {
    instructionsContainer.style.setProperty('display', isTicked ? 'none' : 'flex', 'important');
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
      if (lookup?.success && lookup.data) {
        applyJobToUI(lookup.data, { fromPipeline: true });
        callback(lookup.data, null);
        return;
      }
      sendExtensionMessage({ action: 'getJobs' }, (response) => {
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
  currentScrapedJob = job;
  if (fromPipeline) pipelineLinked = true;
  populateUIFields();

  const instrInput = document.getElementById('ajf-job-custom-instructions');
  if (instrInput) {
    instrInput.value = job.customInstructions || '';
  }
  const saveInstrBtn = document.getElementById('ajf-btn-save-instructions');
  if (saveInstrBtn) {
    saveInstrBtn.style.display = pipelineLinked ? 'inline-block' : 'none';
  }

  const statusBadge = document.getElementById('ajf-job-status');
  const status = (job.status || 'To Process').trim();
  statusBadge.innerText = status;
  statusBadge.className = `ajf-badge ajf-badge-${status.toLowerCase().replace(/\s+/g, '-')}`;
  statusBadge.setAttribute('title', `Pipeline status: ${status}`);

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

  const expSection = document.getElementById('ajf-tailor-explanation-section');
  const expText = document.getElementById('ajf-tailor-explanation');
  if (expSection && expText) {
    if (job && job.tailoringExplanation) {
      expText.textContent = job.tailoringExplanation;
      expSection.style.display = 'block';
    } else {
      expSection.style.display = 'none';
    }
  }

  const assessSection = document.getElementById('ajf-assess-section');
  const assessResult = document.getElementById('ajf-assess-result');
  if (assessSection && assessResult) {
    if (job && job.suitabilityAssessment) {
      assessResult.textContent = job.suitabilityAssessment;
      assessSection.style.display = 'block';
    } else {
      assessSection.style.display = 'none';
      assessResult.textContent = '';
    }
  }

  updateActionButtons();
}

function updateActionButtons() {
  const job = currentScrapedJob;
  const inDb = pipelineLinked;
  const tailored =
    job?.status === 'Applied' ||
    !!job?.pdfPath ||
    !!job?.tailoredCv;

  const saveBtn = document.getElementById('ajf-btn-save');
  const tailorBtn = document.getElementById('ajf-btn-tailor');
  const autofillBtn = document.getElementById('ajf-btn-autofill');
  const downloadBtn = document.getElementById('ajf-btn-download-pdf');
  const hint = document.getElementById('ajf-workflow-hint');

  if (inDb) {
    saveBtn.innerText = '✓ Saved in Pipeline';
    saveBtn.disabled = true;
  } else {
    saveBtn.innerText = '💾 Save to Pipeline';
    saveBtn.disabled = false;
  }
  tailorBtn.disabled = !pipelineCheckDone || !inDb;
  autofillBtn.disabled = !pipelineCheckDone || !tailored;
  downloadBtn.style.display = tailored ? 'flex' : 'none';

  const hasIntro = !!job?.hiringManagerIntro;
  const showExport = tailored || hasIntro;

  const copyIntroBtn = document.getElementById('ajf-btn-copy-hiring-intro');
  if (copyIntroBtn) {
    copyIntroBtn.style.display = hasIntro ? 'inline-block' : 'none';
  }

  document.getElementById('ajf-export-section').style.display = showExport ? 'block' : 'none';

  tailorBtn.title = inDb ? 'Generate tailored CV and cover letter' : 'Save to pipeline first';
  autofillBtn.title = tailored ? 'Fill this application form' : 'Tailor CV first';

  if (hint) {
    if (!inDb) {
      hint.textContent = 'Step 1: Click Save to Pipeline — then Tailor and Autofill unlock.';
    } else if (!tailored) {
      hint.textContent = 'Step 2: Click Tailor CV & Letter — then Autofill unlocks.';
    } else {
      hint.textContent = 'Ready — Autofill and Open PDF are available.';
    }
  }
}

function finishPipelineCheck() {
  pipelineCheckDone = true;
  updateActionButtons();
}

function checkExistingJob() {
  pipelineCheckDone = false;
  updateActionButtons();
  logToConsole('Checking pipeline for this job…');

  resolvePipelineJob((job, err) => {
    if (job) {
      logToConsole(`✓ Linked to pipeline job #${job.id}`);
      logToConsole(`Status: ${job.status}`);
      if (job.status === 'Applied') {
        logToConsole('✓ CV & cover letter are ready.');
      }
    } else if (err === 'not_found') {
      logToConsole('New on this page — click Save to Pipeline to add it.');
      const linkSection = document.getElementById('ajf-link-section');
      if (linkSection) {
        linkSection.style.display = 'block';
        populatePipelineDropdown();
      }
    } else {
      logToConsole(`✗ ${err}`);
    }
    finishPipelineCheck();
  });
}

function toggleSidebar() {
  sidebarElement.classList.toggle('ajf-open');
}

function logToConsole(message) {
  const logsBox = document.getElementById('ajf-logs');
  const logsTitle = document.getElementById('ajf-logs-title');
  if (!logsBox) return;
  logsBox.style.display = 'block';
  if (logsTitle) logsTitle.style.display = 'block';
  const line = document.createElement('div');
  line.className = 'ajf-log-line';
  line.textContent = message;
  logsBox.appendChild(line);
  logsBox.scrollTop = logsBox.scrollHeight;
}

function clearLogs() {
  const logsBox = document.getElementById('ajf-logs');
  if (logsBox) logsBox.innerHTML = '';
}

// SPA watcher delay/retry parsing engine
let spaTimer = null;
let retryCount = 0;
const MAX_RETRIES = 4;

function runSpaAutoReparse() {
  if (spaTimer) clearTimeout(spaTimer);
  retryCount = 0;

  // Clear UI fields immediately to avoid stale data display
  const titleInput = document.getElementById('ajf-input-title');
  if (titleInput) titleInput.value = 'Loading job details...';
  const companyInput = document.getElementById('ajf-input-company');
  if (companyInput) companyInput.value = '';
  const locationInput = document.getElementById('ajf-input-location');
  if (locationInput) locationInput.value = '';
  const statusBadge = document.getElementById('ajf-job-status');
  if (statusBadge) {
    statusBadge.innerText = 'Checking...';
    statusBadge.className = 'ajf-badge ajf-badge-to-process';
  }

  spaTimer = setTimeout(attemptReparse, 800);
}

function attemptReparse() {
  const scraped = extractJobDetails();
  const titleEmpty = !scraped.title || scraped.title === 'Job Opportunity' || scraped.title.trim().length === 0;
  const descEmpty = !scraped.description || scraped.description.length < 150;

  // Detect if the DOM content is identical to the previously active job, which indicates the SPA hasn't hydrated/rendered the new job details yet
  const isDuplicateOfCurrent = currentScrapedJob &&
    scraped.title === currentScrapedJob.title &&
    scraped.company === currentScrapedJob.company &&
    scraped.description === currentScrapedJob.description;

  if ((titleEmpty || descEmpty || isDuplicateOfCurrent) && retryCount < MAX_RETRIES) {
    retryCount++;
    logToConsole(`Waiting for page content to load (Retry ${retryCount}/${MAX_RETRIES})...`);
    spaTimer = setTimeout(attemptReparse, 500);
    return;
  }

  logToConsole('Job details extracted successfully from page.');
  pipelineLinked = false;
  pipelineCheckDone = false;
  clearChat();
  currentScrapedJob = scraped;
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  populateUIFields();
  updateActionButtons();
  checkExistingJob();
}

function handleReparseJob() {
  clearLogs();
  logToConsole('Manually re-parsing page details...');
  pipelineLinked = false;
  pipelineCheckDone = false;
  clearChat();
  currentScrapedJob = extractJobDetails();
  currentScrapedJob.url = canonicalJobUrl(currentScrapedJob.url);
  populateUIFields();
  updateActionButtons();
  checkExistingJob();
  showToast('Page re-parsed successfully!');
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

function getLinkedInHiringManager() {
  const root = document.querySelector('.job-view-layout') || document.querySelector('.jobs-details') || document;

  // 1. Text-based search for "Meet the hiring team" or "Job poster"
  const elements = root.querySelectorAll('h2, h3, h4, h5, div, span, p, label');
  const labels = ['meet the hiring team', 'job poster', 'hiring team', 'hiring manager'];

  for (const el of elements) {
    if (el.children.length === 0 || (el.children.length > 0 && !el.querySelector('h2, h3, h4, h5'))) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (labels.some(l => text === l || text.startsWith(l))) {
        // We found the section header/label.
        // Let's traverse up to the closest container
        const container = el.closest('.jobs-poster') ||
          el.closest('[class*="poster"]') ||
          el.closest('[class*="hirer"]') ||
          el.closest('[class*="hiring"]') ||
          el.closest('.artdeco-card') ||
          el.closest('section') ||
          el.parentElement;

        if (container) {
          // Look for a link to a LinkedIn profile
          const profileLink = container.querySelector('a[href*="/in/"]');
          if (profileLink && profileLink.href) {
            return {
              url: profileLink.href,
              name: extractCleanName(profileLink.innerText || container.querySelector('strong')?.innerText || '')
            };
          }
          // If no profile link with /in/, maybe a generic link or just a name
          const nameEl = container.querySelector('.jobs-poster__name, strong, [class*="name"]');
          if (nameEl) {
            return {
              url: '',
              name: extractCleanName(nameEl.innerText)
            };
          }
        }
      }
    }
  }

  // 2. Class-based search fallbacks (if header text wasn't found or was translated)
  const hiringLink = document.querySelector('.jobs-poster__name')?.closest('a') ||
    document.querySelector('.job-details-people-who-can-help__section--two-pane a[href*="/in/"]') ||
    document.querySelector('.hirer-card__hirer-information a[href*="/in/"]') ||
    document.querySelector('[class*="hiring-team"] a[href*="/in/"]') ||
    document.querySelector('[class*="hirer-card"] a[href*="/in/"]');

  const hiringNameEl = document.querySelector('.jobs-poster__name strong') ||
    document.querySelector('.jobs-poster__name') ||
    document.querySelector('.hirer-card__hirer-information strong') ||
    document.querySelector('[class*="hiring-team"] strong') ||
    document.querySelector('[class*="hirer-card"] strong');

  if (hiringLink && hiringLink.href) {
    return {
      url: hiringLink.href,
      name: extractCleanName(hiringNameEl ? hiringNameEl.innerText : hiringLink.innerText)
    };
  } else if (hiringNameEl) {
    return {
      url: '',
      name: extractCleanName(hiringNameEl.innerText)
    };
  }

  // 3. Last resort: scan any anchor tag inside the job layout that contains /in/ in the href
  // but exclude common elements or ourselves, and scope it to the left or right panels
  const allInLinks = root.querySelectorAll('a[href*="/in/"]');
  for (const link of allInLinks) {
    // Check if it's within a card/section that mentions poster or hiring
    const parentCard = link.closest('.artdeco-card') || link.closest('section') || link.closest('div');
    if (parentCard) {
      const cardText = (parentCard.innerText || '').toLowerCase();
      if (cardText.includes('poster') || cardText.includes('hiring') || cardText.includes('hirer') || cardText.includes('team') || cardText.includes('meet')) {
        return {
          url: link.href,
          name: extractCleanName(link.innerText || '')
        };
      }
    }
  }

  return null;
}

function extractCleanName(rawName) {
  if (!rawName) return '';
  // Split by newline, remove anything after '·' or degree like '2nd', clean emoji, remove trailing/leading spaces
  let name = rawName.split('\n')[0].split('•')[0].split('·')[0].trim();
  name = name.replace(/\s+(?:1st|2nd|3rd\+?|3rd)\b/gi, ''); // remove connection degree
  return name.trim();
}

// Extract Job Listing details using custom/generic selectors
function extractJobDetails() {
  const url = window.location.href;
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
    title = document.querySelector('.job-details-jobs-unified-top-card__job-title h1')?.innerText ||
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-unified-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-details-top-card__job-title')?.innerText ||
      document.querySelector('.jobs-search-top-card__job-title')?.innerText ||
      document.querySelector('.job-details-panel h1')?.innerText ||
      document.querySelector('.job-details h1')?.innerText ||
      document.querySelector('h1')?.innerText || '';

    company = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText ||
      document.querySelector('.jobs-unified-top-card__company-name')?.innerText ||
      document.querySelector('.jobs-details-top-card__company-name')?.innerText ||
      document.querySelector('.jobs-search-top-card__company-name')?.innerText ||
      document.querySelector('.jobs-unified-top-card__company-name-link')?.innerText ||
      document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.innerText ||
      '';

    location = getLinkedInLocation();

    description = document.querySelector('.jobs-description__content')?.innerText ||
      document.querySelector('.jobs-box__html-content')?.innerText ||
      document.querySelector('#job-details')?.innerText ||
      document.querySelector('.jobs-description')?.innerText ||
      document.querySelector('.jobs-description-content__text')?.innerText ||
      '';

    // Extract hiring manager URL or Name using robust helper
    const hmInfo = getLinkedInHiringManager();
    if (hmInfo) {
      hiringManager = hmInfo.url || hmInfo.name || '';
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
  }

  // Fallbacks
  if (!title) {
    const titleParts = document.title.split('|');
    title = document.querySelector('h1')?.innerText || titleParts[0].trim() || 'Job Opportunity';
  }
  if (!company) {
    const titleParts = document.title.split('|');
    if (titleParts.length >= 2) {
      company = titleParts[1].trim();
    } else {
      company = document.title.split(' at ')[1] || document.title.split(' - ')[1] || 'Unknown';
    }
  }
  if (!description) {
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

  const recruiterKeywords = [
    'hays', 'onset', 'wow recruitment', 'latitude it', 'salt', 'talent international',
    'hudson', 'robert half', 'michael page', 'adecco', 'randstad', 'genesis', 'aurec',
    'paxus', 'greythorn', 'chandler macleod', 'espy', 'allura', 'halcyon knights',
    'prestige staffing', 'charterhouse', 'command', 'davidson', 'sharp & carter',
    'tribe', 'reo group', 'denovo', 'sourced', 'g2', 'kinexus', 'm&t resources',
    'polyglot', 'peoplebank', 'talenza', 'trs resourcing', 'sirius', 'bluefin',
    'concept recruitment', 'method recruitment', 'mitchellake', 'xpand', 'interpro',
    'robert walters'
  ];
  const isRecruiter = recruiterKeywords.some(kw => cleanCompanyName.toLowerCase().includes(kw));

  return {
    id: Math.random().toString(36).substring(2, 11),
    title: title.trim(),
    company: cleanCompanyName,
    location: location.trim().replace(/•/g, '').trim(),
    url: url,
    description: description.replace(/\s+/g, ' ').trim(),
    status: 'To Process',
    scrapedAt: new Date().toISOString(),
    tailoredCv: null,
    coverLetter: null,
    source: 'Extension Sourced',
    hiringManager: hiringManager.trim(),
    hiringManagerIntro: '',
    isRecruiter: isRecruiter,
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
    hmInput.value = currentScrapedJob.hiringManager || '';
  }

  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  if (isRecruiterBox) {
    isRecruiterBox.checked = !!currentScrapedJob.isRecruiter;
  }

  const scoreInput = document.getElementById('ajf-input-score');
  if (scoreInput) {
    scoreInput.value = currentScrapedJob.suitabilityScore || '';
  }

  const assessSection = document.getElementById('ajf-assess-section');
  const assessResult = document.getElementById('ajf-assess-result');
  if (assessSection && assessResult) {
    assessSection.style.display = 'none';
    assessResult.textContent = '';
  }
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
          applyJobToUI(currentScrapedJob, { fromPipeline: true });
          showToast(`Job status updated to ${newStatus}!`);
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
      saveBtn.innerText = '💾 Save to Pipeline';
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
          logToConsole(`✓ Step 2/4: Suitability Assessment completed. Score: ${assessResponse.data.score || 5}/10`);
          jobToUpdate.suitabilityScore = assessResponse.data.score || 5;
          jobToUpdate.suitabilityAssessment = assessResponse.data.explanation;

          const scoreInput = document.getElementById('ajf-input-score');
          if (scoreInput) scoreInput.value = jobToUpdate.suitabilityScore;

          const assessSection = document.getElementById('ajf-assess-section');
          const assessResult = document.getElementById('ajf-assess-result');
          if (assessSection && assessResult) {
            assessResult.textContent = `Suitability Score: ${jobToUpdate.suitabilityScore}/10\n\n${assessResponse.data.explanation}`;
            assessSection.style.display = 'block';
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
                saveBtn.innerText = '✓ Saved in Pipeline';
                logToConsole(`✗ Auto-process failed at Tailor step: ${tailorResponse?.error || 'Unknown error'}`);
                showToast('Auto-process failed at Tailor step!');
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
                saveBtn.innerText = '✓ Saved in Pipeline';

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

function handleSaveJob() {
  const autoProcessCheckbox = document.getElementById('ajf-input-auto-process');
  const shouldAutoProcess = autoProcessCheckbox ? autoProcessCheckbox.checked : false;

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
  const scoreVal = document.getElementById('ajf-input-score').value;
  currentScrapedJob.suitabilityScore = scoreVal ? parseInt(scoreVal, 10) : null;
  currentScrapedJob.isRecruiter = document.getElementById('ajf-input-is-recruiter').checked;
  currentScrapedJob.url = canonicalJobUrl(
    document.getElementById('ajf-input-url').value || currentScrapedJob.url
  );

  clearLogs();
  logToConsole('Saving job details to pipeline...');

  sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (response) => {
    saveBtn.disabled = false;
    saveBtn.innerText = '💾 Save to Pipeline';

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
    currentScrapedJob.hiringManager = hmVal.value;
  }
  const isRecruiterBox = document.getElementById('ajf-input-is-recruiter');
  if (isRecruiterBox) {
    currentScrapedJob.isRecruiter = isRecruiterBox.checked;
  }
  const scoreInput = document.getElementById('ajf-input-score');
  if (scoreInput) {
    currentScrapedJob.suitabilityScore = scoreInput.value ? parseInt(scoreInput.value, 10) : null;
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
          showToast('Intro generated and saved!');
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
        let effortRecommendation = '';
        if (score >= 7) {
          effortRecommendation = 'Put more effort into this application!';
        } else if (score >= 5) {
          effortRecommendation = 'Put moderate effort into this application.';
        } else {
          effortRecommendation = 'Put less effort into this application.';
        }

        const scoreMsg = `Okay, the score is ${score}/10. ${effortRecommendation}`;
        logToConsole(`✓ Suitability assessment complete. ${scoreMsg}`);

        if (currentScrapedJob) {
          currentScrapedJob.suitabilityAssessment = response.data.explanation;
          currentScrapedJob.suitabilityScore = score;
        }

        const scoreInput = document.getElementById('ajf-input-score');
        if (scoreInput) {
          scoreInput.value = score;
        }

        assessResult.textContent = `${scoreMsg}\n\n${response.data.explanation}`;
        assessSection.style.display = 'block';

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

          logToConsole('Auto-saving job and score details to pipeline...');
          sendExtensionMessage({ action: 'addJob', job: currentScrapedJob }, (saveResponse) => {
            if (saveResponse && saveResponse.success) {
              logToConsole('✓ Job and assessment auto-saved to pipeline.');
              pipelineLinked = true;
              if (saveResponse.data && saveResponse.data.job) {
                currentScrapedJob = saveResponse.data.job;
              }
              updateActionButtons();
              const statusBadge = document.getElementById('ajf-job-status');
              if (statusBadge && currentScrapedJob) {
                const status = (currentScrapedJob.status || 'To Process').trim();
                statusBadge.innerText = status;
                statusBadge.className = `ajf-badge ajf-badge-${status.toLowerCase().replace(/\s+/g, '-')}`;
              }
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
  tailorBtn.innerText = '✨ Tailoring CV (LLM)...';

  logToConsole('Resolving pipeline job…');

  resolvePipelineJob((job, err) => {
    if (!job) {
      logToConsole(err === 'not_found' ? 'Save to pipeline first.' : `✗ ${err}`);
      tailorBtn.disabled = false;
      tailorBtn.innerText = '✨ Tailor CV & Letter';
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
        logToConsole('CV & cover letter tailored successfully!');
        applyJobToUI(response.data, { fromPipeline: true });

        logToConsole('Automatically compiling PDF CV...');
        sendExtensionMessage({ action: 'generatePdf', jobId: job.id }, (pdfResponse) => {
          tailorBtn.disabled = false;
          tailorBtn.innerText = '✨ Tailor CV & Letter';

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
        tailorBtn.innerText = '✨ Tailor CV & Letter';
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

    const coverLetter = currentScrapedJob.coverLetter || '';
    const pdfUrl = `http://localhost:3004${currentScrapedJob.pdfPath}`;
    const cleanCompany = (currentScrapedJob.company || 'Company').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `Eugene_bochkov_CV_${cleanCompany}.pdf`;

    logToConsole('Analyzing application fields...');
    const formElements = document.querySelectorAll('input, textarea, select');
    const radioGroups = {};
    let fieldsFilled = 0;

    for (const el of formElements) {
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

      if (!isSponsorship && !isEligibility && !isEEOC) continue;

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
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
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
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) labelText = label.innerText;
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

function sendExtensionMessage(message, callback) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    logToConsole('✗ Error: Extension connection lost. Please refresh this webpage to reload the Copilot extension.');
    showToast('Please refresh the page to reload Copilot!');
    if (callback) callback({ success: false, error: 'Extension connection lost' });
    return false;
  }
  try {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        logToConsole(`✗ Extension error: ${lastError.message}`);
        logToConsole('TIP: Please refresh this webpage to restore connection.');
        showToast('Extension disconnected! Please refresh.');
        if (callback) callback({ success: false, error: lastError.message });
        return;
      }
      if (callback) callback(response);
    });
    return true;
  } catch (e) {
    logToConsole(`✗ Extension error: ${e.message}`);
    logToConsole('TIP: Please refresh this webpage to restore connection.');
    showToast('Extension disconnected! Please refresh.');
    if (callback) callback({ success: false, error: e.message });
    return false;
  }
}

// Chatbot helpers
function clearChat() {
  chatMessages = [];
  const chatHistory = document.getElementById('ajf-chat-history');
  if (chatHistory) {
    chatHistory.innerHTML = '<div class="ajf-chat-msg ajf-chat-msg-ai">Hi Eugene! I know about your CV and this role. Ask me anything about this job/company or ask me to draft a custom message/cover letter adjustment.</div>';
  }
  const expSection = document.getElementById('ajf-tailor-explanation-section');
  const expText = document.getElementById('ajf-tailor-explanation');
  if (expSection && expText) {
    expText.textContent = '';
    expSection.style.display = 'none';
  }
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

// Start Copilot
initCopilot();

// Watch for SPA URL changes
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    logToConsole('URL change detected (SPA). Rechecking pipeline shortly...');
    clearLogs();
    runSpaAutoReparse();
    runIndeedIntegration();
  }
});
urlObserver.observe(document, { subtree: true, childList: true });

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

    // 1. Hiring Manager
    const currentHM = (currentScrapedJob.hiringManager || '').trim();
    const isCurrentUrl = currentHM.startsWith('http');
    if (!currentHM || !isCurrentUrl) {
      const hmInfo = getLinkedInHiringManager();
      if (hmInfo) {
        const val = hmInfo.url || hmInfo.name;
        if (val && currentHM !== val) {
          if (hmInfo.url || !currentHM) {
            currentScrapedJob.hiringManager = val;
            const hmInput = document.getElementById('ajf-input-hiring-manager');
            if (hmInput) hmInput.value = val;
            logToConsole(`✓ Lazy-loaded hiring manager detected: ${val}`);
            updated = true;
          }
        }
      }
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

    // 3. Company Name (if currently 'Unknown' or empty)
    if (!currentScrapedJob.company || currentScrapedJob.company === 'Unknown') {
      let foundComp = document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText ||
        document.querySelector('.jobs-unified-top-card__company-name')?.innerText ||
        document.querySelector('.jobs-details-top-card__company-name')?.innerText ||
        document.querySelector('.jobs-search-top-card__company-name')?.innerText ||
        document.querySelector('.jobs-unified-top-card__company-name-link')?.innerText ||
        document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.innerText ||
        '';
      if (foundComp) {
        foundComp = foundComp.trim().replace(/ hiring now!/gi, '');
        if (foundComp && foundComp !== 'Unknown' && currentScrapedJob.company !== foundComp) {
          currentScrapedJob.company = foundComp;
          const compInput = document.getElementById('ajf-input-company');
          if (compInput) compInput.value = foundComp;
          logToConsole(`✓ Lazy-loaded company name detected: ${foundComp}`);
          updated = true;
        }
      }
    }

    // Auto-save changes if any value was updated
    if (updated) {
      autoSaveJobDetails();
    }
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
