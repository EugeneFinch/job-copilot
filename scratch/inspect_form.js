import { chromium } from 'playwright';

async function inspectForm() {
  const url = "https://jobs.ashbyhq.com/Checkbox%20Technology/53b772aa-a94f-47fe-bfc1-5d1da0d68092";
  console.log(`Navigating to ${url}...`);
  const browser = await chromium.launch({ 
    headless: true,
    channel: 'chrome'
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log(`Navigation error: ${e.message}`));
  
  console.log("Waiting 5 seconds for client-side JS to render...");
  await page.waitForTimeout(5000);
  
  console.log(`Page Title: ${await page.title()}`);
  console.log(`Current URL: ${page.url()}`);

  const applyBtn = await page.locator('button:has-text("Apply for this Job"), button:has-text("Apply")').first();
  if (await applyBtn.count() > 0) {
    console.log("\nFound 'Apply for this Job' button. Clicking it...");
    await applyBtn.click();
    console.log("Waiting 3 seconds for form to load...");
    await page.waitForTimeout(3000);
  } else {
    console.log("\n'Apply for this Job' button not found.");
  }

  // Look for any forms
  const forms = await page.locator('form').all();
  console.log(`\nForms found: ${forms.length}`);

  // Let's print all input, select, textarea elements
  console.log("\n--- ALL INPUTS ---");
  const inputs = await page.locator('input, textarea, select').all();
  for (const input of inputs) {
    const name = await input.getAttribute('name');
    const id = await input.getAttribute('id');
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const tagName = await input.evaluate(el => el.tagName);
    
    // Find associated label or parent text
    let labelText = '';
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).first();
      if (await label.count() > 0) {
        labelText = await label.innerText();
      }
    }
    if (!labelText) {
      labelText = await input.evaluate(el => {
        const parentLabel = el.closest('label');
        if (parentLabel) return parentLabel.innerText;
        
        const formGroup = el.closest('[class*="field"], [class*="group"], [class*="row"]');
        if (formGroup) {
          const textEl = formGroup.querySelector('label, span, p');
          if (textEl) return textEl.innerText;
        }
        return '';
      });
    }

    console.log(`Tag: ${tagName} | name="${name}" | id="${id}" | type="${type}" | placeholder="${placeholder}"`);
    if (labelText) {
      console.log(`  Label: "${labelText.trim().replace(/\n/g, ' ')}"`);
    }
  }

  await browser.close();
}

inspectForm().catch(console.error);
