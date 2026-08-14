import { chromium } from 'playwright';

// Helper to clean up company name from URL or Page Title
function cleanCompany(url, pageTitle) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('greenhouse.io')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[0].toUpperCase();
    } else if (urlObj.hostname.includes('lever.co')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[0].toUpperCase();
    } else if (urlObj.hostname.includes('ashbyhq.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return parts[0].toUpperCase();
    }
  } catch (e) {}

  if (pageTitle) {
    const cleanTitle = pageTitle.split('-')[1] || pageTitle.split('|')[1] || pageTitle;
    return cleanTitle.trim();
  }
  return 'Unknown';
}

// Scrape job details from a direct URL (Greenhouse, Lever, Ashby, or generic)
export async function scrapeJobUrl(url, browserInstance = null) {
  let browser = browserInstance;
  let ownBrowser = false;
  if (!browser) {
    browser = await chromium.launch({ 
      headless: true,
      channel: 'chrome'
    });
    ownBrowser = true;
  }
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Wait a brief moment for content to hydrate
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    let jobTitle = '';
    let company = '';
    let description = '';
    let location = 'Australia';

    if (url.includes('greenhouse.io')) {
      jobTitle = await page.locator('h1.app-title').first().innerText({ timeout: 2000 }).catch(() => '');
      description = await page.locator('#content').innerText({ timeout: 2000 }).catch(() => '');
      location = await page.locator('.location').first().innerText({ timeout: 2000 }).catch(() => 'Australia');
    } else if (url.includes('lever.co')) {
      jobTitle = await page.locator('.posting-header h2').first().innerText({ timeout: 2000 }).catch(() => '');
      description = await page.locator('.section.page-centered').innerText({ timeout: 2000 }).catch(() => '');
      const metaText = await page.locator('.posting-categories').innerText({ timeout: 2000 }).catch(() => '');
      if (metaText) {
        location = metaText.split('/')[0].trim();
      }
    } else if (url.includes('ashbyhq.com')) {
      jobTitle = await page.locator('h1').first().innerText({ timeout: 2000 }).catch(() => '');
      description = await page.locator('.job-description, [class*="jobDescription"]').innerText({ timeout: 2000 }).catch(() => '');
      location = await page.locator('p:has-text("Location"), span:has-text("Location")').innerText({ timeout: 2000 }).catch(() => 'Australia');
      // Clean location label
      location = location.replace(/Location/gi, '').replace(/:/g, '').trim();
    }

    // Fallbacks
    if (!jobTitle) {
      jobTitle = title.split(' - ')[0] || title.split(' | ')[0] || 'Product Manager';
    }
    if (!description) {
      description = await page.locator('body').innerText().catch(() => '');
    }
    company = cleanCompany(url, title);

    description = description.replace(/\s+/g, ' ').trim();

    if (!description || description.length < 100) {
      throw new Error('Failed to extract meaningful job description text.');
    }

    return {
      id: Math.random().toString(36).substring(2, 11),
      title: jobTitle.trim(),
      company: company.trim(),
      location: location.trim(),
      url: url,
      description: description,
      status: 'To Process',
      scrapedAt: new Date().toISOString(),
      tailoredCv: null,
      coverLetter: null,
      suitabilityScore: null
    };

  } finally {
    await page.close();
    await context.close();
    if (ownBrowser) {
      await browser.close();
    }
  }
}

// Scrape jobs via Google Search with stealth anti-detection and per-board targeting
export async function runScraper(keywords = ['Product Manager'], locations = ['Australia'], logCallback = console.log, onJobScraped = null, excludeCompanies = []) {
  logCallback('Initializing automated sourcing engine (anti-detection mode)...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney'
  });

  const page = await context.newPage();
  const jobs = [];
  const visitedUrls = new Set();
  const targetBoards = ['boards.greenhouse.io', 'jobs.lever.co', 'jobs.ashbyhq.com', 'ashbyhq.com'];

  // Clean keywords
  const primaryKeywords = keywords.length > 0 ? keywords.slice(0, 3) : ['Product Manager'];
  const keywordQuery = primaryKeywords.map(k => `"${k.trim()}"`).join(' OR ');

  for (const location of locations) {
    logCallback(`Searching Australian job boards for "${primaryKeywords.join(', ')}" in ${location}...`);
    
    for (const board of targetBoards) {
      const query = `site:${board} (${keywordQuery}) "${location.trim()}"`;
      const searchUrl = `https://www.google.com.au/search?q=${encodeURIComponent(query)}&num=20&hl=en`;
      
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1200);

        // Auto-dismiss Google consent banner if present
        const consentBtn = await page.$('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Accept")');
        if (consentBtn) {
          await consentBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
        }

        // Extract all links matching target board domain
        const rawLinks = await page.evaluate((b) => {
          const anchors = Array.from(document.querySelectorAll('a'));
          return anchors
            .map(a => a.href)
            .filter(href => href && href.includes(b) && !href.includes('translate.google') && !href.includes('googleusercontent'));
        }, board.replace('jobs.', ''));

        // Normalize and clean extracted URLs
        const validPostingUrls = [];
        for (let rawUrl of rawLinks) {
          let clean = rawUrl.split('#:~:text=')[0].split('#')[0];
          if (clean.includes('url?q=')) {
            const match = clean.match(/url\?q=([^&]+)/);
            if (match) clean = decodeURIComponent(match[1]);
          }

          // Strip tracking query params
          clean = clean.split('?')[0];

          // Validate individual job detail URLs
          const isDetail = (() => {
            try {
              const urlObj = new URL(clean);
              const segments = urlObj.pathname.split('/').filter(Boolean);
              if (clean.includes('greenhouse.io')) {
                return clean.includes('/jobs/') && segments.length >= 2;
              }
              if (clean.includes('lever.co')) {
                return segments.length >= 2;
              }
              if (clean.includes('ashbyhq.com')) {
                return !clean.includes('/embed/') && segments.length >= 2;
              }
            } catch (e) {}
            return false;
          })();

          if (isDetail && !visitedUrls.has(clean)) {
            validPostingUrls.push(clean);
          }
        }

        const uniqueBoardLinks = [...new Set(validPostingUrls)];
        if (uniqueBoardLinks.length > 0) {
          logCallback(`  → Found ${uniqueBoardLinks.length} roles on ${board} (${location})`);
        }

        for (const url of uniqueBoardLinks) {
          if (visitedUrls.has(url)) continue;

          // Check if URL matches any excluded company name
          const isExcluded = excludeCompanies.some(comp => {
            const cleanComp = comp.trim().toLowerCase();
            return cleanComp && url.toLowerCase().includes(cleanComp);
          });
          if (isExcluded) {
            logCallback(`[Skip] Company excluded by settings: ${url}`);
            continue;
          }

          visitedUrls.add(url);
          logCallback(`Scraping job details: ${url}`);

          try {
            const jobData = await scrapeJobUrl(url, browser);
            
            // Double-check company name after scraping
            const isCompanyExcluded = excludeCompanies.some(comp => {
              const cleanComp = comp.trim().toLowerCase();
              return cleanComp && jobData.company.toLowerCase().includes(cleanComp);
            });
            if (isCompanyExcluded) {
              logCallback(`[Skip] Scraped company "${jobData.company}" is in exclude list.`);
              continue;
            }

            jobs.push(jobData);
            logCallback(`[Success] Scraped: ${jobData.title} at ${jobData.company}`);
            if (onJobScraped) {
              await onJobScraped(jobData);
            }
          } catch (e) {
            logCallback(`[Failed] Error scraping ${url}: ${e.message}`);
          }
        }

      } catch (e) {
        logCallback(`[Warning] Query error for ${board} in ${location}: ${e.message}`);
      }
    }
  }

  await page.close();
  await context.close();
  await browser.close();

  logCallback(`Sourcing session complete. Found ${jobs.length} relevant jobs.`);
  return jobs;
}
