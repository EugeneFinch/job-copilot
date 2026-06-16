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

// Scrape jobs via Google Search (Headed Mode to bypass bot controls)
export async function runScraper(keywords = ['Product Manager'], locations = ['Australia'], logCallback = console.log, onJobScraped = null, excludeCompanies = []) {
  logCallback('Launching headed browser for Google search... (Check your dock/desktop)');
  
  // Set headless: false so user can solve Google captchas
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  // Launch a separate headless browser for details scraping in background (much faster, no popups)
  const headlessBrowser = await chromium.launch({ 
    headless: true,
    channel: 'chrome'
  });

  const jobs = [];
  const visitedUrls = new Set();

  // Combine keywords into an OR list for Google search
  const keywordQuery = keywords.map(k => `"${k.trim()}"`).join(' OR ');

  for (const location of locations) {
    logCallback(`Querying Google for target keywords in "${location}"...`);
    
    const query = `site:boards.greenhouse.io OR site:jobs.lever.co OR site:ashbyhq.com (${keywordQuery}) "${location}"`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
      
      logCallback('Waiting for Google Search results. If a CAPTCHA appears, please solve it in the browser window... ');
      
      // Wait up to 60 seconds for search result div to render
      await page.waitForSelector('div#search', { timeout: 60000 });
      
      logCallback('Search page rendered successfully! Extracting job links...');
      
      // Extract result links and apply strict host filter and junk filter
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .map(a => a.href)
          .filter(href => href && (
            (href.includes('greenhouse.io') && href.includes('/jobs/')) || 
            href.includes('lever.co/') || 
            href.includes('ashbyhq.com/')
          ) && !href.includes('translate.google.com') && !href.includes('webcache.googleusercontent.com'));
      });

      const uniqueLinks = [...new Set(links)];
      logCallback(`Found ${uniqueLinks.length} target job links on Google for "${location}".`);
      
      for (let url of uniqueLinks) {
        // Clean Google redirects if present
        if (url.includes('url?q=')) {
          const match = url.match(/url\?q=([^&]+)/);
          if (match) {
            url = decodeURIComponent(match[1]);
          }
        }

        // Strict check for individual job posting details URLs
        const isJobDetail = (() => {
          try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            if (url.includes('greenhouse.io')) {
              return url.includes('/jobs/');
            }
            if (url.includes('lever.co')) {
              return pathSegments.length >= 2;
            }
            if (url.includes('ashbyhq.com')) {
              return !url.includes('/embed/') && pathSegments.length >= 2;
            }
          } catch (e) {}
          return false;
        })();

        if (!isJobDetail || visitedUrls.has(url)) continue;

        // Check if URL matches any excluded company name (case-insensitive)
        const isExcluded = excludeCompanies.some(comp => {
          const cleanComp = comp.trim().toLowerCase();
          return cleanComp && url.toLowerCase().includes(cleanComp);
        });
        if (isExcluded) {
          logCallback(`[Skip] Company excluded by settings: ${url}`);
          continue;
        }

        visitedUrls.add(url);

        logCallback(`Scraping job details (background): ${url}`);
        try {
          // Re-use headless browser instance in background
          const jobData = await scrapeJobUrl(url, headlessBrowser);
          
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
      logCallback(`[Error] Failed query for location "${location}": ${e.message}`);
    }
  }

  await browser.close();
  await headlessBrowser.close();
  logCallback(`Sourcing session complete. Found ${jobs.length} jobs.`);
  return jobs;
}
