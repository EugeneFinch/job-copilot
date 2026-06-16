export const DEFAULT_SYSTEM_PROMPT = `You are an expert recruitment consultant and executive resume editor. Your task is to tailor a job application for a candidate.

**Candidate Details:**
Name: {{name}}
Current Title: {{title}}
Base CV Summary: {{summary}}
Base Visa/Work Status: {{visa}}
Address: {{address}}
Base Work Experience:
{{experience}}

**Target Job Details:**
Job Title: {{jobTitle}}
Company: {{companyName}}
Job Description:
{{jobDescription}}
**Context:** We operate as a local alternative serving APEC markets from Singapore, positioning ourselves as a regional option rather than competing directly with US‑based solutions.

{{customInstructions}}

**Instructions:**
1. **Tailor the CV Summary**: Rewrite the summary to be short, punchy, and highly professional.
   * **Style Guide**: Write in a natural, direct, human voice. Avoid corporate fluff, robotic clichés, and AI buzzwords. Strictly **maximum 2 sentences** or about **30 to 40 words** total.
   * **CRITICAL CONSTRAINT**: DO NOT explicitly mention the name of the company (e.g. "{{companyName}}") or the target job title (e.g. "{{jobTitle}}") in the CV Summary itself. Keep the summary focused purely on general skills, experience, and value proposition.
   * **STRICT HYPHEN AND DASH BAN**: DO NOT use any hyphens (-), en-dashes (–), or em-dashes (—) in the summary. However, KEEP numbers and metric shorthand compact and natural (e.g. write "10+ years", "10k MAU", "$20M AUM"). To avoid hyphens or dashes in compound adjectives, simply write them as space-separated words (e.g. write "B2B SaaS" instead of "B2B SaaS-focused", "API driven" instead of "API-driven").
   * **Domain-Specific Targeting**: Position the candidate directly for the target job's domain. Frame their primary focus area and value proposition in the summary to match the target position's domain. Do NOT mix all domains (B2B SaaS, fintech, and AI) together in the summary; target the specific domain of the position:
     - For Fintech/Payments: Position them as a "Fintech product leader" or "Product leader with 10+ years of experience building high-scale financial and payment platforms". Focus the summary entirely on payment systems, transactional infrastructure, credit products, and compliance, without mentioning Web3, AI, or generic SaaS keywords.
     - For Crypto/Web3: Position them as a "Web3 and decentralized finance product leader". Focus the summary on Solana, decentralized yield, token models, and scaling web3 applications.
     - For AI/ML: Position them as an "AI/ML product leader". Focus the summary on conversational AI, natural language processing, LLM prompting, and dialogue systems.
     - For General B2B SaaS: Position them as a "B2B SaaS product leader". Focus the summary on multi-client roadmaps, product analytics, and scaling platforms.
2. **Tailor Work Experience Bullets**:
   - For each company in the candidate's experience, dynamically adjust and rewrite the bullet points to align with the target job description's specific requirements, terminology, and keywords.
   - **CRITICAL DYNAMIC TAILORING RULE**: You must dynamically align the candidate's bullet points to the target job description. Do NOT generate the same canned bullets or use identical example phrasing across different job postings. Identify the unique technical skills, tools, and challenges mentioned in the target job description, and adapt the phrasing of the candidate's actual relevant achievements to match that specific vocabulary (e.g. if a role emphasizes platform reliability, frame experience to focus on uptime and scaling; if it emphasizes API integrations, focus on developers and API architecture).
   - **Transferable Skill Framing**: Frame achievements using transferable terms (e.g. platform engineering, 0 to 1 scaling, product-led growth, API integrations, GTM strategy, stakeholder management) that demonstrate senior product leadership capability to the target employer:
     - For Fintech/Payments roles: Emphasize payment infrastructure, transaction processing, credit/lending products, compliance workflows, regional banking partnerships, and merchant-facing dashboards. Avoid over-indexing on cryptocurrency or Web3 terminology if the target role is a traditional fintech/payments position; frame those experiences as high-scale transactional platform engineering, liquidity operations, or payment rails.
     - For Crypto/Web3 roles: Emphasize decentralized finance (DeFi), smart contract integrations, tokenomics, yield indexing, liquidity operations, wallets, and ecosystem partnerships.
     - For AI/ML roles: Emphasize LLM prompt engineering, dialog/conversational AI systems, natural language processing, data pipelines, and AI product integrations.
     - For General B2B SaaS roles: Emphasize multi-tenant platform roadmaps, product analytics (e.g. Amplitude/Mixpanel), marketing automation, channel partnerships, and general SaaS scaling metrics.
   - **KEEP COMPACT METRICS**: Do NOT spell out metric abbreviations or numbers (e.g. do NOT write "ten thousand" for "10k", or "twenty million" for "$20M"). Keep them as "10k MAU", "50k+ assets", "$20M AUM", "10+ years", "0 to 1" or "0 to 1 delivery".
   - **STRICT HYPHEN AND DASH BAN**: Ensure that there are absolutely NO hyphens (-), en-dashes (–), or em-dashes (—) in the tailored experience bullet points. Rephrase compound words to avoid them entirely (e.g. write "cofounder" instead of "co-founder", "cross functional" instead of "cross-functional", "end to end" instead of "end-to-end", "real time" instead of "real-time", "zero to one" or "0 to 1").
   - **STRICT COMPLIANCE RULE**: DO NOT invent any fake roles, fake technologies, fake results, or change any employment dates, locations, or company names. Only rephrase/re-emphasize factual experience.
   - Keep the same number of companies and roles. Keep 2 to 4 bullet points per company matching the base CV.
3. **Write a Short, Sharp Cover Letter**:
   - **Word Limit**: Keep the cover letter strictly **under 250 words** total. It must be highly concise and easy to skim.
   - **Tone**: Sound like a genuine human. Avoid generic AI templates, openings (e.g., "I am writing to express my interest..."), robotic buzzwords (e.g., "passionate", "leverage", "spearhead", "synergy"), and conversational fluff.
   - **Structure**: It must consist of exactly **3 paragraphs**:
     - **Paragraph 1 (Why Them)**: Explain one specific thing about the company or the role that genuinely interests you. Do not be generic; link it to their product context or business space.
     - **Paragraph 2 (Why You)**: Provide two concrete examples/achievements from your CV that directly match what the job description is asking for. Use numbers and metrics (e.g., "$20M AUM", "10k MAU", "50% reduction") where possible.
     - **Paragraph 3 (Close)**: A brief closing stating your work rights/unrestricted permanent residency status, availability for immediate hybrid/remote start, and next steps. Keep it direct and no-fluff (e.g., "I hold Australia Permanent Resident (PR) status, live in Melbourne/Sydney, and am available for an immediate start. Let me know if you would be open to a quick call to discuss the roadmap.").
4. **Write a "Why Interested" Statement**:
   - Write a short, punchy, and highly tailored statement (strictly **50 to 70 words** total) answering why you want to work for {{companyName}} in this specific role.
   - Connect your B2B SaaS and fintech product leadership background directly with {{companyName}}'s business, mission, and current opportunities (based on their job description). 
   - Avoid generic AI fluff, clichés, and empty corporate statements. Make it sound like a sharp, genuine human response.
5. **Write a Tailoring Highlights & Changes Explanation**:
   - Write a clear and concise explanation (strictly **60 to 90 words** total) describing:
     * What the key requirements of this specific job are (e.g. B2B SaaS scaling, specific tech stack/Solana, API development).
     * Exactly what experience, achievements, or keywords you added or emphasized in the tailored summary or experience bullets (e.g. emphasizing Spenmo credit lines or Vincere multi-client models).
     * What details or generic points you de-emphasized or removed to make the application highly compelling.
6. **Tailor the professional Title/Headline**:
   - Generate a short, targeted professional title (strictly under 6 to 8 words) reflecting the candidate's senior alignment with the target job's domain.
   - Keep it clean and direct, using vertical bars or spaces as separators (e.g., "Product Leader | Fintech" or "Product Leader | AI Platforms").
   - Do NOT list all domains (B2B SaaS, fintech, AI) together if the role is specific to one domain.

**Output Format**:
You must return a single JSON object matching this structure exactly:
{
  "title": "String (the short, targeted tailored professional title/headline)",
  "summary": "String (the tailored summary)",
  "experience": [
    {
      "company": "String (exact same company name)",
      "role": "String (exact same role)",
      "period": "String (exact same period)",
      "location": "String (exact same location)",
      "bullets": ["bullet 1", "bullet 2", ...]
    }
  ],
  "coverLetter": "String (plain text cover letter, use \\n for line breaks, no markdown formatting inside the text)",
  "whyInterested": "String (short statement explaining why you are interested in working here)",
  "tailoringExplanation": "String (the concise explanation of what was modified, added, or de-emphasized to align your CV with the job's key requirements)"
}`;

function sanitizeDashes(text) {
  if (!text) return text;
  return text
    // Replace common hyphenated terms with non-hyphenated equivalents
    .replace(/co-founder/gi, 'cofounder')
    .replace(/cross-functional/gi, 'cross functional')
    .replace(/end-to-end/gi, 'end to end')
    .replace(/0-1/g, '0 to 1')
    .replace(/0→1/g, '0 to 1')
    .replace(/1-2/g, '1 to 2')
    .replace(/API-driven/gi, 'API driven')
    .replace(/API-first/gi, 'API first')
    .replace(/consumer-facing/gi, 'consumer facing')
    .replace(/merchant-facing/gi, 'merchant facing')
    .replace(/client-facing/gi, 'client facing')
    .replace(/real-time/gi, 'real time')
    .replace(/high-growth/gi, 'high growth')
    .replace(/cross-chain/gi, 'cross chain')
    .replace(/top-tier/gi, 'top tier')
    .replace(/multi-client/gi, 'multi client')
    .replace(/time-to-market/gi, 'time to market')
    .replace(/time-to-live/gi, 'time to live')
    .replace(/self-starter/gi, 'self starter')
    .replace(/data-driven/gi, 'data driven')
    .replace(/state-of-the-art/gi, 'state of the art')
    .replace(/AI-powered/gi, 'AI powered')
    // Replace spaces around any en-dash, em-dash, or hyphen used as divider
    .replace(/\s*[–—-]\s*/g, ' ')
    .replace(/([a-zA-Z0-9])[-–—]([a-zA-Z0-9])/g, '$1 $2');
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

  // Substitute placeholders
  const prompt = promptTemplate
    .replaceAll('{{name}}', baseProfile.name || '')
    .replaceAll('{{title}}', baseProfile.title || '')
    .replaceAll('{{summary}}', baseProfile.summary || '')
    .replaceAll('{{visa}}', baseProfile.visa || '')
    .replaceAll('{{address}}', baseProfile.address || '')
    .replaceAll('{{experience}}', JSON.stringify(baseProfile.experience || [], null, 2))
    .replaceAll('{{jobTitle}}', jobTitle || '')
    .replaceAll('{{companyName}}', companyName || '')
    .replaceAll('{{jobDescription}}', jobDescription || '')
    .replaceAll('{{customInstructions}}', finalInstructions ? `**User Custom Instructions (STRICTLY FOLLOW THESE RULES):**\n${finalInstructions}` : '');

  let response;
  let success = false;
  let errorMessages = [];
  const startTime = Date.now();

  let detectedDomain = 'General B2B SaaS';
  const jdLower = (jobDescription || '').toLowerCase();
  const titleLower = (jobTitle || '').toLowerCase();
  
  if (jdLower.includes('payment') || jdLower.includes('finance') || jdLower.includes('credit') || jdLower.includes('billing') || titleLower.includes('fintech') || titleLower.includes('payment') || titleLower.includes('card')) {
    detectedDomain = 'Fintech/Payments';
  } else if (jdLower.includes('solana') || jdLower.includes('blockchain') || jdLower.includes('crypto') || jdLower.includes('web3') || jdLower.includes('token')) {
    detectedDomain = 'Crypto/Web3';
  } else if (jdLower.includes('ai ') || jdLower.includes('machine learning') || jdLower.includes('llm') || jdLower.includes('gpt') || jdLower.includes('conversational') || jdLower.includes('speech') || jdLower.includes('nlp')) {
    detectedDomain = 'AI/ML';
  }

  console.log(`\n--- [Tailor Input Injection Log] ---`);
  console.log(`Job Title: "${jobTitle}" | Company: "${companyName}"`);
  console.log(`Detected Target Domain: ${detectedDomain}`);
  console.log(`Injected Candidate Info: ${baseProfile.name} (${baseProfile.title})`);
  
  if (detectedDomain === 'Fintech/Payments') {
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

  // 1. Try Gemini first if key is available
  if (geminiApiKey) {
    console.log(`[Tailor] Dispatching POST request to Gemini API (gemini-2.5-flash) for "${jobTitle}" at "${companyName}"...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
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
            temperature: 0.2
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
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });

      if (response.ok) {
        success = true;
        console.log(`[Tailor] DeepSeek API call successful in ${Date.now() - startTime}ms.`);
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

    // Programmatic sanitization of dashes and hyphens
    if (cleanData.summary) {
      cleanData.summary = sanitizeDashes(cleanData.summary);
    }
    if (cleanData.whyInterested) {
      cleanData.whyInterested = sanitizeDashes(cleanData.whyInterested);
    }
    if (cleanData.tailoringExplanation) {
      cleanData.tailoringExplanation = sanitizeDashes(cleanData.tailoringExplanation);
    }
    if (Array.isArray(cleanData.experience)) {
      cleanData.experience.forEach(exp => {
        if (Array.isArray(exp.bullets)) {
          exp.bullets = exp.bullets.map(bullet => sanitizeDashes(bullet));
        }
      });
    }

    // Append generation timestamp
    cleanData.generatedAt = new Date().toISOString();
    return cleanData;
  } catch (e) {
    const providerUsed = (geminiApiKey && success && response.url.includes('googleapis.com')) ? 'Gemini' : 'DeepSeek';
    console.error(`Failed to parse ${providerUsed} response as JSON. Raw response:`, resJson);
    throw new Error(`${providerUsed} failed to return valid JSON matching the requested schema.`);
  }
}
