import { chromium } from 'playwright';
import path from 'path';

export async function runApply(jobUrl, profile, coverLetterText, pdfPath, logCallback = console.log) {
  logCallback(`Launching headed browser to apply for job: ${jobUrl}`);
  
  const pName = profile?.name || '';
  const pEmail = profile?.email || '';
  const pPhone = profile?.phone || '';
  const pLinkedin = profile?.linkedin || '';
  const pGithub = profile?.github || '';
  const pWebsite = profile?.website || '';
  const pVisa = profile?.visa || '';
  
  // Launch headed browser so the user can see it in action
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    slowMo: 100 // Slow down slightly for visual feedback
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000); // 10s default timeout for safety
    
    // Navigate to job page
    logCallback('Navigating to job page...');
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    logCallback('Waiting for initial page rendering (5 seconds)...');
    await page.waitForTimeout(5000);
    
    // Step 1: Detect if form is visible. If not, click "Apply" button to reveal it.
    const nameInputCount = await page.locator('input[name*="name"], input[id*="name"], input[placeholder*="Name"], input[type="email"]').count();
    if (nameInputCount === 0) {
      logCallback('Application form fields not visible initially. Searching for "Apply" button...');
      const applyBtn = await page.locator(
        'button:has-text("Apply for this Job"), button:has-text("Apply Now"), button:has-text("Apply"), a:has-text("Apply for this Job"), a:has-text("Apply Now"), a:has-text("Apply")'
      ).first();
      
      if (await applyBtn.count() > 0) {
        logCallback(`Found Apply button: "${(await applyBtn.innerText()).trim()}". Clicking to reveal form...`);
        await applyBtn.click().catch(e => logCallback(`Warning: Click failed - ${e.message}`));
        logCallback('Waiting 3 seconds for form to load...');
        await page.waitForTimeout(3000);
      } else {
        logCallback('No explicit "Apply" button found. Proceeding with page analysis...');
      }
    }

    const absolutePdfPath = path.resolve(pdfPath);
    
    // Helper function to extract labels/placeholders for an element
    async function getElementInfo(element) {
      const id = await element.getAttribute('id');
      const name = await element.getAttribute('name');
      const placeholder = await element.getAttribute('placeholder');
      const type = await element.getAttribute('type');
      const tagName = await element.evaluate(el => el.tagName);
      
      let labelText = '';
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).first();
        if (await label.count() > 0) {
          labelText = await label.innerText();
        }
      }
      if (!labelText) {
        labelText = await element.evaluate(el => {
          const parentLabel = el.closest('label');
          if (parentLabel) return parentLabel.innerText;
          
          const formGroup = el.closest('[class*="field"], [class*="group"], [class*="row"], [class*="container"]');
          if (formGroup) {
            const textEl = formGroup.querySelector('label, span, p, .label, [class*="label"]');
            if (textEl) return textEl.innerText;
          }
          const prev = el.previousElementSibling;
          if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
            return prev.innerText;
          }
          return '';
        });
      }
      
      return {
        label: (labelText || '').trim(),
        name: (name || '').trim(),
        placeholder: (placeholder || '').trim(),
        id: (id || '').trim(),
        type: (type || '').toLowerCase(),
        tagName: tagName.toUpperCase()
      };
    }

    // Helper to get surrounding question text for an element
    async function getQuestionText(element) {
      return await element.evaluate(el => {
        const fieldset = el.closest('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          if (legend) return legend.innerText;
        }
        
        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const qText = parent.querySelector('label, span, p, h1, h2, h3, h4, [class*="label"], [class*="question"]');
          if (qText && qText !== el && !el.closest('label')) {
            const text = qText.innerText.trim();
            if (text.length > 5) return text;
          }
          parent = parent.parentElement;
        }
        return '';
      });
    }

    logCallback('Analyzing and filling application form fields...');

    // Find all inputs, textareas, selects
    const formElements = await page.locator('input, textarea, select').all();
    
    // We will group radio buttons by name to handle them collectively
    const radioGroups = {};
    const processedIds = new Set();

    for (const el of formElements) {
      if (await el.isVisible().catch(() => false) === false) continue;
      
      const info = await getElementInfo(el);
      const labelLower = info.label.toLowerCase();
      const nameLower = info.name.toLowerCase();
      const placeholderLower = info.placeholder.toLowerCase();
      const combined = `${labelLower} ${nameLower} ${placeholderLower}`;

      // Skip captcha field, system fields, or buttons
      if (combined.includes('recaptcha') || info.type === 'submit' || info.type === 'button') {
        continue;
      }

      // Handle File Uploads (Resume/CV)
      if (info.type === 'file') {
        if (combined.includes('resume') || combined.includes('cv') || combined.includes('profile') || processedIds.size === 0) {
          logCallback(`Uploading CV to file input: "${info.label || info.name || 'Resume'}"`);
          await el.setInputFiles(absolutePdfPath).catch(e => logCallback(`Upload failed: ${e.message}`));
          processedIds.add(info.id || info.name);
          continue;
        }
      }

      // Handle Radios (Group them first)
      if (info.type === 'radio') {
        const groupName = info.name || 'unnamed-group';
        if (!radioGroups[groupName]) {
          radioGroups[groupName] = [];
        }
        radioGroups[groupName].push({ element: el, info });
        continue;
      }

      // Handle Text/Email/Phone/Textarea
      if (info.tagName === 'INPUT' || info.tagName === 'TEXTAREA') {
        let valueToFill = null;

        // Categorize field
        if (combined.includes('first name') || combined.includes('given name')) {
          valueToFill = pName.split(' ')[0];
        } else if (combined.includes('last name') || combined.includes('surname') || combined.includes('family name')) {
          valueToFill = pName.split(' ').slice(1).join(' ') || '.';
        } else if (combined.includes('name') && !combined.includes('company') && !combined.includes('school') && !combined.includes('degree') && !combined.includes('reference')) {
          valueToFill = pName;
        } else if (info.type === 'email' || combined.includes('email')) {
          valueToFill = pEmail;
        } else if (info.type === 'tel' || combined.includes('phone') || combined.includes('mobile') || combined.includes('contact')) {
          valueToFill = pPhone;
        } else if (combined.includes('linkedin')) {
          valueToFill = pLinkedin ? (pLinkedin.startsWith('http') ? pLinkedin : `https://${pLinkedin}`) : '';
        } else if (combined.includes('github')) {
          valueToFill = pGithub ? (pGithub.startsWith('http') ? pGithub : `https://${pGithub}`) : '';
        } else if (combined.includes('website') || combined.includes('portfolio') || combined.includes('personal link') || combined.includes('url')) {
          valueToFill = pWebsite || pLinkedin;
        } else if (combined.includes('cover letter') || combined.includes('comments') || combined.includes('message') || combined.includes('note') || combined.includes('letter')) {
          valueToFill = coverLetterText;
        } else if (combined.includes('visa') || combined.includes('sponsorship') || combined.includes('work authorization') || combined.includes('work rights')) {
          valueToFill = pVisa;
        } else if (combined.includes('address') || combined.includes('street')) {
          valueToFill = profile?.address || "";
        } else if (combined.includes('city') || combined.includes('suburb') || combined.includes('town')) {
          valueToFill = profile?.address ? (profile.address.split(',')[1]?.trim() || profile.address) : "";
        } else if (combined.includes('state') || combined.includes('region') || combined.includes('province')) {
          valueToFill = "";
        } else if (combined.includes('zip') || combined.includes('postcode') || combined.includes('postal')) {
          valueToFill = "";
        } else if (combined.includes('location') && !combined.includes('job')) {
          valueToFill = profile?.address || "";
        } else if (combined.includes('notice') || combined.includes('availability') || combined.includes('start date') || combined.includes('how soon')) {
          valueToFill = pVisa ? `Immediate (${pVisa})` : "Immediate";
        } else if (combined.includes('salary') || combined.includes('expectation') || combined.includes('compensation') || combined.includes('desired pay')) {
          valueToFill = "Negotiable / Market rate";
        }

        if (valueToFill !== null && valueToFill !== '') {
          logCallback(`Filling field "${info.label || info.name}": "${valueToFill.substring(0, 40)}${valueToFill.length > 40 ? '...' : ''}"`);
          await el.fill(valueToFill).catch(e => logCallback(`Failed to fill ${info.name}: ${e.message}`));
          processedIds.add(info.id || info.name);
        }
      }

      // Handle Select Dropdowns
      if (info.tagName === 'SELECT') {
        const questionText = (await getQuestionText(el)).toLowerCase();
        const options = await el.locator('option').all();
        let optionToSelect = null;

        const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support');
        const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('work in') || questionText.includes('eligible');
        const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability');

        let bestScore = -999;

        for (const opt of options) {
          const optText = (await opt.innerText()).toLowerCase();
          const optValue = await opt.getAttribute('value');
          if (optValue === '' || optText.includes('select') || optText.includes('choose')) continue;

          let score = 0;
          if (isSponsorship) {
            if (optText.includes('no') || optText.includes('not require') || optText.includes('without sponsorship')) score += 10;
            if (optText.includes('yes') || optText.includes('require sponsorship') || optText.includes('need sponsorship')) score -= 10;
          } else if (isEligibility) {
            if (optText.includes('yes') || optText.includes('authorized') || optText.includes('eligible') || optText.includes('pr') || optText.includes('permanent resident') || optText.includes('citizen')) score += 10;
            if (optText.includes('no') || optText.includes('not authorized') || optText.includes('not eligible')) score -= 10;
          } else if (isEEOC) {
            if (optText.includes('decline') || optText.includes('prefer not to say') || optText.includes('choose not to disclose') || optText.includes('wish not to say')) score += 10;
          }

          if (score > bestScore && score > 0) {
            bestScore = score;
            optionToSelect = optValue || await opt.innerText();
          }
        }

        if (optionToSelect) {
          logCallback(`Selecting dropdown "${info.label || questionText}" -> "${optionToSelect}"`);
          await el.selectOption(optionToSelect).catch(e => logCallback(`Select failed: ${e.message}`));
          processedIds.add(info.id || info.name);
        }
      }
    }

    // Process Radio Button Groups
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      if (radios.length === 0) continue;
      const firstEl = radios[0].element;
      const questionText = (await getQuestionText(firstEl)).toLowerCase();
      
      const isSponsorship = questionText.includes('sponsorship') || questionText.includes('sponsor') || questionText.includes('visa support') || questionText.includes('need visa');
      const isEligibility = questionText.includes('authorized') || questionText.includes('right to work') || questionText.includes('work in') || questionText.includes('eligible') || questionText.includes('visa status');
      const isEEOC = questionText.includes('gender') || questionText.includes('race') || questionText.includes('ethnicity') || questionText.includes('veteran') || questionText.includes('disability') || questionText.includes('sex');

      if (!isSponsorship && !isEligibility && !isEEOC) {
        logCallback(`Skipping unknown radio question group: "${questionText || groupName}"`);
        continue;
      }

      let bestRadio = null;
      let bestScore = -999;

      for (const radio of radios) {
        const optionText = radio.info.label.toLowerCase();
        let score = 0;

        if (isSponsorship) {
          if (optionText.includes('without sponsorship') || optionText.includes('no sponsorship') || optionText.includes('do not require') || optionText.includes("don't require") || optionText.includes('independent')) {
            score += 15;
          }
          if (optionText.includes('require sponsorship') || optionText.includes('need sponsorship') || optionText.includes('would require') || optionText.includes('will require')) {
            score -= 15;
          }
          if (optionText === 'no' || optionText === 'no.') {
            score += 10;
          }
          if (optionText === 'yes' || optionText === 'yes.') {
            score -= 10;
          }
          if (optionText.includes('yes') && optionText.includes('can work')) {
            score += 8;
          }
        } else if (isEligibility) {
          if (optionText.includes('yes') || optionText.includes('authorized') || optionText.includes('eligible') || optionText.includes('permanent resident') || optionText.includes('pr') || optionText.includes('citizen') || optionText.includes('subclass 858') || optionText.includes('full work rights') || optionText.includes('without restriction')) {
            score += 15;
          }
          if (optionText.includes('no') || optionText.includes('not authorized') || optionText.includes('not eligible') || optionText.includes('cannot work')) {
            score -= 15;
          }
          if (optionText === 'yes' || optionText === 'yes.') {
            score += 10;
          }
          if (optionText === 'no' || optionText === 'no.') {
            score -= 10;
          }
        } else if (isEEOC) {
          if (optionText.includes('decline') || optionText.includes('prefer not to say') || optionText.includes('choose not to disclose') || optionText.includes('wish not to say') || optionText.includes('dont wish') || optionText.includes('no answer')) {
            score += 15;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestRadio = radio.element;
        }
      }

      if (bestRadio && bestScore > 0) {
        const optionLabel = await bestRadio.evaluate(el => {
          const label = el.closest('label');
          if (label) return label.innerText;
          const id = el.getAttribute('id');
          if (id) {
            const l = document.querySelector(`label[for="${id}"]`);
            if (l) return l.innerText;
          }
          return el.value;
        });
        
        logCallback(`Answering radio question "${questionText || groupName}" -> select "${optionLabel.trim()}"`);
        await bestRadio.click().catch(e => logCallback(`Radio click failed: ${e.message}`));
      }
    }

    // Handle checkboxes that are required terms & agreements
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (const cb of checkboxes) {
      if (await cb.isVisible().catch(() => false) === false) continue;
      const info = await getElementInfo(cb);
      const labelLower = info.label.toLowerCase();
      if (labelLower.includes('agree') || labelLower.includes('accept') || labelLower.includes('consent') || labelLower.includes('terms') || labelLower.includes('understand') || labelLower.includes('privacy')) {
        logCallback(`Checking terms/consent box: "${info.label}"`);
        await cb.check().catch(() => {});
      }
    }

    // Inject floating guidance banner at the top of the page
    logCallback('Injecting application helper banner...');
    await page.evaluate(() => {
      const banner = document.createElement('div');
      banner.id = 'ausjobflow-helper-banner';
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.backgroundColor = '#000000';
      banner.style.color = '#ffffff';
      banner.style.padding = '14px 24px';
      banner.style.textAlign = 'center';
      banner.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
      banner.style.fontWeight = '600';
      banner.style.fontSize = '14px';
      banner.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
      banner.style.zIndex = '999999999';
      banner.style.display = 'flex';
      banner.style.justifyContent = 'center';
      banner.style.alignItems = 'center';
      banner.style.gap = '15px';
      
      banner.innerHTML = `
        <span>🚀 <strong>100x job:</strong> Form pre-filled successfully! Submitting and closing in 3 seconds...</span>
        <button id="close-copilot-banner" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; margin-left: 10px;">Dismiss</button>
      `;
      document.body.appendChild(banner);

      document.getElementById('close-copilot-banner').addEventListener('click', () => {
        banner.remove();
      });
      document.body.style.paddingTop = '50px';
    });

    logCallback('Waiting 3 seconds before auto-submitting...');
    await page.waitForTimeout(3000);

    // Save page URL and text content before clicking submit to compare later and avoid false positives
    const originalUrl = page.url();
    const originalBodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

    logCallback('Locating and clicking the submit button...');
    const submitBtn = await page.locator(
      'button#key-submit-application, input#submit_app, button[type="submit"], input[type="submit"], button:has-text("Submit Application"), button:has-text("Submit"), button:has-text("Apply")'
    ).first();

    if (await submitBtn.count() > 0) {
      await submitBtn.click({ timeout: 5000 }).catch(e => {
        logCallback(`Warning: Submit click failed or timed out: ${e.message}`);
      });

      logCallback('Checking for successful submission page redirect or confirmation text...');
      let submitted = false;

      // Monitor for redirect or changes for up to 10 seconds
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(500);
        
        const currentUrl = page.url().toLowerCase();
        const currentBodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();

        // 1. Check for URL change to success page
        const isSuccessUrl = currentUrl !== originalUrl.toLowerCase() && (
          currentUrl.includes('thanks') || 
          currentUrl.includes('thank') || 
          currentUrl.includes('confirmation') || 
          currentUrl.includes('success') || 
          currentUrl.includes('submitted')
        );

        // 2. Check for NEW success text on page (to avoid matching old text in job description)
        const newTextOnly = currentBodyText.replace(originalBodyText, '');
        const isSuccessText = newTextOnly.includes('thank you') || 
                              newTextOnly.includes('submitted') || 
                              newTextOnly.includes('received') || 
                              newTextOnly.includes('success') || 
                              newTextOnly.includes('cảm ơn') || 
                              newTextOnly.includes('confirm') || 
                              newTextOnly.includes('complete');

        // 3. Double-check if validation errors are currently displayed
        const errorText = await page.evaluate(() => {
          // Look for typical error elements or text containing validation errors
          const errorEls = Array.from(document.querySelectorAll('[class*="error"], [class*="invalid"], [class*="warning"], .error-message'));
          const visibleErrors = errorEls.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && el.innerText.trim().length > 0;
          });
          if (visibleErrors.length > 0) {
            return visibleErrors.map(el => el.innerText.trim()).join('; ');
          }
          // Scan for text
          const bodyText = document.body.innerText.toLowerCase();
          if (bodyText.includes('required field') || bodyText.includes('please fill') || bodyText.includes('invalid email')) {
            return 'Validation error text detected';
          }
          return '';
        });

        // 4. Check for visible captchas
        const captchaVisible = await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe'));
          const isCaptcha = iframes.some(iframe => iframe.src.includes('recaptcha') || iframe.src.includes('hcaptcha') || iframe.src.includes('captcha'));
          const captchaDiv = document.querySelector('[class*="captcha"]');
          return isCaptcha || (captchaDiv && captchaDiv.getBoundingClientRect().height > 0);
        });

        if (captchaVisible) {
          logCallback('[Captcha Detected] A captcha check has appeared. Please solve it in the browser window.');
          break; // Exit loop, requires manual interaction
        }

        if (errorText) {
          logCallback(`[Validation Error] The form has validation errors: "${errorText.substring(0, 100)}". Correct them and submit manually.`);
          break; // Exit loop, let user fix and submit manually
        }

        if (isSuccessUrl || isSuccessText) {
          logCallback('[Success] Verified application submission successfully!');
          submitted = true;
          break;
        }
      }

      if (submitted) {
        logCallback('Closing browser automatically in 2 seconds...');
        await page.waitForTimeout(2000);
        await browser.close().catch(() => {});
        return;
      }
    } else {
      logCallback('Could not locate a submit button automatically.');
    }

    // If we reach here, auto-submit didn't confirm success (due to errors, captcha, or unconfirmed redirect)
    logCallback('Auto-submit did not confirm success. Leaving browser open for manual review and submission.');
    logCallback('Please fill in any missing details, solve captchas if any, and submit manually. The browser will close when you close the window.');
    
    // Wait for the user to close the browser manually
    return new Promise((resolve) => {
      page.on('close', async () => {
        logCallback('Browser window closed by user.');
        await browser.close().catch(() => {});
        resolve();
      });
      browser.on('disconnected', () => {
        logCallback('Browser disconnected.');
        resolve();
      });
    });

  } catch (error) {
    logCallback(`Automation Error: ${error.message}`);
    logCallback('Leaving browser open for manual review. Close it when you are done.');
    
    // Wait for the user to close the browser manually
    return new Promise((resolve) => {
      page.on('close', async () => {
        logCallback('Browser window closed by user.');
        await browser.close().catch(() => {});
        resolve();
      });
      browser.on('disconnected', () => {
        logCallback('Browser disconnected.');
        resolve();
      });
    });
  }
}
