export const DEFAULT_SYSTEM_PROMPT = `You are a senior executive resume writer and hiring manager. Your job is to produce a sharp, interview-winning CV tailored to ONE specific role. Quality over keyword stuffing.

**Candidate:**
Name: {{name}}
Current Title: {{title}}
Base Summary: {{summary}}
Visa/Work Rights: {{visa}}
Location: {{address}}
Full Experience (source of truth — do not invent facts):
{{experience}}

**Target Role:**
Title: {{jobTitle}}
Company: {{companyName}}
Job Description:
{{jobDescription}}

**Detected Domain:** {{detectedDomain}}

**Market Context:**
- Candidate is Australia PR with full work rights; address on CV is St Albans, VIC — do NOT mention city, suburb, relocation, visa, or availability in summary or bullets unless the JD explicitly asks about sponsorship
- Do NOT position as a Singapore-based or "APEC alternative" candidate
- Write for Australian hiring managers at {{companyName}} or similar

{{customInstructions}}

**PROCESS (think through this before writing):**
1. Extract the top 5 requirements from the job description (skills, domain, seniority, tools, outcomes).
2. Rank the candidate's roles by relevance to THIS role. Only the top roles belong on a 2-page CV.
3. Decide what to cut: irrelevant Web3/AI/HR roles should be omitted or reduced to 1 bullet unless the JD explicitly needs them.

**TAILORING RULES:**

**A. CV Length & Timeline (EXACTLY 2 FULL EXECUTIVE PAGES)**
- The CV MUST fill **EXACTLY 2 FULL EXECUTIVE PAGES** (the standard for 10+ years experience in Australia). Never produce a truncated 1-page resume.
- Return **7 to 9 roles** in experience array, in **reverse chronological order** (most recent first).
- Include core career history: Foundation, MC Research, Spenmo, Dirac AI, Empala, Vincere, Navigos/Answerbuddy, Paymentwall, KPMG Ukraine.
- Top 3 roles: 3-4 high-impact STAR bullets each. Next 3 roles: 2-3 bullets each. Older roles (Paymentwall, KPMG): 2 bullets each.
- Each bullet: 1-2 lines, max 28 words. Lead with outcome or metric, not "Responsible for...".
- NEVER leave unexplained employment gaps > 4 months.

**B. Core Skills Section**
- Populate **coreSkills** with a clean 1-line comma-separated list of 6-8 domain capabilities tailored to the JD (e.g. "Product Strategy, B2B Credit Rails, Banking-as-a-Service (BaaS), Mixpanel, API Integration, Regulatory Compliance").

**C. Summary (STRICTLY EXACTLY 2 SENTENCES, MAX 45 WORDS TOTAL — NO BLOAT)**
- **Sentence 1 (Positioning)**: Executive title matched to {{jobTitle}} + 2 core domain capabilities aligned with {{detectedDomain}} and this specific JD.
  * *Example for B2B SaaS*: "Senior Product Manager specializing in multi-tenant B2B SaaS platforms, API integrations, and product-led growth."
  * *Example for Fintech/Payments*: "Senior Product Manager specializing in B2B credit infrastructure, global payment rails, and regulatory compliance."
- **Sentence 2 (Hard Proof Metrics)**: Exactly 2 concrete metrics from candidate history ($20M platform volume, 10k MAU, 90+ countries, or 50% efficiency gain).
  * *Example*: "Track record scaling platform volume to $20M across 90+ countries and reducing merchant onboarding time by 50%."
- DO NOT list 6 different tech buzzwords or stack unrelated terms. Keep it laser-focused and clean.
- NEVER include work rights, visa status, city, suburb, or immediate availability in the CV summary.
- BANNED openers (never use these): "Product leader with 10+ years", "Proven track record", "Passionate", "Dynamic", "Results-driven", "Seasoned professional", "Built and scaled shipping".

**D. Experience Bullets**
- Use STAR logic: situation/action → measurable result
- Mirror JD terminology only where factually accurate — do not force keywords
- **Finance Systems JDs (GL, ERP, budgeting, reconciliation, Oracle/Anaplan/TM1):** Summary must open with career arc: KPMG finance control → product in payments and lending. Always include KPMG as the oldest role (2 bullets). Lead with Paymentwall (reconciliation, merchant reporting, financial data), Spenmo (B2B credit, compliance), Empala or Foundation (lending/credit lifecycle). Drop Web3/AI/HR before dropping KPMG or payments roles. Reframe Foundation as lending/credit infrastructure, not crypto jargon.
- **Fintech/Payments JDs:** Lead with Paymentwall (multi-currency payouts, FX, 90+ countries), Spenmo (B2B credit, BaaS, compliance), Foundation (reframe as payment rails, liquidity ops, card partnerships — minimize DeFi/token/stablecoin jargon unless JD is crypto-native)
- **B2B SaaS JDs:** Lead with Vincere (multi-client ATS), Spenmo (analytics, Mixpanel, scaling PM team), Navigos
- **AI/ML JDs:** Lead with Dirac AI (GPT-3 beta, prompt engineering), Answerbuddy (NLP, dialogue systems)
- **Crypto/Web3 JDs:** Foundation and MC Research can use full Web3 vocabulary
- NEVER change company names, role titles, dates, or locations. NEVER invent tools, certifications, or metrics

**E. Professional Title**
- Match target seniority from {{jobTitle}} (e.g. "Director of Product | Payments" for Director roles, "Senior Product Manager | Fintech" for Senior PM)
- One domain only — do not list "SaaS · Fintech · AI" together

**F. tailoringExplanation (60-90 words)**
- State top 3 JD requirements you targeted
- What you emphasized and what you cut/omitted
- Be honest if fit is partial

**G. Experience Gaps (CRITICAL when domain fit is partial)**
- NEVER add disclaimers, footnotes, or "transferable skills" notes ON the CV — no "Note:", no bracketed caveats in summary or bullets
- NEVER invent domain experience the candidate lacks (e.g. do not claim insurance/GAP/warranty, loyalty programs, or automotive finance if absent from source experience)
- When JD requires missing domain: reframe closest REAL experience using accurate product-lifecycle language (regulated financial products, B2B credit lifecycle, subscription/recurring revenue, partner integrations, retention analytics) — without pretending it is the same industry
- experienceGaps: up to 3 specific JD requirements the candidate genuinely lacks (e.g. "embedded GAP insurance products", not vague "domain mismatch")
- gapBridgeNote: 2-3 sentences for COVER LETTER use only — honest bridge from real achievements to the gap; acknowledge the gap briefly, then pivot to transferable proof
- transferableHighlights: up to 3 short notes mapping real candidate wins to the gap area (internal reference for cover letter, NOT printed on CV)

**H. HUMAN EXECUTIVE VOICE (STRICTLY BAN AI FLUFF & TELLTALE WORDS)**
- **Write like a real human tech executive**, NOT an AI generator.
- **STRICTLY BANNED AI WORDS (NEVER USE THESE IN CV OR COVER LETTER):**
  spearheaded, orchestrated, championed, leveraged, harnessed, synergized, fostered, catalyzed, pioneered, empowered, transformative, paradigm, seamless, cutting-edge, state-of-the-art, robust, delve, testament, beacon, tapestry, unwavering, spearheading, beacon of, holistic.
- **USE DIRECT NATURAL HUMAN VERBS ONLY:**
  Built, Launched, Scaled, Designed, Shipped, Hired, Ran, Closed, Grew, Cut, Instrumented, Owned, Structured, Delivered.
- **Cover Letter Voice:** Write in clear, crisp, conversational Australian tech English. Sound like a senior product leader talking straight to another founder or VP of Product. Avoid dramatic fluff, AI throat-clearing, or corporate grandstanding.

**Output Format** — return ONLY valid JSON:
{
  "title": "String",
  "summary": "String",
  "coreSkills": "String — one line max 15 words, or empty string",
  "topRequirements": ["req1", "req2", "req3", "req4", "req5"],
  "experience": [
    {
      "company": "String (exact from source)",
      "role": "String (exact from source)",
      "period": "String (exact from source)",
      "location": "String (exact from source)",
      "bullets": ["bullet 1"]
    }
  ],
  "tailoringExplanation": "String",
  "experienceGaps": ["specific gap 1", "specific gap 2"],
  "gapBridgeNote": "String — for cover letter only, not CV",
  "transferableHighlights": ["real achievement mapped to gap", "another mapping"],
  "omittedRoles": [{"company": "String", "period": "String", "reason": "String"}],
  "timelineNotes": ["String — internal note on roles kept/dropped for timeline continuity"]
}`;

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const DEEPSEEK_MODEL = 'deepseek-chat';

const MAX_CV_ROLES = 10;
const MAX_BULLETS_BY_RANK = [4, 4, 3, 3, 2, 2, 2, 2, 2, 2];
const BANNED_SUMMARY_OPENERS = [
  /^product leader with 10\+ years/i,
  /^proven track record/i,
  /^passionate/i,
  /^dynamic/i,
  /^results[- ]driven/i,
  /^seasoned professional/i
];

const BANNED_COVER_OPENERS = [
  /sits at the intersection/i,
  /^i am drawn to\b/i,
  /^i'm drawn to\b/i,
  /^i was drawn to\b/i,
  /^your platform sits at/i,
  /^.+'s .+ sits at/i,
  /^this role sits at/i,
  /^the .+ role sits at/i,
  /^i am excited\b/i,
  /^i'm excited\b/i,
  /^i am writing to\b/i,
  /^i am applying\b/i,
  /^you're hiring\b/i,
  /^you are hiring\b/i,
  /^you're looking for\b/i,
  /^you are looking for\b/i
];

function coverLetterParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function hasBannedCoverOpening(text) {
  const first = coverLetterParagraphs(text)[0] || '';
  return BANNED_COVER_OPENERS.some((re) => re.test(first));
}

const COVER_LETTER_HEDGE_PATTERNS = [
  /\s*[—–-]\s*even if\b[^.!?]*/gi,
  /\s*even if i (?:haven't|have not|don't|do not)\b[^.!?]*/gi,
  /\s*although i (?:haven't|have not|don't|do not)\b[^.!?]*/gi,
  /\s*even though i (?:haven't|have not)\b[^.!?]*/gi,
  /\s*despite (?:not having|lacking)\b[^.!?]*/gi,
  /\s*i (?:haven't|have not) (?:run|worked|managed|led)\b[^.!?]*/gi,
  /\s*i don't have (?:direct )?experience\b[^.!?]*/gi,
  /\s*happy to (?:walk|talk) through how my\b[^.!?]*/gi,
  /\s*happy to discuss how my\b[^.!?]*/gi
];

function sanitizeCoverLetterDisclaimers(text) {
  let paras = coverLetterParagraphs(text);
  paras = paras.map((p) => {
    let cleaned = p;
    for (const re of COVER_LETTER_HEDGE_PATTERNS) {
      cleaned = cleaned.replace(re, '');
    }
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    return cleaned;
  }).filter((p) => p.length > 20);

  const last = paras[paras.length - 1] || '';
  const stripBragSentences = (paragraph) => {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
    const isBragSentence = (s) => (
      /(?:\bbased in\b|\blive in\b|\blocated in\b|\bi am in\b|\bi'm in\b)/i.test(s)
      || /(?:hold|have|with) (?:australian |australia )?(?:pr\b|permanent residen)/i.test(s)
      || /permanent residen|full work rights|no sponsorship|visa status/i.test(s)
      || /available (?:to|for an?) (?:start|begin)|(?:can|ready to) start immediately/i.test(s)
    );
    const kept = sentences.filter((s) => !isBragSentence(s));
    return (kept.length ? kept : sentences.slice(-1)).join(' ').replace(/\s{2,}/g, ' ').trim();
  };

  paras = paras.map((p) => stripBragSentences(p)).filter((p) => p.length > 20);

  if (paras.length) {
    const lastIdx = paras.length - 1;
    let closing = paras[lastIdx];
    if (COVER_LETTER_HEDGE_PATTERNS.some((re) => re.test(closing)) || /happy to (?:walk|talk|discuss)/i.test(closing)) {
      closing = closing
        .replace(/\s*happy to (?:walk|talk|discuss) through[^.!?]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    if (!/quick call|chat|conversation|let me know/i.test(closing)) {
      closing = (closing.replace(/[.!?]\s*$/, '').trim() + '. Let me know if you would be open to a quick call.').trim();
    }
    paras[lastIdx] = closing;
  }
  if (!paras.length) {
    paras.push('Let me know if you would be open to a quick call.');
  }
  return paras.join('\n\n');
}

function sanitizeCoverLetterOpening(text) {
  const paras = coverLetterParagraphs(text);
  if (paras.length < 2) return String(text || '').trim();

  const first = paras[0];
  if (!hasBannedCoverOpening(text)) return paras.join('\n\n');

  const experienceIdx = paras.findIndex(
    (p, i) => i > 0 && /^(I have|At |My experience|Over the|In my)/i.test(p)
  );
  if (experienceIdx > 0) {
    return [paras[experienceIdx], ...paras.filter((_, i) => i !== experienceIdx)].join('\n\n');
  }

  return paras.slice(1).join('\n\n');
}

export function detectDomain(jobDescription = '', jobTitle = '') {
  const jdLower = `${jobDescription} ${jobTitle}`.toLowerCase();
  if (/general ledger|\bgl\b|budgeting|forecasting|reconciliation system|oracle|anaplan|tm1|erp|finance system|finance platform|fp&a|bas\b|gst reporting|accounting system/.test(jdLower)) {
    return 'Finance Systems';
  }
  if (/payment|finance|credit|billing|fintech|card|fx|treasury|lending|banking/.test(jdLower)) {
    return 'Fintech/Payments';
  }
  if (/solana|blockchain|crypto|web3|token|defi|nft/.test(jdLower)) {
    return 'Crypto/Web3';
  }
  if (/ai |machine learning|llm|gpt|conversational|speech|nlp|ml /.test(jdLower)) {
    return 'AI/ML';
  }
  return 'B2B SaaS';
}

function sanitizeCryptoJargon(text = '') {
  return text;
}

export function compactExperienceText(experience = []) {
  return (experience || []).map((exp) => {
    const bullets = (exp.bullets || []).map((b) => `  - ${b}`).join('\n');
    return `${exp.company} — ${exp.role} (${exp.period || ''}, ${exp.location || ''})\n${bullets}`;
  }).join('\n\n');
}

export function compactJobDescription(jd = '', maxChars = 3500) {
  if (!jd) return '';
  let cleaned = String(jd).trim();
  cleaned = cleaned.replace(/equal opportunity employer[\s\S]*/i, '');
  cleaned = cleaned.replace(/we are an equal opportunity employer[\s\S]*/i, '');
  if (cleaned.length > maxChars) {
    return cleaned.slice(0, maxChars) + '\n...[Description truncated for concise processing]';
  }
  return cleaned;
}

function trimBullets(experience = []) {
  return experience.slice(0, MAX_CV_ROLES).map((exp, index) => ({
    ...exp,
    bullets: (exp.bullets || []).slice(0, MAX_BULLETS_BY_RANK[index] || 1)
  }));
}

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parsePeriodDate(raw = '') {
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  if (/present|current|now/.test(text)) return new Date();

  const match = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*['']?(\d{2,4})\b/i);
  if (!match) return null;

  const month = MONTH_MAP[match[1].slice(0, 3).toLowerCase()];
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  return new Date(year, month, 1);
}

function parsePeriod(period = '') {
  const parts = String(period).split(/\s*[–—-]\s*/);
  const start = parsePeriodDate(parts[0]);
  const end = parsePeriodDate(parts[1] || parts[0]);
  return { start, end: end || start };
}

function monthsBetween(earlier, later) {
  if (!earlier || !later) return 0;
  return (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth());
}

function formatMonthYear(date) {
  if (!date) return '?';
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${labels[date.getMonth()]} ${date.getFullYear()}`;
}

function companyKey(company = '') {
  return String(company).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

function sortReverseChronological(experience = []) {
  return [...experience].sort((a, b) => {
    const aStart = parsePeriod(a.period).start;
    const bStart = parsePeriod(b.period).start;
    if (!aStart && !bStart) return 0;
    if (!aStart) return 1;
    if (!bStart) return -1;
    return bStart - aStart;
  });
}

function roleCoversGap(role, gapStart, gapEnd) {
  const { start, end } = parsePeriod(role.period);
  if (!start || !end || !gapStart || !gapEnd) return false;
  return start <= gapEnd && end >= gapStart;
}

function ensureTimelineContinuity(tailoredExp = [], fullExp = [], options = {}) {
  const maxGapMonths = options.maxGapMonths ?? 4;
  const maxRoles = options.maxRoles ?? MAX_CV_ROLES;
  const lookbackYears = options.lookbackYears ?? 5;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - lookbackYears);

  let exp = sortReverseChronological(tailoredExp);
  const timelineNotes = [];
  const bridgeRolesAdded = [];
  const fullSorted = sortReverseChronological(fullExp);

  let safety = 0;
  while (safety++ < 8) {
    let inserted = false;
    for (let i = 0; i < exp.length - 1; i++) {
      const newer = parsePeriod(exp[i].period);
      const older = parsePeriod(exp[i + 1].period);
      if (!newer.start || !older.end || newer.start < cutoff) continue;

      const gapMonths = monthsBetween(older.end, newer.start);
      if (gapMonths <= maxGapMonths) continue;

      const inList = new Set(exp.map((r) => companyKey(r.company)));
      const gapStart = older.end;
      const gapEnd = newer.start;

      const bridge = fullSorted.find((r) => {
        if (inList.has(companyKey(r.company))) return false;
        return roleCoversGap(r, gapStart, gapEnd);
      });

      if (bridge) {
        const newerCompany = exp[i].company;
        const olderCompany = exp[i + 1].company;
        const bridgeEntry = {
          company: bridge.company,
          role: bridge.role,
          period: bridge.period,
          location: bridge.location || '',
          bullets: [(bridge.bullets || [])[0] || `${bridge.role} — ${bridge.company}.`].slice(0, 1)
        };
        exp.splice(i + 1, 0, bridgeEntry);
        bridgeRolesAdded.push(bridge.company);
        timelineNotes.push(
          `Kept ${bridge.company} (1 bullet) to cover ${gapMonths}-month gap between ${olderCompany} and ${newerCompany}.`
        );
        inserted = true;

        if (exp.length > maxRoles) {
          const removed = exp.pop();
          timelineNotes.push(`Dropped ${removed.company} (oldest listed) to stay at ${maxRoles} roles.`);
        }
        break;
      }

      timelineNotes.push(
        `⚠️ ${gapMonths}-month employment gap (${formatMonthYear(gapStart)}–${formatMonthYear(gapEnd)}) between ${exp[i + 1].company} and ${exp[i].company} — no profile role fills it.`
      );
    }
    if (!inserted) break;
  }

  return {
    experience: sortReverseChronological(exp).slice(0, maxRoles),
    timelineNotes,
    bridgeRolesAdded
  };
}

export function finalizeTailoredExperience(tailoredExp = [], fullExp = []) {
  const continuity = ensureTimelineContinuity(tailoredExp, fullExp);
  return {
    experience: trimBullets(continuity.experience),
    timelineNotes: continuity.timelineNotes,
    bridgeRolesAdded: continuity.bridgeRolesAdded
  };
}

function polishSummary(summary = '', domain = '') {
  let text = String(summary || '').trim();
  // Strip trailing work rights/immediate availability disclaimers from CV summary
  text = text.replace(/;?\s*(?:full work rights|permanent resident|australia pr|available for immediate start).*/gi, '.');
  
  // Strictly enforce max 2 sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2) {
    text = sentences.slice(0, 2).join(' ');
  }

  for (const pattern of BANNED_SUMMARY_OPENERS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, 'Senior Product Manager');
    }
  }
  text = sanitizeCryptoJargon(text, domain);
  return sanitizeDashes(text);
}

function sanitizeDashes(text) {
  return text;
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

export function buildTailorPrompt(baseProfile = {}, jobDescription = '', jobTitle = '', companyName = '', customInstructions = '', promptTemplate = DEFAULT_SYSTEM_PROMPT, isRecruiter = false) {
  let finalInstructions = customInstructions || '';
  if (isRecruiter) {
    const recruiterInstructions = `**SPECIAL CONTEXT: RECRUITER POSTING**
This job is listed by a recruitment agency (${companyName || 'the recruiter'}), not the actual hiring company. The actual hiring company's identity is currently unknown.
- Therefore, in the Cover Letter (specifically Paragraph 1 'Why Them') and the 'Why Interested' statement:
  * Do NOT mention that you want to work for/with the recruitment agency (e.g. '${companyName || 'the recruiter'}') or address them as the employer.
  * Do NOT refer to joining the recruitment agency's business, mission, or teams.
  * Instead, refer to the actual hiring company generically as 'your client' or describe their domain based on clues from the job description (e.g. 'your client, a leading fintech startup' or 'the client company').
  * Focus your interest on the role's challenges, requirements, and the opportunity to add value to the client's product/platform.`;
    finalInstructions = finalInstructions ? `${finalInstructions}\n\n${recruiterInstructions}` : recruiterInstructions;
  }

  const detectedDomain = detectDomain(jobDescription, jobTitle);
  const formattedExp = compactExperienceText(baseProfile.experience || []);
  const formattedJd = compactJobDescription(jobDescription || '', 3500);

  const prompt = (promptTemplate || DEFAULT_SYSTEM_PROMPT)
    .replaceAll('{{name}}', baseProfile.name || '')
    .replaceAll('{{title}}', baseProfile.title || '')
    .replaceAll('{{summary}}', baseProfile.summary || '')
    .replaceAll('{{visa}}', baseProfile.visa || '')
    .replaceAll('{{address}}', baseProfile.address || '')
    .replaceAll('{{experience}}', formattedExp)
    .replaceAll('{{jobTitle}}', jobTitle || '')
    .replaceAll('{{companyName}}', companyName || '')
    .replaceAll('{{jobDescription}}', formattedJd)
    .replaceAll('{{detectedDomain}}', detectedDomain)
    .replaceAll('{{customInstructions}}', finalInstructions ? `**User Custom Instructions (STRICTLY FOLLOW THESE RULES):**\n${finalInstructions}` : '');

  return {
    prompt,
    detectedDomain,
    finalInstructions,
    formattedExp,
    formattedJd
  };
}

export function buildCoverLetterPrompt(baseProfile = {}, jobDescription = '', jobTitle = '', companyName = '', customInstructions = '', tailoredCv = null, gapContext = {}, isRecruiter = false) {
  let finalInstructions = customInstructions || '';
  if (isRecruiter) {
    const recruiterInstructions = `**SPECIAL CONTEXT: RECRUITER POSTING**
- Do NOT mention that you want to work for/with the recruitment agency (${companyName || 'the recruiter'}).
- Do NOT refer to joining the recruitment agency's business or team.
- Refer to the hiring company generically as 'your client' or 'the client company'.`;
    finalInstructions = finalInstructions ? `${finalInstructions}\n\n${recruiterInstructions}` : recruiterInstructions;
  }

  const experienceGaps = Array.isArray(gapContext.experienceGaps) ? gapContext.experienceGaps : [];
  const gapBridgeNote = gapContext.gapBridgeNote || '';
  const transferableHighlights = Array.isArray(gapContext.transferableHighlights) ? gapContext.transferableHighlights : [];
  const hasGaps = experienceGaps.length > 0 || gapBridgeNote;

  const gapSection = hasGaps ? `
**Internal gap notes (for your reasoning only — NEVER mention these gaps, lacks, or missing experience in the letter):**
${experienceGaps.map((g) => `- ${g}`).join('\n') || '- See bridge note'}
**Bridge strategy (paragraph 2 only — show transferable proof, do NOT name what is missing):**
${gapBridgeNote || 'Map closest real wins from the CV to the JD without disclaimers.'}
${transferableHighlights.length ? `**Transferable proof points:**\n${transferableHighlights.map((h) => `- ${h}`).join('\n')}` : ''}
` : '';

  const cv = tailoredCv || baseProfile;
  const formattedExperience = (cv.experience || []).map(exp => {
    const bullets = (exp.bullets || []).map(b => `  - ${b}`).join('\n');
    return `${exp.company} — ${exp.role} (${exp.period || ''}, ${exp.location || ''})\n${bullets}`;
  }).join('\n\n');

  const prompt = `Write the body of a cover letter for an Australian job application. No greeting ("Dear…") and no sign-off ("Best, Eugene") — just 3 short paragraphs.

**Voice:** Write like a senior product leader sending a direct note to a hiring manager — clear, specific, calm confidence. Not HR-speak, not salesy, not AI-polished. Vary sentence length. Use plain words.

**Candidate:** ${baseProfile.name || ''} · ${cv.title || ''}
**Summary:** ${cv.summary || ''}
**Work rights:** ${baseProfile.visa || 'Australia PR'}

**Tailored experience (source of truth — do not invent):**
${formattedExperience || 'No experience set'}

**Role:** ${jobTitle || ''} · ${companyName || ''}
**Job description:**
${compactJobDescription(jobDescription || '', 2500)}
${gapSection}

**Structure (~150–190 words total):**
1. **Why you (OPENING PARAGRAPH — CRITICAL):** Start with "I" — e.g. "I have spent…", "I want to bring…". Lead with YOUR relevant experience mapped to THEIR need. For finance systems roles, open with KPMG finance foundation → payments/lending product arc before platform proof. ${hasGaps ? 'Bridge domain gaps via transferable proof only — never name what you lack.' : 'Lead with the strongest tailored bullets and metrics.'}
2. **Proof:** Two concrete outcomes with numbers from the CV, tied to specific JD requirements.
3. **Close:** One short, low-key line inviting a quick call. Do NOT mention city, suburb, Melbourne, Sydney, location, visa, PR, work rights, or availability unless the JD explicitly asks about sponsorship. No bragging, no formulaic sign-off.

**NEVER open paragraph 1 with:**
- Company or product name ("Veracross's Business Suite…", "Nearmap's platform…")
- "sits at the intersection of"
- "I am drawn to" / "I'm drawn to"
- Describing what the company does before stating your fit
- "I'm excited to apply" / "I am writing to express"

**Banned phrases:** passionate, thrilled, excited to express, delighted, proven track record, leverage, spearhead, synergy, dynamic, results-driven, hit the ground running, align with your vision, unique opportunity, I believe I would be a great fit, sits at the intersection, even if I haven't, although I haven't, I don't have direct experience, I lack experience, happy to walk through how my experience translates, I'm based in Melbourne, I live in Melbourne, hold Australian permanent residency, hold Australia Permanent Resident, full work rights, available for an immediate start

**NEVER write disclaimers or hedges** — no "even if", "although", "despite not having", "I haven't worked in", "I don't have experience with". Sell transferable fit confidently; never apologize or flag missing domain experience.

**Custom instructions:**
${finalInstructions || 'None'}

Return plain text only. No markdown, no bullet points, no subject line.
`;

  return {
    prompt,
    finalInstructions,
    formattedExperience,
    gapSection
  };
}

export async function tailorCvAndLetter(apiKeys, baseProfile, jobDescription, jobTitle, companyName, customInstructions, systemPromptTemplate, isRecruiter = false) {
  let geminiApiKey = '';
  let deepSeekApiKey = '';

  if (typeof apiKeys === 'string') {
    if (apiKeys.startsWith('AIzaSy') || apiKeys.startsWith('AQ.')) {
      geminiApiKey = apiKeys;
    } else {
      deepSeekApiKey = apiKeys;
    }
  } else if (apiKeys && typeof apiKeys === 'object') {
    geminiApiKey = apiKeys.geminiApiKey || '';
    deepSeekApiKey = apiKeys.deepSeekApiKey || '';
  }

  if (!geminiApiKey && !deepSeekApiKey) {
    throw new Error('API key is required. Please add it in settings.');
  }

  const promptTemplate = systemPromptTemplate || DEFAULT_SYSTEM_PROMPT;
  
  let finalInstructions = customInstructions || '';
  if (isRecruiter) {
    const recruiterInstructions = `**SPECIAL CONTEXT: RECRUITER POSTING**
This job is listed by a recruitment agency (${companyName || 'the recruiter'}), not the actual hiring company. The actual hiring company's identity is currently unknown.
- Therefore, in the Cover Letter (specifically Paragraph 1 'Why Them') and the 'Why Interested' statement:
  * Do NOT mention that you want to work for/with the recruitment agency (e.g. '${companyName || 'the recruiter'}') or address them as the employer.
  * Do NOT refer to joining the recruitment agency's business, mission, or teams.
  * Instead, refer to the actual hiring company generically as 'your client' or describe their domain based on clues from the job description (e.g. 'your client, a leading fintech startup' or 'the client company').
  * Focus your interest on the role's challenges, requirements, and the opportunity to add value to the client's product/platform.`;
    finalInstructions = finalInstructions ? `${finalInstructions}\n\n${recruiterInstructions}` : recruiterInstructions;
  }

  const detectedDomain = detectDomain(jobDescription, jobTitle);

  console.log(`\n--- [Tailor Input Injection Log] ---`);
  console.log(`Job Title: "${jobTitle}" | Company: "${companyName}"`);
  console.log(`Detected Target Domain: ${detectedDomain}`);
  console.log(`Injected Candidate Info: ${baseProfile.name} (${baseProfile.title})`);
  
  if (detectedDomain === 'Finance Systems') {
    console.log(`Reasoning & Highlights Injected: Emphasizing KPMG finance control, Paymentwall reconciliation/reporting, Spenmo/Empala lending & credit, Foundation lending infrastructure.`);
  } else if (detectedDomain === 'Fintech/Payments') {
    console.log(`Reasoning & Highlights Injected: Emphasizing Spenmo credit line & KYC, Paymentwall global payouts/payout analytics, and Foundation yield regulatory compliance.`);
  } else if (detectedDomain === 'Crypto/Web3') {
    console.log(`Reasoning & Highlights Injected: Emphasizing Foundation Solana yield indexing, real-time NAV liquidity pools, and MC Research cross-chain wallet/marketplace scaling.`);
  } else if (detectedDomain === 'AI/ML') {
    console.log(`Reasoning & Highlights Injected: Emphasizing Dirac AI GPT-3 prompt engineering pilot, Answerbuddy natural language dialog agents, and conversational speech infrastructure.`);
  } else {
    console.log(`Reasoning & Highlights Injected: Emphasizing B2B SaaS product leadership, Vincere multi-client ATS portal roadmap execution, and product analytics setups.`);
  }
  
  if (customInstructions) {
    console.log(`Injected Custom Instructions: "${customInstructions}"`);
  }
  console.log(`------------------------------------\n`);

  const formattedExp = compactExperienceText(baseProfile.experience || []);
  const formattedJd = compactJobDescription(jobDescription || '', 3500);

  const prompt = promptTemplate
    .replaceAll('{{name}}', baseProfile.name || '')
    .replaceAll('{{title}}', baseProfile.title || '')
    .replaceAll('{{summary}}', baseProfile.summary || '')
    .replaceAll('{{visa}}', baseProfile.visa || '')
    .replaceAll('{{address}}', baseProfile.address || '')
    .replaceAll('{{experience}}', formattedExp)
    .replaceAll('{{jobTitle}}', jobTitle || '')
    .replaceAll('{{companyName}}', companyName || '')
    .replaceAll('{{jobDescription}}', formattedJd)
    .replaceAll('{{detectedDomain}}', detectedDomain)
    .replaceAll('{{customInstructions}}', finalInstructions ? `**User Custom Instructions (STRICTLY FOLLOW THESE RULES):**\n${finalInstructions}` : '');

  let response;
  let success = false;
  let errorMessages = [];
  const startTime = Date.now();

  // 1. Try Gemini first if key is available
  if (geminiApiKey) {
    console.log(`[Tailor] Dispatching POST request to Gemini API (${GEMINI_MODEL}) for "${jobTitle}" at "${companyName}"...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.45,
            topP: 0.92
          }
        })
      });

      if (response.ok) {
        success = true;
        console.log(`[Tailor] Gemini API call successful in ${Date.now() - startTime}ms.`);
      } else {
        const errText = await response.text();
        errorMessages.push(`Gemini Error (${response.status}): ${errText}`);
      }
    } catch (e) {
      errorMessages.push(`Gemini Connection Error: ${e.message}`);
    }
  }

  // 2. Fallback to DeepSeek if Gemini was not used or failed
  if (!success && deepSeekApiKey) {
    if (geminiApiKey) {
      console.warn(`[Tailor Warning] Gemini failed. Errors: [${errorMessages.join(' | ')}]. Falling back to DeepSeek API...`);
    }
    console.log(`[Tailor] Dispatching POST request to DeepSeek API for "${jobTitle}" at "${companyName}"...`);
    try {
      const url = `https://api.deepseek.com/chat/completions`;
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: 'You are a senior executive resume writer. Return only valid JSON matching the requested schema.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.45,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        success = true;
        console.log(`[Tailor] DeepSeek API call successful (${DEEPSEEK_MODEL}) in ${Date.now() - startTime}ms.`);
      } else {
        const errText = await response.text();
        errorMessages.push(`DeepSeek Error (${response.status}): ${errText}`);
      }
    } catch (e) {
      errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
    }
  }

  if (!success) {
    throw new Error(`Tailoring failed. Errors: ${errorMessages.join(' | ')}`);
  }

  const resJson = await response.json();
  try {
    let rawText = '';
    const hasGeminiKeyUsed = geminiApiKey && success && response.url.includes('googleapis.com');
    if (hasGeminiKeyUsed) {
      if (!resJson.candidates || resJson.candidates.length === 0) {
        throw new Error(resJson.error?.message || 'No candidates returned from Gemini API.');
      }
      rawText = resJson.candidates[0].content?.parts?.[0]?.text || '';
    } else {
      rawText = resJson.choices?.[0]?.message?.content || '';
    }

    const cleanData = JSON.parse(cleanJsonText(rawText));

    if (cleanData.summary) {
      cleanData.summary = polishSummary(cleanData.summary, detectedDomain);
    }
    if (cleanData.tailoringExplanation) {
      cleanData.tailoringExplanation = sanitizeDashes(cleanData.tailoringExplanation);
    }
    if (Array.isArray(cleanData.experience)) {
      let experience = trimBullets(
        cleanData.experience.map((exp) => ({
          ...exp,
          bullets: (exp.bullets || [])
        }))
      );
      const continuity = finalizeTailoredExperience(experience, baseProfile.experience || []);
      experience = continuity.experience;
      if (continuity.timelineNotes.length) {
        console.log(`[Tailor] Timeline continuity: ${continuity.timelineNotes.join(' | ')}`);
      }
      cleanData.experience = experience;
      cleanData.timelineNotes = [
        ...(Array.isArray(cleanData.timelineNotes) ? cleanData.timelineNotes : []),
        ...continuity.timelineNotes
      ].slice(0, 5);
      cleanData.bridgeRolesAdded = continuity.bridgeRolesAdded;
    }

    const usedGemini = geminiApiKey && success && response.url.includes('googleapis.com');
    cleanData.detectedDomain = detectedDomain;
    cleanData.coreSkills = String(cleanData.coreSkills || '').trim().slice(0, 120);
    cleanData.omittedRoles = Array.isArray(cleanData.omittedRoles) ? cleanData.omittedRoles.slice(0, 5) : [];
    cleanData.experienceGaps = Array.isArray(cleanData.experienceGaps) ? cleanData.experienceGaps.slice(0, 3) : [];
    cleanData.gapBridgeNote = cleanData.gapBridgeNote || '';
    cleanData.transferableHighlights = Array.isArray(cleanData.transferableHighlights)
      ? cleanData.transferableHighlights.slice(0, 3)
      : [];
    cleanData.tailoredByModel = usedGemini ? GEMINI_MODEL : DEEPSEEK_MODEL;
    cleanData.generatedAt = new Date().toISOString();
    console.log(`[Tailor] CV generated by: ${cleanData.tailoredByModel}`);
    return cleanData;
  } catch (e) {
    const providerUsed = (geminiApiKey && success && response.url.includes('googleapis.com')) ? GEMINI_MODEL : DEEPSEEK_MODEL;
    console.error(`Failed to parse ${providerUsed} response as JSON. Raw response:`, resJson);
    throw new Error(`${providerUsed} failed to return valid JSON matching the requested schema.`);
  }
}

export async function generateCoverLetter(
  apiKeys,
  baseProfile,
  tailoredCv,
  jobTitle,
  companyName,
  jobDescription,
  customInstructions,
  isRecruiter = false,
  gapContext = {}
) {
  let geminiApiKey = '';
  let deepSeekApiKey = '';

  if (typeof apiKeys === 'string') {
    if (apiKeys.startsWith('AIzaSy') || apiKeys.startsWith('AQ.')) {
      geminiApiKey = apiKeys;
    } else {
      deepSeekApiKey = apiKeys;
    }
  } else if (apiKeys && typeof apiKeys === 'object') {
    geminiApiKey = apiKeys.geminiApiKey || '';
    deepSeekApiKey = apiKeys.deepSeekApiKey || '';
  }

  if (!geminiApiKey && !deepSeekApiKey) {
    throw new Error('API key is required. Please add it in settings.');
  }

  const cv = tailoredCv || baseProfile;
  const formattedExperience = (cv.experience || []).map(exp => {
    return `Company: ${exp.company}
Role: ${exp.role}
Period: ${exp.period}
Location: ${exp.location || 'Remote'}
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
  }).join('\n\n');

  let finalInstructions = customInstructions || '';
  if (isRecruiter) {
    const recruiterInstructions = `**SPECIAL CONTEXT: RECRUITER POSTING**
This job is listed by a recruitment agency (${companyName || 'the recruiter'}), not the actual hiring company.
- Do NOT refer to joining the recruitment agency's business or team.
- Refer to the hiring company generically as 'your client' or 'the client company'.`;
    finalInstructions = finalInstructions ? `${finalInstructions}\n\n${recruiterInstructions}` : recruiterInstructions;
  }

  const experienceGaps = Array.isArray(gapContext.experienceGaps) ? gapContext.experienceGaps : [];
  const gapBridgeNote = gapContext.gapBridgeNote || '';
  const transferableHighlights = Array.isArray(gapContext.transferableHighlights) ? gapContext.transferableHighlights : [];
  const suitabilityAssessment = gapContext.suitabilityAssessment || '';
  const hasGaps = experienceGaps.length > 0 || gapBridgeNote;

  const gapSection = hasGaps ? `
**Internal gap notes (for your reasoning only — NEVER mention these gaps, lacks, or missing experience in the letter):**
${experienceGaps.map((g) => `- ${g}`).join('\n') || '- See bridge note'}
**Bridge strategy (paragraph 2 only — show transferable proof, do NOT name what is missing):**
${gapBridgeNote || 'Map closest real wins from the CV to the JD without disclaimers.'}
${transferableHighlights.length ? `**Transferable proof points:**\n${transferableHighlights.map((h) => `- ${h}`).join('\n')}` : ''}
` : '';

  const prompt = `Write the body of a cover letter for an Australian job application. No greeting ("Dear…") and no sign-off ("Best, Eugene") — just 3 short paragraphs.

**Voice:** Write like a senior product leader sending a direct note to a hiring manager — clear, specific, calm confidence. Not HR-speak, not salesy, not AI-polished. Vary sentence length. Use plain words.

**Candidate:** ${baseProfile.name || ''} · ${cv.title || ''}
**Summary:** ${cv.summary || ''}
**Work rights:** ${baseProfile.visa || 'Australia PR'}

**Tailored experience (source of truth — do not invent):**
${formattedExperience || 'No experience set'}

**Role:** ${jobTitle || ''} · ${companyName || ''}
**Job description:**
${compactJobDescription(jobDescription || '', 2500)}
${gapSection}

**Structure (~150–190 words total):**
1. **Why you (OPENING PARAGRAPH — CRITICAL):** Start with "I" — e.g. "I have spent…", "I want to bring…". Lead with YOUR relevant experience mapped to THEIR need. For finance systems roles, open with KPMG finance foundation → payments/lending product arc before platform proof. ${hasGaps ? 'Bridge domain gaps via transferable proof only — never name what you lack.' : 'Lead with the strongest tailored bullets and metrics.'}
2. **Proof:** Two concrete outcomes with numbers from the CV, tied to specific JD requirements.
3. **Close:** One short, low-key line inviting a quick call. Do NOT mention city, suburb, Melbourne, Sydney, location, visa, PR, work rights, or availability unless the JD explicitly asks about sponsorship. No bragging, no formulaic sign-off.

**NEVER open paragraph 1 with:**
- Company or product name ("Veracross's Business Suite…", "Nearmap's platform…")
- "sits at the intersection of"
- "I am drawn to" / "I'm drawn to"
- Describing what the company does before stating your fit
- "I'm excited to apply" / "I am writing to express"

**Banned phrases:** passionate, thrilled, excited to express, delighted, proven track record, leverage, spearhead, synergy, dynamic, results-driven, hit the ground running, align with your vision, unique opportunity, I believe I would be a great fit, sits at the intersection, even if I haven't, although I haven't, I don't have direct experience, I lack experience, happy to walk through how my experience translates, I'm based in Melbourne, I live in Melbourne, hold Australian permanent residency, hold Australia Permanent Resident, full work rights, available for an immediate start

**NEVER write disclaimers or hedges** — no "even if", "although", "despite not having", "I haven't worked in", "I don't have experience with". Sell transferable fit confidently; never apologize or flag missing domain experience.

**Custom instructions:**
${finalInstructions || 'None'}

Return plain text only. No markdown, no bullet points, no subject line.
`;

  let response;
  let success = false;
  let errorMessages = [];

  if (geminiApiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
      response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.55, topP: 0.92 }
        })
      });
      if (response.ok) success = true;
    } catch (e) {
      errorMessages.push(`Gemini Connection Error: ${e.message}`);
    }
  }

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
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: 'You write short, human cover letters for senior product leaders in Australia. Start with the candidate\'s strengths. Never mention Melbourne, location, visa, or PR unless the job ad requires sponsorship info. Never hedge or disclaim missing experience. Never open with company product pitches or "sits at the intersection of".' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.55
        })
      });
      if (response.ok) success = true;
    } catch (e) {
      errorMessages.push(`DeepSeek Connection Error: ${e.message}`);
    }
  }

  if (!success) {
    throw new Error(`Cover letter generation failed. Errors: ${errorMessages.join(' | ')}`);
  }

  const resJson = await response.json();
  let rawText = '';
  const usedGemini = geminiApiKey && success && response.url.includes('googleapis.com');
  if (usedGemini) {
    rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    rawText = resJson.choices?.[0]?.message?.content || '';
  }

  const generatedByModel = usedGemini ? GEMINI_MODEL : DEEPSEEK_MODEL;
  let coverLetter = sanitizeCoverLetterDisclaimers(rawText.trim());
  if (hasBannedCoverOpening(coverLetter)) {
    console.log('[Tailor] Banned cover letter opening detected — reordering paragraphs.');
    coverLetter = sanitizeCoverLetterOpening(coverLetter);
  }
  coverLetter = sanitizeCoverLetterDisclaimers(coverLetter);
  console.log(`[Tailor] Cover letter generated by: ${generatedByModel}`);
  return { coverLetter, generatedByModel };
}

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

export function formatOutreachWorkRightsLine(visa = '') {
  const v = String(visa || '').trim();
  if (/pr|permanent resident/i.test(v)) {
    return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
  }
  if (v) return `${v} — looking forward to connect.`;
  return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
}

export function buildQuickOutreachMessage({
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
