const API_BASE = 'http://localhost:3004';

let applyQueue = {
  isActive: false,
  jobList: [],
  currentIndex: 0,
  tabId: null
};

// Load queue state on startup
chrome.storage.local.get(['indeedApplyQueue'], (result) => {
  if (result && result.indeedApplyQueue) {
    applyQueue = result.indeedApplyQueue;
    console.log('[Background] Restored queue state from storage:', applyQueue);
  }
});

function saveQueueState() {
  chrome.storage.local.set({ indeedApplyQueue: applyQueue }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Failed to save queue state:', chrome.runtime.lastError.message);
    }
  });
}

// Listen to tab removal to stop/pause queue if the user manually closes the active auto-apply tab
chrome.tabs.onRemoved.addListener((tabId) => {
  if (applyQueue.isActive && tabId === applyQueue.tabId) {
    applyQueue.isActive = false;
    applyQueue.tabId = null;
    saveQueueState();
    console.log('[Background] Indeed apply queue paused because active tab was closed.');
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startIndeedQueue') {
    applyQueue = {
      isActive: true,
      jobList: request.jobList,
      currentIndex: 0,
      tabId: null
    };
    saveQueueState();
    
    // Open the first job page
    if (applyQueue.jobList.length > 0) {
      chrome.tabs.create({ url: applyQueue.jobList[0].url }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.error('[Background] Failed to create tab:', chrome.runtime.lastError?.message);
          applyQueue.isActive = false;
          saveQueueState();
          sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to create tab' });
          return;
        }
        applyQueue.tabId = tab.id;
        saveQueueState();
        sendResponse({ success: true, queue: applyQueue });
      });
    } else {
      applyQueue.isActive = false;
      saveQueueState();
      sendResponse({ success: false, error: 'Empty job list' });
    }
    return true;
  }

  if (request.action === 'nextIndeedJob') {
    const tabsToRemove = [];
    if (sender.tab && sender.tab.id) {
      tabsToRemove.push(sender.tab.id);
    }
    if (applyQueue.tabId && applyQueue.tabId !== sender.tab?.id) {
      tabsToRemove.push(applyQueue.tabId);
    }

    if (tabsToRemove.length > 0) {
      chrome.tabs.remove(tabsToRemove, () => {
        // Suppress any errors if tab is already closed
        const err = chrome.runtime.lastError;
      });
    }

    applyQueue.currentIndex++;
    saveQueueState();

    if (applyQueue.isActive && applyQueue.currentIndex < applyQueue.jobList.length) {
      const nextJob = applyQueue.jobList[applyQueue.currentIndex];
      chrome.tabs.create({ url: nextJob.url }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.error('[Background] Failed to create next tab:', chrome.runtime.lastError?.message);
          applyQueue.isActive = false;
          saveQueueState();
          sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Failed to create next tab' });
          return;
        }
        applyQueue.tabId = tab.id;
        saveQueueState();
        sendResponse({ success: true, queue: applyQueue });
      });
    } else {
      applyQueue.isActive = false;
      applyQueue.tabId = null;
      saveQueueState();
      sendResponse({ success: true, completed: true });
    }
    return true;
  }

  if (request.action === 'stopIndeedQueue') {
    applyQueue.isActive = false;
    applyQueue.tabId = null;
    saveQueueState();
    sendResponse({ success: true, queue: applyQueue });
    return;
  }

  if (request.action === 'getQueueState') {
    chrome.storage.local.get(['indeedApplyQueue'], (result) => {
      if (result && result.indeedApplyQueue) {
        applyQueue = result.indeedApplyQueue;
      }
      sendResponse({ success: true, queue: applyQueue });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'suggestAnswer') {
    fetch(`${API_BASE}/api/jobs/suggest-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: request.jobTitle,
        companyName: request.companyName,
        jobDescription: request.jobDescription,
        question: request.question
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'checkCompanyApplied') {
    const params = new URLSearchParams({ company: request.company || '' });
    fetch(`${API_BASE}/api/jobs/check-company?${params}`)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, applied: data.applied === true }))
      .catch(err => sendResponse({ success: false, applied: false, error: err.message }));
    return true;
  }

  if (request.action === 'getSettings') {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'addJob') {
    fetch(`${API_BASE}/api/jobs/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.job)
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'updateJobStatus') {
    fetch(`${API_BASE}/api/jobs/${request.jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: request.status })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'updateJob') {
    fetch(`${API_BASE}/api/jobs/${request.jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.updates)
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data: data.data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'tailorJob') {
    fetch(`${API_BASE}/api/jobs/${request.jobId}/tailor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customInstructions: request.customInstructions })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'generateCoverLetter') {
    fetch(`${API_BASE}/api/jobs/${request.jobId}/cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customInstructions: request.customInstructions })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'generatePdf') {
    fetch(`${API_BASE}/api/jobs/${request.jobId}/pdf`, {
      method: 'POST'
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'getJobs') {
    fetch(`${API_BASE}/api/jobs`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          sendResponse({ success: false, error: data?.error || 'Invalid jobs response from server' });
          return;
        }
        sendResponse({ success: true, data });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'addContact') {
    fetch(`${API_BASE}/api/contacts/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.contact)
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'lookupJob') {
    const params = new URLSearchParams({
      url: request.url || '',
      title: request.title || '',
      company: request.company || ''
    });
    fetch(`${API_BASE}/api/jobs/lookup?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          sendResponse({ success: false, error: data?.error || 'Job not found' });
          return;
        }
        sendResponse({ success: true, data });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'downloadFile') {
    fetch(request.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:application/pdf;base64,${base64}`;

        chrome.downloads.download({
          url: dataUrl,
          filename: request.filename,
          saveAs: request.saveAs !== false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, downloadId });
          }
        });
      })
      .catch(err => {
        console.error('[Background] Download error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'chat') {
    fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: request.jobTitle,
        companyName: request.companyName,
        jobDescription: request.jobDescription,
        suitabilityAssessment: request.suitabilityAssessment,
        isRecruiter: request.isRecruiter,
        messages: request.messages
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'assessMatch') {
    fetch(`${API_BASE}/api/jobs/assess-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: request.jobTitle,
        companyName: request.companyName,
        jobDescription: request.jobDescription,
        isRecruiter: request.isRecruiter
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          sendResponse({ success: false, error: data.error });
        } else {
          sendResponse({ success: true, data });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'openTab') {
    chrome.tabs.create({ url: request.url });
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'setPendingConnectInvite') {
    chrome.storage.local.set({ pendingConnectInvite: request.invite || null }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getPendingConnectInvite') {
    chrome.storage.local.get(['pendingConnectInvite'], (result) => {
      sendResponse({ success: true, data: result.pendingConnectInvite || null });
    });
    return true;
  }

  if (request.action === 'clearPendingConnectInvite') {
    chrome.storage.local.remove(['pendingConnectInvite'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'solveCaptcha') {
    const apiKey = '8dba0b53c2c8d932e8d641190eac45a7';
    const captchaType = request.captchaType;
    const sitekey = request.sitekey;
    const pageUrl = request.pageUrl;

    let inUrl = `https://2captcha.com/in.php?key=${apiKey}&method=${captchaType}&json=1&pageurl=${encodeURIComponent(pageUrl)}`;
    if (captchaType === 'userrecaptcha') {
      inUrl += `&googlekey=${sitekey}`;
    } else if (captchaType === 'hcaptcha') {
      inUrl += `&sitekey=${sitekey}`;
    } else if (captchaType === 'turnstile') {
      inUrl += `&sitekey=${sitekey}`;
    }

    console.log('[Background] Submitting CAPTCHA to 2Captcha:', captchaType);

    fetch(inUrl)
      .then(r => r.json())
      .then(inRes => {
        if (inRes.status !== 1) {
          sendResponse({ success: false, error: inRes.request || 'Submit failed' });
          return;
        }

        const taskId = inRes.request;
        console.log('[Background] 2Captcha Task ID:', taskId);

        let attempts = 0;
        const maxAttempts = 20;

        const pollInterval = setInterval(() => {
          attempts++;
          const resUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`;

          fetch(resUrl)
            .then(r => r.json())
            .then(resRes => {
              if (resRes.status === 1) {
                clearInterval(pollInterval);
                console.log('[Background] 2Captcha solve success!');
                sendResponse({ success: true, token: resRes.request });
              } else if (resRes.request !== 'CAPCHA_NOT_READY') {
                clearInterval(pollInterval);
                console.error('[Background] 2Captcha error:', resRes.request);
                sendResponse({ success: false, error: resRes.request });
              } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                console.error('[Background] 2Captcha timeout');
                sendResponse({ success: false, error: 'TIMEOUT' });
              }
            })
            .catch(err => {
              clearInterval(pollInterval);
              sendResponse({ success: false, error: err.message });
            });
        }, 5000);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep channel open for async response
  }
});
